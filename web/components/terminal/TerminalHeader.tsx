import { Bell, Bot, Settings2, Wifi, WifiOff } from "lucide-react";
import { useState, Suspense, lazy } from "react";
import type { ReactElement } from "react";
import type { DashboardState } from "../../../src/dashboard/dashboard-types";
import { Select } from "../ui/Select";
import { Tag } from "../ui/Tag";
import { Drawer } from "../ui/Drawer";

const AiAnalysisPanel = lazy(() => import("./AiAnalysisPanel").then((module) => ({ default: module.AiAnalysisPanel })));
const AutomationControl = lazy(() => import("./AutomationControl").then((module) => ({ default: module.AutomationControl })));
const StrategyStatusPanel = lazy(() => import("./StrategyStatusPanel").then((module) => ({ default: module.StrategyStatusPanel })));

function PanelFallback(): ReactElement {
  return <div className="min-h-20 animate-pulse rounded-lg bg-slate-800/30 p-3 text-xs text-slate-500">加载中…</div>;
}

export function TerminalHeader({ state, onSymbolChange }: { state: DashboardState; onSymbolChange: (symbol: string) => void }): ReactElement {
  const [aiDrawerOpen, setAiDrawerOpen] = useState(false);
  const [settingsDrawerOpen, setSettingsDrawerOpen] = useState(false);
  const [notificationDrawerOpen, setNotificationDrawerOpen] = useState(false);

  const connected = state.connection.market && state.connection.userData;
  const candle = state.market.latestCandle;
  const change = candle?.open ? ((state.market.latestPrice - candle.open) / candle.open) * 100 : 0;

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-slate-800/50 bg-slate-900/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1920px] items-center gap-3 px-3 py-2">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 text-lg font-bold shadow-lg shadow-amber-500/20">
              ₿
            </div>
            <h1 className="m-0 text-sm font-bold text-white">葛氏策略</h1>
          </div>

          {/* Price */}
          <div className="flex-1">
            <div className={`font-mono text-xl font-bold lg:text-2xl ${change >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
              {state.market.latestPrice ? state.market.latestPrice.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "--"}
              <span className="ml-2 text-xs font-normal text-slate-500">{state.account.quoteAsset}</span>
              <span className={`ml-2 text-xs ${change >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                {change >= 0 ? "▲" : "▼"}{change.toFixed(2)}%
              </span>
            </div>
          </div>

          {/* Stats */}
          {candle && (
            <div className="hidden gap-4 text-[10px] xl:flex">
              <span className="text-slate-400">高 <b className="font-mono text-emerald-400">{candle.high.toFixed(2)}</b></span>
              <span className="text-slate-400">低 <b className="font-mono text-rose-400">{candle.low.toFixed(2)}</b></span>
              <span className="text-slate-400">量 <b className="font-mono text-slate-200">{candle.volume.toFixed(2)}</b></span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-1.5">
            <Tag color={state.mode === "live" ? "red" : "blue"} size="small">
              {state.mode === "live" ? "实盘" : "模拟"}
            </Tag>
            <div className={`flex h-6 w-6 items-center justify-center rounded ${connected ? "bg-emerald-500/10" : "bg-amber-500/10"}`}>
              {connected ? <Wifi size={12} className="text-emerald-400" /> : <WifiOff size={12} className="text-amber-400" />}
            </div>
            <button
              onClick={() => setAiDrawerOpen(true)}
              className="flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-slate-800/50"
              title="AI 分析"
            >
              <Bot size={12} className={state.ai.enabled ? "text-cyan-400" : "text-slate-500"} />
            </button>
            <button
              onClick={() => setNotificationDrawerOpen(true)}
              className="relative flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-slate-800/50"
              title="运行日志"
            >
              <Bell size={12} className="text-slate-400" />
              {state.activity.length > 0 && (
                <span className="absolute right-0 top-0 h-2 w-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)]" />
              )}
            </button>
            <button
              onClick={() => setSettingsDrawerOpen(true)}
              className="flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-slate-800/50"
              title="策略设置"
            >
              <Settings2 size={12} className="text-slate-400" />
            </button>
            <Select
              className="ml-1 min-w-[120px]"
              value={state.symbol}
              onChange={onSymbolChange}
              options={state.instruments.length ? state.instruments.map((item) => ({ value: item.symbol, label: item.symbol })) : [{ value: state.symbol, label: state.symbol }]}
            />
          </div>
        </div>
      </header>

      {/* AI 分析 Drawer */}
      <Drawer open={aiDrawerOpen} onClose={() => setAiDrawerOpen(false)} title="AI 智能分析" width="800px">
        <Suspense fallback={<PanelFallback />}>
          <AiAnalysisPanel state={state} />
        </Suspense>
      </Drawer>

      {/* 策略设置 Drawer */}
      <Drawer open={settingsDrawerOpen} onClose={() => setSettingsDrawerOpen(false)} title="策略设置" width="600px" position="right">
        <div className="space-y-4">
          <Suspense fallback={<PanelFallback />}>
            <AutomationControl state={state} />
          </Suspense>
          <Suspense fallback={<PanelFallback />}>
            <StrategyStatusPanel state={state} />
          </Suspense>
        </div>
      </Drawer>

      {/* 运行日志 Drawer */}
      <Drawer open={notificationDrawerOpen} onClose={() => setNotificationDrawerOpen(false)} title="运行日志" width="500px" position="right">
        <div className="space-y-2">
          {state.activity.length > 0 ? (
            state.activity.map((item) => (
              <div
                key={item.id}
                className="group rounded-lg border border-slate-700/50 bg-slate-800/30 p-3 transition-all hover:bg-slate-800/50"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <strong className="block text-sm font-semibold text-slate-200">{item.title}</strong>
                    <p className="mt-1 text-xs text-slate-400">{item.detail}</p>
                  </div>
                  <time className="text-xs text-slate-500">
                    {new Date(item.at).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                  </time>
                </div>
                <div className="mt-2 text-[10px] text-slate-600">
                  类型: {item.type === "ai" ? "AI 审核" : item.type === "order" ? "订单" : "数据库"}
                </div>
              </div>
            ))
          ) : (
            <div className="grid min-h-32 place-items-center rounded-lg border border-dashed border-slate-700/50 bg-slate-800/20 text-center">
              <div>
                <div className="mb-2 text-sm text-slate-400">暂无运行日志</div>
                <div className="text-xs text-slate-600">系统活动将在此显示</div>
              </div>
            </div>
          )}
        </div>
      </Drawer>
    </>
  );
}
