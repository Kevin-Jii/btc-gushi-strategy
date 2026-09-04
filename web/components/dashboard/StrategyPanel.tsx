import type { ReactElement } from "react";
import type { StrategyDashboardSummary } from "../../../src/dashboard/dashboard-types";
import { Tag } from "../ui/Tag";
import { formatMoney } from "../ui";
export function StrategyPanel({ strategies }: { strategies: StrategyDashboardSummary[] }): ReactElement { return <div className="data-panel"><div className="data-panel-title">策略运行概览</div>{strategies.map((strategy) => <div className="strategy-row" key={strategy.id}><div><strong>{strategy.name}</strong><small>{strategy.id} · v{strategy.version} · {strategy.category}</small></div><Tag color={strategy.status === "running" ? "green" : "slate"}>{strategy.status === "running" ? "运行中" : "已停止"}</Tag><span className={strategy.profit >= 0 ? "positive" : "negative"}>{strategy.profit >= 0 ? "+" : ""}{formatMoney(strategy.profit)}<small>{strategy.profitPercent.toFixed(2)}% · {strategy.orderCount} 单</small></span></div>)}</div>; }
