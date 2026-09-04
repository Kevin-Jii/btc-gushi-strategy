import { Activity, Bot, Database, ReceiptText } from "lucide-react";
import type { ReactElement } from "react";
import type { DashboardState } from "../../../src/dashboard/dashboard-types";
export function ActivityTimeline({ state }: { state: DashboardState }): ReactElement {
  return (
    <section className="rounded-xl border border-slate-800/50 bg-slate-900/50 p-5 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-500/10">
          <Activity size={18} className="text-cyan-400" />
        </div>
        <h2 className="text-base font-bold text-slate-100">运行日志</h2>
        <span className="ml-auto text-xs text-slate-500">最近 {Math.min(state.activity.length, 6)} 条</span>
      </div>

      <div className="mt-4 max-h-[440px] space-y-1 overflow-auto">
        {state.activity.slice(0, 6).map((item) => (
          <div
            key={item.id}
            className="group grid grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 transition-all hover:border-slate-700/50 hover:bg-slate-800/30"
          >
            <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${
              item.type === "ai" ? "bg-purple-500/10 text-purple-400" :
              item.type === "order" ? "bg-blue-500/10 text-blue-400" :
              "bg-slate-500/10 text-slate-400"
            }`}>
              {item.type === "ai" ? <Bot size={14} /> : item.type === "order" ? <ReceiptText size={14} /> : <Database size={14} />}
            </div>
            <div className="min-w-0">
              <strong className="block truncate text-xs font-semibold text-slate-200">{item.title}</strong>
              <span className="block truncate text-[10px] text-slate-500">{item.detail}</span>
            </div>
            <time className="font-mono text-[10px] text-slate-500 transition-colors group-hover:text-slate-400">
              {new Date(item.at).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}
            </time>
          </div>
        ))}

        {state.activity.length === 0 && (
          <div className="grid min-h-32 place-items-center rounded-lg border border-dashed border-slate-700/50 bg-slate-800/20 py-12 text-center">
            <div>
              <div className="mb-2 text-sm text-slate-400">暂无运行日志</div>
              <div className="text-xs text-slate-600">系统活动将在此显示</div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
