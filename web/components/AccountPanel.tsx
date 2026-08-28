import { ConnectionIcon } from "./TopBar";
import type { ReactElement } from "react";
import type { DashboardState } from "../../src/dashboard/dashboard-types";
import { formatAsset, formatMoney, formatTime } from "./ui";

export function AccountPanel({ state }: { state: DashboardState }): ReactElement {
  const assets = [...state.account.balances]
    .filter((balance) => balance.free !== 0 || balance.locked !== 0)
    .sort((left, right) => {
      const priority = (asset: string): number => asset === state.account.quoteAsset ? 0 : asset === state.account.baseAsset ? 1 : 2;
      return priority(left.asset) - priority(right.asset) || right.free + right.locked - left.free - left.locked;
    });
  return <section className="panel account-panel"><div className="panel-header"><div><h2>现货钱包</h2><p>Binance Spot 账户 · {assets.length} 项非零资产</p></div><ConnectionIcon connected={state.connection.userData} /></div><div className="asset-table wallet-table"><div className="asset-row header"><span>资产</span><span>可用</span><span>冻结</span></div>{assets.map((balance) => <div className="asset-row" key={balance.asset}><span className="asset-name"><span className={`asset-icon ${balance.asset === state.account.baseAsset ? "btc" : balance.asset === state.account.quoteAsset ? "usdt" : "other"}`}>{balance.asset === state.account.baseAsset ? "₿" : balance.asset === state.account.quoteAsset ? "$" : balance.asset.slice(0, 1)}</span>{balance.asset}</span><span>{formatAsset(balance.free)}</span><span>{formatAsset(balance.locked)}</span></div>)}</div><div className="account-summary"><span>BTC/USDT 估算总权益</span><strong>{formatMoney(state.account.estimatedEquity)} <small>{state.account.quoteAsset}</small></strong></div><div className="account-refresh">余额更新时间 {formatTime(state.connection.lastAccountUpdate)}</div></section>;
}
