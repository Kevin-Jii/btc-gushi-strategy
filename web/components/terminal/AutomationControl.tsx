import { Pause, Play, ShieldCheck } from "lucide-react";
import { useState } from "react";
import type { ReactElement } from "react";
import type { DashboardState } from "../../../src/dashboard/dashboard-types";

export function AutomationControl({ state }: { state: DashboardState }): ReactElement {
  const [selected, setSelected] = useState<string[]>(state.automation.strategyIds);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const toggleStrategy = (id: string, supported: boolean): void => {
    if (!supported) return;
    setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };
  const submit = async (): Promise<void> => {
    setLoading(true);
    try {
      const response = await fetch("/api/automation", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ strategyIds: selected, password }) });
      if (!response.ok) throw new Error((await response.json() as { error?: string }).error ?? "策略状态切换失败");
      setPassword("");
    } catch (error) { window.alert(error instanceof Error ? error.message : "策略状态切换失败"); }
    finally { setLoading(false); }
  };
  return <section className="terminal-panel p-4"><div className="flex items-start justify-between gap-3"><div><span className="terminal-eyebrow">STRATEGY AUTHORIZATION</span><h2 className="terminal-title">策略执行授权</h2></div><span className={`terminal-status-pill ${state.automation.enabled ? "bg-profit/10 text-profit" : "bg-warning/10 text-warning"}`}>{state.automation.enabled ? "执行中" : "未启动"}</span></div><p className="mt-3 text-xs leading-5 text-muted">选择要执行的策略。启动、变更和停止策略都必须经过服务端密码校验。</p><div className="mt-3 grid gap-2">{state.strategies.map((strategy) => <label key={strategy.id} className={`flex items-center gap-3 rounded border px-3 py-2 ${strategy.executionSupported ? "cursor-pointer border-line bg-bg/35" : "border-line/60 bg-bg/15 opacity-60"}`}><input type="checkbox" checked={selected.includes(strategy.id)} disabled={!strategy.executionSupported} onChange={() => toggleStrategy(strategy.id, strategy.executionSupported)} /><span className="min-w-0 flex-1"><strong className="block text-xs">{strategy.name}</strong><span className="text-[10px] text-muted">{strategy.executionSupported ? "可执行" : "执行器尚未接入"}</span></span><span className="text-[10px] text-muted">{strategy.status === "running" ? "运行中" : strategy.status === "unavailable" ? "不可用" : "已停止"}</span></label>)}</div><div className="mt-3 flex gap-2"><input className="h-9 min-w-0 flex-1 rounded border border-warning/35 bg-bg px-3 font-mono text-sm text-ink" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="策略执行密码" /><button className={`flex items-center gap-2 rounded border px-3 text-xs ${state.automation.enabled ? "border-warning/40 bg-warning/10 text-warning" : "border-profit/40 bg-profit/10 text-profit"}`} disabled={loading || !password} onClick={() => void submit()}>{state.automation.enabled ? <Pause size={14} /> : <Play size={14} />}{loading ? "校验中…" : state.automation.enabled ? "停止/更新" : "启动策略"}</button></div><div className="mt-3 flex items-center gap-2 text-[10px] text-muted"><ShieldCheck size={13} className="text-cyan" />{state.ai.enabled ? "AI 审核放行后才自动开仓" : "按确定性策略信号自动运行"}</div></section>;
}
