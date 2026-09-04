import { CheckCircle2, CircleDashed, ShieldAlert, TrendingUp } from "lucide-react";
import type { ReactElement } from "react";
import type { DashboardState, StrategyDashboardSummary } from "../../../src/dashboard/dashboard-types";
import { formatMoney } from "../ui";

export function StrategyStatusPanel({ state }: { state: DashboardState }): ReactElement {
  const activeIds = new Set(state.automation.strategyIds);
  const strategy = state.strategies.find((item) => activeIds.has(item.id)) ?? state.strategies[0];
  const currentRule = state.strategy.buy ?? state.strategy.sell ?? "等待法则触发";
  const checks = [
    { label: "趋势", value: state.strategy.trendFilter === null ? "等待" : state.strategy.trendFilter ? "成立" : "未成立", pass: state.strategy.trendFilter === true },
    { label: "信号", value: state.strategy.entrySignal ? `${state.strategy.buy} 候选` : "无买入候选", pass: state.strategy.entrySignal === true },
    { label: "持仓", value: state.position ? "禁止重复" : "允许新仓", pass: !state.position },
    { label: "AI", value: state.ai.latest ? `${state.ai.latest.allowEntry ? "放行" : "不放行"}` : "等待审核", pass: state.ai.latest?.allowEntry === true },
  ];

  return (
    <section className="rounded-lg border border-slate-800/50 bg-slate-900/50 p-3 backdrop-blur-sm">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-500/10">
            <TrendingUp size={14} className="text-cyan-400" />
          </div>
          <h2 className="text-sm font-bold text-slate-100">策略状态</h2>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${strategy?.status === "running" ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"}`}>
          {strategy?.status === "running" ? "运行" : "未运行"}
        </span>
      </div>

      <div className="mt-3 space-y-1.5">
        {state.strategies.map((item) => (
          <StrategyBadge key={item.id} strategy={item} active={activeIds.has(item.id)} />
        ))}
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 rounded border border-slate-700/50 bg-slate-800/30 p-2">
        <div>
          <span className="text-[9px] font-medium uppercase tracking-wider text-slate-500">趋势</span>
          <div className={`mt-1 flex items-center gap-1.5 text-sm font-bold ${state.strategy.trendFilter ? "text-emerald-400" : "text-slate-500"}`}>
            <TrendingUp size={14} />
            {state.strategy.trendFilter ? "多头" : "等待"}
          </div>
        </div>
        <div>
          <span className="text-[9px] font-medium uppercase tracking-wider text-slate-500">法则</span>
          <div className="mt-1 text-sm font-bold text-cyan-400">{currentRule}</div>
        </div>
      </div>

      <div className="mt-2 space-y-1">
        {checks.map((check) => (
          <div
            key={check.label}
            className="flex items-center gap-2 rounded border border-slate-700/50 bg-slate-800/20 px-2 py-1.5 transition-all hover:bg-slate-800/40"
          >
            <span className={check.pass ? "text-emerald-400" : "text-slate-600"}>
              {check.pass ? <CheckCircle2 size={13} /> : <CircleDashed size={13} />}
            </span>
            <span className="min-w-[50px] text-[10px] font-medium text-slate-400">{check.label}</span>
            <span className="ml-auto text-right text-[10px] text-slate-300">{check.value}</span>
          </div>
        ))}
      </div>

      <div className="mt-2 grid grid-cols-2 gap-2">
        <Level label="支撑" value={state.strategy.support} />
        <Level label="阻力" value={state.strategy.resistance} />
      </div>

      {state.connection.error && (
        <div className="mt-2 flex gap-2 rounded border border-rose-500/30 bg-rose-500/10 p-2 text-[10px] text-rose-400">
          <ShieldAlert size={12} className="flex-shrink-0" />
          <span>{state.connection.error}</span>
        </div>
      )}
    </section>
  );
}
function StrategyBadge({ strategy, active }: { strategy: StrategyDashboardSummary; active: boolean }): ReactElement {
  const unavailable = strategy.status === "unavailable";
  return (
    <div className={`flex items-center gap-2 rounded border px-2 py-1.5 transition-all ${
      active
        ? "border-blue-500/30 bg-blue-500/10"
        : "border-slate-700/50 bg-slate-800/20"
    }`}>
      <span className={`h-1.5 w-1.5 rounded-full ${
        active && strategy.status === "running"
          ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)] animate-pulse"
          : "bg-slate-600"
      }`} />
      <div className="min-w-0 flex-1">
        <strong className="block truncate text-xs font-semibold text-slate-200">{strategy.name}</strong>
      </div>
      <span className={`text-[10px] font-medium ${
        active && strategy.status === "running" ? "text-emerald-400" : "text-slate-500"
      }`}>
        {unavailable ? "不可用" : active && strategy.status === "running" ? "运行" : "停止"}
      </span>
    </div>
  );
}

function Level({ label, value }: { label: string; value: number | null }): ReactElement {
  return (
    <div className="rounded border border-slate-700/50 bg-slate-800/20 p-2">
      <span className="text-[9px] font-medium uppercase tracking-wider text-slate-500">{label}</span>
      <strong className="mt-1 block font-mono text-xs font-semibold text-slate-200">
        {value ? formatMoney(value) : "--"}
      </strong>
    </div>
  );
}
