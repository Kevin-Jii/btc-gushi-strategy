import { createHmac } from "node:crypto";
import WebSocket from "ws";
import type { Candle } from "../data/types.js";
import type { AccountBalance, BinanceTradingClient, OrderFill, SymbolRules, UserDataEvent } from "./binance-types.js";
import type { OkxConfig } from "./okx-config.js";

type JsonRecord = Record<string, unknown>;
const asNumber = (value: unknown, fallback = 0): number => {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

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
export class OkxClient implements BinanceTradingClient {
  public readonly interval: string;
  private readonly restBase = "https://www.okx.com";
  private readonly baseAssetName: string;

  public constructor(private readonly config: OkxConfig) {
    this.interval = config.interval;
    this.baseAssetName = baseAsset(config.instId, config.quoteAsset);
  }

  public async getSymbolRules(symbol: string): Promise<SymbolRules> {
    const response = await this.publicRequest("/api/v5/public/instruments", { instType: "SPOT", instId: symbol });
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

  public async marketBuy(symbol: string, quoteOrderQty: number): Promise<OrderFill> {
    if (quoteOrderQty <= 0) throw new Error("Buy amount must be positive");
    return this.placeMarketOrder(symbol, "buy", quoteOrderQty, "quote_ccy");
  }

  public async marketSell(symbol: string, quantity: number): Promise<OrderFill> {
    if (quantity <= 0) throw new Error("Sell quantity must be positive");
    return this.placeMarketOrder(symbol, "sell", quantity, "base_ccy");
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
        if (!row || String(row[8] ?? "0") !== "1") return;
        const timestamp = asNumber(row[0]);
        void onCandle({ timestamp, closeTime: timestamp + intervalMilliseconds(interval) - 1, open: asNumber(row[1]), high: asNumber(row[2]), low: asNumber(row[3]), close: asNumber(row[4]), volume: asNumber(row[5]) });
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
    socket.send(JSON.stringify({ op: "subscribe", args: [{ channel: "orders", instType: "SPOT" }, { channel: "account" }] }));
    const listener = (raw: WebSocket.RawData): void => {
      const message = this.parse(raw);
      const arg = message?.arg as JsonRecord | undefined;
      const row = (Array.isArray(message?.data) ? message.data[0] : undefined) as JsonRecord | undefined;
      if (!row || !arg || arg.channel !== "orders") return;
      const event: UserDataEvent = {
        eventType: "executionReport",
        ...(typeof row.instId === "string" ? { symbol: row.instId } : {}),
        ...(typeof row.state === "string" ? { orderStatus: row.state.toUpperCase() } : {}),
        executedQuantity: asNumber(row.fillSz ?? row.accFillSz),
        cumulativeQuantity: asNumber(row.accFillSz),
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
      instId: symbol, tdMode: "cash", side, ordType: "market", sz: String(size), tgtCcy: targetCurrency,
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
    return data;
  }

  private firstRow(response: JsonRecord): JsonRecord {
    const row = Array.isArray(response.data) ? response.data[0] : undefined;
    return typeof row === "object" && row !== null ? row as JsonRecord : {};
  }
}
