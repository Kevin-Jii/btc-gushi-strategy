import { lazy, Suspense } from "react";
import type { ReactElement } from "react";
import type { DashboardState } from "../../../src/dashboard/dashboard-types";
import { ActivityTimeline } from "./ActivityTimeline";
import { MarketWorkspace } from "./MarketWorkspace";
import { PerformanceStrip } from "./PerformanceStrip";
import { PositionSummary } from "./PositionSummary";
import { StrategyStatusPanel } from "./StrategyStatusPanel";
import { TerminalHeader } from "./TerminalHeader";
import { PromptBar } from "./PromptBar";

const AutomationControl = lazy(() => import("./AutomationControl").then((module) => ({ default: module.AutomationControl })));
const TradeControl = lazy(() => import("./TradeControl").then((module) => ({ default: module.TradeControl })));
const AiAnalysisPanel = lazy(() => import("./AiAnalysisPanel").then((module) => ({ default: module.AiAnalysisPanel })));
const ExecutionList = lazy(() => import("./ExecutionList").then((module) => ({ default: module.ExecutionList })));
const BacktestPanel = lazy(() => import("./BacktestPanel").then((module) => ({ default: module.BacktestPanel })));

function PanelFallback(): ReactElement { return <div className="terminal-panel min-h-20 animate-pulse p-4 text-xs text-muted">模块加载中…</div>; }
export function TerminalDashboard({ state, onIntervalChange, onSymbolChange, promptMessage, onPromptMessageChange }: { state: DashboardState; onIntervalChange: (interval: string) => void; onSymbolChange: (symbol: string) => void; promptMessage: string; onPromptMessageChange: (message: string) => void }): ReactElement {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <TerminalHeader state={state} onSymbolChange={onSymbolChange} />
      <main className="mx-auto max-w-[1920px] space-y-4 p-4 pb-24">
        <PerformanceStrip state={state} />

        <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,2.15fr)_minmax(340px,.85fr)]">
          <MarketWorkspace state={state} onIntervalChange={onIntervalChange} />
          <aside className="grid content-start gap-4">
            <Suspense fallback={<PanelFallback />}>
              <AutomationControl state={state} />
            </Suspense>
            <Suspense fallback={<PanelFallback />}>
              <TradeControl state={state} />
            </Suspense>
            <StrategyStatusPanel state={state} />
          </aside>
        </div>

        <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(420px,1fr)]">
          <div className="grid content-start gap-4">
            <PositionSummary state={state} />
            <ActivityTimeline state={state} />
          </div>
          <Suspense fallback={<PanelFallback />}>
            <AiAnalysisPanel state={state} />
          </Suspense>
        </div>

        <Suspense fallback={<PanelFallback />}>
          <ExecutionList state={state} />
        </Suspense>

        <Suspense fallback={<PanelFallback />}>
          <BacktestPanel />
        </Suspense>

        <footer className="flex flex-wrap items-center gap-6 rounded-lg border border-slate-800/50 bg-slate-900/30 px-4 py-3 text-[10px] backdrop-blur-sm">
          <span className={`flex items-center gap-1.5 ${state.connection.market ? "text-emerald-400" : "text-amber-400"}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${state.connection.market ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" : "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]"} animate-pulse`} />
            行情 API {state.connection.market ? "正常" : "断开"}
          </span>
          <span className={`flex items-center gap-1.5 ${state.connection.userData ? "text-emerald-400" : "text-amber-400"}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${state.connection.userData ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" : "bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]"} animate-pulse`} />
            账户流 {state.connection.userData ? "正常" : "断开"}
          </span>
          <span className="text-slate-400">策略快照持续写入 PostgreSQL</span>
          <span className="ml-auto text-slate-500">
            更新时间 {state.updatedAt ? new Date(state.updatedAt).toLocaleString("zh-CN") : "--"}
          </span>
        </footer>
      </main>
      <PromptBar state={state} message={promptMessage} onMessageChange={onPromptMessageChange} />
    </div>
  );
}
