import type { StrategyConfig } from "../config/strategy.config.js";

/**
 * 供量化葛氏八法则使用的指标快照。
 *
 * `_3`、`_6` 等后缀分别表示三根、六根 K 线之前。
 * 让该对象独立于数据源，可以方便地对每条规则进行单元测试。
 */
export interface GushiContext {
  currentPrice: number;

  prevClose: number;
  prev2Close: number;

  prevOpen: number;
  prevLow: number;
  prevHigh: number;

  ma20: number;
  ma60: number;
  ma120: number;

  prevMA60: number;
  ma60_3: number;
  ma60_4: number;
  ma60_5: number;
  ma60_6: number;

  prevBias60: number;
  bias60: number;

  volumeConfirm: boolean;

  resistance: number;
  support: number;
}

/** G1：当前价格重新站上趋平或上行的 MA60。 */
export function checkG1(ctx: GushiContext, _config: StrategyConfig): boolean {
  const maFlattening =
    ctx.ma60_5 > ctx.ma60_3 &&
    ctx.ma60_3 > ctx.prevMA60 &&
    ctx.ma60 >= ctx.prevMA60;
  const priceCross = ctx.prevClose <= ctx.prevMA60 && ctx.currentPrice > ctx.ma60;
  return maFlattening && priceCross;
}

/** G2：既有趋势回踩 MA60 后恢复上行。 */
export function checkG2(ctx: GushiContext, config: StrategyConfig): boolean {
  return (
    ctx.prev2Close > ctx.ma60_3 &&
    ctx.prevLow <= ctx.prevMA60 * (1 + config.pullbackTolerance) &&
    ctx.prevClose >= ctx.prevMA60 &&
    ctx.currentPrice > ctx.prevClose &&
    ctx.ma60 >= ctx.prevMA60
  );
}

/** G3：价格以可配置的缓冲幅度重新站上 MA60。 */
export function checkG3(ctx: GushiContext, config: StrategyConfig): boolean {
  return (
    ctx.prevClose < ctx.prevMA60 &&
    ctx.currentPrice > ctx.ma60 * (1 + config.reclaimBuffer) &&
    ctx.ma60 > ctx.prevMA60
  );
}

/** G4：市场深度超卖后反弹，同时长期趋势仍然有效。 */
export function checkG4(ctx: GushiContext, config: StrategyConfig): boolean {
  const oversold = ctx.bias60 <= -config.g4BiasThreshold;
  const rebound = ctx.currentPrice > ctx.prevClose && ctx.currentPrice > ctx.prevOpen;
  const longTrendOk = ctx.ma120 >= ctx.ma60_6;
  return oversold && rebound && longTrendOk;
}

/** G5：过度上涨的行情开始回撤。 */
export function checkG5(ctx: GushiContext, config: StrategyConfig): boolean {
  const overextended = ctx.bias60 >= config.g5BiasThreshold;
  const pullback = ctx.currentPrice < ctx.prevClose && ctx.bias60 < ctx.prevBias60;
  return overextended && pullback && ctx.ma60 > ctx.prevMA60;
}

/** G6：MA60 经历上行、近似走平后开始向下。 */
export function checkG6(ctx: GushiContext, config: StrategyConfig): boolean {
  const maWasRising =
    ctx.ma60_5 < ctx.ma60_4 &&
    ctx.ma60_4 < ctx.ma60_3 &&
    ctx.ma60_3 <= ctx.prevMA60;
  const maWasFlat =
    ctx.ma60_3 !== 0 &&
    Math.abs((ctx.prevMA60 - ctx.ma60_3) / ctx.ma60_3) <= config.maFlatTolerance;
  const maTurnDown = ctx.ma60 < ctx.prevMA60;
  const priceBreakDown = ctx.prevClose >= ctx.prevMA60 && ctx.currentPrice < ctx.ma60;
  return maWasRising && maWasFlat && maTurnDown && priceBreakDown;
}

/** G7：重新站上 MA60 失败后转弱。 */
export function checkG7(ctx: GushiContext, config: StrategyConfig): boolean {
  return (
    ctx.prevClose < ctx.prevMA60 &&
    ctx.prevHigh <= ctx.prevMA60 * (1 + config.reclaimBuffer) &&
    ctx.currentPrice < ctx.prevClose &&
    ctx.currentPrice < ctx.ma60
  );
}

/** G8：价格跌破此前重新站上、但现在正在下降的 MA60。 */
export function checkG8(ctx: GushiContext, config: StrategyConfig): boolean {
  return (
    ctx.prevClose > ctx.prevMA60 * (1 + config.reclaimBuffer) &&
    ctx.currentPrice < ctx.ma60 &&
    ctx.ma60 < ctx.prevMA60
  );
}
