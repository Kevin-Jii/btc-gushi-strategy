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
  allowEntry: boolean;
  source: "langchain" | "error";
  model: string;
}

export interface AiReviewInput {
  symbol: string;
  platform: string;
  mode: string;
  candle: Candle;
  recentCandles: Candle[];
  evaluation: StrategyEvaluation;
  position: Position | null;
}
