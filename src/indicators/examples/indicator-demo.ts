/**
 * 指标引擎使用示例
 * 演示如何使用新的指标抽象层
 */

import { IndicatorEngine } from "../core/indicator-engine.js";
import { MACalculator, EMACalculator, BIASCalculator } from "../core/ma-calculator.js";
import { RSICalculator, MACDCalculator, BollingerCalculator } from "../core/rsi-calculator.js";
import { VolumeMACalculator, SupportCalculator, ResistanceCalculator, ATRCalculator } from "../core/volume-calculator.js";
import type { Candle } from "../../data/types.js";
import type { StrategyConfig } from "../../config/strategy.config.js";

// ============ 示例 1：基础指标计算 ============

/**
 * 使用 IndicatorEngine 计算所有指标
 */
export function exampleEngineBasic(): void {
  // 模拟 K 线数据
  const candles: Candle[] = [
    { timestamp: 1000, open: 100, high: 105, low: 98, close: 103, volume: 1000 },
    { timestamp: 2000, open: 103, high: 108, low: 102, close: 106, volume: 1200 },
    { timestamp: 3000, open: 106, high: 110, low: 105, close: 108, volume: 1500 },
    { timestamp: 4000, open: 108, high: 112, low: 107, close: 110, volume: 1800 },
    { timestamp: 5000, open: 110, high: 115, low: 109, close: 113, volume: 2000 },
    // ... 更多 K 线用于预热
  ];

  // 添加更多 K 线确保指标有足够数据
  for (let i = 6; i <= 150; i++) {
    const basePrice = 100 + i * 0.5;
    candles.push({
      timestamp: i * 1000,
      open: basePrice,
      high: basePrice + 5,
      low: basePrice - 5,
      close: basePrice + Math.random() * 2,
      volume: 1000 + Math.random() * 500,
    });
  }

  // 创建指标引擎
  const engine = new IndicatorEngine({
    ma: { periods: [20, 60, 120] },
    rsi: { period: 14 },
    macd: { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 },
    bollinger: { period: 20, stdDev: 2 },
    volume: { period: 20 },
    levels: { lookback: 20 },
    atr: { period: 14 },
  });

  // 计算所有指标
  const results = engine.calculate(candles);

  // 打印结果
  console.log("=== 指标计算结果 ===");
  for (const [name, result] of results) {
    const lastValid = [...result.values].reverse().find((v) => v !== null);
    console.log(`${name}: ${lastValid?.main.toFixed(4) ?? "N/A"}`);
  }

  // 获取指定索引的快照
  const index = 100;
  const snapshot = engine.getSnapshot(candles, index);
  console.log(`\n=== 索引 ${index} 的指标快照 ===`);
  for (const [name, value] of snapshot) {
    console.log(`${name}: ${value?.toFixed(4) ?? "N/A"}`);
  }
}

// ============ 示例 2：单独使用指标计算器 ============

/**
 * 直接使用指标计算器
 */
export function exampleCalculatorDirect(): void {
  const closes = [100, 102, 105, 103, 107, 110, 108, 112, 115, 113, 117, 120];

  // MA 计算器
  const maCalc = new MACalculator();
  const ma20Result = maCalc.calculate({ closes }, { period: 20 });
  console.log("MA20:", ma20Result.values);

  // EMA 计算器
  const emaCalc = new EMACalculator();
  const ema12Result = emaCalc.calculate({ closes }, { period: 12 });
  console.log("EMA12:", ema12Result.values);

  // RSI 计算器
  const rsiCalc = new RSICalculator();
  const rsiResult = rsiCalc.calculate({ closes }, { period: 14 });
  console.log("RSI14:", rsiResult.values);

  // MACD 计算器
  const macdCalc = new MACDCalculator();
  const macdResult = macdCalc.calculate(
    { closes },
    { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 },
  );
  console.log("MACD:", macdResult.values);

  // 布林带计算器
  const bollCalc = new BollingerCalculator();
  const bollResult = bollCalc.calculate({ closes }, { period: 20, stdDev: 2 });
  console.log("BOLL:", bollResult.values);
}

// ============ 示例 3：策略配置集成 ============

/**
 * 从 StrategyConfig 创建指标引擎
 */
export function exampleFromStrategyConfig(): void {
  const strategyConfig: StrategyConfig = {
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

  const engineConfig = IndicatorEngine.fromStrategyConfig(strategyConfig);
  console.log("引擎配置:", engineConfig);

  const engine = new IndicatorEngine(engineConfig);
  console.log("引擎已创建");
}

// ============ 示例 4：自定义指标组合 ============

/**
 * 计算特定指标组合
 */
export function exampleCustomCombo(): void {
  const candles: Candle[] = [];
  const basePrice = 50000;
  for (let i = 0; i < 100; i++) {
    candles.push({
      timestamp: Date.now() - (100 - i) * 86400000,
      open: basePrice + i * 100 + Math.random() * 200,
      high: basePrice + i * 100 + 300 + Math.random() * 200,
      low: basePrice + i * 100 - 200 + Math.random() * 200,
      close: basePrice + i * 100 + 150 + Math.random() * 200,
      volume: 1000 + Math.random() * 500,
    });
  }

  // 只计算 MA 和 RSI
  const engine = new IndicatorEngine({
    ma: { periods: [5, 10, 20, 60] },
    rsi: { period: 7 },
  });

  const results = engine.calculate(candles);
  console.log("计算了以下指标:");
  for (const name of results.keys()) {
    console.log(`  - ${name}`);
  }

  // 获取最后一个有效值
  const lastIndex = candles.length - 1;
  const snapshot = engine.getSnapshot(candles, lastIndex);
  console.log("\n最新指标值:");
  for (const [name, value] of snapshot) {
    if (value !== null) {
      console.log(`  ${name}: ${value.toFixed(2)}`);
    }
  }
}

// ============ 示例 5：多时间周期分析 ============

/**
 * 多时间周期指标对比
 */
export function exampleMultiTimeframe(): void {
  // 模拟 1h 数据
  const hourlyCandles: Candle[] = [];
  for (let i = 0; i < 200; i++) {
    hourlyCandles.push({
      timestamp: Date.now() - (200 - i) * 3600000,
      open: 50000 + i * 10,
      high: 50000 + i * 10 + 50,
      low: 50000 + i * 10 - 50,
      close: 50000 + i * 10 + 20,
      volume: 100,
    });
  }

  // 计算不同周期的 MA
  const engine = new IndicatorEngine({
    ma: { periods: [7, 25, 99] }, // 常用 EMA 周期
  });

  const results = engine.calculate(hourlyCandles);

  // 提取 MA 值
  const ma7 = results.get("MA_7")?.values ?? [];
  const ma25 = results.get("MA_25")?.values ?? [];
  const ma99 = results.get("MA_99")?.values ?? [];

  // 分析趋势
  const lastIndex = ma7.length - 1;
  if (ma7[lastIndex] && ma25[lastIndex] && ma99[lastIndex]) {
    const m7 = ma7[lastIndex]!.main;
    const m25 = ma25[lastIndex]!.main;
    const m99 = ma99[lastIndex]!.main;

    console.log(`MA7: ${m7.toFixed(2)}, MA25: ${m25.toFixed(2)}, MA99: ${m99.toFixed(2)}`);

    if (m7 > m25 && m25 > m99) {
      console.log("趋势: 多头排列 (看涨)");
    } else if (m7 < m25 && m25 < m99) {
      console.log("趋势: 空头排列 (看跌)");
    } else {
      console.log("趋势: 混乱");
    }
  }
}

// 运行所有示例
export function runAllExamples(): void {
  console.log("=== 示例 1: 基础指标计算 ===");
  exampleEngineBasic();

  console.log("\n=== 示例 2: 直接使用计算器 ===");
  exampleCalculatorDirect();

  console.log("\n=== 示例 3: 从策略配置创建 ===");
  exampleFromStrategyConfig();

  console.log("\n=== 示例 4: 自定义指标组合 ===");
  exampleCustomCombo();

  console.log("\n=== 示例 5: 多时间周期分析 ===");
  exampleMultiTimeframe();
}
