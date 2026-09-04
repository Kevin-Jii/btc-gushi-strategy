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

  return (
    <section className="grid grid-cols-2 gap-2 overflow-hidden md:grid-cols-3 xl:grid-cols-6">
      <Metric
        icon={<WalletCards size={14} />}
        label="账户资产"
        value={formatMoney(state.account.estimatedEquity)}
        note={`可用 ${formatMoney(state.account.quoteFree)}`}
        iconBg="bg-blue-500/10"
        iconColor="text-blue-400"
      />
      <Metric
        icon={<TrendingUp size={14} />}
        label="未实现"
        value={`${pnl >= 0 ? "+" : ""}${formatMoney(pnl)}`}
        tone={pnl >= 0 ? "positive" : "negative"}
        note={state.position ? "持仓中" : "空仓"}
        iconBg={pnl >= 0 ? "bg-emerald-500/10" : "bg-rose-500/10"}
        iconColor={pnl >= 0 ? "text-emerald-400" : "text-rose-400"}
      />
      <Metric
        icon={<Target size={14} />}
        label="已实现"
        value={`${realized >= 0 ? "+" : ""}${formatMoney(realized)}`}
        tone={realized >= 0 ? "positive" : "negative"}
        note={`${closed.length} 笔`}
        iconBg={realized >= 0 ? "bg-emerald-500/10" : "bg-rose-500/10"}
        iconColor={realized >= 0 ? "text-emerald-400" : "text-rose-400"}
      />
      <Metric
        icon={<TrendingDown size={14} />}
        label="策略信号"
        value={state.strategy.buy ?? state.strategy.sell ?? "等待"}
        note={`${state.interval} · ${state.strategies.length}策略`}
        iconBg="bg-purple-500/10"
        iconColor="text-purple-400"
      />
      <Metric
        icon={<Gauge size={14} />}
        label="盈亏因子"
        value={factor ? factor.toFixed(2) : "--"}
        note="统计"
        iconBg="bg-cyan-500/10"
        iconColor="text-cyan-400"
      />
      <Metric
        icon={<ShieldCheck size={14} />}
        label="胜率"
        value={closed.length ? `${((wins.length / closed.length) * 100).toFixed(1)}%` : "--"}
        note={closed.length ? `${wins.length}/${closed.length}` : "等待"}
        iconBg="bg-amber-500/10"
        iconColor="text-amber-400"
      />
    </section>
  );
}
function Metric({ icon, label, value, note, tone = "neutral", iconBg = "bg-slate-500/10", iconColor = "text-slate-400" }: { icon: ReactElement; label: string; value: string; note: string; tone?: "positive" | "negative" | "neutral"; iconBg?: string; iconColor?: string }): ReactElement {
  return (
    <div className="group relative overflow-hidden rounded-lg border border-slate-800/50 bg-slate-900/50 p-3 backdrop-blur-sm transition-all hover:border-slate-700/50 hover:bg-slate-900/80">
      <div className="flex items-center gap-2 text-[9px] font-medium uppercase tracking-wider text-slate-500">
        <div className={`flex h-6 w-6 items-center justify-center rounded ${iconBg}`}>
          <span className={iconColor}>{icon}</span>
        </div>
        {label}
      </div>
      <strong className={`mt-2 block truncate font-mono text-base font-bold ${tone === "positive" ? "text-emerald-400" : tone === "negative" ? "text-rose-400" : "text-slate-100"}`}>
        {value}
      </strong>
      <span className="mt-1 block truncate text-[10px] text-slate-500">{note}</span>
    </div>
  );
}
