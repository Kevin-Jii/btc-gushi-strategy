/**
 * 策略接口定义
 * 所有策略必须实现此接口
 */

import type {
  StrategyContext,
  StrategySignal,
  StrategyMetadata,
  StrategyEvaluation,
  StrategyConfigContext,
} from "./strategy-types.js";

/**
 * 策略接口
 * 所有交易策略必须实现此接口
 */
export interface Strategy {
  /**
   * 获取策略元信息
   */
  getMetadata(): StrategyMetadata;

  /**
   * 评估策略信号
   * @param context 策略上下文
   * @returns 策略信号
   */
  evaluate(context: StrategyContext): StrategySignal;

  /**
   * 验证配置参数
   * @param config 配置参数
   * @returns 是否有效
   */
  validateConfig?(config: StrategyConfigContext): boolean;

  /**
   * 初始化策略
   * @param config 配置参数
   */
  initialize?(config: StrategyConfigContext): void;

  /**
   * 重置策略状态
   */
  reset?(): void;
}

/**
 * 策略基类
 * 提供通用的默认实现
 */
export abstract class BaseStrategy implements Strategy {
  abstract getMetadata(): StrategyMetadata;

  abstract evaluate(context: StrategyContext): StrategySignal;

  validateConfig(_config: StrategyConfigContext): boolean {
    return true;
  }

  initialize(_config: StrategyConfigContext): void {
    // 默认空实现
  }

  reset(): void {
    // 默认空实现
  }
}

/**
 * 策略评估结果包装器
 * 方便创建标准化的评估结果
 */
export function createStrategyEvaluation(
  strategy: Strategy,
  barIndex: number,
  signal: StrategySignal,
  extra?: {
    trendFilter?: boolean;
    evaluation?: Record<string, unknown>;
    warnings?: string[];
  },
): StrategyEvaluation {
  const metadata = strategy.getMetadata();
  return {
    strategyId: metadata.id,
    strategyVersion: metadata.version,
    timestamp: Date.now(),
    barIndex,
    signal,
    trendFilter: extra?.trendFilter ?? null,
    evaluation: extra?.evaluation ?? null,
    warnings: extra?.warnings ?? null,
  };
}

/**
 * 默认 HOLD 信号
 */
export function createHoldSignal(
  strategyId: string,
  reason: string = "No entry condition met",
): StrategySignal {
  return {
    signalId: null,
    strategyId,
    strategyVersion: null,
    timestamp: Date.now(),
    action: "HOLD",
    strength: 0,
    reason,
    rule: null,
    barIndex: null,
    price: null,
    metadata: null,
  };
}
