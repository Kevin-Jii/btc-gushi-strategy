import type { StrategyConfig } from "../config/strategy.config.js";
import { defaultStrategyConfig } from "../config/strategy.config.js";
import { calculateIndicators } from "../data/market-data.js";
import type { Candle, IndicatorData, StrategySignal } from "../data/types.js";
import {
  checkG1,
  checkG2,
  checkG3,
  checkG4,
  checkG5,
  checkG6,
  checkG7,
  checkG8,
  type GushiContext,
} from "./gushi.js";

export interface StrategyEvaluation {
  context: GushiContext;
  signal: StrategySignal;
  trendFilter: boolean;
  entrySignal: boolean;
}

/**
 * 创建一根 K 线的规则快照。至少需要六根历史 K 线，
 * 因为 G1/G6/G4 会检查更早的 MA60/MA120 值。
 */
export function buildGushiContext(
  candles: Candle[],
  indicators: IndicatorData[],
  index: number,
): GushiContext | null {
  if (index < 6 || index >= candles.length || index >= indicators.length) return null;

  const current = candles[index];
  const previous = candles[index - 1];
  const twoBarsAgo = candles[index - 2];
  const currentIndicators = indicators[index];
  const previousIndicators = indicators[index - 1];
  const threeBarsAgoIndicators = indicators[index - 3];
  const fourBarsAgoIndicators = indicators[index - 4];
  const fiveBarsAgoIndicators = indicators[index - 5];
  const sixBarsAgoIndicators = indicators[index - 6];
  if (
    !current ||
    !previous ||
    !twoBarsAgo ||
    !currentIndicators ||
    !previousIndicators ||
    !threeBarsAgoIndicators ||
    !fourBarsAgoIndicators ||
    !fiveBarsAgoIndicators ||
    !sixBarsAgoIndicators
  ) {
    return null;
  }

  // MA 在预热阶段可能是 NaN；返回 null 可以阻止不完整的信号。
  const numericValues = [
    current.close,
    previous.close,
    twoBarsAgo.close,
    previous.open,
    previous.low,
    previous.high,
    currentIndicators.ma20,
    currentIndicators.ma60,
    currentIndicators.ma120,
    previousIndicators.ma60,
    threeBarsAgoIndicators.ma60,
    fourBarsAgoIndicators.ma60,
    fiveBarsAgoIndicators.ma60,
    sixBarsAgoIndicators.ma60,
    previousIndicators.bias60,
    currentIndicators.bias60,
    currentIndicators.resistance,
    currentIndicators.support,
  ];
  if (numericValues.some((value) => !Number.isFinite(value))) return null;

  return {
    currentPrice: current.close,
    prevClose: previous.close,
    prev2Close: twoBarsAgo.close,
    prevOpen: previous.open,
    prevLow: previous.low,
    prevHigh: previous.high,
    ma20: currentIndicators.ma20,
    ma60: currentIndicators.ma60,
    ma120: currentIndicators.ma120,
    prevMA60: previousIndicators.ma60,
    ma60_3: threeBarsAgoIndicators.ma60,
    ma60_4: fourBarsAgoIndicators.ma60,
    ma60_5: fiveBarsAgoIndicators.ma60,
    ma60_6: sixBarsAgoIndicators.ma60,
    prevBias60: previousIndicators.bias60,
    bias60: currentIndicators.bias60,
    volumeConfirm: currentIndicators.volumeConfirm,
    resistance: currentIndicators.resistance,
    support: currentIndicators.support,
  };
}

/** 将 MA 趋势过滤、成交量过滤与第一条匹配的 G 法则组合起来。 */
export function generateSignal(ctx: GushiContext, config: StrategyConfig): StrategySignal {
  let buy: StrategySignal["buy"] = null;
  let sell: StrategySignal["sell"] = null;

  if (checkG1(ctx, config)) buy = "G1";
  else if (checkG2(ctx, config)) buy = "G2";
  else if (checkG3(ctx, config)) buy = "G3";
  else if (checkG4(ctx, config)) buy = "G4";

  if (checkG5(ctx, config)) sell = "G5";
  else if (checkG6(ctx, config)) sell = "G6";
  else if (checkG7(ctx, config)) sell = "G7";
  else if (checkG8(ctx, config)) sell = "G8";

  return {
    buy,
    sell,
    ...(buy ? { buyReason: `GuShi ${buy} buy rule` } : {}),
    ...(sell ? { sellReason: `GuShi ${sell} sell rule` } : {}),
  };
}

/** MA60 必须高于 MA120，且 MA120 不能处于下降趋势。 */
export function checkTrendFilter(
  ma60: number,
  ma120: number,
  prevMA120: number,
  ma120_6: number,
): boolean {
  return ma60 > ma120 && ma120 >= prevMA120 && ma120 >= ma120_6;
}

/** 使用与回测相同的流程评估一根历史 K 线。 */
export function evaluateStrategyAtIndex(
  candles: Candle[],
  indicators: IndicatorData[],
  index: number,
  config: StrategyConfig,
): StrategyEvaluation | null {
  const context = buildGushiContext(candles, indicators, index);
  if (!context) return null;
  const previous = indicators[index - 1];
  const sixBarsAgo = indicators[index - 6];
  if (!previous || !sixBarsAgo) return null;

  const signal = generateSignal(context, config);
  const trendFilter = checkTrendFilter(context.ma60, context.ma120, previous.ma120, sixBarsAgo.ma120);
  return {
    context,
    signal,
    trendFilter,
    entrySignal: trendFilter && context.volumeConfirm && signal.buy !== null,
  };
}

/** 面向有状态服务的封装，内部调用纯粹的逐 K 线评估器。 */
export class StrategyEngine {
  private readonly candles: Candle[] = [];

  public constructor(private readonly config: StrategyConfig = defaultStrategyConfig) {}

  public evaluate(
    candles: Candle[],
    indicators: IndicatorData[],
    index: number,
  ): StrategyEvaluation | null {
    return evaluateStrategyAtIndex(candles, indicators, index, this.config);
  }

  /** 追加一根 K 线并评估，方便接入实时行情。 */
  public process(candle: Candle): StrategyEvaluation | null {
    this.candles.push(candle);
    const indicators = calculateIndicators(this.candles, this.config);
    return evaluateStrategyAtIndex(this.candles, indicators, this.candles.length - 1, this.config);
  }
}
