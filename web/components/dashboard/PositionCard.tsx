import { Card, Divider, Tag, Typography } from "@douyinfe/semi-ui";
import { Wallet } from "lucide-react";
import type { ReactElement } from "react";
import type { DashboardState } from "../../../src/dashboard/dashboard-types";
import { formatAsset, formatMoney, formatTime } from "../ui";
const { Text, Title } = Typography;
export function PositionCard({ state }: { state: DashboardState }): ReactElement {
  const position = state.position; const price = state.market.latestPrice;
  if (!position) return <Card className="position-card" shadows="hover"><div className="position-empty"><Wallet size={32} /><Title heading={5}>当前无持仓</Title><Text type="tertiary">等待策略入场信号</Text></div></Card>;
  const pnl = (price - position.entryPrice) * position.quantity; const pnlPct = ((price - position.entryPrice) / position.entryPrice) * 100; const profit = pnl >= 0;
  return <Card className="position-card" shadows="hover"><div className="position-header"><Title heading={5}>当前持仓</Title><Tag color="blue">做多</Tag></div><div className="position-main"><div><Text type="tertiary" size="small">持仓数量</Text><Title heading={3}>{formatAsset(position.quantity)} {state.account.baseAsset}</Title></div><div><Text type="tertiary" size="small">开仓均价</Text><Text strong>{formatMoney(position.entryPrice)}</Text></div><div><Text type="tertiary" size="small">未实现盈亏</Text><div className={`pnl-value ${profit ? "positive" : "negative"}`}><Text strong>{profit ? "+" : ""}{formatMoney(pnl)}</Text><Tag color={profit ? "green" : "red"} size="small">{profit ? "+" : ""}{pnlPct.toFixed(2)}%</Tag></div></div></div><Divider margin="12px 0" /><div className="position-details"><div className="detail-item"><Text type="tertiary" size="small">当前价格</Text><Text>{formatMoney(price)}</Text></div><div className="detail-item"><Text type="tertiary" size="small">开仓时间</Text><Text>{formatTime(position.entryTimestamp)}</Text></div><div className="detail-item"><Text type="tertiary" size="small">最高价</Text><Text>{formatMoney(position.peakPrice)}</Text></div></div></Card>;
}
