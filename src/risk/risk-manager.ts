import type { StrategyConfig } from "../config/strategy.config.js";
import type { Candle, ExitReason, Position } from "../data/types.js";

/** 当价格触及固定百分比止损价时返回 true。 */
export function checkFixedStopLoss(
  currentPrice: number,
  avgCost: number,
  stopLossPct: number,
): boolean {
  if (avgCost <= 0 || stopLossPct < 0) return false;
  return currentPrice <= avgCost * (1 - stopLossPct);
}

/** 根据观察到的最高价计算回撤止损价。 */
export function calculateTrailingStop(peakPrice: number, trailingStopPct: number): number {
  return peakPrice * (1 - trailingStopPct);
}

/** 判断已经激活的移动止损是否被触发。 */
export function checkTrailingStop(
  currentPrice: number,
  avgCost: number,
  peakPrice: number,
  activationProfit: number,
  trailingStopPct: number,
): boolean {
  if (avgCost <= 0 || peakPrice <= 0 || trailingStopPct < 0) return false;
  const activated = currentPrice >= avgCost * (1 + activationProfit);
  return activated && currentPrice <= calculateTrailingStop(peakPrice, trailingStopPct);
}

/** 当当前价格跌破此前计算出的支撑位时返回 true。 */
export function checkSupportBreak(currentPrice: number, support: number): boolean {
  return Number.isFinite(support) && support > 0 && currentPrice < support;
}

/** 检测 MA60 首次失去对 MA120 的上方位置的 K 线。 */
export function checkTrendFailure(
  ma60: number,
  ma120: number,
  prevMA60: number,
  prevMA120: number,
): boolean {
  return prevMA60 >= prevMA120 && ma60 < ma120;
}

export interface RiskExit {
  price: number;
  reason: Exclude<ExitReason, "G5" | "G6" | "G7" | "G8" | "end-of-data">;
}

/**
 * 检查 K 线内部的最低价是否触发止损。如果开盘时已经跳空低于止损价，
 * 则按开盘价成交；否则使用配置的止损价。
 */
export function evaluateRiskExit(
  candle: Candle,
  position: Position,
  config: StrategyConfig,
): RiskExit | null {
  const fixedStop = position.entryPrice * (1 - config.stopLossPct);
  if (candle.low <= fixedStop) {
    return {
      price: candle.open < fixedStop ? candle.open : fixedStop,
      reason: "fixed-stop",
    };
  }

  const peakPrice = Math.max(position.peakPrice, candle.high);
  const trailingStop = calculateTrailingStop(peakPrice, config.trailingStopPct);
  const trailingActivated = peakPrice >= position.entryPrice * (1 + config.trailingActivationProfit);
  if (trailingActivated && candle.low <= trailingStop) {
    return {
      price: candle.open < trailingStop ? candle.open : trailingStop,
      reason: "trailing-stop",
    };
  }
  return null;
}

/** 将冷却期记录从策略和订单模拟中独立出来。 */
export class RiskManager {
  private lastExitBar = Number.NEGATIVE_INFINITY;

  public canEnter(barIndex: number, cooldownBars: number): boolean {
    return barIndex - this.lastExitBar > Math.max(0, cooldownBars);
  }

  public registerExit(barIndex: number): void {
    this.lastExitBar = barIndex;
  }

  public getLastExitBar(): number {
    return this.lastExitBar;
  }
}
