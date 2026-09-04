import { Activity, Bot, Database, ReceiptText } from "lucide-react";
import type { ReactElement } from "react";
import type { DashboardState } from "../../../src/dashboard/dashboard-types";
export function ActivityTimeline({ state }: { state: DashboardState }): ReactElement {
  return (
    <section className="rounded-lg border border-slate-800/50 bg-slate-900/50 p-3 backdrop-blur-sm">
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-500/10">
          <Activity size={14} className="text-cyan-400" />
        </div>
        <h2 className="text-sm font-bold text-slate-100">日志</h2>
        <span className="ml-auto text-[10px] text-slate-500">最近 {Math.min(state.activity.length, 6)} 条</span>
      </div>

      <div className="mt-3 max-h-[360px] space-y-1 overflow-auto">
        {state.activity.slice(0, 6).map((item) => (
          <div
            key={item.id}
            className="group grid grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-2 rounded px-2 py-2 transition-all hover:bg-slate-800/30"
          >
            <div className={`flex h-6 w-6 items-center justify-center rounded ${
              item.type === "ai" ? "bg-purple-500/10 text-purple-400" :
              item.type === "order" ? "bg-blue-500/10 text-blue-400" :
              "bg-slate-500/10 text-slate-400"
            }`}>
              {item.type === "ai" ? <Bot size={12} /> : item.type === "order" ? <ReceiptText size={12} /> : <Database size={12} />}
            </div>
            <div className="min-w-0">
              <strong className="block truncate text-[11px] font-semibold text-slate-200">{item.title}</strong>
              <span className="block truncate text-[9px] text-slate-500">{item.detail}</span>
            </div>
            <time className="font-mono text-[9px] text-slate-500">
              {new Date(item.at).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}
            </time>
          </div>
        ))}

        {state.activity.length === 0 && (
          <div className="grid min-h-24 place-items-center rounded border border-dashed border-slate-700/50 bg-slate-800/20 py-8 text-center">
            <div>
              <div className="mb-1 text-xs text-slate-400">暂无日志</div>
              <div className="text-[10px] text-slate-600">活动将在此显示</div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
