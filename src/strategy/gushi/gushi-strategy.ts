/**
 * 葛氏八法则策略
 * 实现 Strategy 接口，作为策略插件运行
 */

import { BaseStrategy, createHoldSignal } from "../core/strategy.interface.js";
import type {
  StrategyContext,
  StrategySignal,
  StrategyMetadata,
} from "../core/strategy-types.js";
import type { GushiContext } from "./gushi-context.js";
import {
  checkG1,
  checkG2,
  checkG3,
  checkG4,
  checkG5,
  checkG6,
  checkG7,
  checkG8,
} from "./gushi-rules.js";
import type { GushiStrategyConfig } from "./gushi-config.js";
import { defaultGushiConfig } from "./gushi-config.js";

/**
 * 葛氏策略元信息
 */
const GUSHI_METADATA: StrategyMetadata = {
  id: "gushi-ma",
  name: "葛氏八法则 MA 趋势策略",
  version: "1.0.0",
  description: "基于葛氏八法则的均线趋势交易策略，适用于 BTC/USDT 等主流加密货币",
  category: "trend",
  market: "spot",
  supportedTimeframes: ["1d", "4h", "1h"],
  requiredIndicators: ["ma20", "ma60", "ma120", "bias60", "volumeConfirm"],
  parameterDefinitions: [
    {
      name: "reclaimBuffer",
      type: "number",
      default: 0.005,
      min: 0,
      max: 0.02,
      step: 0.001,
      description: "重新站上均线需要的缓冲幅度",
    },
    {
      name: "pullbackTolerance",
      type: "number",
      default: 0.01,
      min: 0,
      max: 0.03,
      step: 0.005,
      description: "回踩均线的容许幅度",
    },
    {
      name: "g4BiasThreshold",
      type: "number",
      default: 0.08,
      min: 0.03,
      max: 0.15,
      step: 0.01,
      description: "G4 超卖 BIAS 阈值",
    },
    {
      name: "g5BiasThreshold",
      type: "number",
      default: 0.12,
      min: 0.05,
      max: 0.25,
      step: 0.01,
      description: "G5 超涨 BIAS 阈值",
    },
    {
      name: "maFlatTolerance",
      type: "number",
      default: 0.002,
      min: 0,
      max: 0.01,
      step: 0.001,
      description: "均线走平判断容差",
    },
  ],
  author: "BTC Gushi Strategy",
  createdAt: Date.now(),
};

/**
 * 葛氏策略
 * 实现葛氏八法则交易逻辑
 */
export class GushiStrategy extends BaseStrategy {
  /** 策略元信息 */
  readonly metadata: StrategyMetadata = GUSHI_METADATA;

  /** 策略配置 */
  private config: GushiStrategyConfig;

  constructor(config: Partial<GushiStrategyConfig> = {}) {
    super();
    this.config = { ...defaultGushiConfig, ...config };
  }

  getMetadata(): StrategyMetadata {
    return {
      ...this.metadata,
      updatedAt: Date.now(),
    };
  }

  /**
   * 评估策略信号
   */
  evaluate(context: StrategyContext): StrategySignal {
    const gushiContext = this.buildGushiContext(context);
    if (!gushiContext) {
      return createHoldSignal(this.metadata.id, "Insufficient data for Gushi evaluation");
    }

    const trendFilter = this.checkTrendFilter(gushiContext);
    const signal = this.generateSignal(gushiContext);

    // 如果有买入信号但趋势过滤未通过，返回 HOLD
    if (signal.action === "BUY" && !trendFilter) {
      return createHoldSignal(this.metadata.id, "Trend filter not passed");
    }

    return {
      signalId: `${this.metadata.id}-${context.candles.current.timestamp}`,
      strategyId: this.metadata.id,
      strategyVersion: this.metadata.version,
      timestamp: context.candles.current.timestamp,
      action: signal.action,
      strength: signal.strength,
      reason: signal.reason,
      rule: signal.rule ?? null,
      barIndex: context.candles.index,
      price: context.candles.current.close,
      metadata: {
        trendFilter,
        volumeConfirm: context.indicators.current.volumeConfirm,
      },
    };
  }

  /**
   * 构建葛氏上下文
   */
  private buildGushiContext(context: StrategyContext): GushiContext | null {
    const { candles, indicators } = context;
    const index = candles.index;

    // 需要至少 6 根历史 K 线
    if (index < 6) return null;

    const history = candles.history;
    const indHistory = indicators.history;

    // 获取需要的 K 线数据
    const current = history[index];
    const previous = history[index - 1];
    const twoBarsAgo = history[index - 2];

    const currentInd = indHistory[index];
    const previousInd = indHistory[index - 1];
    const threeBarsAgoInd = indHistory[index - 3];
    const fourBarsAgoInd = indHistory[index - 4];
    const fiveBarsAgoInd = indHistory[index - 5];
    const sixBarsAgoInd = indHistory[index - 6];

    if (!current || !previous || !twoBarsAgo || !currentInd || !previousInd ||
        !threeBarsAgoInd || !fourBarsAgoInd || !fiveBarsAgoInd || !sixBarsAgoInd) {
      return null;
    }

    // 检查数值是否有效
    const numericValues = [
      current.close,
      previous.close,
      twoBarsAgo.close,
      previous.open,
      previous.low,
      previous.high,
      currentInd.ma20,
      currentInd.ma60,
      currentInd.ma120,
      previousInd.ma60,
      threeBarsAgoInd.ma60,
      fourBarsAgoInd.ma60,
      fiveBarsAgoInd.ma60,
      sixBarsAgoInd.ma60,
      previousInd.bias60,
      currentInd.bias60,
    ];

    if (numericValues.some((v) => !Number.isFinite(v))) {
      return null;
    }

    return {
      currentPrice: current.close,
      prevClose: previous.close,
      prev2Close: twoBarsAgo.close,
      prevOpen: previous.open,
      prevLow: previous.low,
      prevHigh: previous.high,
      ma20: currentInd.ma20,
      ma60: currentInd.ma60,
      ma120: currentInd.ma120,
      prevMA60: previousInd.ma60,
      ma60_3: threeBarsAgoInd.ma60,
      ma60_4: fourBarsAgoInd.ma60,
      ma60_5: fiveBarsAgoInd.ma60,
      ma60_6: sixBarsAgoInd.ma60,
      prevBias60: previousInd.bias60,
      bias60: currentInd.bias60,
      volumeConfirm: currentInd.volumeConfirm,
      resistance: currentInd.resistance,
      support: currentInd.support,
    };
  }

  /**
   * 趋势过滤：MA60 必须高于 MA120，且 MA120 不能处于下降趋势
   */
  private checkTrendFilter(ctx: GushiContext): boolean {
    return (
      ctx.ma60 > ctx.ma120 &&
      ctx.ma60 >= ctx.prevMA60 &&
      ctx.ma60 >= ctx.ma60_6
    );
  }

  /**
   * 生成交易信号
   */
  private generateSignal(ctx: GushiContext): { action: "BUY" | "SELL" | "HOLD"; strength: number; reason: string; rule: string | undefined } {
    // 检查买入条件 G1-G4
    if (checkG1(ctx, this.config)) {
      return {
        action: "BUY",
        strength: 0.9,
        reason: "G1: 价格重新站上趋平或上行的 MA60",
        rule: "G1",
      };
    }

    if (checkG2(ctx, this.config)) {
      return {
        action: "BUY",
        strength: 0.85,
        reason: "G2: 回踩 MA60 后恢复上行",
        rule: "G2",
      };
    }

    if (checkG3(ctx, this.config)) {
      return {
        action: "BUY",
        strength: 0.75,
        reason: "G3: 价格以缓冲幅度重新站上 MA60",
        rule: "G3",
      };
    }

    if (checkG4(ctx, this.config)) {
      return {
        action: "BUY",
        strength: 0.7,
        reason: "G4: 超卖反弹且长期趋势有效",
        rule: "G4",
      };
    }

    // 检查卖出条件 G5-G8
    if (checkG5(ctx, this.config)) {
      return {
        action: "SELL",
        strength: 0.85,
        reason: "G5: 过度上涨后开始回撤",
        rule: "G5",
      };
    }

    if (checkG6(ctx, this.config)) {
      return {
        action: "SELL",
        strength: 0.9,
        reason: "G6: MA60 由升转降",
        rule: "G6",
      };
    }

    if (checkG7(ctx, this.config)) {
      return {
        action: "SELL",
        strength: 0.75,
        reason: "G7: 重新站上 MA60 失败后转弱",
        rule: "G7",
      };
    }

    if (checkG8(ctx, this.config)) {
      return {
        action: "SELL",
        strength: 0.85,
        reason: "G8: 价格跌破正在下降的 MA60",
        rule: "G8",
      };
    }

    return {
      action: "HOLD",
      strength: 0,
      reason: "无葛氏信号",
      rule: undefined,
    };
  }

  /**
   * 获取当前配置
   */
  getConfig(): GushiStrategyConfig {
    return { ...this.config };
  }

  /**
   * 更新配置
   */
  updateConfig(overrides: Partial<GushiStrategyConfig>): void {
    this.config = { ...this.config, ...overrides };
  }
}
