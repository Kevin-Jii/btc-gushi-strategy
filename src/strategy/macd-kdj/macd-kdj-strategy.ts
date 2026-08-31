import { BaseStrategy, createHoldSignal } from "../core/strategy.interface.js";
import type { StrategyContext, StrategyMetadata, StrategySignal } from "../core/strategy-types.js";
import { createMacdKdjConfig, defaultMacdKdjConfig, type MacdKdjStrategyConfig } from "./macd-kdj-config.js";
import { evaluateMacdKdj, shouldBuy, shouldSell } from "./macd-kdj-rules.js";

const metadata: StrategyMetadata = { id: "macd-kdj-momentum", name: "MACD + KDJ 动量策略", version: "1.0.0", description: "MACD 判断方向，KDJ 寻找回调结束点，成交量确认入场，适用于 BTC 5m 超短线。", category: "momentum", market: "futures", supportedTimeframes: ["5m", "15m"], requiredIndicators: ["EMA20", "MACD(12,26,9)", "KDJ(9,3,3)", "VolumeMA20", "ATR14"] };

export class MacdKdjStrategy extends BaseStrategy {
  private readonly config: MacdKdjStrategyConfig;
  public constructor(overrides: Partial<MacdKdjStrategyConfig> = {}) { super(); this.config = createMacdKdjConfig(overrides); }
  public getMetadata(): StrategyMetadata { return metadata; }
  public evaluate(context: StrategyContext): StrategySignal {
    const candles = [...context.candles.history, context.candles.current].map((candle) => ({ ...candle, isClosed: true }));
    const snapshot = evaluateMacdKdj(candles, this.config);
    if (!snapshot) return createHoldSignal(metadata.id, "指标预热不足，需要 MACD/KDJ/ATR 历史数据");
    if (shouldBuy(snapshot, this.config)) return { signalId: `${metadata.id}-${context.candles.current.timestamp}`, strategyId: metadata.id, strategyVersion: metadata.version, timestamp: Date.now(), action: "BUY", strength: Math.min(snapshot.score / 10, 1), reason: `MACD 动能增强 + KDJ 回调金叉 + EMA20 + 成交量确认（${snapshot.score}/10）`, rule: "MACD_KDJ_BUY", barIndex: context.candles.index, price: context.candles.current.close, metadata: { snapshot } };
    if (shouldSell(snapshot)) return { signalId: `${metadata.id}-${context.candles.current.timestamp}`, strategyId: metadata.id, strategyVersion: metadata.version, timestamp: Date.now(), action: "SELL", strength: 0.8, reason: "MACD 动能衰竭并跌破 EMA20 环境", rule: "MACD_MOMENTUM_EXIT", barIndex: context.candles.index, price: context.candles.current.close, metadata: { snapshot } };
    return createHoldSignal(metadata.id, `等待 MACD/KDJ 共振（当前评分 ${snapshot.score}/10）`);
  }
  public getConfig(): MacdKdjStrategyConfig { return { ...this.config }; }
}
