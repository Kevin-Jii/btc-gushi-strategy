import { Button, Card, Divider, Tag, Tooltip, Typography } from "@douyinfe/semi-ui";
import { RefreshCw } from "lucide-react";
import type { ReactElement } from "react";
import type { DashboardState } from "../../../src/dashboard/dashboard-types";
import { formatAsset, formatMoney } from "../ui";
const { Text, Title } = Typography;
export function AccountCard({ state }: { state: DashboardState }): ReactElement {
  const quoteTotal = state.account.quoteFree + state.account.quoteLocked; const baseTotal = state.account.baseFree + state.account.baseLocked;
  return <Card className="account-card" shadows="hover"><div className="account-header"><Title heading={5}>账户资产</Title><Tooltip content="刷新余额"><Button icon={<RefreshCw size={15} />} size="small" /></Tooltip></div><div className="account-summary"><Text type="tertiary" size="small">总权益（估算）</Text><Title heading={3}>{formatMoney(state.account.estimatedEquity)} <small>{state.account.quoteAsset}</small></Title></div><Divider margin="12px 0" /><div className="asset-list"><Asset symbol={state.account.baseAsset} tone="btc" available={formatAsset(state.account.baseFree)} total={formatAsset(baseTotal)} value={`≈ ${formatMoney(baseTotal * state.market.latestPrice)} ${state.account.quoteAsset}`} /><Asset symbol={state.account.quoteAsset} tone="usdt" available={formatMoney(state.account.quoteFree)} total={formatMoney(quoteTotal)} value={`冻结 ${formatMoney(state.account.quoteLocked)}`} /></div></Card>;
}
function Asset({ symbol, tone, available, total, value }: { symbol: string; tone: string; available: string; total: string; value: string }): ReactElement { return <div className="asset-item"><div className="asset-info"><span className={`asset-icon ${tone}`}>{symbol[0]}</span><div><Text strong>{symbol}</Text><Text type="tertiary" size="small">可用: {available}</Text></div></div><div className="asset-value"><Text strong>{total}</Text><Text type="tertiary" size="small">{value}</Text></div></div>; }
