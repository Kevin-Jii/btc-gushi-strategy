import { Select, Tag, Modal } from "@douyinfe/semi-ui";
import { useState } from "react";
import { BarChart3, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import type { ReactElement } from "react";
import type { DashboardState } from "../../../src/dashboard/dashboard-types";

export const intervals = [
  { value: "1h", label: "1 小时" },
  { value: "1d", label: "1 日" },
  { value: "1w", label: "1 周" },
  { value: "1M", label: "1 月" },
  { value: "1y", label: "1 年" },
];

export function MarketToolbar({ state, onIntervalChange }: { state: DashboardState; onIntervalChange: (interval: string) => void }): ReactElement {
  const [buyOpen, setBuyOpen] = useState(false);
  const [strategyId, setStrategyId] = useState("gushi-ma");
  const [allowedInterval, setAllowedInterval] = useState(state.interval);
  const trade = async (side: "BUY" | "SELL") => {
    const response = await fetch("/api/trade", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ side, strategyId, interval: allowedInterval }) });
    if (!response.ok) { const result = await response.json() as { error?: string }; window.alert(result.error ?? "下单失败"); }
  };
  return <div className="market-toolbar"><div className="market-identity"><span className="asset-logo">{state.account.baseAsset.slice(0, 1)}</span><div><strong>{state.symbol}</strong><small>{state.account.baseAsset} / {state.account.quoteAsset}</small></div><Tag size="small" color={state.mode === "live" ? "red" : "blue"}>{state.mode === "live" ? "真实盘" : "模拟盘"}</Tag></div><div className="market-price"><strong>{state.market.latestPrice ? state.market.latestPrice.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "--"}</strong><span className="positive">实时行情</span></div><div className="market-stats"><span>策略 <b>{state.strategies.length}</b></span><span>订单 <b>{state.orders.length}</b></span><span className="connection-live"><i />{state.connection.market ? "已连接" : "连接中"}</span></div><div className="trade-actions"><button className="trade-button buy" onClick={() => setBuyOpen(true)} disabled={Boolean(state.position)}><ArrowUpFromLine size={13} />买入</button><button className="trade-button sell" onClick={() => void trade("SELL")} disabled={!state.position}><ArrowDownToLine size={13} />卖出</button></div><Select prefix={<BarChart3 size={14} />} value={state.interval} optionList={intervals} onChange={(value) => onIntervalChange(String(value))} /><Modal title="选择策略与允许周期" visible={buyOpen} onCancel={() => setBuyOpen(false)} onOk={() => { setBuyOpen(false); void trade("BUY"); }} okText="确认买入" cancelText="取消"><div className="trade-form"><label>交易策略<Select value={strategyId} optionList={[{ value: "gushi-ma", label: "葛氏八法则 · MA 趋势" }]} onChange={(value) => setStrategyId(String(value))} /></label><label>允许周期<Select value={allowedInterval} optionList={intervals} onChange={(value) => setAllowedInterval(String(value))} /></label><p>买入将按当前永续合约账户的仓位比例执行。</p></div></Modal></div>;
}
