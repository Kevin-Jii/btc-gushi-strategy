/**
 * 信号聚合器
 * 将多个策略的信号合并为统一的交易决策
 */

import type { StrategySignal, StrategyAction } from "../strategy/core/strategy-types.js";
import type {
  AggregatedSignal,
  ContributingSignal,
  SignalAggregatorConfig,
} from "./signal-types.js";

/**
 * 策略权重配置
 */
export interface StrategyWeight {
  strategyId: string;
  weight: number;
  enabled?: boolean;
}

/**
 * 信号聚合器
 * 管理多策略信号聚合
 */
export class SignalAggregator {
  private readonly strategyWeights = new Map<string, number>();
  private readonly signalHistory: AggregatedSignal[] = [];
  private config: Required<SignalAggregatorConfig>;

  constructor(config?: Partial<SignalAggregatorConfig>) {
    this.config = {
      combineMode: config?.combineMode ?? "weighted",
      minWeight: config?.minWeight ?? 0.3,
      allowConflictingSignals: config?.allowConflictingSignals ?? false,
      strengthThreshold: config?.strengthThreshold ?? 0,
    };
  }

  /**
   * 设置策略权重
   */
  setStrategyWeight(strategyId: string, weight: number): void {
    if (weight < 0 || weight > 1) {
      throw new Error(`Weight must be between 0 and 1, got ${weight}`);
    }
    this.strategyWeights.set(strategyId, weight);
  }

  /**
   * 批量设置策略权重
   */
  setStrategyWeights(weights: StrategyWeight[]): void {
    for (const { strategyId, weight, enabled } of weights) {
      if (enabled !== false) {
        this.strategyWeights.set(strategyId, weight);
      }
    }
  }

  /**
   * 获取策略权重
   */
  getStrategyWeight(strategyId: string): number {
    return this.strategyWeights.get(strategyId) ?? 1.0;
  }

  /**
   * 聚合多个策略信号
   */
  aggregate(
    signals: StrategySignal[],
    metadata: Map<string, { name: string }>,
    barIndex: number | null = null,
    price: number | null = null,
  ): AggregatedSignal | null {
    if (signals.length === 0) {
      return null;
    }

    // 构建 contributing signals
    const contributing: ContributingSignal[] = signals.map((signal) => {
      const weight = this.getStrategyWeight(signal.strategyId);
      return {
        strategyId: signal.strategyId,
        strategyName: metadata.get(signal.strategyId)?.name ?? signal.strategyId,
        signal,
        weight,
        adopted: false,
      };
    });

    // 根据模式聚合
    let result: AggregatedSignal;

    switch (this.config.combineMode) {
      case "unanimous":
        result = this.aggregateUnanimous(contributing, barIndex, price);
        break;
      case "majority":
        result = this.aggregateMajority(contributing, barIndex, price);
        break;
      case "any":
        result = this.aggregateAny(contributing, barIndex, price);
        break;
      case "weighted":
      default:
        result = this.aggregateWeighted(contributing, barIndex, price);
    }

    // 记录到历史
    this.signalHistory.push(result);

    return result;
  }

  /**
   * 全票通过模式：所有策略必须一致
   */
  private aggregateUnanimous(
    contributing: ContributingSignal[],
    barIndex: number | null,
    price: number | null,
  ): AggregatedSignal {
    const actions = [...new Set(contributing.map((c) => c.signal.action))];
    
    if (actions.length !== 1) {
      return this.createHoldsSignal(contributing, barIndex, price, "Strategies disagree");
    }

    const action = actions[0]!;
    if (action === "HOLD") {
      return this.createHoldsSignal(contributing, barIndex, price, "No actionable signals");
    }

    const adopted = contributing.map((c) => ({ ...c, adopted: true }));
    return this.createAggregatedSignal(action, adopted, barIndex, price);
  }

  /**
   * 多数通过模式：超过半数策略一致
   */
  private aggregateMajority(
    contributing: ContributingSignal[],
    barIndex: number | null,
    price: number | null,
  ): AggregatedSignal {
    const actionCounts = new Map<StrategyAction, number>();
    for (const c of contributing) {
      const count = actionCounts.get(c.signal.action) ?? 0;
      actionCounts.set(c.signal.action, count + 1);
    }

    let maxAction: StrategyAction | null = null;
    let maxCount = 0;
    for (const [action, count] of actionCounts) {
      if (action !== "HOLD" && count > maxCount) {
        maxCount = count;
        maxAction = action;
      }
    }

    if (!maxAction || maxCount <= contributing.length / 2) {
      return this.createHoldsSignal(contributing, barIndex, price, "No majority consensus");
    }

    const adopted = contributing
      .filter((c) => c.signal.action === maxAction)
      .map((c) => ({ ...c, adopted: true }));
    
    return this.createAggregatedSignal(maxAction, adopted, barIndex, price);
  }

  /**
   * 任意模式：任何策略产生信号即采纳
   */
  private aggregateAny(
    contributing: ContributingSignal[],
    barIndex: number | null,
    price: number | null,
  ): AggregatedSignal {
    const buySignals = contributing.filter((c) => c.signal.action === "BUY");
    const sellSignals = contributing.filter((c) => c.signal.action === "SELL");

    // 检查冲突
    if (!this.config.allowConflictingSignals && buySignals.length > 0 && sellSignals.length > 0) {
      return this.createHoldsSignal(contributing, barIndex, price, "Conflicting signals");
    }

    // 优先 BUY，然后 SELL
    if (buySignals.length > 0) {
      const adopted = buySignals.map((c) => ({ ...c, adopted: true }));
      return this.createAggregatedSignal("BUY", adopted, barIndex, price);
    }

    if (sellSignals.length > 0) {
      const adopted = sellSignals.map((c) => ({ ...c, adopted: true }));
      return this.createAggregatedSignal("SELL", adopted, barIndex, price);
    }

    return this.createHoldsSignal(contributing, barIndex, price, "No actionable signals");
  }

  /**
   * 加权平均模式：根据权重计算综合信号
   */
  private aggregateWeighted(
    contributing: ContributingSignal[],
    barIndex: number | null,
    price: number | null,
  ): AggregatedSignal {
    let buyWeight = 0;
    let sellWeight = 0;
    let buyStrength = 0;
    let sellStrength = 0;

    for (const c of contributing) {
      const effectiveWeight = c.weight;
      if (c.signal.action === "BUY") {
        buyWeight += effectiveWeight;
        buyStrength += c.signal.strength * effectiveWeight;
      } else if (c.signal.action === "SELL") {
        sellWeight += effectiveWeight;
        sellStrength += c.signal.strength * effectiveWeight;
      }
    }

    // 检查冲突
    if (!this.config.allowConflictingSignals && buyWeight > 0 && sellWeight > 0) {
      return this.createHoldsSignal(contributing, barIndex, price, "Conflicting signals");
    }

    // 根据权重决定动作
    const totalWeight = buyWeight + sellWeight;
    if (totalWeight < this.config.minWeight) {
      return this.createHoldsSignal(contributing, barIndex, price, "Below minimum weight threshold");
    }

    let action: StrategyAction;
    let adopted: ContributingSignal[];

    if (buyWeight > sellWeight) {
      action = "BUY";
      adopted = contributing
        .filter((c) => c.signal.action === "BUY")
        .map((c) => ({ ...c, adopted: true }));
    } else if (sellWeight > buyWeight) {
      action = "SELL";
      adopted = contributing
        .filter((c) => c.signal.action === "SELL")
        .map((c) => ({ ...c, adopted: true }));
    } else {
      return this.createHoldsSignal(contributing, barIndex, price, "Equal weights, no decision");
    }

    return this.createAggregatedSignal(action, adopted, barIndex, price);
  }

  /**
   * 创建聚合信号
   */
  private createAggregatedSignal(
    action: StrategyAction,
    contributing: ContributingSignal[],
    barIndex: number | null,
    price: number | null,
  ): AggregatedSignal {
    const totalWeight = contributing.reduce((sum, c) => sum + c.weight, 0);
    const avgStrength = contributing.reduce((sum, c) => sum + c.signal.strength * c.weight, 0) / totalWeight;
    
    const reasons = contributing.map((c) => `${c.strategyName}: ${c.signal.rule ?? c.signal.action}`);

    return {
      signalId: `agg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: Date.now(),
      action,
      aggregatedStrength: avgStrength,
      contributingSignals: contributing,
      reason: reasons.join("; "),
      barIndex,
      price,
      confidence: contributing.length / (this.strategyWeights.size || 1),
    };
  }

  /**
   * 创建 HOLD 信号
   */
  private createHoldsSignal(
    contributing: ContributingSignal[],
    barIndex: number | null,
    price: number | null,
    reason: string,
  ): AggregatedSignal {
    return {
      signalId: `agg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      timestamp: Date.now(),
      action: "HOLD",
      aggregatedStrength: 0,
      contributingSignals: contributing.map((c) => ({ ...c, adopted: false })),
      reason,
      barIndex,
      price,
      confidence: 0,
    };
  }

  /**
   * 获取信号历史
   */
  getHistory(): AggregatedSignal[] {
    return [...this.signalHistory];
  }

  /**
   * 获取最近的信号
   */
  getRecentSignals(count: number = 10): AggregatedSignal[] {
    return this.signalHistory.slice(-count);
  }

  /**
   * 清空历史
   */
  clearHistory(): void {
    this.signalHistory.length = 0;
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<SignalAggregatorConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 获取当前配置
   */
  getConfig(): SignalAggregatorConfig {
    return { ...this.config };
  }
}
