import { createHmac } from "node:crypto";
import WebSocket from "ws";
import type { Candle } from "../data/types.js";
import type { AccountBalance, OrderFill, SpotInstrument, SymbolRules, TradingClient, UserDataEvent } from "./trading-types.js";
import type { OkxConfig } from "./okx-config.js";

type JsonRecord = Record<string, unknown>;
const asNumber = (value: unknown, fallback = 0): number => {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

function intervalToBar(interval: string): string {
  const known: Record<string, string> = { "5m": "5m", "15m": "15m", "1h": "1H", "1d": "1D", "1w": "1W", "1M": "1M", "1y": "1Y" };
  return known[interval] ?? interval;
}

function intervalMilliseconds(interval: string): number {
  const match = interval.toLowerCase().match(/^(\d+)(m|h|d|w)$/);
  if (!match) return 24 * 60 * 60 * 1000;
  const amount = Number(match[1]);
  const unit = match[2];
  const multiplier = unit === "m" ? 60_000 : unit === "h" ? 3_600_000 : unit === "d" ? 86_400_000 : 604_800_000;
  return amount * multiplier;
}

function baseAsset(instId: string, quoteAsset: string): string {
  return instId.endsWith(`-${quoteAsset}`) ? instId.slice(0, -(quoteAsset.length + 1)) : instId.split("-")[0] ?? "BTC";
}

/** OKX REST/WebSocket 适配层，使用 OKX V5 签名接口并保持与策略层相同的交易契约。 */
export class OkxClient implements TradingClient {
  public interval: string;
  private readonly restBase = "https://www.okx.com";
  private readonly baseAssetName: string;

  public constructor(private readonly config: OkxConfig) {
    this.interval = config.interval;
    this.baseAssetName = baseAsset(config.instId, config.quoteAsset);
  }

  public setInterval(interval: string): void {
    this.interval = interval;
    this.config.bar = intervalToBar(interval);
  }

  public async getSpotInstruments(quoteAsset?: string): Promise<SpotInstrument[]> {
    const response = await this.publicRequest("/api/v5/public/instruments", { instType: this.config.instrumentType });
    const rows = Array.isArray(response.data) ? response.data as JsonRecord[] : [];
    return rows.flatMap((row): SpotInstrument[] => {
      const symbol = String(row.instId ?? "");
      const state = String(row.state ?? "");
      const quote = String(row.quoteCcy ?? "").toUpperCase();
      if (!symbol || state !== "live" || (quoteAsset && quote !== quoteAsset.toUpperCase())) return [];
      return [{
        symbol,
        baseAsset: String(row.baseCcy ?? symbol.split("-")[0] ?? ""),
        quoteAsset: quote,
        state,
        tickSize: asNumber(row.tickSz),
        quantityStep: asNumber(row.lotSz ?? row.minSz),
        minQuantity: asNumber(row.minSz),
        minNotional: asNumber(row.minSz),
        contractValue: this.config.instrumentType === "SWAP" ? asNumber(row.ctVal, 1) : 1,
      }];
    }).sort((left, right) => left.symbol.localeCompare(right.symbol));
  }

  public async getSymbolRules(symbol: string): Promise<SymbolRules> {
    const response = await this.publicRequest("/api/v5/public/instruments", { instType: this.config.instrumentType, instId: symbol });
    const row = this.firstRow(response);
    const quantityStep = asNumber(row.lotSz ?? row.minSz, 0);
    if (quantityStep <= 0) throw new Error(`OKX returned no valid lot size for ${symbol}`);
    return {
      symbol,
      baseAsset: String(row.baseCcy ?? this.baseAssetName),
      quoteAsset: String(row.quoteCcy ?? this.config.quoteAsset),
      quantityStep,
      minQuantity: asNumber(row.minSz),
      maxQuantity: asNumber(row.maxLmtSz ?? row.maxMktSz, Number.POSITIVE_INFINITY),
      priceTick: asNumber(row.tickSz),
      minNotional: 0,
      contractValue: this.config.instrumentType === "SWAP" ? asNumber(row.ctVal, 1) : 1,
    };
  }

  public async getBalances(): Promise<AccountBalance[]> {
    const response = await this.privateRequest("GET", "/api/v5/account/balance");
    const data = Array.isArray(response.data) ? response.data as JsonRecord[] : [];
    const details = data.flatMap((account) => Array.isArray(account.details) ? account.details as JsonRecord[] : []);
    return details.flatMap((row) => {
      const asset = String(row.ccy ?? "");
      if (!asset) return [];
      return [{ asset, free: asNumber(row.availBal ?? row.cashBal), locked: asNumber(row.frozenBal) }];
    });
  }

  public async getLatestPrice(symbol: string): Promise<number> {
    const ticker = await this.publicRequest("/api/v5/market/ticker", { instId: symbol });
    const price = asNumber(this.firstRow(ticker).last);
    if (price <= 0) throw new Error(`OKX returned no latest price for ${symbol}`);
    return price;
  }

  public async setLeverage(symbol: string, leverage: number): Promise<void> {
    if (this.config.instrumentType !== "SWAP") return;
    if (!Number.isInteger(leverage) || leverage < 1 || leverage > 100) throw new Error("杠杆必须是 1 到 100 的整数");
    await this.privateRequest("POST", "/api/v5/account/set-leverage", { instId: symbol, ccy: this.config.quoteAsset, lever: String(leverage), mgnMode: "cross", posSide: "net" });
  }

  public async marketBuy(symbol: string, quoteOrderQty: number, _leverage?: number, requestedContracts?: number): Promise<OrderFill> {
    if (quoteOrderQty <= 0) throw new Error("Buy amount must be positive");
    if (this.config.instrumentType === "SPOT") return this.placeMarketOrder(symbol, "buy", quoteOrderQty, "quote_ccy");
    const rules = await this.getSymbolRules(symbol);
    const price = await this.getLatestPrice(symbol);
    const contracts = requestedContracts === undefined
      ? Math.floor((quoteOrderQty / Math.max(price, 1)) / Math.max(rules.contractValue ?? 1, 1e-12))
      : Math.floor(requestedContracts / Math.max(rules.quantityStep, 1e-12)) * rules.quantityStep;
    const impliedMargin = contracts * Math.max(rules.contractValue ?? 1, 1e-12) * price / Math.max(_leverage ?? 1, 1);
    if (requestedContracts !== undefined && impliedMargin > quoteOrderQty * 1.02) throw new Error(`合约张数与保证金/杠杆不匹配：${contracts} 张约需 ${impliedMargin.toFixed(4)} ${this.config.quoteAsset} 保证金，但本次仅授权 ${quoteOrderQty.toFixed(4)}`);
    if (contracts < rules.minQuantity) throw new Error(`合约张数不足最小下单量：${contracts} < ${rules.minQuantity}`);
    if (contracts > rules.maxQuantity) throw new Error(`合约张数超过交易所上限：${contracts} > ${rules.maxQuantity}`);
    const fill = await this.placeMarketOrder(symbol, "buy", contracts, "base_ccy");
    return { ...fill, executedQuantity: fill.executedQuantity * Math.max(rules.contractValue ?? 1, 1e-12) };
  }

  public async marketSell(symbol: string, quantity: number): Promise<OrderFill> {
    if (quantity <= 0) throw new Error("Sell quantity must be positive");
    if (this.config.instrumentType === "SPOT") return this.placeMarketOrder(symbol, "sell", quantity, "base_ccy");
    const rules = await this.getSymbolRules(symbol);
    const contracts = Math.floor((quantity / Math.max(rules.contractValue ?? 1, 1e-12)) / Math.max(rules.quantityStep, 1e-12)) * rules.quantityStep;
    if (contracts < rules.minQuantity) throw new Error(`合约张数不足最小下单量：${contracts} < ${rules.minQuantity}`);
    const fill = await this.placeMarketOrder(symbol, "sell", contracts, "base_ccy");
    return { ...fill, executedQuantity: fill.executedQuantity * Math.max(rules.contractValue ?? 1, 1e-12) };
  }

  public async getOrder(symbol: string, orderId: string): Promise<OrderFill> {
    const response = await this.privateRequest("GET", "/api/v5/trade/order", undefined, { instId: symbol, ordId: orderId });
    const row = this.firstRow(response);
    const quantity = asNumber(row.accFillSz);
    return {
      orderId: String(row.ordId ?? orderId),
      status: String(row.state ?? "unknown").toUpperCase(),
      executedQuantity: quantity,
      averagePrice: asNumber(row.avgPx ?? row.fillPx),
      transactTime: asNumber(row.uTime ?? row.cTime, Date.now()),
    };
  }

  public async loadCandles(symbol: string, interval: string, limit = 500): Promise<Candle[]> {
    const bar = this.config.bar || interval;
    const response = await this.publicRequest("/api/v5/market/candles", { instId: symbol, bar, limit: String(Math.min(limit, 300)) });
    const rows = Array.isArray(response.data) ? response.data as unknown[][] : [];
    const duration = intervalMilliseconds(interval);
    return rows.flatMap((row): Candle[] => {
      if (row.length < 6) return [];
      const timestamp = asNumber(row[0]);
      const closeTime = timestamp + duration - 1;
      if (closeTime >= Date.now()) return [];
      return [{ timestamp, closeTime, open: asNumber(row[1]), high: asNumber(row[2]), low: asNumber(row[3]), close: asNumber(row[4]), volume: asNumber(row[5]) }];
    }).sort((left, right) => left.timestamp - right.timestamp);
  }

  public async subscribeKlines(symbol: string, interval: string, onCandle: (candle: Candle) => void | Promise<void>): Promise<() => Promise<void>> {
    const socket = this.openSocket("public");
    await this.waitForOpen(socket);
    const channel = `candle${this.config.bar || interval}`;
    socket.send(JSON.stringify({ op: "subscribe", args: [{ channel, instId: symbol }] }));
    const listener = (raw: WebSocket.RawData): void => {
      const message = this.parse(raw);
      if (message?.arg && (message.arg as JsonRecord).channel === channel && Array.isArray(message.data)) {
        const row = (message.data as unknown[][])[0];
        if (!row) return;
        const timestamp = asNumber(row[0]);
        const isClosed = String(row[8] ?? "0") === "1";
        void onCandle({ timestamp, isClosed, closeTime: timestamp + intervalMilliseconds(interval) - 1, open: asNumber(row[1]), high: asNumber(row[2]), low: asNumber(row[3]), close: asNumber(row[4]), volume: asNumber(row[5]) });
      }
    };
    socket.on("message", listener);
    return async () => {
      socket.off("message", listener);
      if (socket.readyState === WebSocket.OPEN) socket.close();
    };
  }

  public async subscribeUserData(onEvent: (event: UserDataEvent) => void | Promise<void>): Promise<() => Promise<void>> {
    const socket = this.openSocket("private");
    await this.waitForOpen(socket);
    const timestamp = String(Math.floor(Date.now() / 1000));
    const sign = createHmac("sha256", this.config.apiSecret).update(`${timestamp}GET/users/self/verify`).digest("base64");
    socket.send(JSON.stringify({ op: "login", args: [{ apiKey: this.config.apiKey, passphrase: this.config.passphrase, timestamp, sign }] }));
    await this.waitForMessage(socket, (message) => message.event === "login" && message.code === "0");
    socket.send(JSON.stringify({ op: "subscribe", args: [{ channel: "orders", instType: this.config.instrumentType }, { channel: "account" }] }));
    const listener = (raw: WebSocket.RawData): void => {
      const message = this.parse(raw);
      const arg = message?.arg as JsonRecord | undefined;
      const row = (Array.isArray(message?.data) ? message.data[0] : undefined) as JsonRecord | undefined;
      if (!row || !arg || arg.channel !== "orders") return;
      const event: UserDataEvent = {
        ...(typeof row.instId === "string" ? { symbol: row.instId } : {}),
        ...(typeof row.state === "string" ? { orderStatus: row.state.toUpperCase() } : {}),
        executedQty: asNumber(row.fillSz ?? row.accFillSz),
        price: 0,
      };
      void onEvent(event);
    };
    socket.on("message", listener);
    return async () => {
      socket.off("message", listener);
      if (socket.readyState === WebSocket.OPEN) socket.close();
    };
  }

  private async placeMarketOrder(symbol: string, side: "buy" | "sell", size: number, targetCurrency: "quote_ccy" | "base_ccy"): Promise<OrderFill> {
    const response = await this.privateRequest("POST", "/api/v5/trade/order", {
      instId: symbol, tdMode: this.config.instrumentType === "SWAP" ? "cross" : "cash", side, ordType: "market", sz: String(size), ...(this.config.instrumentType === "SPOT" ? { tgtCcy: targetCurrency } : { posSide: "net" }),
    });
    const row = this.firstRow(response);
    const orderId = String(row.ordId ?? "");
    if (!orderId || String(row.sCode ?? "0") !== "0") throw new Error(`OKX order rejected: ${String(row.sMsg ?? "unknown error")}`);
    let fill = await this.getOrder(symbol, orderId);
    for (let attempt = 0; attempt < 5 && fill.executedQuantity <= 0; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      fill = await this.getOrder(symbol, orderId);
    }
    return fill;
  }

  private openSocket(kind: "public" | "private"): WebSocket {
    const host = this.config.mode === "demo" ? "wspap.okx.com" : "ws.okx.com";
    const socket = new WebSocket(`wss://${host}:8443/ws/v5/${kind}`, this.config.mode === "demo" ? { headers: { "x-simulated-trading": "1" } } : undefined);
    socket.on("error", () => undefined);
    return socket;
  }

  private waitForOpen(socket: WebSocket): Promise<void> {
    if (socket.readyState === WebSocket.OPEN) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const onOpen = (): void => { cleanup(); resolve(); };
      const onError = (error: Error): void => { cleanup(); reject(error); };
      const cleanup = (): void => { socket.off("open", onOpen); socket.off("error", onError); };
      socket.once("open", onOpen);
      socket.once("error", onError);
    });
  }

  private waitForMessage(socket: WebSocket, predicate: (message: JsonRecord) => boolean): Promise<void> {
    return new Promise((resolve, reject) => {
      const onMessage = (raw: WebSocket.RawData): void => {
        const message = this.parse(raw);
        if (message && predicate(message)) { cleanup(); resolve(); }
        else if (message?.event === "error") { cleanup(); reject(new Error(`OKX WebSocket login failed: ${String(message.msg ?? "unknown error")}`)); }
      };
      const onError = (error: Error): void => { cleanup(); reject(error); };
      const cleanup = (): void => { socket.off("message", onMessage); socket.off("error", onError); };
      socket.on("message", onMessage);
      socket.once("error", onError);
    });
  }

  private parse(raw: WebSocket.RawData): JsonRecord | null {
    try {
      const parsed: unknown = JSON.parse(raw.toString());
      return typeof parsed === "object" && parsed !== null ? parsed as JsonRecord : null;
    } catch {
      return null;
    }
  }

  private async publicRequest(endpoint: string, params: Record<string, string>): Promise<JsonRecord> {
    const query = new URLSearchParams(params).toString();
    return this.request(`${endpoint}?${query}`, "GET");
  }

  private async privateRequest(method: "GET" | "POST", endpoint: string, body?: JsonRecord, params?: Record<string, string>): Promise<JsonRecord> {
    const query = params ? `?${new URLSearchParams(params).toString()}` : "";
    const timestamp = new Date().toISOString();
    const bodyText = body ? JSON.stringify(body) : "";
    const sign = createHmac("sha256", this.config.apiSecret).update(`${timestamp}${method}${endpoint}${query}${bodyText}`).digest("base64");
    return this.request(`${endpoint}${query}`, method, bodyText, { "OK-ACCESS-KEY": this.config.apiKey, "OK-ACCESS-SIGN": sign, "OK-ACCESS-TIMESTAMP": timestamp, "OK-ACCESS-PASSPHRASE": this.config.passphrase });
  }

  private async request(endpoint: string, method: "GET" | "POST", body = "", authHeaders: Record<string, string> = {}): Promise<JsonRecord> {
    const headers: Record<string, string> = { "Content-Type": "application/json", ...authHeaders };
    if (this.config.mode === "demo") headers["x-simulated-trading"] = "1";
    let response: Response;
    try {
      response = await fetch(`${this.restBase}${endpoint}`, { method, headers, ...(method === "POST" ? { body } : {}) });
    } catch (error) {
      throw new Error(`OKX 网络请求失败：${this.restBase}${endpoint}；${error instanceof Error ? error.message : String(error)}`);
    }
    if (!response.ok) throw new Error(`OKX HTTP ${response.status}: ${await response.text()}`);
    const data = await response.json() as JsonRecord;
    if (String(data.code ?? "0") !== "0") throw new Error(`OKX API ${String(data.code)}: ${String(data.msg ?? "unknown error")}`);
    const rows = Array.isArray(data.data) ? data.data as JsonRecord[] : [];
    const failed = rows.find((row) => String(row.sCode ?? "0") !== "0");
    if (failed) throw new Error(`OKX operation ${String(failed.sCode)}: ${String(failed.sMsg ?? data.msg ?? "unknown error")}`);
    return data;
  }

  private firstRow(response: JsonRecord): JsonRecord {
    const row = Array.isArray(response.data) ? response.data[0] : undefined;
    return typeof row === "object" && row !== null ? row as JsonRecord : {};
  }
}
