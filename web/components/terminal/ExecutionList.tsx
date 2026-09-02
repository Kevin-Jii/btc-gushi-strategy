import { Activity, CircleStop, Gauge } from "lucide-react";
import type { ReactElement } from "react";
import type { DashboardState, StrategyExecution } from "../../../src/dashboard/dashboard-types";

function money(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}`;
}

function ratio(value: number): string {
  return Number.isFinite(value) ? value.toFixed(2) : "∞";
}

function ExecutionRow({ execution }: { execution: StrategyExecution }): ReactElement {
  const active = execution.status === "running";
  return <div className="grid gap-3 border-b border-line px-3 py-3 last:border-b-0 lg:grid-cols-[minmax(180px,1.4fr)_100px_120px_120px_100px_90px_90px] lg:items-center">
    <div className="min-w-0"><div className="flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${active ? "bg-profit" : execution.status === "unavailable" ? "bg-muted" : "bg-warning"}`} /><strong className="truncate text-xs">{execution.strategyName}</strong></div><div className="mt-1 text-[10px] text-muted">{execution.symbol} · {execution.interval} · {execution.executionSupported ? "执行器已接入" : "执行器未接入"}</div></div>
    <div><span className="block text-[10px] text-muted">状态</span><strong className={`text-xs ${active ? "text-profit" : execution.status === "unavailable" ? "text-muted" : "text-warning"}`}>{active ? "运行中" : execution.status === "unavailable" ? "不可执行" : "已停止"}</strong></div>
    <div><span className="block text-[10px] text-muted">当前信号</span><strong className="text-xs text-cyan">{execution.lastSignal ?? "等待信号"}</strong></div>
    <div><span className="block text-[10px] text-muted">持仓 / 未实现</span><strong className="text-xs">{execution.position ? `${execution.position.quantity.toFixed(6)} · ${money(execution.unrealizedProfit)}` : "空仓"}</strong></div>
    <div><span className="block text-[10px] text-muted">已实现盈亏</span><strong className={execution.realizedProfit >= 0 ? "text-xs text-profit" : "text-xs text-loss"}>{money(execution.realizedProfit)}</strong></div>
    <div><span className="block text-[10px] text-muted">胜率</span><strong className="text-xs">{execution.winRatePct.toFixed(1)}%</strong></div>
    <div><span className="block text-[10px] text-muted">盈亏比</span><strong className="text-xs">{ratio(execution.profitFactor)}</strong></div>
  </div>;
}

export function ExecutionList({ state }: { state: DashboardState }): ReactElement {
  return <section className="terminal-panel overflow-hidden"><div className="flex items-start justify-between border-b border-line px-4 py-3"><div><span className="terminal-eyebrow">EXECUTION MONITOR</span><h2 className="terminal-title">策略执行列表</h2></div><div className="flex items-center gap-2 text-[10px] text-muted"><Activity size={14} className="text-cyan" />实时状态</div></div>{state.executions.length === 0 ? <div className="flex items-center gap-2 px-4 py-6 text-xs text-muted"><CircleStop size={15} />暂无策略执行记录</div> : <div>{state.executions.map((execution) => <ExecutionRow key={execution.strategyId} execution={execution} />)}</div>}<div className="flex items-center gap-2 border-t border-line px-4 py-2 text-[10px] text-muted"><Gauge size={13} className="text-cyan" />盈亏比 = 盈利交易总额 ÷ 亏损交易绝对值；没有亏损交易时显示 ∞。</div></section>;
}
