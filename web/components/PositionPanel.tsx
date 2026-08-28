import { ShieldCheck } from "lucide-react";
import type { ReactElement } from "react";
import type { DashboardState } from "../../src/dashboard/dashboard-types";
import { formatAsset, formatMoney } from "./ui";

export function PositionPanel({ state }: { state: DashboardState }): ReactElement {
  const price = state.market.latestPrice;
  const pnl = state.position ? (price - state.position.entryPrice) * state.position.quantity : 0;
  return <section className="panel position-panel"><div className="panel-header"><div><h2>策略持仓</h2><p>风险管理与最新成交</p></div><span className={`position-state ${state.position ? "held" : "flat"}`}>{state.position ? "持仓中" : "空仓"}</span></div>{state.position ? <div className="position-details"><div><span>入场价</span><strong>{formatMoney(state.position.entryPrice)}</strong></div><div><span>持仓数量</span><strong>{formatAsset(state.position.quantity)} BTC</strong></div><div><span>持仓峰值</span><strong>{formatMoney(state.position.peakPrice)}</strong></div><div><span>浮动盈亏</span><strong className={pnl >= 0 ? "positive-text" : "negative-text"}>{pnl >= 0 ? "+" : ""}{formatMoney(pnl)} USDT</strong></div></div> : <div className="empty-state"><ShieldCheck size={20} /><span>策略当前没有持仓，等待符合趋势与成交量条件的买入信号。</span></div>}</section>;
}
