/**
 * 信号聚合与执行示例
 * 演示如何使用 SignalAggregator 和 ExecutionEngine
 */

import { SignalAggregator } from "../signal-aggregator.js";
import type { StrategySignal } from "../../strategy/core/strategy-types.js";
import { ExecutionEngine, type ExecutionEngineConfig } from "../../execution/execution-engine.js";
import { GushiStrategy } from "../../strategy/gushi/index.js";

// ============ 示例 1：信号聚合 ============

/**
 * 多策略信号聚合示例
 */
export function exampleSignalAggregation(): void {
  // 创建信号聚合器
  const aggregator = new SignalAggregator({
    combineMode: "weighted",
    minWeight: 0.3,
    allowConflictingSignals: false,
  });

  // 设置策略权重
  aggregator.setStrategyWeight("gushi-ma", 1.0);
  aggregator.setStrategyWeight("ma-trend", 0.8);
  aggregator.setStrategyWeight("rsi-strategy", 0.5);

  // 模拟策略信号
  const signals: StrategySignal[] = [
    {
      signalId: "sig-1",
      strategyId: "gushi-ma",
      strategyVersion: "1.0.0",
      timestamp: Date.now(),
      action: "BUY",
      strength: 0.85,
      reason: "G2 pullback hold",
      rule: "G2",
      barIndex: 100,
      price: 50000,
      metadata: { trendFilter: true },
    },
    {
      signalId: "sig-2",
      strategyId: "ma-trend",
      strategyVersion: "1.0.0",
      timestamp: Date.now(),
      action: "BUY",
      strength: 0.7,
      reason: "MA20 > MA60 golden cross",
      rule: "MA_GOLDEN_CROSS",
      barIndex: 100,
      price: 50000,
      metadata: null,
    },
    {
      signalId: "sig-3",
      strategyId: "rsi-strategy",
      strategyVersion: "1.0.0",
      timestamp: Date.now(),
      action: "HOLD",
      strength: 0,
      reason: "RSI not oversold",
      rule: null,
      barIndex: 100,
      price: 50000,
      metadata: null,
    },
  ];

  // 策略元信息
  const metadata = new Map<string, { name: string }>();
  metadata.set("gushi-ma", { name: "葛氏策略" });
  metadata.set("ma-trend", { name: "MA 趋势策略" });
  metadata.set("rsi-strategy", { name: "RSI 策略" });

  // 聚合信号
  const aggregated = aggregator.aggregate(signals, metadata, 100, 50000);

  if (aggregated) {
    console.log("=== 聚合结果 ===");
    console.log(`动作: ${aggregated.action}`);
    console.log(`强度: ${aggregated.aggregatedStrength.toFixed(2)}`);
    console.log(`原因: ${aggregated.reason}`);
    console.log(`置信度: ${(aggregated.confidence * 100).toFixed(1)}%`);
    console.log(`参与策略: ${aggregated.contributingSignals.length}`);
  }

  // 尝试不同模式的聚合
  console.log("\n=== 不同聚合模式 ===");

  // 全票通过模式
  const unanimousAggregator = new SignalAggregator({ combineMode: "unanimous" });
  const unanimousResult = unanimousAggregator.aggregate(signals, metadata, 100, 50000);
  console.log(`Unanimous: ${unanimousResult?.action ?? "N/A"} - ${unanimousResult?.reason ?? ""}`);

  // 多数通过模式
  const majorityAggregator = new SignalAggregator({ combineMode: "majority" });
  const majorityResult = majorityAggregator.aggregate(signals, metadata, 100, 50000);
  console.log(`Majority: ${majorityResult?.action ?? "N/A"} - ${majorityResult?.reason ?? ""}`);
}

// ============ 示例 2：冲突信号处理 ============

/**
 * 冲突信号处理示例
 */
export function exampleConflictingSignals(): void {
  const aggregator = new SignalAggregator({
    combineMode: "weighted",
    allowConflictingSignals: false,
  });

  // 模拟冲突信号
  const signals: StrategySignal[] = [
    {
      signalId: "sig-buy",
      strategyId: "strategy-a",
      strategyVersion: "1.0.0",
      timestamp: Date.now(),
      action: "BUY",
      strength: 0.9,
      reason: "Bullish signal",
      rule: "RULE_BUY",
      barIndex: 50,
      price: 100,
      metadata: null,
    },
    {
      signalId: "sig-sell",
      strategyId: "strategy-b",
      strategyVersion: "1.0.0",
      timestamp: Date.now(),
      action: "SELL",
      strength: 0.8,
      reason: "Bearish signal",
      rule: "RULE_SELL",
      barIndex: 50,
      price: 100,
      metadata: null,
    },
  ];

  const metadata = new Map<string, { name: string }>();
  metadata.set("strategy-a", { name: "策略 A" });
  metadata.set("strategy-b", { name: "策略 B" });

  // 不允许冲突 - 应该返回 HOLD
  const result = aggregator.aggregate(signals, metadata, 50, 100);
  console.log("不允许冲突:", result?.action, "-", result?.reason);

  // 允许冲突 - 应该返回 BUY（因为权重相同但 BUY 先检查）
  const allowConflictsAggregator = new SignalAggregator({
    combineMode: "weighted",
    allowConflictingSignals: true,
  });
  const allowResult = allowConflictsAggregator.aggregate(signals, metadata, 50, 100);
  console.log("允许冲突:", allowResult?.action, "-", allowResult?.reason);
}

// ============ 示例 3：信号历史 ============

/**
 * 信号历史追踪示例
 */
export function exampleSignalHistory(): void {
  const aggregator = new SignalAggregator();

  const actions: Array<"BUY" | "SELL" | "HOLD"> = ["BUY", "HOLD", "SELL", "HOLD", "BUY", "BUY"];
  const metadata = new Map<string, { name: string }>();
  metadata.set("test-strategy", { name: "测试策略" });

  for (let i = 0; i < actions.length; i++) {
    const signal: StrategySignal = {
      signalId: `sig-${i}`,
      strategyId: "test-strategy",
      strategyVersion: "1.0.0",
      timestamp: Date.now() + i * 1000,
      action: actions[i]!,
      strength: actions[i] === "HOLD" ? 0 : 0.8,
      reason: `Test signal ${i}`,
      rule: null,
      barIndex: i,
      price: 100 + i,
      metadata: null,
    };

    aggregator.aggregate([signal], metadata, i, 100 + i);
  }

  console.log("=== 信号历史 ===");
  console.log("总信号数:", aggregator.getHistory().length);
  console.log("最近 3 个信号:");
  for (const sig of aggregator.getRecentSignals(3)) {
    console.log(`  ${sig.action} @ ${sig.price} - ${sig.reason}`);
  }

  // 清空历史
  aggregator.clearHistory();
  console.log("清空后信号数:", aggregator.getHistory().length);
}

// ============ 示例 4：权重调整 ============

/**
 * 动态调整策略权重示例
 */
export function exampleWeightAdjustment(): void {
  const aggregator = new SignalAggregator({ combineMode: "weighted" });

  // 初始权重
  aggregator.setStrategyWeight("strategy-a", 1.0);
  aggregator.setStrategyWeight("strategy-b", 0.5);
  aggregator.setStrategyWeight("strategy-c", 0.3);

  console.log("初始权重:");
  console.log("  strategy-a:", aggregator.getStrategyWeight("strategy-a"));
  console.log("  strategy-b:", aggregator.getStrategyWeight("strategy-b"));
  console.log("  strategy-c:", aggregator.getStrategyWeight("strategy-c"));

  // 批量设置权重
  aggregator.setStrategyWeights([
    { strategyId: "strategy-a", weight: 0.8 },
    { strategyId: "strategy-b", weight: 1.0 },
    { strategyId: "strategy-c", weight: 0.2 },
  ]);

  console.log("\n调整后权重:");
  console.log("  strategy-a:", aggregator.getStrategyWeight("strategy-a"));
  console.log("  strategy-b:", aggregator.getStrategyWeight("strategy-b"));
  console.log("  strategy-c:", aggregator.getStrategyWeight("strategy-c"));
}

// 运行所有示例
export function runAllExamples(): void {
  console.log("=== 示例 1: 信号聚合 ===");
  exampleSignalAggregation();

  console.log("\n=== 示例 2: 冲突信号 ===");
  exampleConflictingSignals();

  console.log("\n=== 示例 3: 信号历史 ===");
  exampleSignalHistory();

  console.log("\n=== 示例 4: 权重调整 ===");
  exampleWeightAdjustment();
}
