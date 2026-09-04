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
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "策略状态切换失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="rounded-xl border border-slate-800/50 bg-slate-900/50 p-5 backdrop-blur-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <span className="text-[9px] font-bold uppercase tracking-widest text-slate-600">STRATEGY AUTHORIZATION</span>
          <h2 className="mt-1 text-base font-bold text-slate-100">策略执行授权</h2>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${state.automation.enabled ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"}`}>
          {state.automation.enabled ? "执行中" : "未启动"}
        </span>
      </div>

      <p className="mt-3 text-xs leading-relaxed text-slate-400">
        选择要执行的策略。启动、变更和停止策略都必须经过服务端密码校验。
      </p>

      <div className="mt-4 space-y-2">
        {state.strategies.map((strategy) => (
          <label
            key={strategy.id}
            className={`flex items-center gap-3 rounded-lg border px-3.5 py-3 transition-all ${
              strategy.executionSupported
                ? "cursor-pointer border-slate-700/50 bg-slate-800/30 hover:border-slate-600/50 hover:bg-slate-800/50"
                : "border-slate-800/30 bg-slate-900/20 opacity-50"
            }`}
          >
            <input
              type="checkbox"
              checked={selected.includes(strategy.id)}
              disabled={!strategy.executionSupported}
              onChange={() => toggleStrategy(strategy.id, strategy.executionSupported)}
              className="h-4 w-4 cursor-pointer rounded border-slate-600 bg-slate-700 text-blue-500 focus:ring-2 focus:ring-blue-500/20"
            />
            <span className="min-w-0 flex-1">
              <strong className="block text-sm font-semibold text-slate-200">{strategy.name}</strong>
              <span className="text-xs text-slate-500">
                {strategy.executionSupported ? "可执行" : "执行器尚未接入"}
              </span>
            </span>
            <span className={`text-xs ${strategy.status === "running" ? "text-emerald-400" : "text-slate-500"}`}>
              {strategy.status === "running" ? "运行中" : strategy.status === "unavailable" ? "不可用" : "已停止"}
            </span>
          </label>
        ))}
      </div>

      <div className="mt-4 flex gap-2">
        <input
          className="h-10 min-w-0 flex-1 rounded-lg border border-amber-500/20 bg-slate-900/50 px-3 font-mono text-sm text-slate-100 placeholder-slate-600 focus:border-amber-500/40 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="策略执行密码"
        />
        <button
          className={`flex items-center gap-2 rounded-lg px-4 text-sm font-semibold transition-all active:scale-95 ${
            state.automation.enabled
              ? "border border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
              : "border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
          }`}
          disabled={loading || !password}
          onClick={() => void submit()}
        >
          {state.automation.enabled ? <Pause size={16} /> : <Play size={16} />}
          {loading ? "校验中…" : state.automation.enabled ? "停止/更新" : "启动策略"}
        </button>
      </div>

      <div className="mt-4 flex items-center gap-2 rounded-lg bg-cyan-500/5 px-3 py-2 text-xs text-cyan-400">
        <ShieldCheck size={14} />
        {state.ai.enabled ? "AI 审核放行后才自动开仓" : "按确定性策略信号自动运行"}
      </div>
    </section>
  );
}
