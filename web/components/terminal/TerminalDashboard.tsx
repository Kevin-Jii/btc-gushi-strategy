import { lazy, Suspense, useState } from "react";
import type { ReactElement } from "react";
import type { DashboardState } from "../../../src/dashboard/dashboard-types";
import { ActivityTimeline } from "./ActivityTimeline";
import { MarketWorkspace } from "./MarketWorkspace";
import { PerformanceStrip } from "./PerformanceStrip";
import { PositionSummary } from "./PositionSummary";
import { StrategyStatusPanel } from "./StrategyStatusPanel";
import { TerminalHeader } from "./TerminalHeader";
import { PromptBar } from "./PromptBar";
import { Drawer } from "../ui/Drawer";

const AutomationControl = lazy(() => import("./AutomationControl").then((module) => ({ default: module.AutomationControl })));
const TradeControl = lazy(() => import("./TradeControl").then((module) => ({ default: module.TradeControl })));
const AiAnalysisPanel = lazy(() => import("./AiAnalysisPanel").then((module) => ({ default: module.AiAnalysisPanel })));
const ExecutionList = lazy(() => import("./ExecutionList").then((module) => ({ default: module.ExecutionList })));
const BacktestPanel = lazy(() => import("./BacktestPanel").then((module) => ({ default: module.BacktestPanel })));

function PanelFallback(): ReactElement {
  return <div className="min-h-20 animate-pulse rounded-lg bg-slate-800/30 p-3 text-xs text-slate-500">加载中…</div>;
}

export function TerminalDashboard({ state, onIntervalChange, onSymbolChange, promptMessage, onPromptMessageChange }: { state: DashboardState; onIntervalChange: (interval: string) => void; onSymbolChange: (symbol: string) => void; promptMessage: string; onPromptMessageChange: (message: string) => void }): ReactElement {
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <TerminalHeader state={state} onSymbolChange={onSymbolChange} />
      <main className="mx-auto max-w-[1920px] space-y-3 p-3 pb-20">
        <PerformanceStrip state={state} />

        <div className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,2.15fr)_minmax(320px,.85fr)]">
          <MarketWorkspace state={state} onIntervalChange={onIntervalChange} />
          <aside className="grid content-start gap-3">
            <Suspense fallback={<PanelFallback />}>
              <AutomationControl state={state} />
            </Suspense>
            <Suspense fallback={<PanelFallback />}>
              <TradeControl state={state} />
            </Suspense>
            <StrategyStatusPanel state={state} />
          </aside>
        </div>

        <div className="grid min-w-0 gap-3 xl:grid-cols-2">
          <PositionSummary state={state} />
          <ActivityTimeline state={state} />
        </div>

        {/* AI 分析按钮 */}
        <button
          onClick={() => setAiDrawerOpen(true)}
          className="w-full rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-4 py-3 text-sm font-semibold text-cyan-400 transition-all hover:border-cyan-500/50 hover:bg-cyan-500/20"
        >
          查看 AI 行情与策略分析
        </button>

        <Suspense fallback={<PanelFallback />}>
          <ExecutionList state={state} />
        </Suspense>

        <Suspense fallback={<PanelFallback />}>
          <BacktestPanel />
        </Suspense>

        <footer className="flex flex-wrap items-center gap-4 rounded-lg border border-slate-800/50 bg-slate-900/30 px-3 py-2 text-[10px] backdrop-blur-sm">
          <span className={`flex items-center gap-1.5 ${state.connection.market ? "text-emerald-400" : "text-amber-400"}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${state.connection.market ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" : "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]"} animate-pulse`} />
            行情 {state.connection.market ? "正常" : "断开"}
          </span>
          <span className={`flex items-center gap-1.5 ${state.connection.userData ? "text-emerald-400" : "text-amber-400"}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${state.connection.userData ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" : "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]"} animate-pulse`} />
            账户流 {state.connection.userData ? "正常" : "断开"}
          </span>
          <span className="text-slate-400">策略快照 PostgreSQL</span>
          <span className="ml-auto text-slate-500">
            更新 {state.updatedAt ? new Date(state.updatedAt).toLocaleString("zh-CN") : "--"}
          </span>
        </footer>
      </main>

      {/* AI 分析 Drawer */}
      <Drawer open={aiDrawerOpen} onClose={() => setAiDrawerOpen(false)} title="AI 行情与策略分析" width="800px">
        <Suspense fallback={<PanelFallback />}>
          <AiAnalysisPanel state={state} />
        </Suspense>
      </Drawer>

      <PromptBar state={state} message={promptMessage} onMessageChange={onPromptMessageChange} />
    </div>
  );
}
