/**
 * 策略插件使用示例
 * 演示如何使用新的 Strategy Interface 和 Registry
 */

import { StrategyRegistry, StrategyContextBuilder } from "../core/index.js";
import { GushiStrategy, createGushiConfig } from "../gushi/index.js";
import type { Strategy, StrategySignal, StrategyMetadata } from "../core/index.js";

// ============ 示例 1：基础使用 ============

/**
 * 使用 Strategy Registry 管理策略
 */
export function exampleWithRegistry(): void {
  // 创建注册中心
  const registry = new StrategyRegistry();

  // 注册葛氏策略
  const gushiStrategy = new GushiStrategy();
  registry.register(gushiStrategy);

  // 或者使用自定义配置
  const gushiWithConfig = new GushiStrategy({
    reclaimBuffer: 0.01,
    g4BiasThreshold: 0.1,
  });
  registry.registerOrReplace(gushiWithConfig);

  // 获取策略
  const strategy = registry.get("gushi-ma");
  if (strategy) {
    console.log("Strategy found:", strategy.getMetadata());
  }

  // 列出所有策略
  const allStrategies = registry.all();
  console.log("Total strategies:", allStrategies.length);

  // 按分类获取
  const trendStrategies = registry.getByCategory("trend");
  console.log("Trend strategies:", trendStrategies.length);
}

// ============ 示例 2：直接使用策略 ============

/**
 * 直接使用策略实例
 */
export function exampleDirectUsage(): void {
  const strategy = new GushiStrategy();

  // 获取策略元信息
  const metadata = strategy.getMetadata();
  console.log("Strategy:", metadata.name, "v" + metadata.version);

  // 策略配置
  const config = strategy.getConfig();
  console.log("Current config:", config);

  // 更新配置
  strategy.updateConfig({
    reclaimBuffer: 0.008,
    g5BiasThreshold: 0.15,
  });
}

// ============ 示例 3：多策略运行 ============

/**
 * 多策略信号评估
 */
export function exampleMultiStrategy(): void {
  const registry = new StrategyRegistry();

  // 注册多个策略（未来可扩展）
  registry.register(new GushiStrategy());

  // 模拟 K 线数据
  const candles = [
    { timestamp: 1000, open: 100, high: 105, low: 99, close: 103, volume: 1000 },
    { timestamp: 2000, open: 103, high: 108, low: 102, close: 106, volume: 1200 },
    { timestamp: 3000, open: 106, high: 110, low: 105, close: 108, volume: 1500 },
    { timestamp: 4000, open: 108, high: 112, low: 107, close: 110, volume: 1800 },
    { timestamp: 5000, open: 110, high: 115, low: 109, close: 113, volume: 2000 },
    { timestamp: 6000, open: 113, high: 118, low: 112, close: 116, volume: 2200 },
    { timestamp: 7000, open: 116, high: 120, low: 115, close: 118, volume: 2500 },
  ];

  // 构建上下文
  const builder = new StrategyContextBuilder({
    symbol: "BTC-USDT",
    timeframe: "1d",
  });

  // 评估所有策略
  const signals: StrategySignal[] = [];
  for (const strategy of registry.all()) {
    // 这里简化演示，实际需要完整的指标数据
    // const context = builder.build(candles, indicators, index, position, config);
    // const signal = strategy.evaluate(context);
    // signals.push(signal);
    console.log("Strategy:", strategy.getMetadata().name);
  }

  // 信号聚合（后续实现）
  return;
}

// ============ 示例 4：创建自定义策略 ============

/**
 * 示例：如何创建新的策略插件
 */
export function exampleCreateCustomStrategy(): void {
  // 创建一个简单的自定义策略示例
  // 这展示了你未来如何添加新策略

  interface SimpleStrategyConfig {
    fastMA: number;
    slowMA: number;
  }

  // 注意：实际使用时需要实现完整的 Strategy 接口
  // 参见 gushi-strategy.ts 作为参考模板

  console.log("To create a new strategy, follow these steps:");
  console.log("1. Create strategy folder in src/strategy/{category}/");
  console.log("2. Implement Strategy interface");
  console.log("3. Define config types");
  console.log("4. Implement evaluate() method");
  console.log("5. Export and register in index.ts");
}

// ============ 示例 5：策略比较 ============

/**
 * 比较不同策略的结果
 */
export function exampleCompareStrategies(): void {
  const registry = new StrategyRegistry();

  // 注册同一策略的不同配置
  const gushiConservative = new GushiStrategy({
    reclaimBuffer: 0.003,
    pullbackTolerance: 0.005,
  });

  const gushiAggressive = new GushiStrategy({
    reclaimBuffer: 0.01,
    pullbackTolerance: 0.02,
  });

  // 添加别名方便区分
  registry.register(gushiConservative);
  registry.register(gushiAggressive);
  registry.addAlias("gushi-conservative", "gushi-ma");

  // 列出所有已注册的策略
  const allMetadata = registry.allMetadata();
  console.log("Registered strategies:");
  for (const meta of allMetadata) {
    console.log(`  - ${meta.id}: ${meta.name}`);
  }
}

// 运行所有示例
export function runAllExamples(): void {
  console.log("=== Example 1: Registry ===");
  exampleWithRegistry();

  console.log("\n=== Example 2: Direct Usage ===");
  exampleDirectUsage();

  console.log("\n=== Example 3: Multi-Strategy ===");
  exampleMultiStrategy();

  console.log("\n=== Example 4: Custom Strategy ===");
  exampleCreateCustomStrategy();

  console.log("\n=== Example 5: Compare ===");
  exampleCompareStrategies();
}
