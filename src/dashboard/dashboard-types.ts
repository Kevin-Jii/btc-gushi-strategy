import type { AccountBalance, SpotInstrument } from "../exchange/trading-types.js";
import type { Candle, Position } from "../data/types.js";
import type { LiveTraderAction } from "../live/live-trader.js";
import type { AiDecisionMode, AiTradeOutcomeReview, AiValidation } from "../ai/ai-types.js";

export interface StrategyDashboardSummary {
  id: string;
  name: string;
  version: string;
  category: string;
  status: "running" | "paused" | "stopped";
  profit: number;
  profitPercent: number;
  orderCount: number;
  buySignal: string | null;
  sellSignal: string | null;
}

export interface DashboardOrder {
  id: number;
  exchangeOrderId: string;
  strategyId: string;
  strategyName: string;
  symbol: string;
  side: "BUY" | "SELL";
  quantity: number;
  price: number;
  reason: string;
  timestamp: number;
  realizedProfit?: number;
  realizedProfitPercent?: number;
}

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
  platform: "okx";
  symbol: string;
  interval: string;
  instruments: SpotInstrument[];
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
    support: number | null;
    resistance: number | null;
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
    outcomeReviews: Array<{ strategyId: string; symbol: string; realizedProfit: number; realizedProfitPercent: number; review: AiTradeOutcomeReview }>;
  };
  activity: DashboardActivity[];
  strategies: StrategyDashboardSummary[];
  orders: DashboardOrder[];
  automation: {
    enabled: boolean;
    strategyId: string;
    label: string;
  };
}
