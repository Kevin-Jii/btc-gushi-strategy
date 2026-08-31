import type { Candle, Position } from "../data/types.js";
import type { StrategyEvaluation } from "../strategy/strategy.js";

export type AiDecisionMode = "advisory" | "veto";
export type AiRecommendation = "BUY" | "SELL" | "HOLD";
export type AiRuleStatus = "PASS" | "FAIL" | "UNCERTAIN";

export interface AiValidation {
  generatedAt: number;
  recommendation: AiRecommendation;
  confidence: number;
  ruleStatus: AiRuleStatus;
  summary: string;
  evidence: string[];
  risks: string[];
  invalidation: string;
  /** AI 对手动下单意图的仓位建议；策略审核不提供时为空。 */
  positionSizingApproved: boolean;
  recommendedMargin?: number;
  recommendedContracts?: number;
  recommendedLeverage?: number;
  allowEntry: boolean;
  source: "langchain" | "error";
  model: string;
}

export interface AiTradeIntent {
  side: "BUY" | "SELL";
  leverage: number;
  marginAmount: number;
  availableBalance: number;
  latestPrice: number;
  notionalValue: number;
  contracts?: number;
}

export interface AiTradeOutcomeReview {
  reviewedAt: number;
  outcome: "WIN" | "LOSS" | "BREAKEVEN";
  summary: string;
  whatWorked: string[];
  whatFailed: string[];
  lessons: string[];
  nextChecks: string[];
  confidence: number;
  source: "langchain" | "error";
}

export interface AiReviewInput {
  symbol: string;
  platform: string;
  mode: string;
  candle: Candle;
  recentCandles: Candle[];
  evaluation: StrategyEvaluation;
  position: Position | null;
  tradeIntent?: AiTradeIntent;
  recentOrders?: Array<{
    exchangeOrderId: string;
    side: "BUY" | "SELL";
    quantity: number;
    price: number;
    reason: string;
    timestamp: number;
  }>;
}
