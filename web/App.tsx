import { useEffect, useState } from "react";
import type { ReactElement } from "react";
import { Activity, BarChart3, CircleDollarSign, ShieldCheck, Wallet } from "lucide-react";
import type { DashboardState } from "../src/dashboard/dashboard-types";
import { AccountPanel } from "./components/AccountPanel";
import { ActivityPanel } from "./components/ActivityPanel";
import { AiAdvisorPanel } from "./components/AiAdvisorPanel";
import { MarketChart } from "./components/MarketChart";
import { MetricPanel } from "./components/MetricPanel";
import { PositionPanel } from "./components/PositionPanel";
import { Sidebar } from "./components/Sidebar";
import { TopBar } from "./components/TopBar";
import { formatAsset, formatMoney, formatTime } from "./components/ui";

const emptyState: DashboardState = {
  updatedAt: 0, mode: "testnet", platform: "binance", symbol: "BTCUSDT", interval: "1d",
  connection: { market: false, userData: false, lastAccountUpdate: 0, error: null },
  market: { latestPrice: 0, latestCandle: null, recentCandles: [], candleCount: 0, lastCandleTimestamp: 0 },
  strategy: { buy: null, sell: null, trendFilter: null, entrySignal: null },
  account: { balances: [], quoteAsset: "USDT", quoteFree: 0, quoteLocked: 0, baseAsset: "BTC", baseFree: 0, baseLocked: 0, estimatedEquity: 0 },
  position: null, lastAction: null, activity: [],
  ai: { enabled: false, decisionMode: "advisory", model: "gpt-4o-mini", latest: null, history: [] },
};

function useDashboardSocket(onState: (state: DashboardState) => void): "connecting" | "connected" | "offline" {
  const [status, setStatus] = useState<"connecting" | "connected" | "offline">("connecting");
  useEffect(() => {
    let socket: WebSocket | null = null;
    let retry: number | undefined;
    const connect = () => {
      setStatus("connecting");
      const protocol = window.location.protocol === "https:" ? "wss" : "ws";
      socket = new WebSocket(`${protocol}://${window.location.host}/ws`);
      socket.onopen = () => setStatus("connected");
      socket.onmessage = (event) => {
        const message = JSON.parse(event.data) as { type?: string; payload?: DashboardState };
        if (message.type === "state" && message.payload) onState(message.payload);
      };
      socket.onclose = () => { setStatus("offline"); retry = window.setTimeout(connect, 2500); };
      socket.onerror = () => socket?.close();
    };
    connect();
    return () => { if (retry) window.clearTimeout(retry); socket?.close(); };
  }, [onState]);
  return status;
}

export default function App(): ReactElement {
  const [state, setState] = useState<DashboardState>(emptyState);
  const socketStatus = useDashboardSocket(setState);
  const baseTotal = state.account.baseFree + state.account.baseLocked;
  const quoteTotal = state.account.quoteFree + state.account.quoteLocked;
  const price = state.market.latestPrice;
  const pnl = state.position ? (price - state.position.entryPrice) * state.position.quantity : 0;
  const strategyStatus = state.strategy.entrySignal === true ? "允许入场" : state.strategy.trendFilter === false ? "趋势过滤" : "等待信号";
  const lastAction = state.lastAction;

  return <div className="app-shell">
    <TopBar state={state} socketStatus={socketStatus} />
    <div className="workspace"><Sidebar state={state} /><main className="main-content">
      <div className="page-heading"><div><p className="eyebrow">LIVE OPERATIONS</p><h1>交易工作台</h1><p className="page-note">策略、账户和成交状态在同一时间线上同步。</p></div><div className="last-update">最后更新 <strong>{formatTime(state.updatedAt)}</strong></div></div>
      {state.connection.error && <div className="error-strip"><span>!</span>账户余额读取失败：{state.connection.error}</div>}
      <div className="metrics-grid"><MetricPanel icon={CircleDollarSign} label="账户权益估算" value={`${formatMoney(state.account.estimatedEquity)} ${state.account.quoteAsset}`} detail={`可用 ${formatMoney(quoteTotal)} ${state.account.quoteAsset}`} tone="accent" /><MetricPanel icon={Wallet} label={`${state.account.quoteAsset} 余额`} value={formatMoney(state.account.quoteFree)} detail={`冻结 ${formatMoney(state.account.quoteLocked)}`} /><MetricPanel icon={Activity} label={`${state.account.baseAsset} 持仓`} value={formatAsset(baseTotal)} detail={state.position ? `持仓盈亏 ${pnl >= 0 ? "+" : ""}${formatMoney(pnl)} ${state.account.quoteAsset}` : "当前没有策略持仓"} tone={state.position ? (pnl >= 0 ? "positive" : "negative") : "neutral"} /><MetricPanel icon={ShieldCheck} label="策略状态" value={strategyStatus} detail={lastAction ? `${lastAction.side === "BUY" ? "买入" : "卖出"} · ${lastAction.reason}` : "等待下一根收盘 K 线"} /></div>
      <div className="primary-grid"><section className="panel chart-panel"><div className="panel-header"><div><h2>{state.symbol} 行情</h2><p>最新收盘价 · {price ? `${formatMoney(price)} ${state.account.quoteAsset}` : "等待数据"}</p></div><div className="signal-stack"><span className="signal-label">买入 {state.strategy.buy ?? "--"}</span><span className="signal-label sell">卖出 {state.strategy.sell ?? "--"}</span></div></div><MarketChart state={state} /></section><AccountPanel state={state} /></div>
      <div className="secondary-grid"><PositionPanel state={state} /><ActivityPanel state={state} /></div>
      <div className="ai-grid"><AiAdvisorPanel state={state} /></div>
    </main></div>
  </div>;
}
