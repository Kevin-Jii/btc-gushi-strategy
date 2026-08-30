/**
 * 风险引擎（执行层）
 * 封装风险检查和止损逻辑
 */

import type { Candle } from "../data/types.js";

/**
 * 持仓数据（简化版）
 */
export interface RiskPosition {
  entryPrice: number;
  peakPrice: number;
  quantity: number;
  side: "long" | "short";
}

/**
 * 风险退出原因
 */
export type RiskExitReason = "fixed-stop" | "trailing-stop" | "trend-change" | "manual";

/**
 * 风险退出结果
 */
export interface RiskExitResult {
  /** 是否需要退出 */
  shouldExit: boolean;

  /** 退出原因 */
  reason: RiskExitReason | null;

  /** 建议退出价格 */
  exitPrice: number | null;

  /** 附加信息 */
  metadata?: Record<string, unknown>;
}

/**
 * 风险引擎配置
 */
export interface RiskEngineConfig {
  /** 固定止损百分比 */
  stopLossPct: number;

  /** 移动止损百分比 */
  trailingStopPct: number;

  /** 移动止损激活利润 */
  trailingActivationProfit: number;

  /** cooldown K 线数 */
  cooldownBars: number;
}

/**
 * 风险引擎
 * 管理止损、移动止损和 cooldown
 */
export class RiskEngine {
  private readonly stopLossPct: number;
  private readonly trailingStopPct: number;
  private readonly trailingActivationProfit: number;
  private readonly cooldownBars: number;

  private lastExitBar = Number.NEGATIVE_INFINITY;

  constructor(config: RiskEngineConfig) {
    this.stopLossPct = config.stopLossPct;
    this.trailingStopPct = config.trailingStopPct;
    this.trailingActivationProfit = config.trailingActivationProfit;
    this.cooldownBars = config.cooldownBars;
  }

  /**
   * 检查是否允许开仓
   */
  canEnter(barIndex: number): boolean {
    return barIndex - this.lastExitBar > Math.max(0, this.cooldownBars);
  }

  /**
   * 记录平仓
   */
  registerExit(barIndex: number): void {
    this.lastExitBar = barIndex;
  }

  /**
   * 获取上次平仓的 K 线索引
   */
  getLastExitBar(): number {
    return this.lastExitBar;
  }

  /**
   * 评估是否需要风险退出
   */
  evaluateExit(candle: Candle, position: RiskPosition): RiskExitResult | null {
    const { entryPrice, peakPrice, side } = position;

    // 检查固定止损
    const fixedStopPrice = side === "long"
      ? entryPrice * (1 - this.stopLossPct)
      : entryPrice * (1 + this.stopLossPct);

    const hitFixedStop = side === "long"
      ? candle.low <= fixedStopPrice
      : candle.high >= fixedStopPrice;

    if (hitFixedStop) {
      const exitPrice = side === "long"
        ? (candle.open < fixedStopPrice ? candle.open : fixedStopPrice)
        : (candle.open > fixedStopPrice ? candle.open : fixedStopPrice);

      return {
        shouldExit: true,
        reason: "fixed-stop",
        exitPrice,
        metadata: { stopPrice: fixedStopPrice },
      };
    }

    // 检查移动止损
    const currentPeak = side === "long"
      ? Math.max(peakPrice, candle.high)
      : Math.min(peakPrice, candle.low);

    const activationPrice = side === "long"
      ? entryPrice * (1 + this.trailingActivationProfit)
      : entryPrice * (1 - this.trailingActivationProfit);

    const trailingActivated = side === "long"
      ? currentPeak >= activationPrice
      : currentPeak <= activationPrice;

    if (trailingActivated) {
      const trailingStopPrice = side === "long"
        ? currentPeak * (1 - this.trailingStopPct)
        : currentPeak * (1 + this.trailingStopPct);

      const hitTrailing = side === "long"
        ? candle.low <= trailingStopPrice
        : candle.high >= trailingStopPrice;

      if (hitTrailing) {
        const exitPrice = side === "long"
          ? (candle.open < trailingStopPrice ? candle.open : trailingStopPrice)
          : (candle.open > trailingStopPrice ? candle.open : trailingStopPrice);

        return {
          shouldExit: true,
          reason: "trailing-stop",
          exitPrice,
          metadata: {
            trailingStopPrice,
            peakPrice: currentPeak,
            activationPrice,
          },
        };
      }
    }

    return null;
  }

  /**
   * 计算止损价格
   */
  calculateStopLoss(entryPrice: number, side: "long" | "short"): number {
    return side === "long"
      ? entryPrice * (1 - this.stopLossPct)
      : entryPrice * (1 + this.stopLossPct);
  }

  /**
   * 计算移动止损价格
   */
  calculateTrailingStop(peakPrice: number, side: "long" | "short"): number | null {
    const activationPrice = side === "long"
      ? peakPrice * (1 + this.trailingActivationProfit)
      : peakPrice * (1 - this.trailingActivationProfit);

    // 如果峰值未达到激活价，返回 null
    if (side === "long" && peakPrice < activationPrice) {
      return null;
    }
    if (side === "short" && peakPrice > activationPrice) {
      return null;
    }

    return side === "long"
      ? peakPrice * (1 - this.trailingStopPct)
      : peakPrice * (1 + this.trailingStopPct);
  }

  /**
   * 计算盈亏比
   */
  calculateRiskReward(
    entryPrice: number,
    targetPrice: number,
    side: "long" | "short",
  ): number {
    const risk = Math.abs(entryPrice * this.stopLossPct);
    const reward = side === "long"
      ? targetPrice - entryPrice
      : entryPrice - targetPrice;

    return reward > 0 ? reward / risk : 0;
  }

  /**
   * 获取配置
   */
  getConfig(): RiskEngineConfig {
    return {
      stopLossPct: this.stopLossPct,
      trailingStopPct: this.trailingStopPct,
      trailingActivationProfit: this.trailingActivationProfit,
      cooldownBars: this.cooldownBars,
    };
  }

  /**
   * 重置状态
   */
  reset(): void {
    this.lastExitBar = Number.NEGATIVE_INFINITY;
  }
}
