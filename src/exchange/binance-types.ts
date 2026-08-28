import type { Candle } from "../data/types.js";

export interface SymbolRules {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  quantityStep: number;
  minQuantity: number;
  maxQuantity: number;
  priceTick: number;
  minNotional: number;
}

export interface AccountBalance {
  asset: string;
  free: number;
  locked: number;
}

export interface OrderFill {
  orderId: string;
  status: string;
  executedQuantity: number;
  averagePrice: number;
  transactTime: number;
}

export interface UserDataEvent {
  eventType?: string;
  symbol?: string;
  orderStatus?: string;
  executedQuantity?: number;
  cumulativeQuantity?: number;
}

export interface BinanceMarketData {
  loadCandles(symbol: string, interval: string, limit?: number): Promise<Candle[]>;
  subscribeKlines(
    symbol: string,
    interval: string,
    onCandle: (candle: Candle) => void | Promise<void>,
  ): Promise<() => Promise<void>>;
}

export interface BinanceTradingClient extends BinanceMarketData {
  readonly interval?: string;
  getSymbolRules(symbol: string): Promise<SymbolRules>;
  getBalances(): Promise<AccountBalance[]>;
  marketBuy(symbol: string, quoteOrderQty: number): Promise<OrderFill>;
  marketSell(symbol: string, quantity: number): Promise<OrderFill>;
  getOrder(symbol: string, orderId: string): Promise<OrderFill>;
  subscribeUserData(onEvent: (event: UserDataEvent) => void | Promise<void>): Promise<() => Promise<void>>;
}

/** 各交易所适配器共用的最小交易接口；BinanceTradingClient 保持向后兼容。 */
export type TradingClient = BinanceTradingClient;
