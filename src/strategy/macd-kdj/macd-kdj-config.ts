import type { StrategyConfigContext } from "../core/strategy-types.js";

export interface MacdKdjStrategyConfig extends StrategyConfigContext {
  macdFast: number;
  macdSlow: number;
  macdSignal: number;
  kdjPeriod: number;
  kdjSmooth: number;
  emaPeriod: number;
  volumePeriod: number;
  volumeMultiplier: number;
  atrPeriod: number;
  atrStopMultiplier: number;
  atrTrailingMultiplier: number;
  kdjOversold: number;
  jOversold: number;
  scoreThreshold: number;
}

export const defaultMacdKdjConfig: MacdKdjStrategyConfig = {
  fastMA: 20, midMA: 60, slowMA: 120, volumeMA: 20,
  stopLossPct: 0.08, trailingStopPct: 0.08, trailingActivationProfit: 0.015,
  macdFast: 12, macdSlow: 26, macdSignal: 9, kdjPeriod: 9, kdjSmooth: 3,
  emaPeriod: 20, volumePeriod: 20, volumeMultiplier: 1.2, atrPeriod: 14,
  atrStopMultiplier: 1.5, atrTrailingMultiplier: 1.8, kdjOversold: 35, jOversold: 20,
  scoreThreshold: 3,
};

export function createMacdKdjConfig(overrides: Partial<MacdKdjStrategyConfig> = {}): MacdKdjStrategyConfig {
  return { ...defaultMacdKdjConfig, ...overrides };
}
