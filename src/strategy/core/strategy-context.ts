/**
 * 策略上下文构建器
 * 从原始数据构建标准化的策略上下文
 */

import type { Candle, IndicatorData } from "../../data/types.js";
import type { StrategyConfig } from "../../config/strategy.config.js";
import type {
  StrategyContext,
  CandleContext,
  CandleData,
  IndicatorContext,
  IndicatorValues,
  PositionContext,
  MarketContext,
  StrategyConfigContext,
} from "./strategy-types.js";
import { IndicatorEngine } from "../../indicators/core/indicator-engine.js";
import type { IndicatorResult } from "../../indicators/core/indicator-types.js";

/**
 * 策略上下文构建器选项
 */
export interface ContextBuilderOptions {
  symbol: string;
  timeframe: string;
  market?: "spot" | "futures";
}

/**
 * 策略上下文构建器
 * 将原始 K 线、指标、持仓数据转换为标准化的 StrategyContext
 */
export class StrategyContextBuilder {
  private readonly symbol: string;
  private readonly timeframe: string;
  private readonly market: "spot" | "futures";

  constructor(options: ContextBuilderOptions) {
    this.symbol = options.symbol;
    this.timeframe = options.timeframe;
    this.market = options.market ?? "spot";
  }

  /**
   * 构建策略上下文
   * @param candles K 线数据
   * @param indicators 指标数据
   * @param index 当前评估的 K 线索引
   * @param position 当前持仓
   * @param config 策略配置
   */
  build(
    candles: Candle[],
    indicators: IndicatorData[],
    index: number,
    position: { side: "long"; entryPrice: number; quantity: number; entryTimestamp: number; entryBarIndex: number; peakPrice: number } | null,
    config: StrategyConfig,
  ): StrategyContext | null {
    if (index < 0 || index >= candles.length || index >= indicators.length) {
      return null;
    }

    const candleContext = this.buildCandleContext(candles, index);
    const indicatorContext = this.buildIndicatorContext(indicators, index);
    const positionContext = this.buildPositionContext(position);
    const currentCandle = candles[index];
    const configContext = this.buildConfigContext(config);

    if (!currentCandle) return null;

    const marketContext = this.buildMarketContext(currentCandle);

    return {
      candles: candleContext,
      indicators: indicatorContext,
      position: positionContext,
      market: marketContext,
      config: configContext,
    };
  }

  /**
   * 使用新的指标引擎构建策略上下文
   * @param candles K 线数据
   * @param indicatorResults 指标计算结果 (Map)
   * @param index 当前评估的 K 线索引
   * @param position 当前持仓
   * @param config 策略配置
   */
  buildWithEngine(
    candles: Candle[],
    indicatorResults: Map<string, IndicatorResult>,
    index: number,
    position: PositionContext["current"],
    config: StrategyConfig,
  ): StrategyContext | null {
    if (index < 0 || index >= candles.length) {
      return null;
    }

    const candleContext = this.buildCandleContext(candles, index);
    const indicatorContext = this.buildIndicatorContextFromEngine(indicatorResults, index);
    const positionContext = this.buildPositionContext(position);
    const currentCandle = candles[index];
    const configContext = this.buildConfigContext(config);

    if (!currentCandle) return null;

    const marketContext = this.buildMarketContext(currentCandle);

    return {
      candles: candleContext,
      indicators: indicatorContext,
      position: positionContext,
      market: marketContext,
      config: configContext,
    };
  }

  /**
   * 构建 K 线上下文
   */
  private buildCandleContext(candles: Candle[], index: number): CandleContext {
    const history: CandleData[] = candles.map((c) => ({
      timestamp: c.timestamp,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      volume: c.volume,
    }));

    return {
      current: history[index]!,
      history,
      index,
      timeframe: this.timeframe,
    };
  }

  /**
   * 构建指标上下文
   */
  private buildIndicatorContext(indicators: IndicatorData[], index: number): IndicatorContext {
    const history: IndicatorValues[] = indicators.map((ind) => ({
      ma20: ind.ma20,
      ma60: ind.ma60,
      ma120: ind.ma120,
      volumeMa20: ind.volumeMa20,
      support: ind.support,
      resistance: ind.resistance,
      bias60: ind.bias60,
      volumeConfirm: ind.volumeConfirm,
    }));

    return {
      current: history[index]!,
      history,
    };
  }

  /**
   * 从指标引擎结果构建指标上下文
   */
  private buildIndicatorContextFromEngine(
    results: Map<string, IndicatorResult>,
    index: number,
  ): IndicatorContext {
    const history: IndicatorValues[] = [];
    const length = results.size > 0
      ? Math.max(...[...results.values()].map((r) => r.values.length))
      : 0;

    for (let i = 0; i < length; i++) {
      const getValue = (name: string): number | null => {
        const result = results.get(name);
        if (!result) return null;
        const value = result.values[i];
        return value?.main ?? null;
      };

      const ma20 = getValue("MA_20");
      const ma60 = getValue("MA_60");
      const ma120 = getValue("MA_120");
      const bias60 = getValue("BIAS_60");
      const volumeMa20 = getValue("VolumeMA_20");
      const support = getValue("Support");
      const resistance = getValue("Resistance");

      history.push({
        ma20: ma20 ?? NaN,
        ma60: ma60 ?? NaN,
        ma120: ma120 ?? NaN,
        volumeMa20: volumeMa20 ?? NaN,
        support: support ?? NaN,
        resistance: resistance ?? NaN,
        bias60: bias60 ?? NaN,
        volumeConfirm: false, // 需要额外的成交量确认逻辑
      });
    }

    return {
      current: history[index] ?? {
        ma20: NaN,
        ma60: NaN,
        ma120: NaN,
        volumeMa20: NaN,
        support: NaN,
        resistance: NaN,
        bias60: NaN,
        volumeConfirm: false,
      },
      history,
    };
  }

  /**
   * 构建持仓上下文
   */
  private buildPositionContext(position: PositionContext["current"]): PositionContext {
    return {
      current: position
        ? {
            side: position.side,
            entryPrice: position.entryPrice,
            quantity: position.quantity,
            entryTimestamp: position.entryTimestamp,
            entryBarIndex: position.entryBarIndex,
            peakPrice: position.peakPrice,
          }
        : null,
      history: [],
    };
  }

  /**
   * 构建市场上下文
   */
  private buildMarketContext(candle: Candle): MarketContext {
    return {
      symbol: this.symbol,
      market: this.market,
      lastUpdateTime: candle.timestamp,
    };
  }

  /**
   * 构建配置上下文
   */
  private buildConfigContext(config: StrategyConfig): StrategyConfigContext {
    return {
      fastMA: config.fastMA,
      midMA: config.midMA,
      slowMA: config.slowMA,
      volumeMA: config.volumeMA,
      stopLossPct: config.stopLossPct,
      trailingStopPct: config.trailingStopPct,
      trailingActivationProfit: config.trailingActivationProfit,
    };
  }
}

/**
 * 从现有数据快速构建简化上下文（用于兼容旧代码）
 */
export function buildSimpleContext(
  candle: Candle,
  indicators: IndicatorData,
  config: StrategyConfig,
): StrategyContext {
  const builder = new StrategyContextBuilder({
    symbol: "UNKNOWN",
    timeframe: "1d",
  });

  return builder.build([candle], [indicators], 0, null, config)!;
}
