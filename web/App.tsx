import { useCallback, useEffect, useState } from "react";
import type { ReactElement } from "react";
import { AlertTriangle } from "lucide-react";
import { Layout } from "@douyinfe/semi-ui";
import type { DashboardState } from "../src/dashboard/dashboard-types";
import { AccountCard } from "./components/dashboard/AccountCard";
import { ActivityCard } from "./components/dashboard/ActivityCard";
import { AiAdvisorCard } from "./components/dashboard/AiAdvisorCard";
import { DashboardHeader } from "./components/dashboard/DashboardHeader";
import { MarketOverview } from "./components/dashboard/MarketOverview";
import { MetricOverview } from "./components/dashboard/MetricOverview";
import { PositionCard } from "./components/dashboard/PositionCard";
import { StatusBar } from "./components/dashboard/StatusBar";
import { WorkspaceIntro } from "./components/dashboard/WorkspaceIntro";
import "./styles.css";

const { Content } = Layout;

const emptyState: DashboardState = { updatedAt: 0, mode: "demo", platform: "okx", symbol: "BTC-USDT", interval: "1d", instruments: [], connection: { market: false, userData: false, lastAccountUpdate: 0, error: null }, market: { latestPrice: 0, latestCandle: null, recentCandles: [], candleCount: 0, lastCandleTimestamp: 0 }, strategy: { buy: null, sell: null, trendFilter: null, entrySignal: null, support: null, resistance: null }, account: { balances: [], quoteAsset: "USDT", quoteFree: 0, quoteLocked: 0, baseAsset: "BTC", baseFree: 0, baseLocked: 0, estimatedEquity: 0 }, position: null, lastAction: null, activity: [], ai: { enabled: false, decisionMode: "advisory", model: "gpt-4o-mini", latest: null, history: [] } };

function useDashboardSocket(onState: (state: DashboardState) => void): "connecting" | "connected" | "offline" { const [status, setStatus] = useState<"connecting" | "connected" | "offline">("connecting"); useEffect(() => { let socket: WebSocket | null = null; let retry: number | undefined; const connect = () => { setStatus("connecting"); const protocol = window.location.protocol === "https:" ? "wss" : "ws"; socket = new WebSocket(`${protocol}://${window.location.host}/ws`); socket.onopen = () => setStatus("connected"); socket.onmessage = (event) => { const message = JSON.parse(event.data) as { type?: string; payload?: DashboardState }; if (message.type === "state" && message.payload) onState(message.payload); }; socket.onclose = () => { setStatus("offline"); retry = window.setTimeout(connect, 2500); }; socket.onerror = () => socket?.close(); }; connect(); return () => { if (retry) window.clearTimeout(retry); socket?.close(); }; }, [onState]); return status; }

export default function App(): ReactElement { const [state, setState] = useState(emptyState); const [activeNav, setActiveNav] = useState("dashboard"); const [switching, setSwitching] = useState(false); const onState = useCallback((next: DashboardState) => setState(next), []); const socketStatus = useDashboardSocket(onState); const onSymbolChange = useCallback(async (symbol: string) => { if (symbol === state.symbol || switching) return; setSwitching(true); try { const response = await fetch("/api/symbol", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ symbol }) }); const result = await response.json() as DashboardState | { error?: string }; if (!response.ok) throw new Error("error" in result ? result.error : "切换交易对失败"); setState(result as DashboardState); } catch (error) { window.alert(error instanceof Error ? error.message : "切换交易对失败"); } finally { setSwitching(false); } }, [state.symbol, switching]); return <Layout className="app-container"><DashboardHeader state={state} activeNav={activeNav} onNavChange={setActiveNav} onSymbolChange={onSymbolChange} /><Content className="app-content"><WorkspaceIntro state={state} /><StatusBar state={state} socketStatus={socketStatus} />{state.connection.error && <div className="error-card"><AlertTriangle size={16} /><span>账户余额读取失败: {state.connection.error}</span></div>}<MetricOverview state={state} /><main className="trading-terminal"><section className="terminal-market"><MarketOverview state={state} /></section><aside className="terminal-sidebar"><AccountCard state={state} /><PositionCard state={state} /></aside></main><section className="terminal-footer"><ActivityCard state={state} /><AiAdvisorCard state={state} /></section></Content></Layout>; }
