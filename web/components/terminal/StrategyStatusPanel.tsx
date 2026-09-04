import { CheckCircle2, CircleDashed, ShieldAlert, TrendingUp } from "lucide-react";
import type { ReactElement } from "react";
import type { DashboardState, StrategyDashboardSummary } from "../../../src/dashboard/dashboard-types";
import { formatMoney } from "../ui";

export function StrategyStatusPanel({ state }: { state: DashboardState }): ReactElement {
  const activeIds = new Set(state.automation.strategyIds);
  const strategy = state.strategies.find((item) => activeIds.has(item.id)) ?? state.strategies[0];
  const currentRule = state.strategy.buy ?? state.strategy.sell ?? "等待法则触发";
  const checks = [
    { label: "均线趋势过滤", value: state.strategy.trendFilter === null ? "等待指标" : state.strategy.trendFilter ? "趋势条件成立" : "趋势条件未成立", pass: state.strategy.trendFilter === true },
    { label: "入场信号", value: state.strategy.entrySignal ? `${state.strategy.buy} 买入候选` : "当前无确定性买入候选", pass: state.strategy.entrySignal === true },
    { label: "持仓门控", value: state.position ? "已有持仓，禁止重复入场" : "当前允许评估新仓位", pass: !state.position },
    { label: "AI 审核门控", value: state.ai.latest ? `${state.ai.latest.ruleStatus} · ${state.ai.latest.allowEntry ? "允许入场" : "不放行"}` : "等待 AI 审核", pass: state.ai.latest?.allowEntry === true },
  ];

  return (
    <section className="rounded-xl border border-slate-800/50 bg-slate-900/50 p-5 backdrop-blur-sm">
      <div className="flex items-start justify-between">
        <div>
          <span className="text-[9px] font-bold uppercase tracking-widest text-slate-600">STRATEGY ENGINE</span>
          <h2 className="mt-1 text-base font-bold text-slate-100">策略状态</h2>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${strategy?.status === "running" ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"}`}>
          {strategy?.status === "running" ? "运行中" : "未运行"}
        </span>
      </div>

      <div className="mt-4 space-y-2">
        {state.strategies.map((item) => (
          <StrategyBadge key={item.id} strategy={item} active={activeIds.has(item.id)} />
        ))}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4 rounded-lg border border-slate-700/50 bg-slate-800/30 p-4">
        <div>
          <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500">趋势方向</span>
          <div className={`mt-2 flex items-center gap-2 text-lg font-bold ${state.strategy.trendFilter ? "text-emerald-400" : "text-slate-500"}`}>
            <TrendingUp size={20} />
            {state.strategy.trendFilter ? "多头趋势" : "等待确认"}
          </div>
        </div>
        <div>
          <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500">当前法则</span>
          <div className="mt-2 text-lg font-bold text-cyan-400">{currentRule}</div>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {checks.map((check) => (
          <div
            key={check.label}
            className="flex items-center gap-3 rounded-lg border border-slate-700/50 bg-slate-800/20 px-3.5 py-3 transition-all hover:bg-slate-800/40"
          >
            <span className={check.pass ? "text-emerald-400" : "text-slate-600"}>
              {check.pass ? <CheckCircle2 size={16} /> : <CircleDashed size={16} />}
            </span>
            <span className="min-w-[100px] text-xs font-medium text-slate-400">{check.label}</span>
            <span className="ml-auto text-right text-xs text-slate-300">{check.value}</span>
          </div>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Level label="支撑位" value={state.strategy.support} />
        <Level label="阻力位" value={state.strategy.resistance} />
      </div>

      {state.connection.error && (
        <div className="mt-4 flex gap-3 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-400">
          <ShieldAlert size={16} className="flex-shrink-0" />
          <span>{state.connection.error}</span>
        </div>
      )}
    </section>
  );
}
function StrategyBadge({ strategy, active }: { strategy: StrategyDashboardSummary; active: boolean }): ReactElement {
  const unavailable = strategy.status === "unavailable";
  return (
    <div className={`flex items-center gap-3 rounded-lg border px-3.5 py-3 transition-all ${
      active
        ? "border-blue-500/30 bg-blue-500/10"
        : "border-slate-700/50 bg-slate-800/20"
    }`}>
      <span className={`h-2 w-2 rounded-full ${
        active && strategy.status === "running"
          ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)] animate-pulse"
          : "bg-slate-600"
      }`} />
      <div className="min-w-0 flex-1">
        <strong className="block truncate text-sm font-semibold text-slate-200">{strategy.name}</strong>
        <span className="text-xs text-slate-500">
          {unavailable ? "执行器尚未接入" : active ? "当前授权执行引擎" : "已注册 · 未授权"} · {strategy.category}
        </span>
      </div>
      <span className={`text-xs font-medium ${
        active && strategy.status === "running" ? "text-emerald-400" : "text-slate-500"
      }`}>
        {unavailable ? "不可执行" : active && strategy.status === "running" ? "运行中" : "已停止"}
      </span>
    </div>
  );
}

function Level({ label, value }: { label: string; value: number | null }): ReactElement {
  return (
    <div className="rounded-lg border border-slate-700/50 bg-slate-800/20 p-3">
      <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500">{label}</span>
      <strong className="mt-2 block font-mono text-sm font-semibold text-slate-200">
        {value ? formatMoney(value) : "--"}
      </strong>
    </div>
  );
}
