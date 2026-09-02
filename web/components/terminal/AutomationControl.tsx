import { Pause, Play, ShieldCheck } from "lucide-react";
import { useState } from "react";
import type { ReactElement } from "react";
import type { DashboardState } from "../../../src/dashboard/dashboard-types";

export function AutomationControl({ state }: { state: DashboardState }): ReactElement {
  const [loading, setLoading] = useState(false);
  const toggle = async (): Promise<void> => {
    setLoading(true);
    try {
      const response = await fetch("/api/automation", { method: "POST" });
      if (!response.ok) throw new Error((await response.json() as { error?: string }).error ?? "策略状态切换失败");
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "策略状态切换失败");
    } finally { setLoading(false); }
  };
  const enabled = state.automation.enabled;
  return <section className="terminal-panel p-4">
    <div className="flex items-start justify-between gap-3"><div><span className="terminal-eyebrow">AUTOMATED STRATEGY</span><h2 className="terminal-title">策略自动运行</h2></div><span className={`terminal-status-pill ${enabled ? "bg-profit/10 text-profit" : "bg-warning/10 text-warning"}`}>{enabled ? "监控中" : "已暂停"}</span></div>
    <p className="mt-3 text-xs leading-5 text-muted">{state.automation.label} 持续监控收盘 K 线。符合入场条件时由 AI 审核后自动下单，卖出条件、固定止损和移动止损自动平仓。</p>
    <div className="mt-3 flex items-center gap-2 rounded border border-line bg-bg/35 px-3 py-2 text-[11px] text-muted"><ShieldCheck size={14} className="text-cyan" />{state.ai.enabled ? "AI 审核已启用：未放行不会开仓" : "AI 未启用：按确定性策略信号运行"}</div>
    <button className={`mt-3 flex w-full items-center justify-center gap-2 rounded border px-3 py-2.5 text-sm ${enabled ? "border-warning/40 bg-warning/10 text-warning" : "border-profit/40 bg-profit/10 text-profit"}`} disabled={loading || !state.connection.market} onClick={() => void toggle()}>{enabled ? <Pause size={15} /> : <Play size={15} />}{loading ? "处理中…" : enabled ? "暂停策略自动交易" : "启动策略自动交易"}</button>
    {enabled && <div className="mt-2 text-[10px] text-warning">暂停后不会新开仓；已有持仓仍按退出规则管理。</div>}
  </section>;
}
