import { Select, Tag } from "@douyinfe/semi-ui";
import { Bell, Bot, Settings2, Wifi, WifiOff } from "lucide-react";
import type { ReactElement } from "react";
import type { DashboardState } from "../../../src/dashboard/dashboard-types";

export function TerminalHeader({ state, onSymbolChange }: { state: DashboardState; onSymbolChange: (symbol: string) => void }): ReactElement {
  const connected = state.connection.market && state.connection.userData;
  const candle = state.market.latestCandle;
  const change = candle?.open ? ((state.market.latestPrice - candle.open) / candle.open) * 100 : 0;

  return (
    <header className="sticky top-0 z-50 border-b border-slate-800/50 bg-slate-900/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1920px] items-center gap-6 px-4 py-4">
        {/* Logo & Brand */}
        <div className="flex min-w-[180px] items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-2xl font-bold shadow-lg shadow-amber-500/20">
            ₿
          </div>
          <div>
            <h1 className="m-0 text-base font-bold tracking-tight text-white">葛氏策略</h1>
            <p className="m-0 text-[10px] font-medium tracking-wider text-slate-400">QUANT TERMINAL</p>
          </div>
        </div>

        {/* Connection Status */}
        <div className="hidden lg:block">
          <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500">市场状态</span>
          <span className={`mt-1 flex items-center gap-2 text-xs font-semibold ${connected ? "text-emerald-400" : "text-amber-400"}`}>
            {connected ? <Wifi size={14} /> : <WifiOff size={14} />}
            {connected ? "实时连接" : "连接中"}
          </span>
        </div>

        {/* Price Display */}
        <div className="min-w-0 flex-1">
          <div className={`font-mono text-3xl font-bold tracking-tight lg:text-4xl ${change >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
            {state.market.latestPrice ? state.market.latestPrice.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "--"}
            <span className="ml-3 text-sm font-normal text-slate-500">{state.account.quoteAsset}</span>
          </div>
          <div className={`mt-0.5 font-mono text-sm font-semibold ${change >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
            {change >= 0 ? "▲" : "▼"} {change >= 0 ? "+" : ""}{change.toFixed(2)}%
          </div>
        </div>

        {/* 24H Stats */}
        {candle && (
          <div className="hidden gap-8 xl:flex">
            <HeaderStat label="24H 最高" value={candle.high} />
            <HeaderStat label="24H 最低" value={candle.low} />
            <HeaderStat label="24H 成交量" value={candle.volume} />
          </div>
        )}

        {/* Actions */}
        <div className="ml-auto flex items-center gap-2">
          <Tag
            color={state.mode === "live" ? "red" : "blue"}
            size="small"
            className="font-semibold"
          >
            {state.mode === "live" ? "真实盘" : "模拟盘"}
          </Tag>
          <button
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700/50 bg-slate-800/50 transition-all hover:border-slate-600 hover:bg-slate-700/50"
            title="AI 审核"
          >
            <Bot size={16} className={state.ai.enabled ? "text-cyan-400" : "text-slate-500"} />
          </button>
          <button
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700/50 bg-slate-800/50 transition-all hover:border-slate-600 hover:bg-slate-700/50"
            title="通知"
          >
            <Bell size={16} className="text-slate-400" />
          </button>
          <button
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700/50 bg-slate-800/50 transition-all hover:border-slate-600 hover:bg-slate-700/50"
            title="设置"
          >
            <Settings2 size={16} className="text-slate-400" />
          </button>
          <Select
            className="ml-2 min-w-[160px]"
            value={state.symbol}
            onChange={(value) => onSymbolChange(String(value))}
            optionList={state.instruments.length ? state.instruments.map((item) => ({ value: item.symbol, label: item.symbol })) : [{ value: state.symbol, label: state.symbol }]}
          />
        </div>
      </div>
    </header>
  );
}
function HeaderStat({ label, value }: { label: string; value: number }): ReactElement {
  return (
    <div>
      <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500">{label}</span>
      <strong className="mt-1.5 block font-mono text-sm font-semibold text-slate-200">
        {value.toLocaleString("en-US", { maximumFractionDigits: 2 })}
      </strong>
    </div>
  );
}
