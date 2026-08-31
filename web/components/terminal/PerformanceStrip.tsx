import { Gauge, ShieldCheck, Target, TrendingDown, TrendingUp, WalletCards } from "lucide-react";
import type { ReactElement } from "react";
import type { DashboardState } from "../../../src/dashboard/dashboard-types";
import { formatMoney } from "../ui";

export function PerformanceStrip({ state }: { state: DashboardState }): ReactElement {
  const realized = state.orders.reduce((sum, order) => sum + (order.realizedProfit ?? 0), 0);
  const pnl = state.position ? (state.market.latestPrice - state.position.entryPrice) * state.position.quantity : 0;
  const closed = state.orders.filter((order) => order.side === "SELL" && order.realizedProfit !== undefined);
  const wins = closed.filter((order) => (order.realizedProfit ?? 0) > 0);
  const losses = closed.filter((order) => (order.realizedProfit ?? 0) < 0);
  const factor = losses.length ? wins.reduce((sum, order) => sum + (order.realizedProfit ?? 0), 0) / Math.abs(losses.reduce((sum, order) => sum + (order.realizedProfit ?? 0), 0)) : 0;
  return <section className="terminal-panel grid grid-cols-2 overflow-hidden md:grid-cols-3 xl:grid-cols-6">
    <Metric icon={<WalletCards size={14} />} label="账户总资产" value={formatMoney(state.account.estimatedEquity)} note={`${state.account.quoteAsset} 可用 ${formatMoney(state.account.quoteFree)}`} />
    <Metric icon={<TrendingUp size={14} />} label="未实现盈亏" value={`${pnl >= 0 ? "+" : ""}${formatMoney(pnl)}`} tone={pnl >= 0 ? "positive" : "negative"} note={state.position ? "当前持仓" : "暂无持仓"} />
    <Metric icon={<Target size={14} />} label="累计已实现收益" value={`${realized >= 0 ? "+" : ""}${formatMoney(realized)}`} tone={realized >= 0 ? "positive" : "negative"} note={`${closed.length} 笔已平仓`} />
    <Metric icon={<TrendingDown size={14} />} label="策略信号" value={state.strategy.buy ?? state.strategy.sell ?? "等待触发"} note={`${state.interval} · ${state.strategies.length} 个策略`} />
    <Metric icon={<Gauge size={14} />} label="盈亏因子" value={factor ? factor.toFixed(2) : "--"} note="已实现订单统计" />
    <Metric icon={<ShieldCheck size={14} />} label="策略胜率" value={closed.length ? `${((wins.length / closed.length) * 100).toFixed(2)}%` : "--"} note={closed.length ? `${wins.length}/${closed.length} 笔盈利` : "等待平仓样本"} />
  </section>;
}
function Metric({ icon, label, value, note, tone = "neutral" }: { icon: ReactElement; label: string; value: string; note: string; tone?: "positive" | "negative" | "neutral" }): ReactElement { return <div className="min-w-0 border-b border-r border-line p-3.5 xl:border-b-0"><div className="flex items-center gap-2 text-[10px] text-muted">{icon}{label}</div><strong className={`mt-2 block truncate font-mono text-lg ${tone === "positive" ? "text-profit" : tone === "negative" ? "text-loss" : "text-ink"}`}>{value}</strong><span className="mt-1 block truncate text-[10px] text-muted">{note}</span></div>; }
