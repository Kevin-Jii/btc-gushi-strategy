import { Decimal } from "decimal.js";
import type { StrategyConfig } from "../config/strategy.config.js";
import { defaultStrategyConfig } from "../config/strategy.config.js";
import { calculateIndicators } from "../data/market-data.js";
import type { Candle, EquityPoint, GushiBuySignal, GushiSellSignal, Position, Trade } from "../data/types.js";
import { evaluateRiskExit, RiskManager } from "../risk/risk-manager.js";
import { evaluateStrategyAtIndex } from "../strategy/strategy.js";
import { calculatePerformance, type PerformanceReport } from "./performance.js";

export interface BacktestOptions {
  config?: StrategyConfig;
  initialCapital?: number;
  feeRate?: number;
  positionFraction?: number;
}

export interface SignalCounts {
  buy: Record<Exclude<GushiBuySignal, null>, number>;
  sell: Record<Exclude<GushiSellSignal, null>, number>;
}

export interface BacktestResult {
  config: StrategyConfig;
  trades: Trade[];
  equity: EquityPoint[];
  signals: SignalCounts;
  performance: PerformanceReport;
}

const emptySignalCounts = (): SignalCounts => ({
  buy: { G1: 0, G2: 0, G3: 0, G4: 0 },
  sell: { G5: 0, G6: 0, G7: 0, G8: 0 },
});

function isStrategyConfig(value: BacktestOptions | StrategyConfig): value is StrategyConfig {
  return "fastMA" in value && "midMA" in value && "slowMA" in value;
}

function normalizeOptions(optionsOrConfig: BacktestOptions | StrategyConfig): Required<BacktestOptions> {
  const options = isStrategyConfig(optionsOrConfig) ? { config: optionsOrConfig } : optionsOrConfig;
  const config = { ...defaultStrategyConfig, ...(options.config ?? {}) };
  const initialCapital = options.initialCapital ?? 100_000;
  const feeRate = options.feeRate ?? 0.001;
  // targetPercent 是策略默认的资金分配比例；调用方可以覆盖它做实验，
  // 而不必修改策略定义。
  const positionFraction = options.positionFraction ?? config.targetPercent;
  if (!Number.isFinite(initialCapital) || initialCapital <= 0) throw new Error("initialCapital must be positive");
  if (!Number.isFinite(feeRate) || feeRate < 0) throw new Error("feeRate must be non-negative");
  if (!Number.isFinite(positionFraction) || positionFraction <= 0 || positionFraction > 1) {
    throw new Error("positionFraction must be in the range (0, 1]");
  }
  return { config, initialCapital, feeRate, positionFraction };
}

/**
 * 运行只做多的现货回测。信号在 K 线收盘时评估，并按收盘价成交；
 * 止损使用每根 K 线的最高价/最低价，并在新开仓前检查，避免持仓使用未来数据。
 */
export function runBacktest(
  candles: Candle[],
  optionsOrConfig: BacktestOptions | StrategyConfig = {},
): BacktestResult {
  if (candles.length === 0) throw new Error("At least one candle is required");
  const options = normalizeOptions(optionsOrConfig);
  const indicators = calculateIndicators(candles, options.config);
  const trades: Trade[] = [];
  const equity: EquityPoint[] = [];
  const signals = emptySignalCounts();
  const riskManager = new RiskManager();
  let cash = Decimal(options.initialCapital);
  let position: Position | null = null;
  let entryFee = Decimal(0);
  let entryReason: GushiBuySignal = null;

  const closePosition = (barIndex: number, exitPrice: number, exitReason: Trade["exitReason"]): void => {
    if (!position) return;
    const safeExitPrice = Math.max(0, exitPrice);
    const exitNotional = Decimal(position.quantity).mul(safeExitPrice);
    const exitFee = exitNotional.mul(options.feeRate);
    cash = cash.add(exitNotional).sub(exitFee);
    const grossPnl = Decimal(safeExitPrice).sub(position.entryPrice).mul(position.quantity);
    const fees = entryFee.add(exitFee);
    const netPnl = grossPnl.sub(fees);
    const cost = Decimal(position.entryPrice).mul(position.quantity).add(entryFee);
    trades.push({
      entryTimestamp: position.entryTimestamp,
      exitTimestamp: candles[barIndex]?.timestamp ?? position.entryTimestamp,
      entryPrice: position.entryPrice,
      exitPrice: safeExitPrice,
      quantity: position.quantity,
      grossPnl: grossPnl.toNumber(),
      fees: fees.toNumber(),
      netPnl: netPnl.toNumber(),
      returnPct: cost.gt(0) ? netPnl.div(cost).toNumber() : 0,
      entryReason,
      exitReason,
    });
    position = null;
    entryFee = Decimal(0);
    entryReason = null;
    riskManager.registerExit(barIndex);
  };

  for (let index = 0; index < candles.length; index += 1) {
    const candle = candles[index];
    if (!candle) continue;
    const evaluation = evaluateStrategyAtIndex(candles, indicators, index, options.config);
    if (evaluation?.signal.buy) signals.buy[evaluation.signal.buy] += 1;
    if (evaluation?.signal.sell) signals.sell[evaluation.signal.sell] += 1;

    if (position) {
      position.peakPrice = Math.max(position.peakPrice, candle.high);
      const riskExit = evaluateRiskExit(candle, position, options.config);
      if (riskExit) {
        closePosition(index, riskExit.price, riskExit.reason);
      } else if (evaluation?.signal.sell) {
        closePosition(index, candle.close, evaluation.signal.sell);
      }
    }

    if (!position && evaluation?.entrySignal && evaluation.signal.buy && riskManager.canEnter(index, options.config.cooldownBars)) {
      const availableCash = cash.mul(options.positionFraction);
      const entryPrice = candle.close;
      const quantity = availableCash.div(Decimal(entryPrice).mul(1 + options.feeRate));
      const notional = quantity.mul(entryPrice);
      const fee = notional.mul(options.feeRate);
      if (entryPrice > 0 && quantity.gt(0)) {
        cash = cash.sub(notional).sub(fee);
        position = {
          side: "long",
          entryPrice,
          quantity: quantity.toNumber(),
          entryTimestamp: candle.timestamp,
          entryBarIndex: index,
          peakPrice: entryPrice,
        };
        entryFee = fee;
        entryReason = evaluation.signal.buy;
      }
    }

    const markedPosition = position ? Decimal(position.quantity).mul(candle.close) : Decimal(0);
    equity.push({ timestamp: candle.timestamp, equity: cash.add(markedPosition).toNumber() });
  }

  // 按最后已知收盘价平掉未结束的仓位，使最终权益等于现金。
  if (position) {
    const lastIndex = candles.length - 1;
    const lastCandle = candles[lastIndex];
    if (lastCandle) {
      closePosition(lastIndex, lastCandle.close, "end-of-data");
      const lastEquity = equity.at(-1);
      if (lastEquity) lastEquity.equity = cash.toNumber();
    }
  }

  return {
    config: options.config,
    trades,
    equity,
    signals,
    performance: calculatePerformance(options.initialCapital, trades, equity),
  };
}

/** 可复用的封装，适合需要运行多次回测的服务。 */
export class BacktestEngine {
  public constructor(private readonly options: BacktestOptions = {}) {}

  public run(candles: Candle[]): BacktestResult {
    return runBacktest(candles, this.options);
  }
}
