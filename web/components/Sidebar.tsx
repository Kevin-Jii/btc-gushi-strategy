import { Activity, BarChart3, Clock3, Database, Gauge, Radio, Wallet } from "lucide-react";
import type { ReactElement } from "react";
import type { DashboardState } from "../../src/dashboard/dashboard-types";
import { formatTime } from "./ui";

export function Sidebar({ state }: { state: DashboardState }): ReactElement {
  return <aside className="sidebar"><div className="side-section-title">运行概览</div><nav><a className="nav-item active"><Gauge size={16} />策略工作台</a><a className="nav-item"><BarChart3 size={16} />行情与信号</a><a className="nav-item"><Wallet size={16} />账户资产</a><a className="nav-item"><Database size={16} />订单活动</a></nav><div className="sidebar-bottom"><div className="side-section-title">服务状态</div><div className="side-status"><Radio size={14} /><span>策略进程</span><b className={state.connection.market ? "ok" : "bad"}>{state.connection.market ? "运行中" : "离线"}</b></div><div className="side-status"><Clock3 size={14} /><span>账户更新</span><b>{formatTime(state.connection.lastAccountUpdate)}</b></div><div className="side-status"><Activity size={14} /><span>行情周期</span><b>{state.interval}</b></div></div></aside>;
}
