import { Button, Divider, Layout, Nav, Select, Tag, Typography } from "@douyinfe/semi-ui";
import { CandlestickChart, Grid3X3, Home, LineChart, Wallet, Brain, Wifi, WifiOff } from "lucide-react";
import type { ReactElement } from "react";
import type { DashboardState } from "../../../src/dashboard/dashboard-types";

const { Header } = Layout;
const { Text, Title } = Typography;

function ConnectionBadge({ connected, label }: { connected: boolean; label: string }): ReactElement {
  return <span className={`header-connection ${connected ? "connected" : "disconnected"}`}><span className="status-dot" />{connected ? <Wifi size={12} /> : <WifiOff size={12} />}{label}</span>;
}

export function DashboardHeader({ state, activeNav, onNavChange, onSymbolChange, onOpenWallet, onOpenAi }: { state: DashboardState; activeNav: string; onNavChange: (key: string) => void; onSymbolChange: (symbol: string) => void; onOpenWallet: () => void; onOpenAi: () => void }): ReactElement {
  return <Header className="app-header">
    <div className="header-brand" text="ink"><div className="brand-logo shadow-[0_0_22px_rgba(247,147,26,.2)]">₿</div><div className="brand-text"><Title heading={5} className="brand-title">葛氏策略</Title><Text type="tertiary" size="small" className="brand-subtitle">BTC/USDT 量化交易系统</Text></div></div>
    <Nav className="header-nav" mode="horizontal" selectedKeys={[activeNav]} onSelect={(data) => onNavChange(String(data.itemKey))}>
      <Nav.Item icon={<Home size={16} />} text="工作台" itemKey="dashboard" /><Nav.Item icon={<CandlestickChart size={16} />} text="行情分析" itemKey="market" /><Nav.Item icon={<Grid3X3 size={16} />} text="订单管理" itemKey="orders" /><Nav.Item icon={<LineChart size={16} />} text="回测分析" itemKey="backtest" />
    </Nav>
    <div className="header-right"><div className="connection-status"><ConnectionBadge connected={state.connection.market} label="行情" /><ConnectionBadge connected={state.connection.userData} label="账户" /></div><Divider layout="vertical" margin="8px" /><div className="header-actions" text="muted"><Button theme="borderless" icon={<Wallet size={15} />} onClick={onOpenWallet}>钱包</Button><Button theme="borderless" icon={<Brain size={15} />} onClick={onOpenAi}>AI 审核</Button></div><Divider layout="vertical" margin="8px" /><div className="mode-indicator"><Tag color={state.mode === "live" ? "red" : "blue"} size="small">{state.mode === "live" ? "真实盘" : state.mode === "demo" ? "模拟盘" : "测试网"}</Tag><Select className="symbol-selector" showClear filter value={state.symbol} onChange={(value) => onSymbolChange(String(value))} optionList={state.instruments.map((instrument) => ({ value: instrument.symbol, label: `${instrument.symbol} · ${instrument.baseAsset}/${instrument.quoteAsset}` }))} filter searchable placeholder="选择交易对" /></div></div>
  </Header>;
}
