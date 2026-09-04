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
    <section className="rounded-lg border border-slate-800/50 bg-slate-900/50 p-3 backdrop-blur-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/10">
            <ShieldCheck size={14} className="text-purple-400" />
          </div>
          <h2 className="text-sm font-bold text-slate-100">策略授权</h2>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${state.automation.enabled ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"}`}>
          {state.automation.enabled ? "执行中" : "未启动"}
        </span>
      </div>

      <div className="mt-3 space-y-1.5">
        {state.strategies.map((strategy) => (
          <label
            key={strategy.id}
            className={`flex items-center gap-2 rounded border px-2 py-1.5 text-xs transition-all ${
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
              className="h-3.5 w-3.5 cursor-pointer rounded border-slate-600 bg-slate-700 text-blue-500"
            />
            <span className="min-w-0 flex-1">
              <strong className="block truncate text-xs font-semibold text-slate-200">{strategy.name}</strong>
            </span>
            <span className={`text-[10px] ${strategy.status === "running" ? "text-emerald-400" : "text-slate-500"}`}>
              {strategy.status === "running" ? "运行" : strategy.status === "unavailable" ? "不可用" : "停止"}
            </span>
          </label>
        ))}
      </div>

      <div className="mt-3 flex gap-1.5">
        <input
          className="h-8 min-w-0 flex-1 rounded border border-amber-500/20 bg-slate-900/50 px-2 text-xs text-slate-100 placeholder-slate-600 focus:border-amber-500/40 focus:outline-none"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="执行密码"
        />
        <button
          className={`flex items-center gap-1.5 rounded px-3 text-xs font-semibold transition-all active:scale-95 ${
            state.automation.enabled
              ? "border border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
              : "border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20"
          }`}
          disabled={loading || !password}
          onClick={() => void submit()}
        >
          {state.automation.enabled ? <Pause size={12} /> : <Play size={12} />}
          {loading ? "校验中" : state.automation.enabled ? "停止" : "启动"}
        </button>
      </div>

      <div className="mt-2 flex items-center gap-1.5 rounded bg-cyan-500/5 px-2 py-1.5 text-[10px] text-cyan-400">
        <ShieldCheck size={11} />
        {state.ai.enabled ? "AI 审核后开仓" : "策略自动运行"}
      </div>
    </section>
  );
}
