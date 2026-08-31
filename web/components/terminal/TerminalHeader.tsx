import { Select, Tag } from "@douyinfe/semi-ui";
import { Bell, Bot, Settings2, Wifi, WifiOff } from "lucide-react";
import type { ReactElement } from "react";
import type { DashboardState } from "../../../src/dashboard/dashboard-types";

export function TerminalHeader({ state, onSymbolChange }: { state: DashboardState; onSymbolChange: (symbol: string) => void }): ReactElement {
  const connected = state.connection.market && state.connection.userData;
  const candle = state.market.latestCandle;
  const change = candle?.open ? ((state.market.latestPrice - candle.open) / candle.open) * 100 : 0;
  return <header className="terminal-header">
    <div className="flex min-w-45 items-center gap-3"><span className="terminal-btc-logo">₿</span><div><h1 className="m-0 text-base font-semibold">葛氏策略</h1><p className="m-0 text-[10px] text-muted">Quant Terminal</p></div></div>
    <div className="hidden lg:block"><span className="terminal-label">市场状态</span><span className={`mt-1 flex items-center gap-1.5 text-xs ${connected ? "text-profit" : "text-warning"}`}>{connected ? <Wifi size={12} /> : <WifiOff size={12} />}{connected ? "实时" : "连接中"}</span></div>
    <div className="min-w-0 flex-1"><div className={`font-mono text-2xl font-semibold lg:text-3xl ${change >= 0 ? "text-profit" : "text-loss"}`}>{state.market.latestPrice ? state.market.latestPrice.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "--"}<span className="ml-2 text-xs font-normal text-muted">{state.account.quoteAsset}</span></div><div className={`font-mono text-xs ${change >= 0 ? "text-profit" : "text-loss"}`}>{change >= 0 ? "+" : ""}{change.toFixed(2)}%</div></div>
    {candle && <div className="hidden gap-8 xl:flex"><HeaderStat label="24H 最高" value={candle.high} /><HeaderStat label="24H 最低" value={candle.low} /><HeaderStat label="24H 成交量" value={candle.volume} /></div>}
    <div className="ml-auto flex items-center gap-1"><Tag color={state.mode === "live" ? "red" : "blue"} size="small">{state.mode === "live" ? "真实盘" : "模拟盘"}</Tag><button className="terminal-icon-button" title="AI 审核"><Bot size={16} className={state.ai.enabled ? "text-cyan" : "text-muted"} /></button><button className="terminal-icon-button" title="通知"><Bell size={16} /></button><button className="terminal-icon-button" title="设置"><Settings2 size={16} /></button><Select className="ml-1 min-w-40" value={state.symbol} onChange={(value) => onSymbolChange(String(value))} optionList={state.instruments.length ? state.instruments.map((item) => ({ value: item.symbol, label: item.symbol })) : [{ value: state.symbol, label: state.symbol }]} /></div>
  </header>;
}
function HeaderStat({ label, value }: { label: string; value: number }): ReactElement { return <div><span className="terminal-label">{label}</span><strong className="mt-1 block font-mono text-xs">{value.toLocaleString("en-US", { maximumFractionDigits: 2 })}</strong></div>; }
