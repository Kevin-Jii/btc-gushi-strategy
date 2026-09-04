import { Activity, Brain, Grid3X3, Wallet } from "lucide-react";
import type { ReactElement } from "react";
import type { DashboardState } from "../../../src/dashboard/dashboard-types";
import { Badge } from "../ui/Badge";
import { Card } from "../ui/Card";
import { formatTime } from "../ui";
export function ActivityCard({ state }: { state: DashboardState }): ReactElement { const activities = state.activity.slice(0, 10); return <Card className="activity-card"><div className="activity-header"><h5 className="text-base font-semibold text-slate-100">最近活动</h5><Badge count={activities.length} /></div><div className="activity-list">{activities.length === 0 ? <div className="activity-empty"><p className="text-sm text-slate-500">暂无活动记录</p></div> : activities.map((item) => <div key={item.id} className="activity-item"><div className={`activity-icon ${item.type}`}>{item.type === "order" ? <Grid3X3 size={14} /> : item.type === "balance" ? <Wallet size={14} /> : item.type === "ai" ? <Brain size={14} /> : <Activity size={14} />}</div><div className="activity-content"><p className="font-semibold text-slate-100">{item.title}</p><p className="text-xs text-slate-500">{item.detail}</p></div><p className="text-xs text-slate-500">{formatTime(item.at)}</p></div>)}</div></Card>; }
