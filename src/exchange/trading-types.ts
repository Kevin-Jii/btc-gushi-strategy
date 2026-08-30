/**
 * 交易客户端类型定义
 * 统一交易所适配层的接口
 */

/** 账户余额 */
export interface AccountBalance {
  asset: string;
  free: number;
  locked: number;
}

/** 订单成交结果 */
export interface OrderFill {
  orderId: string;
  status: string;
  executedQuantity: number;
  averagePrice: number;
  transactTime: number;
}

/** OKX 可交易现货交易对 */
export interface SpotInstrument {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  state: string;
  tickSize: number;
  quantityStep: number;
  minQuantity: number;
  minNotional: number;
  contractValue?: number;
}

/** 交易对规则 */
export interface SymbolRules {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  quantityStep: number;
  minQuantity: number;
  maxQuantity: number;
  priceTick: number;
  minNotional: number;
  contractValue?: number;
}

/** 用户数据事件 */
export interface UserDataEvent {
  symbol?: string;
  orderStatus?: string;
  side?: string;
  orderId?: string;
  executedQty: number;
  price: number;
}

/** 交易客户端接口 */
export interface TradingClient {
  /** 当前 K 线间隔 */
  interval?: string;

  /** 切换 K 线间隔 */
  setInterval?(interval: string): void;

  /** 获取交易对规则 */
  getSymbolRules(symbol: string): Promise<SymbolRules>;

  /** 获取可交易的现货交易对 */
  getSpotInstruments(quoteAsset?: string): Promise<SpotInstrument[]>;

  /** 获取账户余额 */
  getBalances(): Promise<AccountBalance[]>;

  /** 市价买入（使用报价货币数量） */
  marketBuy(symbol: string, quoteOrderQty: number): Promise<OrderFill>;

  /** 市价卖出（使用基础货币数量） */
  marketSell(symbol: string, quantity: number): Promise<OrderFill>;

  /** 获取订单详情 */
  getOrder(symbol: string, orderId: string): Promise<OrderFill>;

  /** 获取交易对最新成交价，用于 Dashboard 实时行情展示。 */
  getLatestPrice(symbol: string): Promise<number>;

  /** 加载历史 K 线 */
  loadCandles(symbol: string, interval: string, limit?: number): Promise<import("../data/types.js").Candle[]>;

  /** 订阅 K 线数据流 */
  subscribeKlines(symbol: string, interval: string, callback: (candle: import("../data/types.js").Candle) => void | Promise<void>): Promise<() => Promise<void>>;

  /** 订阅用户数据流 */
  subscribeUserData(callback: (event: UserDataEvent) => void | Promise<void>): Promise<() => Promise<void>>;
}
