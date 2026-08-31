import type { AiReviewInput, AiTradeOutcomeReview, AiValidation } from "../ai/ai-types.js";

export interface PersistedOrder {
  exchangeOrderId: string;
  strategyId: string;
  strategyName: string;
  strategyVersion: string;
  platform: string;
  mode: string;
  symbol: string;
  interval: string;
  side: "BUY" | "SELL";
  quantity: number;
  price: number;
  reason: string;
  executedAt: number;
  entryOrderId?: string;
  realizedProfit?: number;
  realizedProfitPercent?: number;
}

export interface PersistedAiReview {
  strategyId: string;
  strategyName: string;
  strategyVersion: string;
  interval: string;
  input: AiReviewInput;
  result: AiValidation;
}

export interface StrategyMonitorSnapshot {
  strategyId: string;
  symbol: string;
  interval: string;
  timestamp: number;
  equity: number;
  unrealizedProfit: number;
  positionQuantity: number;
  entryPrice: number;
  markPrice: number;
  terminationCondition: string;
  signal: string;
}

export interface StrategyPerformance {
  strategyId: string;
  realizedProfit: number;
  realizedProfitPercent: number;
  completedTrades: number;
}

export interface PersistedTradeOutcomeReview {
  id: number;
  strategyId: string;
  symbol: string;
  interval: string;
  entryOrderId: string;
  exitOrderId: string;
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  realizedProfit: number;
  realizedProfitPercent: number;
  review: AiTradeOutcomeReview;
}

export interface PersistedAiReviewRecord extends PersistedAiReview {
  id: number;
  platform: string;
  mode: string;
  symbol: string;
  generatedAt: number;
}

export interface OrderQuery {
  limit?: number;
  strategyId?: string;
  symbol?: string;
  side?: "BUY" | "SELL";
}

export interface AiReviewQuery {
  limit?: number;
  strategyId?: string;
  symbol?: string;
}

export interface TradingPersistence {
  initialize(): Promise<void>;
  saveOrder(order: PersistedOrder): Promise<void>;
  saveAiReview(review: PersistedAiReview): Promise<void>;
  saveMonitorSnapshot(snapshot: StrategyMonitorSnapshot): Promise<void>;
  saveTradeOutcomeReview(review: PersistedTradeOutcomeReview): Promise<void>;
  loadTradeOutcomeReviews(limit?: number, strategyId?: string): Promise<PersistedTradeOutcomeReview[]>;
  loadRecentOrders(limit?: number): Promise<PersistedOrder[]>;
  loadOrders(query?: OrderQuery): Promise<PersistedOrder[]>;
  loadAiReviews(query?: AiReviewQuery): Promise<PersistedAiReviewRecord[]>;
  loadStrategyPerformance(strategyId?: string): Promise<StrategyPerformance[]>;
  close(): Promise<void>;
}
