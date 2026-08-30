/**
 * 指标引擎
 * 统一管理所有指标的计算和访问
 */

import type { Candle } from "../../data/types.js";
import type { StrategyConfig } from "../../config/strategy.config.js";
import type { IndicatorInput, IndicatorResult } from "./indicator-types.js";
import { MACalculator, EMACalculator, BIASCalculator } from "./ma-calculator.js";
import { RSICalculator, MACDCalculator, BollingerCalculator } from "./rsi-calculator.js";
import { VolumeMACalculator, SupportCalculator, ResistanceCalculator, ATRCalculator } from "./volume-calculator.js";

/**
 * 指标引擎配置
 */
export interface IndicatorEngineConfig {
  /** MA 计算器配置 */
  ma?: {
    periods?: number[];
  };

  /** RSI 配置 */
  rsi?: {
    period?: number;
  };

  /** MACD 配置 */
  macd?: {
    fastPeriod?: number;
    slowPeriod?: number;
    signalPeriod?: number;
  };

  /** 布林带配置 */
  bollinger?: {
    period?: number;
    stdDev?: number;
  };

  /** 成交量配置 */
  volume?: {
    period?: number;
  };

  /** 支撑阻力位配置 */
  levels?: {
    lookback?: number;
  };

  /** ATR 配置 */
  atr?: {
    period?: number;
  };
}

/**
 * 指标引擎
 * 一次性计算所有需要的指标
 */
export class IndicatorEngine {
  // 指标计算器实例
  private readonly ma = new MACalculator();
  private readonly ema = new EMACalculator();
  private readonly bias = new BIASCalculator();
  private readonly rsi = new RSICalculator();
  private readonly macd = new MACDCalculator();
  private readonly bollinger = new BollingerCalculator();
  private readonly volumeMA = new VolumeMACalculator();
  private readonly support = new SupportCalculator();
  private readonly resistance = new ResistanceCalculator();
  private readonly atr = new ATRCalculator();

  private config: IndicatorEngineConfig;

  constructor(config: IndicatorEngineConfig = {}) {
    this.config = config;
  }

  /**
   * 从 K 线数据构建指标输入
   */
  static buildInput(candles: Candle[]): IndicatorInput {
    return {
      closes: candles.map((c) => c.close),
      opens: candles.map((c) => c.open),
      highs: candles.map((c) => c.high),
      lows: candles.map((c) => c.low),
      volumes: candles.map((c) => c.volume),
    };
  }

  /**
   * 计算所有指标
   */
  calculate(candles: Candle[]): Map<string, IndicatorResult> {
    const input = IndicatorEngine.buildInput(candles);
    const results = new Map<string, IndicatorResult>();

    // 提取配置
    const { ma, rsi, macd, bollinger, volume, levels, atr } = this.config;

    // MA 指标
    const maPeriods = ma?.periods ?? [20, 60, 120];
    for (const period of maPeriods) {
      const result = this.ma.calculate(input, { period });
      results.set(`MA_${period}`, result);
    }

    // EMA 指标
    const emaPeriods = [12, 26];
    for (const period of emaPeriods) {
      const result = this.ema.calculate(input, { period });
      results.set(`EMA_${period}`, result);
    }

    // BIAS 指标
    const biasPeriod = maPeriods.includes(60) ? 60 : 60;
    const biasResult = this.bias.calculate(input, { period: biasPeriod });
    results.set(`BIAS_${biasPeriod}`, biasResult);

    // RSI 指标
    const rsiPeriod = rsi?.period ?? 14;
    const rsiResult = this.rsi.calculate(input, { period: rsiPeriod });
    results.set(`RSI_${rsiPeriod}`, rsiResult);

    // MACD 指标
    const macdConfig = macd ?? {};
    const macdResult = this.macd.calculate(input, {
      fastPeriod: macdConfig.fastPeriod ?? 12,
      slowPeriod: macdConfig.slowPeriod ?? 26,
      signalPeriod: macdConfig.signalPeriod ?? 9,
    });
    results.set("MACD", macdResult);

    // 布林带指标
    const bollConfig = bollinger ?? {};
    const bollResult = this.bollinger.calculate(input, {
      period: bollConfig.period ?? 20,
      stdDev: bollConfig.stdDev ?? 2,
    });
    results.set("BOLL", bollResult);

    // 成交量 MA
    const volPeriod = volume?.period ?? 20;
    const volResult = this.volumeMA.calculate(input, { period: volPeriod });
    results.set(`VolumeMA_${volPeriod}`, volResult);

    // 支撑位
    const levelLookback = levels?.lookback ?? 20;
    const supportResult = this.support.calculate(input, { lookback: levelLookback });
    results.set("Support", supportResult);

    // 阻力位
    const resistanceResult = this.resistance.calculate(input, { lookback: levelLookback });
    results.set("Resistance", resistanceResult);

    // ATR
    const atrPeriod = atr?.period ?? 14;
    const atrResult = this.atr.calculate(input, { period: atrPeriod });
    results.set(`ATR_${atrPeriod}`, atrResult);

    return results;
  }

  /**
   * 计算单个指标
   */
  calculateOne(
    candles: Candle[],
    name: string,
    params: Record<string, number>,
  ): IndicatorResult | null {
    const input = IndicatorEngine.buildInput(candles);

    switch (name) {
      case "MA":
        return this.ma.calculate(input, params);
      case "EMA":
        return this.ema.calculate(input, params);
      case "BIAS":
        return this.bias.calculate(input, params);
      case "RSI":
        return this.rsi.calculate(input, params);
      case "MACD":
        return this.macd.calculate(input, params);
      case "BOLL":
        return this.bollinger.calculate(input, params);
      case "VolumeMA":
        return this.volumeMA.calculate(input, params);
      case "Support":
        return this.support.calculate(input, params);
      case "Resistance":
        return this.resistance.calculate(input, params);
      case "ATR":
        return this.atr.calculate(input, params);
      default:
        return null;
    }
  }

  /**
   * 获取指定 K 线索引的所有指标值
   */
  getSnapshot(candles: Candle[], index: number): Map<string, number | null> {
    const results = this.calculate(candles);
    const snapshot = new Map<string, number | null>();

    for (const [name, result] of results) {
      const value = result.values[index];
      snapshot.set(name, value?.main ?? null);
    }

    return snapshot;
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<IndicatorEngineConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 从 StrategyConfig 创配置
   */
  static fromStrategyConfig(config: StrategyConfig): IndicatorEngineConfig {
    return {
      ma: {
        periods: [config.fastMA, config.midMA, config.slowMA],
      },
      volume: {
        period: config.volumeMA,
      },
      levels: {
        lookback: config.supportLookback,
      },
    };
  }
}

/**
 * 全局指标引擎实例
 */
export const globalIndicatorEngine = new IndicatorEngine();
