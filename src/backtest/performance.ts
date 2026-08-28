import type { EquityPoint, Trade } from "../data/types.js";

export interface PerformanceReport {
  initialCapital: number;
  finalEquity: number;
  totalReturn: number;
  annualizedReturn: number;
  maxDrawdown: number;
  sharpeRatio: number;
  winRate: number;
  profitFactor: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  averageWin: number;
  averageLoss: number;

  // 百分比别名便于在仪表盘中直接展示报告。
  totalReturnPct: number;
  annualizedReturnPct: number;
  maxDrawdownPct: number;
  winRatePct: number;
}

/** 计算相邻周期之间的权益收益率。 */
export function calculateEquityReturns(equity: EquityPoint[]): number[] {
  const returns: number[] = [];
  for (let index = 1; index < equity.length; index += 1) {
    const previous = equity[index - 1]?.equity ?? 0;
    const current = equity[index]?.equity ?? previous;
    returns.push(previous > 0 ? current / previous - 1 : 0);
  }
  return returns;
}

/** 返回从峰值到谷值的最大回撤，以负小数表示。 */
export function calculateMaxDrawdown(equity: EquityPoint[]): number {
  let peak = 0;
  let maxDrawdown = 0;
  for (const point of equity) {
    if (point.equity > peak) peak = point.equity;
    if (peak > 0) maxDrawdown = Math.min(maxDrawdown, point.equity / peak - 1);
  }
  return maxDrawdown;
}

/** 根据权益曲线中的时间戳计算年化收益率。 */
export function calculateAnnualizedReturn(initialCapital: number, equity: EquityPoint[]): number {
  const finalEquity = equity.at(-1)?.equity ?? initialCapital;
  const firstTimestamp = equity.at(0)?.timestamp;
  const lastTimestamp = equity.at(-1)?.timestamp;
  const years =
    firstTimestamp !== undefined && lastTimestamp !== undefined
      ? (lastTimestamp - firstTimestamp) / (365.25 * 24 * 60 * 60 * 1000)
      : 0;
  if (initialCapital <= 0 || finalEquity <= 0 || years <= 0) return finalEquity === 0 ? -1 : 0;
  return Math.pow(finalEquity / initialCapital, 1 / years) - 1;
}

/** 根据每根 K 线的收益率计算无风险利率为零的夏普比率。 */
export function calculateSharpeRatio(equity: EquityPoint[]): number {
  const returns = calculateEquityReturns(equity);
  if (returns.length < 2) return 0;
  const mean = returns.reduce((sum, value) => sum + value, 0) / returns.length;
  const variance =
    returns.reduce((sum, value) => sum + (value - mean) ** 2, 0) / (returns.length - 1);
  const standardDeviation = Math.sqrt(variance);
  if (standardDeviation === 0) return 0;
  // 预期输入是日线数据；对其他周期这样年化仍可工作，
  // 后续也可以替换为按周期配置的年化方式。
  return (mean / standardDeviation) * Math.sqrt(365.25);
}

/** 生成 CLI 和未来仪表盘使用的核心指标。 */
export function calculatePerformance(
  initialCapital: number,
  trades: Trade[],
  equity: EquityPoint[],
): PerformanceReport {
  const finalEquity = equity.at(-1)?.equity ?? initialCapital;
  const winners = trades.filter((trade) => trade.netPnl > 0);
  const losers = trades.filter((trade) => trade.netPnl < 0);
  const grossProfit = winners.reduce((sum, trade) => sum + trade.netPnl, 0);
  const grossLoss = losers.reduce((sum, trade) => sum + trade.netPnl, 0);
  const winRate = trades.length > 0 ? winners.length / trades.length : 0;
  const averageWin = winners.length > 0
    ? winners.reduce((sum, trade) => sum + trade.returnPct, 0) / winners.length
    : 0;
  const averageLoss = losers.length > 0
    ? losers.reduce((sum, trade) => sum + trade.returnPct, 0) / losers.length
    : 0;
  const totalReturn = initialCapital > 0 ? finalEquity / initialCapital - 1 : 0;

  return {
    initialCapital,
    finalEquity,
    totalReturn,
    annualizedReturn: calculateAnnualizedReturn(initialCapital, equity),
    maxDrawdown: calculateMaxDrawdown(equity),
    sharpeRatio: calculateSharpeRatio(equity),
    winRate,
    profitFactor: grossLoss < 0 ? grossProfit / Math.abs(grossLoss) : grossProfit > 0 ? Number.POSITIVE_INFINITY : 0,
    totalTrades: trades.length,
    winningTrades: winners.length,
    losingTrades: losers.length,
    averageWin,
    averageLoss,
    totalReturnPct: totalReturn * 100,
    annualizedReturnPct: calculateAnnualizedReturn(initialCapital, equity) * 100,
    maxDrawdownPct: calculateMaxDrawdown(equity) * 100,
    winRatePct: winRate * 100,
  };
}

/** 格式化报告，不依赖任何 UI 框架。 */
export function formatPerformance(report: PerformanceReport): string {
  const percent = (value: number) => `${(value * 100).toFixed(2)}%`;
  const factor = Number.isFinite(report.profitFactor) ? report.profitFactor.toFixed(2) : "Infinity";
  return [
    "GuShi BTC/USDT Backtest",
    `Initial capital: ${report.initialCapital.toFixed(2)}`,
    `Final equity: ${report.finalEquity.toFixed(2)}`,
    `Total return: ${percent(report.totalReturn)}`,
    `Annualized return: ${percent(report.annualizedReturn)}`,
    `Max drawdown: ${percent(report.maxDrawdown)}`,
    `Sharpe ratio: ${report.sharpeRatio.toFixed(2)}`,
    `Win rate: ${percent(report.winRate)}`,
    `Profit factor: ${factor}`,
    `Total trades: ${report.totalTrades}`,
  ].join("\n");
}
