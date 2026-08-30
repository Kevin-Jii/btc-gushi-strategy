import { BarChart3, Cpu, Wifi } from "lucide-react";
import type { ReactElement } from "react";
import type { DashboardState } from "../../../src/dashboard/dashboard-types";
import { formatTime } from "../ui";

export function StatusBar({ state, socketStatus }: { state: DashboardState; socketStatus: "connecting" | "connected" | "offline" }): ReactElement {
  return <div className="status-bar"><div className="status-item"><Wifi size={14} /><span>{socketStatus === "connected" ? "实时连接" : socketStatus === "connecting" ? "连接中..." : "离线"}</span></div><div className="status-item"><BarChart3 size={14} /><span>{state.market.candleCount} 根 K 线</span></div><div className="status-item"><Cpu size={14} /><span>{state.platform.toUpperCase()} · {state.interval}</span></div><span className="update-time">最后更新: {formatTime(state.updatedAt)}</span></div>;
}
