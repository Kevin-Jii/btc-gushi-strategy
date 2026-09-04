import { LoaderCircle, Send, Sparkles } from "lucide-react";
import { useState } from "react";
import type { ReactElement } from "react";
import type { DashboardState } from "../../../src/dashboard/dashboard-types";
export function PromptBar({ state, message, onMessageChange }: { state: DashboardState; message: string; onMessageChange: (message: string) => void }): ReactElement {
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (): Promise<void> => {
    if (!message.trim() || loading) return;
    setLoading(true);
    try {
      const response = await fetch("/api/ai-chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message }) });
      const body = await response.json() as { answer?: string; error?: string };
      if (!response.ok) throw new Error(body.error ?? "AI 对话失败");
      setAnswer(body.answer ?? "AI 没有返回内容");
      onMessageChange("");
    } catch (error) {
      setAnswer(error instanceof Error ? error.message : "AI 对话失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-x-4 bottom-4 z-40 mx-auto max-w-3xl">
      <div className="rounded-xl border border-cyan-500/30 bg-slate-900/95 p-3 shadow-2xl backdrop-blur-xl">
        <div className="flex items-center gap-2.5 px-2 text-xs text-cyan-400">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-cyan-500/10">
            <Sparkles size={14} />
          </div>
          <span className="font-medium">实时订单监控 AI</span>
          <span className="text-slate-500">·</span>
          <span className="text-slate-400">{state.orders.length} 条订单</span>
          <span className="text-slate-500">·</span>
          <span className={state.position ? "text-emerald-400" : "text-slate-400"}>
            {state.position ? "当前有持仓" : "当前空仓"}
          </span>
        </div>

        {answer && (
          <div className="mt-3 rounded-lg border border-slate-700/50 bg-slate-800/30 px-3 py-2.5 text-sm leading-relaxed text-slate-200">
            {answer}
          </div>
        )}

        <div className="mt-3 flex items-center gap-2">
          <input
            className="h-10 min-w-0 flex-1 rounded-lg bg-slate-800/50 px-4 text-sm text-slate-100 placeholder-slate-500 outline-none transition-all focus:bg-slate-800/80 focus:ring-2 focus:ring-cyan-500/20"
            value={message}
            onChange={(event) => onMessageChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void submit();
            }}
            placeholder="询问实时订单、持仓、收益或风控状态…"
          />
          <button
            className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500/15 text-cyan-400 transition-all hover:bg-cyan-500/25 active:scale-95 disabled:opacity-40"
            disabled={loading || !state.ai.enabled || !message.trim()}
            onClick={() => void submit()}
            title="发送给 AI"
          >
            {loading ? <LoaderCircle size={18} className="animate-spin" /> : <Send size={18} />}
          </button>
        </div>
      </div>
    </div>
  );
}
