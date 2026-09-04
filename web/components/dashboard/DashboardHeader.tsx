import {
  CandlestickChart,
  Grid3X3,
  Home,
  LineChart,
  Wallet,
  Brain,
  Wifi,
  WifiOff,
} from "lucide-react";
import type { ReactElement } from "react";
import type { DashboardState } from "../../../src/dashboard/dashboard-types";
import { Button } from "../ui/Button";
import { Divider } from "../ui/Divider";
import { Select } from "../ui/Select";
import { Tag } from "../ui/Tag";

function ConnectionBadge({
  connected,
  label,
}: {
  connected: boolean;
  label: string;
}): ReactElement {
  return (
    <span
      className={`header-connection ${connected ? "connected" : "disconnected"}`}
    >
      <span className="status-dot" />
      {connected ? <Wifi size={12} /> : <WifiOff size={12} />}
      {label}
    </span>
  );
}

export function DashboardHeader({
  state,
  activeNav,
  onNavChange,
  onSymbolChange,
  onOpenWallet,
  onOpenAi,
}: {
  state: DashboardState;
  activeNav: string;
  onNavChange: (key: string) => void;
  onSymbolChange: (symbol: string) => void;
  onOpenWallet: () => void;
  onOpenAi: () => void;
}): ReactElement {
  return (
    <header className="app-header">
      <div className="header-brand">
        <div className="brand-logo shadow-[0_0_22px_rgba(247,147,26,.2)]">
          ₿
        </div>
        <div className="brand-text">
          <h5 className="brand-title text-sm font-semibold text-slate-100">
            葛氏策略
          </h5>
          <p className="brand-subtitle text-xs text-slate-500">
            {state.symbol}
          </p>
        </div>
      </div>
      <nav className="header-nav flex gap-1">
        <button className={`nav-item ${activeNav === "dashboard" ? "active" : ""}`} onClick={() => onNavChange("dashboard")}><Home size={16} />工作台</button>
        <button className={`nav-item ${activeNav === "market" ? "active" : ""}`} onClick={() => onNavChange("market")}><CandlestickChart size={16} />行情分析</button>
        <button className={`nav-item ${activeNav === "orders" ? "active" : ""}`} onClick={() => onNavChange("orders")}><Grid3X3 size={16} />订单管理</button>
        <button className={`nav-item ${activeNav === "backtest" ? "active" : ""}`} onClick={() => onNavChange("backtest")}><LineChart size={16} />回测分析</button>
      </nav>
      <div className="header-right">
        <div className="connection-status">
          <ConnectionBadge connected={state.connection.market} label="行情" />
          <ConnectionBadge connected={state.connection.userData} label="账户" />
        </div>
        <Divider />
        <div className="header-actions">
          <Button variant="ghost" size="small" onClick={onOpenWallet}><Wallet size={15} />钱包</Button>
          <Button variant="ghost" size="small" onClick={onOpenAi}><Brain size={15} />AI 审核</Button>
        </div>
        <Divider />
        <div className="mode-indicator">
          <Tag color={state.mode === "live" ? "red" : "blue"}>
            {state.mode === "live"
              ? "真实盘"
              : state.mode === "demo"
                ? "模拟盘"
                : "测试网"}
          </Tag>
          <Select
            className="symbol-selector"
            value={state.symbol}
            onChange={(value) => onSymbolChange(String(value))}
            options={state.instruments.map((instrument) => ({
              value: instrument.symbol,
              label: `${instrument.symbol} · ${instrument.baseAsset}/${instrument.quoteAsset}`,
            }))}
            placeholder="选择交易对"
          />
        </div>
      </div>
    </header>
  );
}
