import { Modal, Select } from "@douyinfe/semi-ui";
import { ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { useEffect, useState } from "react";
import type { ReactElement } from "react";
import type { DashboardState } from "../../../src/dashboard/dashboard-types";
const options = ["1h", "1d", "1w", "1M", "1y"].map((value) => ({ value, label: value }));
export function TradeControl({ state }: { state: DashboardState }): ReactElement {
  const [open, setOpen] = useState(false); const [strategyId, setStrategyId] = useState(state.strategies[0]?.id ?? "gushi-ma"); const [interval, setInterval] = useState(state.interval);
  useEffect(() => setInterval(state.interval), [state.interval]);
  const trade = async (side: "BUY" | "SELL") => { const response = await fetch("/api/trade", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ side, strategyId, interval }) }); if (!response.ok) { const body = await response.json() as { error?: string }; window.alert(body.error ?? "下单失败"); } };
  return <><div className="grid grid-cols-2 gap-2"><button className="terminal-trade-button border-profit/40 bg-profit/10 text-profit" disabled={Boolean(state.position)} onClick={() => setOpen(true)}><ArrowUpFromLine size={14} />开多 / 买入</button><button className="terminal-trade-button border-loss/40 bg-loss/10 text-loss" disabled={!state.position} onClick={() => void trade("SELL")}><ArrowDownToLine size={14} />平多 / 卖出</button></div><Modal title="确认策略入场" visible={open} onCancel={() => setOpen(false)} onOk={() => { setOpen(false); void trade("BUY"); }} okText="确认买入"><div className="grid gap-4 py-2"><label className="grid gap-2 text-sm text-muted">交易策略<Select value={strategyId} optionList={state.strategies.map((item) => ({ value: item.id, label: item.name }))} onChange={(value) => setStrategyId(String(value))} /></label><label className="grid gap-2 text-sm text-muted">允许周期<Select value={interval} optionList={options} onChange={(value) => setInterval(String(value))} /></label><p className="m-0 rounded border border-warning/25 bg-warning/6 p-3 text-xs text-warning">当前为{state.mode === "live" ? "真实盘" : "模拟盘"}，系统按策略和风控配置计算下单数量。</p></div></Modal></>;
}
