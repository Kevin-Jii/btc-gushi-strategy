import { Wallet } from "lucide-react";
import type { ReactElement } from "react";
import type { DashboardState } from "../../../src/dashboard/dashboard-types";
import { Card } from "../ui/Card";
import { Divider } from "../ui/Divider";
import { Tag } from "../ui/Tag";
import { formatAsset, formatMoney, formatTime } from "../ui";
export function PositionCard({ state }: { state: DashboardState }): ReactElement {
  const position = state.position; const price = state.market.latestPrice;
  if (!position) return <Card className="position-card"><div className="position-empty"><Wallet size={32} /><h5 className="text-base font-semibold text-slate-100">当前无持仓</h5><p className="text-sm text-slate-500">等待策略入场信号</p></div></Card>;
  const pnl = (price - position.entryPrice) * position.quantity; const pnlPct = ((price - position.entryPrice) / position.entryPrice) * 100; const profit = pnl >= 0;
  return <Card className="position-card"><div className="position-header"><h5 className="text-base font-semibold text-slate-100">当前持仓</h5><Tag color="blue">做多</Tag></div><div className="position-main"><div><p className="text-xs text-slate-500">持仓数量</p><h3 className="text-2xl font-bold text-slate-100">{formatAsset(position.quantity)} {state.account.baseAsset}</h3></div><div><p className="text-xs text-slate-500">开仓均价</p><p className="font-semibold text-slate-100">{formatMoney(position.entryPrice)}</p></div><div><p className="text-xs text-slate-500">未实现盈亏</p><div className={`pnl-value ${profit ? "positive" : "negative"}`}><p className="font-semibold text-slate-100">{profit ? "+" : ""}{formatMoney(pnl)}</p><Tag color={profit ? "green" : "red"}>{profit ? "+" : ""}{pnlPct.toFixed(2)}%</Tag></div></div></div><Divider className="my-3" /><div className="position-details"><div className="detail-item"><p className="text-xs text-slate-500">当前价格</p><p className="text-slate-100">{formatMoney(price)}</p></div><div className="detail-item"><p className="text-xs text-slate-500">开仓时间</p><p className="text-slate-100">{formatTime(position.entryTimestamp)}</p></div><div className="detail-item"><p className="text-xs text-slate-500">最高价</p><p className="text-slate-100">{formatMoney(position.peakPrice)}</p></div></div></Card>;
}
