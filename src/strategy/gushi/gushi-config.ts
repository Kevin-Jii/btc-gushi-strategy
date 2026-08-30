/**
 * 葛氏策略配置
 */

import type { StrategyConfigContext } from "../core/strategy-types.js";

/**
 * 葛氏策略专用配置
 */
export interface GushiStrategyConfig extends StrategyConfigContext {
  /** 重新站上均线需要的缓冲幅度 */
  reclaimBuffer: number;

  /** 回踩均线的容许幅度 */
  pullbackTolerance: number;

  /** G4 超卖 BIAS 阈值 */
  g4BiasThreshold: number;

  /** G5 超涨 BIAS 阈值 */
  g5BiasThreshold: number;

  /** 均线走平判断容差 */
  maFlatTolerance: number;
}

/**
 * 葛氏策略默认配置
 */
export const defaultGushiConfig: GushiStrategyConfig = {
  // 基础 MA 参数
  fastMA: 20,
  midMA: 60,
  slowMA: 120,
  volumeMA: 20,

  // 止损参数
  stopLossPct: 0.08,
  trailingStopPct: 0.08,
  trailingActivationProfit: 0.18,

  // 葛氏策略专用参数
  reclaimBuffer: 0.005,
  pullbackTolerance: 0.01,
  g4BiasThreshold: 0.08,
  g5BiasThreshold: 0.12,
  maFlatTolerance: 0.002,
};

/**
 * 创建葛氏策略配置
 */
export function createGushiConfig(
  overrides: Partial<GushiStrategyConfig> = {},
): GushiStrategyConfig {
  return { ...defaultGushiConfig, ...overrides };
}
