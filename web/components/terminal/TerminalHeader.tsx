import { Bell, Bot, Settings2, Wifi, WifiOff } from "lucide-react";
import type { ReactElement } from "react";
import type { DashboardState } from "../../../src/dashboard/dashboard-types";
import { Select } from "../ui/Select";
import { Tag } from "../ui/Tag";

export function TerminalHeader({ state, onSymbolChange }: { state: DashboardState; onSymbolChange: (symbol: string) => void }): ReactElement {
  const connected = state.connection.market && state.connection.userData;
  const candle = state.market.latestCandle;
  const change = candle?.open ? ((state.market.latestPrice - candle.open) / candle.open) * 100 : 0;

  return (
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
          <button className="flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-slate-800/50" title="AI">
            <Bot size={12} className={state.ai.enabled ? "text-cyan-400" : "text-slate-500"} />
          </button>
          <button className="flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-slate-800/50" title="通知">
            <Bell size={12} className="text-slate-400" />
          </button>
          <button className="flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-slate-800/50" title="设置">
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
  );
}
