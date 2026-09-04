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
    <div className="fixed inset-x-3 bottom-3 z-40 mx-auto max-w-3xl">
      <div className="rounded-lg border border-cyan-500/30 bg-slate-900/95 p-2.5 shadow-2xl backdrop-blur-xl">
        <div className="flex items-center gap-2 px-2 text-[10px] text-cyan-400">
          <div className="flex h-5 w-5 items-center justify-center rounded bg-cyan-500/10">
            <Sparkles size={12} />
          </div>
          <span className="font-medium">AI 监控</span>
          <span className="text-slate-500">·</span>
          <span className="text-slate-400">{state.orders.length} 订单</span>
          <span className="text-slate-500">·</span>
          <span className={state.position ? "text-emerald-400" : "text-slate-400"}>
            {state.position ? "持仓" : "空仓"}
          </span>
        </div>

        {answer && (
          <div className="mt-2 rounded border border-slate-700/50 bg-slate-800/30 px-2.5 py-2 text-xs leading-relaxed text-slate-200">
            {answer}
          </div>
        )}

        <div className="mt-2 flex items-center gap-1.5">
          <input
            className="h-8 min-w-0 flex-1 rounded bg-slate-800/50 px-3 text-xs text-slate-100 placeholder-slate-500 outline-none transition-all focus:bg-slate-800/80"
            value={message}
            onChange={(event) => onMessageChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void submit();
            }}
            placeholder="询问订单、持仓、收益或风控状态…"
          />
          <button
            className="flex h-8 w-8 items-center justify-center rounded bg-cyan-500/15 text-cyan-400 transition-all hover:bg-cyan-500/25 active:scale-95 disabled:opacity-40"
            disabled={loading || !state.ai.enabled || !message.trim()}
            onClick={() => void submit()}
            title="发送"
          >
            {loading ? <LoaderCircle size={14} className="animate-spin" /> : <Send size={14} />}
          </button>
        </div>
      </div>
    </div>
  );
}
