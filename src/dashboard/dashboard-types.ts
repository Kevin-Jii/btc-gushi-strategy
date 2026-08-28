import type { AccountBalance } from "../exchange/binance-types.js";
import type { Candle, Position } from "../data/types.js";
import type { LiveTraderAction } from "../live/live-trader.js";
import type { AiDecisionMode, AiValidation } from "../ai/ai-types.js";

export interface DashboardActivity {
  id: number;
  at: number;
  type: "order" | "balance" | "system" | "ai";
  title: string;
  detail: string;
  side?: "BUY" | "SELL";
}

export interface DashboardState {
  updatedAt: number;
  mode: "testnet" | "demo" | "live";
  platform: "binance" | "okx";
  symbol: string;
  interval: string;
  connection: {
    market: boolean;
    userData: boolean;
    lastAccountUpdate: number;
    error: string | null;
  };
  market: {
    latestPrice: number;
    latestCandle: Candle | null;
    recentCandles: Candle[];
    candleCount: number;
    lastCandleTimestamp: number;
  };
  strategy: {
    buy: string | null;
    sell: string | null;
    trendFilter: boolean | null;
    entrySignal: boolean | null;
  };
  account: {
    balances: AccountBalance[];
    quoteAsset: string;
    quoteFree: number;
    quoteLocked: number;
    baseAsset: string;
    baseFree: number;
    baseLocked: number;
    estimatedEquity: number;
  };
  position: Position | null;
  lastAction: LiveTraderAction | null;
  ai: {
    enabled: boolean;
    decisionMode: AiDecisionMode;
    model: string;
    latest: AiValidation | null;
    history: AiValidation[];
  };
  activity: DashboardActivity[];
}
