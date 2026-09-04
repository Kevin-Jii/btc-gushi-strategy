import { Grid3X3, Shield, Wallet, Zap } from "lucide-react";
import type { ReactElement } from "react";
import type { DashboardState } from "../../../src/dashboard/dashboard-types";
import { Card } from "../ui/Card";
import { Tag } from "../ui/Tag";
import { formatAsset, formatMoney } from "../ui";

function Metric({ className, icon, label, value, detail, children }: { className: string; icon: ReactElement; label: string; value?: string; detail: string; children?: ReactElement }): ReactElement {
  return <Card className={`metric-card ${className}`}><div className="metric-icon-wrapper">{icon}</div><div className="metric-content"><p className="text-xs text-slate-500">{label}</p>{value ? <h3 className="text-2xl font-bold text-slate-100">{value}</h3> : children}<p className="text-xs text-slate-500">{detail}</p></div></Card>;
}

export function MetricOverview({ state }: { state: DashboardState }): ReactElement {
  const price = state.market.latestPrice;
  const baseTotal = state.account.baseFree + state.account.baseLocked;
  const pnl = state.position ? (price - state.position.entryPrice) * state.position.quantity : 0;
  const status = state.strategy.entrySignal ? "允许入场" : state.strategy.trendFilter === false ? "趋势过滤" : "等待信号";
  return <><div className="section-heading"><div><span className="eyebrow">PORTFOLIO OVERVIEW</span><h4 className="text-xl font-bold text-slate-100">账户概览</h4></div><span className="section-note">数据每次 K 线闭合后更新</span></div><div className="metrics-grid"><Metric className="equity" icon={<Zap size={20} />} label="账户权益估算" value={formatMoney(state.account.estimatedEquity)} detail={state.account.quoteAsset} /><Metric className="balance" icon={<Wallet size={20} />} label={`${state.account.quoteAsset} 余额`} value={formatMoney(state.account.quoteFree)} detail={`冻结 ${formatMoney(state.account.quoteLocked)}`} /><Metric className="position" icon={<Grid3X3 size={20} />} label={`${state.account.baseAsset} 持仓`} value={formatAsset(baseTotal)} detail={state.position ? `盈亏 ${formatMoney(pnl)}` : "当前无持仓"} /><Metric className="strategy" icon={<Shield size={20} />} label="策略状态" value="" detail={state.lastAction ? `${state.lastAction.side === "BUY" ? "买入" : "卖出"} · ${state.lastAction.reason}` : "等待下一根收盘 K 线"}><Tag color={state.strategy.entrySignal ? "green" : state.strategy.trendFilter === false ? "red" : "slate"}>{status}</Tag></Metric></div></>;
}
