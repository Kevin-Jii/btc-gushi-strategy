import { Badge, Card, Typography } from "@douyinfe/semi-ui";
import { Activity, Brain, Grid3X3, Wallet } from "lucide-react";
import type { ReactElement } from "react";
import type { DashboardState } from "../../../src/dashboard/dashboard-types";
import { formatTime } from "../ui";
const { Text, Title } = Typography;
export function ActivityCard({ state }: { state: DashboardState }): ReactElement { const activities = state.activity.slice(0, 10); return <Card className="activity-card" shadows="hover"><div className="activity-header"><Title heading={5}>最近活动</Title><Badge count={activities.length} type="primary" overflowCount={99} /></div><div className="activity-list">{activities.length === 0 ? <div className="activity-empty"><Text type="tertiary">暂无活动记录</Text></div> : activities.map((item) => <div key={item.id} className="activity-item"><div className={`activity-icon ${item.type}`}>{item.type === "order" ? <Grid3X3 size={14} /> : item.type === "balance" ? <Wallet size={14} /> : item.type === "ai" ? <Brain size={14} /> : <Activity size={14} />}</div><div className="activity-content"><Text strong>{item.title}</Text><Text type="tertiary" size="small">{item.detail}</Text></div><Text type="tertiary" size="small">{formatTime(item.at)}</Text></div>)}</div></Card>; }
