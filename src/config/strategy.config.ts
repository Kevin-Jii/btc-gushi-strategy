export interface StrategyConfig {
  fastMA: number;
  midMA: number;
  slowMA: number;

  volumeMA: number;

  breakoutLookback: number;
  supportLookback: number;

  targetPercent: number;

  stopLossPct: number;

  trailingStopPct: number;

  trailingActivationProfit: number;

  volumeMultiplier: number;

  reclaimBuffer: number;

  pullbackTolerance: number;

  g4BiasThreshold: number;

  g5BiasThreshold: number;

  maFlatTolerance: number;

  cooldownBars: number;
}

export const defaultStrategyConfig: StrategyConfig = {
  fastMA: 20,
  midMA: 60,
  slowMA: 120,

  volumeMA: 20,

  breakoutLookback: 20,
  supportLookback: 20,

  targetPercent: 0.5,

  stopLossPct: 0.08,

  trailingStopPct: 0.08,

  trailingActivationProfit: 0.18,

  volumeMultiplier: 1.1,

  reclaimBuffer: 0.005,

  pullbackTolerance: 0.01,

  g4BiasThreshold: 0.08,

  g5BiasThreshold: 0.12,

  maFlatTolerance: 0.002,

  cooldownBars: 5,
};

/** 创建策略配置，调用方只需要覆盖需要调整的参数。 */
export function createStrategyConfig(
  overrides: Partial<StrategyConfig> = {},
): StrategyConfig {
  return { ...defaultStrategyConfig, ...overrides };
}
