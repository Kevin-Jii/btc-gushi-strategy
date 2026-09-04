import { RefreshCw } from "lucide-react";
import type { ReactElement } from "react";
import type { DashboardState } from "../../../src/dashboard/dashboard-types";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { Divider } from "../ui/Divider";
import { Tooltip } from "../ui/Tooltip";
import { formatAsset, formatMoney } from "../ui";
export function AccountCard({ state }: { state: DashboardState }): ReactElement {
  const quoteTotal = state.account.quoteFree + state.account.quoteLocked; const baseTotal = state.account.baseFree + state.account.baseLocked;
  return <Card className="account-card"><div className="account-header"><h5 className="text-base font-semibold text-slate-100">账户资产</h5><Tooltip content="刷新余额"><Button size="small" variant="ghost"><RefreshCw size={15} /></Button></Tooltip></div><div className="account-summary"><p className="text-xs text-slate-500">总权益（估算）</p><h3 className="text-2xl font-bold text-slate-100">{formatMoney(state.account.estimatedEquity)} <small>{state.account.quoteAsset}</small></h3></div><Divider className="my-3" /><div className="asset-list"><Asset symbol={state.account.baseAsset} tone="btc" available={formatAsset(state.account.baseFree)} total={formatAsset(baseTotal)} value={`≈ ${formatMoney(baseTotal * state.market.latestPrice)} ${state.account.quoteAsset}`} /><Asset symbol={state.account.quoteAsset} tone="usdt" available={formatMoney(state.account.quoteFree)} total={formatMoney(quoteTotal)} value={`冻结 ${formatMoney(state.account.quoteLocked)}`} /></div></Card>;
}
function Asset({ symbol, tone, available, total, value }: { symbol: string; tone: string; available: string; total: string; value: string }): ReactElement { return <div className="asset-item"><div className="asset-info"><span className={`asset-icon ${tone}`}>{symbol[0]}</span><div><p className="font-semibold text-slate-100">{symbol}</p><p className="text-xs text-slate-500">可用: {available}</p></div></div><div className="asset-value"><p className="font-semibold text-slate-100">{total}</p><p className="text-xs text-slate-500">{value}</p></div></div>; }
