import { Select, Tag } from "@douyinfe/semi-ui";
import { Activity, BarChart3, Search, Wallet } from "lucide-react";
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
  return <div className="market-toolbar"><div className="market-identity"><span className="asset-logo">{state.account.baseAsset.slice(0, 1)}</span><div><strong>{state.symbol}</strong><small>{state.account.baseAsset} / {state.account.quoteAsset}</small></div><Tag size="small" color={state.mode === "live" ? "red" : "blue"}>{state.mode === "live" ? "真实盘" : "模拟盘"}</Tag></div><div className="market-price"><strong>{state.market.latestPrice ? state.market.latestPrice.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "--"}</strong><span className="positive">实时行情</span></div><div className="market-stats"><span>策略 <b>{state.strategies.length}</b></span><span>订单 <b>{state.orders.length}</b></span><span className="connection-live"><i />{state.connection.market ? "已连接" : "连接中"}</span></div><Select prefix={<BarChart3 size={14} />} value={state.interval} optionList={intervals} onChange={(value) => onIntervalChange(String(value))} /></div>;
}
