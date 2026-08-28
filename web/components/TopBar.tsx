import { Wifi, WifiOff } from "lucide-react";
import type { ReactElement } from "react";
import type { DashboardState } from "../../src/dashboard/dashboard-types";

function ConnectionPill({ label, connected }: { label: string; connected: boolean }): ReactElement {
  return <span className={`connection-pill ${connected ? "online" : "offline"}`}><span className="status-dot" />{label} {connected ? "已连接" : "断开"}</span>;
}

export interface TopBarProps {
  state: DashboardState;
  socketStatus: "connecting" | "connected" | "offline";
}

export function TopBar({ state, socketStatus }: TopBarProps): ReactElement {
  return <header className="topbar">
    <div className="brand-lockup"><div className="brand-mark">G</div><div><div className="brand-name">葛氏策略</div><div className="brand-subtitle">BTC / USDT 量化控制台</div></div></div>
    <div className="topbar-center"><span className={`mode-badge ${state.mode === "testnet" || state.mode === "demo" ? "testnet" : "live"}`}><span className="mode-dot" />{state.mode === "testnet" ? "Binance 测试网" : state.mode === "demo" ? "OKX 模拟盘" : `${state.platform.toUpperCase()} 真实盘`}</span><span className="symbol-badge">{state.symbol}</span><span className="interval-badge">{state.interval}</span></div>
    <div className="topbar-right"><ConnectionPill label="行情" connected={state.connection.market} /><ConnectionPill label="账户" connected={state.connection.userData} /><span className="socket-state"><span className={`status-dot ${socketStatus === "connected" ? "online" : "offline"}`} />页面 {socketStatus === "connected" ? "实时" : "重连中"}</span></div>
  </header>;
}

export function ConnectionIcon({ connected }: { connected: boolean }): ReactElement {
  return connected ? <Wifi size={17} className="icon-online" /> : <WifiOff size={17} className="icon-offline" />;
}
