import type { ReactElement } from "react";
import type { DashboardState } from "../../../src/dashboard/dashboard-types";
import { ActivityTimeline } from "./ActivityTimeline";
import { AiAnalysisPanel } from "./AiAnalysisPanel";
import { MarketWorkspace } from "./MarketWorkspace";
import { PerformanceStrip } from "./PerformanceStrip";
import { PositionSummary } from "./PositionSummary";
import { StrategyStatusPanel } from "./StrategyStatusPanel";
import { TerminalHeader } from "./TerminalHeader";
import { TradeControl } from "./TradeControl";
export function TerminalDashboard({ state, onIntervalChange, onSymbolChange }: { state: DashboardState; onIntervalChange: (interval: string) => void; onSymbolChange: (symbol: string) => void }): ReactElement { return <div className="min-h-screen bg-bg text-ink"><TerminalHeader state={state} onSymbolChange={onSymbolChange} /><main className="mx-auto grid max-w-[1920px] gap-3 p-3"><PerformanceStrip state={state} /><div className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,2.15fr)_minmax(340px,.85fr)]"><MarketWorkspace state={state} onIntervalChange={onIntervalChange} /><aside className="grid content-start gap-3"><TradeControl state={state} /><StrategyStatusPanel state={state} /></aside></div><div className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(420px,1fr)]"><div className="grid content-start gap-3"><PositionSummary state={state} /><ActivityTimeline state={state} /></div><AiAnalysisPanel state={state} /></div><footer className="flex flex-wrap items-center gap-4 border-t border-line px-1 py-2 text-[9px] text-muted"><span className={state.connection.market ? "text-profit" : "text-warning"}>● 行情 API {state.connection.market ? "正常" : "断开"}</span><span className={state.connection.userData ? "text-profit" : "text-warning"}>● 账户流 {state.connection.userData ? "正常" : "断开"}</span><span>策略快照持续写入 PostgreSQL</span><span className="ml-auto">更新时间 {state.updatedAt ? new Date(state.updatedAt).toLocaleString("zh-CN") : "--"}</span></footer></main></div>; }
