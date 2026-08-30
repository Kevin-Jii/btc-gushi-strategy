/**
 * 信号聚合核心类型定义
 */

import type { StrategySignal, StrategyAction } from "../strategy/core/strategy-types.js";

/**
 * 信号聚合配置
 */
export interface SignalAggregatorConfig {
  /** 多策略信号合并方式 */
  combineMode: "unanimous" | "majority" | "weighted" | "any";

  /** 最低通过权重（weighted 模式） */
  minWeight?: number;

  /** 允许不同策略同时发出相反信号 */
  allowConflictingSignals?: boolean;

  /** 信号强度阈值 */
  strengthThreshold?: number;
}

/**
 * 聚合后的信号
 */
export interface AggregatedSignal {
  /** 信号 ID */
  signalId: string;

  /** 聚合时间戳 */
  timestamp: number;

  /** 最终动作 */
  action: StrategyAction;

  /** 聚合强度 0-1 */
  aggregatedStrength: number;

  /** 参与聚合的信号列表 */
  contributingSignals: ContributingSignal[];

  /** 决策原因 */
  reason: string;

  /** K 线索引 */
  barIndex: number | null;

  /** 价格信息 */
  price: number | null;

  /** 置信度 */
  confidence: number;
}

/**
 * 参与聚合的信号
 */
export interface ContributingSignal {
  /** 策略 ID */
  strategyId: string;

  /** 策略名称 */
  strategyName: string;

  /** 原始信号 */
  signal: StrategySignal;

  /** 策略权重 */
  weight: number;

  /** 是否被采纳 */
  adopted: boolean;
}

/**
 * 信号过滤器
 */
export interface SignalFilter {
  /** 过滤条件类型 */
  type: "min-strength" | "max-filters" | "time-range" | "custom";

  /** 阈值或配置 */
  value: unknown;

  /** 描述 */
  description: string;
}

/**
 * 信号历史记录
 */
export interface SignalHistory {
  /** 信号列表 */
  signals: AggregatedSignal[];

  /** 添加信号 */
  add(signal: AggregatedSignal): void;

  /** 获取最近的信号 */
  getRecent(count: number): AggregatedSignal[];

  /** 获取指定时间范围的信号 */
  getInRange(startTime: number, endTime: number): AggregatedSignal[];

  /** 清空历史 */
  clear(): void;
}
