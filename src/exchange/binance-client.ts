import {
  Spot,
  SPOT_REST_API_PROD_URL,
  SPOT_REST_API_TESTNET_URL,
  SPOT_WS_API_PROD_URL,
  SPOT_WS_API_TESTNET_URL,
  SPOT_WS_STREAMS_PROD_URL,
  SPOT_WS_STREAMS_TESTNET_URL,
} from "@binance/spot";
import type { SpotRestAPI, SpotWebsocketStreams } from "@binance/spot";
import type { Candle } from "../data/types.js";
import type { BinanceConfig } from "./binance-config.js";
import type {
  AccountBalance,
  BinanceTradingClient,
  OrderFill,
  SymbolRules,
  UserDataEvent,
} from "./binance-types.js";

type JsonRecord = Record<string, unknown>;
const asNumber = (value: unknown, fallback = 0): number => {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

function decimalPlaces(step: number): number {
  const text = String(step);
  const exponent = text.toLowerCase().split("e-")[1];
  if (exponent) return Number(exponent);
  return text.includes(".") ? text.length - text.indexOf(".") - 1 : 0;
}

/** 将 Binance 的字符串过滤器转换成策略层可用的数量/价格约束。 */
function parseRules(symbol: string, raw: JsonRecord): SymbolRules {
  const filters = Array.isArray(raw.filters) ? raw.filters as JsonRecord[] : [];
  const find = (type: string): JsonRecord => filters.find((filter) => filter.filterType === type) ?? {};
  const lot = find("LOT_SIZE");
  const marketLot = find("MARKET_LOT_SIZE");
  const price = find("PRICE_FILTER");
  const notional = find("NOTIONAL");
  const minNotional = find("MIN_NOTIONAL");
  const marketStep = asNumber(marketLot.stepSize);
  const lotStep = asNumber(lot.stepSize);
  const quantityStep = marketStep > 0 ? marketStep : lotStep;
  if (quantityStep <= 0) throw new Error(`No valid LOT_SIZE for ${symbol}`);
  const marketMin = asNumber(marketLot.minQty);
  const lotMin = asNumber(lot.minQty);
  const marketMax = asNumber(marketLot.maxQty);
  const lotMax = asNumber(lot.maxQty, Number.POSITIVE_INFINITY);
  return {
    symbol,
    baseAsset: String(raw.baseAsset ?? ""),
    quoteAsset: String(raw.quoteAsset ?? ""),
    quantityStep,
    minQuantity: marketMin > 0 ? marketMin : lotMin,
    maxQuantity: marketMax > 0 ? marketMax : lotMax,
    priceTick: asNumber(price.tickSize),
    minNotional: asNumber(notional.minNotional ?? minNotional.minNotional),
  };
}

/** Binance Spot REST/WebSocket 的薄适配层，便于用 mock 替换并测试交易逻辑。 */
export class BinanceClient implements BinanceTradingClient {
  private readonly client: Spot;
  public readonly interval: string;

  public constructor(private readonly config: BinanceConfig) {
    this.interval = config.interval;
    const testnet = config.mode === "testnet";
    this.client = new Spot({
      configurationRestAPI: {
        apiKey: config.apiKey,
        apiSecret: config.apiSecret,
        basePath: testnet ? SPOT_REST_API_TESTNET_URL : SPOT_REST_API_PROD_URL,
      },
      // 用户数据流使用 WebSocket API 签名订阅，测试网和真实盘地址必须匹配。
      configurationWebsocketAPI: {
        apiKey: config.apiKey,
        apiSecret: config.apiSecret,
        wsURL: testnet ? SPOT_WS_API_TESTNET_URL : SPOT_WS_API_PROD_URL,
      },
      configurationWebsocketStreams: {
        wsURL: testnet ? SPOT_WS_STREAMS_TESTNET_URL : SPOT_WS_STREAMS_PROD_URL,
      },
    });
  }

  public async getSymbolRules(symbol: string): Promise<SymbolRules> {
    const response = await this.client.restAPI.exchangeInfo({ symbol });
    const data = await response.data() as JsonRecord;
    const item = (Array.isArray(data.symbols) ? data.symbols : []).find(
      (value): value is JsonRecord => typeof value === "object" && value !== null && (value as JsonRecord).symbol === symbol,
    );
    if (!item) throw new Error(`Symbol ${symbol} was not found in exchangeInfo`);
    return parseRules(symbol, item);
  }

  public async getBalances(): Promise<AccountBalance[]> {
    const response = await this.client.restAPI.getAccount({ omitZeroBalances: true });
    const data = await response.data() as JsonRecord;
    return (Array.isArray(data.balances) ? data.balances : []).flatMap((value) => {
      if (typeof value !== "object" || value === null) return [];
      const row = value as JsonRecord;
      return [{ asset: String(row.asset ?? ""), free: asNumber(row.free), locked: asNumber(row.locked) }];
    });
  }

  private async placeMarketOrder(symbol: string, side: "BUY" | "SELL", params: { quantity?: number; quoteOrderQty?: number }): Promise<OrderFill> {
    const response = await this.client.restAPI.newOrder({
      symbol,
      side: side as SpotRestAPI.NewOrderSideEnum,
      type: "MARKET" as SpotRestAPI.NewOrderTypeEnum,
      ...(params.quantity !== undefined ? { quantity: params.quantity } : {}),
      ...(params.quoteOrderQty !== undefined ? { quoteOrderQty: params.quoteOrderQty } : {}),
      newOrderRespType: "FULL" as SpotRestAPI.NewOrderNewOrderRespTypeEnum,
    });
    const data = await response.data() as JsonRecord;
    const executedQuantity = asNumber(data.executedQty ?? data.origQty);
    const quoteQuantity = asNumber(data.cummulativeQuoteQty);
    const fills = Array.isArray(data.fills) ? data.fills as JsonRecord[] : [];
    const filledQty = fills.reduce((sum, fill) => sum + asNumber(fill.qty), 0);
    const filledQuote = fills.reduce((sum, fill) => sum + asNumber(fill.qty) * asNumber(fill.price), 0);
    const quantity = executedQuantity || filledQty;
    return {
      orderId: String(data.orderId ?? ""),
      status: String(data.status ?? "UNKNOWN"),
      executedQuantity: quantity,
      averagePrice: quantity > 0 ? (quoteQuantity || filledQuote) / quantity : 0,
      transactTime: asNumber(data.transactTime, Date.now()),
    };
  }

  public async marketBuy(symbol: string, quoteOrderQty: number): Promise<OrderFill> {
    if (quoteOrderQty <= 0) throw new Error("quoteOrderQty must be positive");
    return this.placeMarketOrder(symbol, "BUY", { quoteOrderQty });
  }

  public async marketSell(symbol: string, quantity: number): Promise<OrderFill> {
    if (quantity <= 0) throw new Error("quantity must be positive");
    return this.placeMarketOrder(symbol, "SELL", { quantity });
  }

  public async getOrder(symbol: string, orderId: string): Promise<OrderFill> {
    const response = await this.client.restAPI.getOrder({ symbol, orderId: Number(orderId) });
    const data = await response.data() as JsonRecord;
    const quantity = asNumber(data.executedQty);
    return {
      orderId: String(data.orderId ?? orderId),
      status: String(data.status ?? "UNKNOWN"),
      executedQuantity: quantity,
      averagePrice: quantity > 0 ? asNumber(data.cummulativeQuoteQty) / quantity : 0,
      transactTime: asNumber(data.updateTime ?? data.time, Date.now()),
    };
  }

  public async loadCandles(symbol: string, interval: string, limit = 500): Promise<Candle[]> {
    const response = await this.client.restAPI.klines({ symbol, interval: interval as SpotRestAPI.KlinesIntervalEnum, limit });
    const rows = await response.data() as unknown[];
    return rows.flatMap((row): Candle[] => {
      if (!Array.isArray(row) || row.length < 6) return [];
      const closeTime = asNumber(row[6]);
      // REST 端点可能返回当前尚未收盘的 K 线；实时策略必须等 x=true。
      if (closeTime > 0 && closeTime >= Date.now()) return [];
      return [{ timestamp: asNumber(row[0]), closeTime, open: asNumber(row[1]), high: asNumber(row[2]), low: asNumber(row[3]), close: asNumber(row[4]), volume: asNumber(row[5]) }];
    });
  }

  public async subscribeKlines(symbol: string, interval: string, onCandle: (candle: Candle) => void | Promise<void>): Promise<() => Promise<void>> {
    // SDK 会自动重连；策略只在 x=true 的收盘事件上执行，避免同一根 K 线重复下单。
    // 在建立连接时直接指定 stream，兼容 Binance 测试网不接受空 streams 参数的行为。
    const streamName = `${symbol.toLowerCase()}@kline_${interval}`;
    const connection = await this.client.websocketStreams.connect({ stream: streamName });
    const stream = connection.kline({ symbol, interval: interval as SpotWebsocketStreams.KlineIntervalEnum });
    stream.on("message", async (message) => {
      const kline = (message as JsonRecord).k as JsonRecord | undefined;
      if (!kline || kline.x !== true) return;
      await onCandle({
        // REST K 线的 timestamp 是开盘时间，实时流必须保持同一语义。
        timestamp: asNumber(kline.t),
        closeTime: asNumber(kline.T),
        open: asNumber(kline.o),
        high: asNumber(kline.h),
        low: asNumber(kline.l),
        close: asNumber(kline.c),
        volume: asNumber(kline.v),
      });
    });
    return async () => { stream.unsubscribe(); await connection.disconnect(); };
  }

  public async subscribeUserData(onEvent: (event: UserDataEvent) => void | Promise<void>): Promise<() => Promise<void>> {
    // WebSocket API 的签名订阅直接使用 HMAC API Key，不再需要维护旧版监听密钥。
    const connection = await this.client.websocketAPI.connect();
    try {
      const { stream } = await connection.userDataStreamSubscribeSignature();
      stream.on("message", async (message) => {
        const data = message as unknown as JsonRecord;
        const event: UserDataEvent = {};
        if (typeof data.e === "string") event.eventType = data.e;
        if (typeof data.s === "string") event.symbol = data.s;
        if (typeof data.X === "string") event.orderStatus = data.X;
        if (data.l !== undefined) event.executedQuantity = asNumber(data.l);
        if (data.z !== undefined) event.cumulativeQuantity = asNumber(data.z);
        await onEvent(event);
      });
      return async () => {
        stream.unsubscribe();
        // 不传 subscriptionId 时取消此连接上的全部用户数据订阅。
        await connection.userDataStreamUnsubscribe().catch(() => undefined);
        await connection.disconnect();
      };
    } catch (error) {
      // 订阅失败时连接尚未交给调用方，必须立即释放，避免重试时连接泄漏。
      await connection.disconnect().catch(() => undefined);
      throw error;
    }
  }
}

/** 按 Binance stepSize 向下取整，避免浮点误差导致 LOT_SIZE 拒单。 */
export function floorToStep(value: number, step: number): number {
  if (value <= 0 || step <= 0) return 0;
  const places = decimalPlaces(step);
  const factor = 10 ** places;
  return Math.floor((value * factor + 1e-9) / (step * factor)) * step;
}
