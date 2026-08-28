import { Activity, ArrowDownRight, ArrowUpRight, BrainCircuit } from "lucide-react";
import type { ReactElement } from "react";
import type { DashboardActivity, DashboardState } from "../../src/dashboard/dashboard-types";
import { formatTime } from "./ui";

function ActivityIcon({ item }: { item: DashboardActivity }): ReactElement {
  return <span className={`activity-icon ${item.type} ${item.side === "BUY" ? "buy" : item.side === "SELL" ? "sell" : ""}`}>{item.side === "BUY" ? <ArrowUpRight size={15} /> : item.side === "SELL" ? <ArrowDownRight size={15} /> : item.type === "ai" ? <BrainCircuit size={15} /> : <Activity size={15} />}</span>;
}

export function ActivityPanel({ state }: { state: DashboardState }): ReactElement {
  const activity = state.activity.slice(0, 8);
  return <section className="panel activity-panel"><div className="panel-header"><div><h2>账户活动</h2><p>订单成交与余额变化</p></div><span className="activity-count">{state.activity.length} 条</span></div>{activity.length ? <div className="activity-list">{activity.map((item) => <div className="activity-row" key={item.id}><ActivityIcon item={item} /><div className="activity-copy"><strong>{item.title}</strong><span>{item.detail}</span></div><time>{formatTime(item.at)}</time></div>)}</div> : <div className="empty-state compact"><Activity size={20} /><span>尚无活动记录</span></div>}</section>;
}
