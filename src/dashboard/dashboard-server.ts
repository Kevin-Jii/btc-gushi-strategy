import "dotenv/config";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocket, WebSocketServer } from "ws";
import { createStrategyConfig } from "../config/strategy.config.js";
import type { AccountBalance } from "../exchange/trading-types.js";
import { LiveTrader } from "../live/live-trader.js";
import type { LiveTraderAction, LiveTraderStatus } from "../live/live-trader.js";
import type { DashboardActivity, DashboardOrder, DashboardState, StrategyDashboardSummary } from "./dashboard-types.js";
import { logger } from "../utils/logger.js";
import { createPlatformRuntime, type PlatformRuntime } from "../exchange/platform-factory.js";
import { createLangChainAdvisorConfig, LangChainAdvisor } from "../ai/langchain-advisor.js";
import { createPostgresRepository, PostgresRepository } from "../persistence/postgres-repository.js";
import type { PersistedAiReviewRecord, PersistedOrder, StrategyPerformance } from "../persistence/persistence-types.js";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const webDist = path.join(projectRoot, "web", "dist");
const port = Number(process.env.DASHBOARD_PORT ?? 8787);

function json(response: http.ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(payload);
}

function safeFilePath(urlPath: string): string | null {
  const pathname = decodeURIComponent(urlPath.split("?")[0] ?? "/");
  const relative = pathname === "/" ? "index.html" : pathname.replace(/^\/+/, "");
  const candidate = path.resolve(webDist, relative);
  return candidate.startsWith(`${webDist}${path.sep}`) ? candidate : null;
}

function contentType(filePath: string): string {
  const extension = path.extname(filePath);
  if (extension === ".html") return "text/html; charset=utf-8";
  if (extension === ".js") return "text/javascript; charset=utf-8";
  if (extension === ".css") return "text/css; charset=utf-8";
  if (extension === ".svg") return "image/svg+xml";
  return "application/octet-stream";
}

function formatNumber(value: number): string {
  return Number.isFinite(value) ? value.toFixed(8) : "0";
}

class DashboardRuntime {
  private balances: AccountBalance[] = [];
  private lastAccountUpdate = 0;
  private accountError: string | null = null;
  private latestPrice = 0;
  private activityId = 0;
  private previousBalance = new Map<string, number>();
  private previousActionTimestamp = 0;
  private previousAiTimestamp = 0;
  private activity: DashboardActivity[] = [];
  private orders: DashboardOrder[] = [];
  private instruments: import("../exchange/trading-types.js").SpotInstrument[] = [];
  private refreshing = false;
  private readonly clients = new Set<WebSocket>();
  private readonly trader: LiveTrader;
  private readonly runtime: PlatformRuntime;
  private readonly aiAdvisor: LangChainAdvisor;
  private readonly repository: PostgresRepository | null;
  private strategyPerformance = new Map<string, StrategyPerformance>();

  public constructor() {
    this.runtime = createPlatformRuntime(process.env, createStrategyConfig());
    this.aiAdvisor = new LangChainAdvisor(createLangChainAdvisorConfig(process.env));
    this.repository = createPostgresRepository(process.env);
    this.trader = new LiveTrader(this.runtime.client, {
      config: this.runtime.config.strategy,
      symbol: this.runtime.symbol,
      quoteAsset: this.runtime.quoteAsset,
      positionFraction: this.runtime.positionFraction,
      aiAdvisor: this.aiAdvisor,
      platform: this.runtime.platform,
      mode: this.runtime.mode,
      adoptExistingPosition: process.env.OKX_ADOPT_EXISTING_POSITION === "true",
      onUpdate: (status) => this.handleTraderUpdate(status),
      onOrder: (action) => this.repository?.saveOrder({ exchangeOrderId: action.exchangeOrderId, strategyId: "gushi-ma", strategyName: "葛氏八法则 · MA 趋势", strategyVersion: "1.0.0", platform: this.runtime.platform, mode: this.runtime.mode, symbol: this.trader.symbol, interval: this.runtime.client.interval ?? this.runtime.interval, side: action.side, quantity: action.quantity, price: action.price, reason: action.reason, executedAt: action.timestamp, ...(action.entryOrderId ? { entryOrderId: action.entryOrderId } : {}), ...(action.realizedProfit !== undefined ? { realizedProfit: action.realizedProfit } : {}), ...(action.realizedProfitPercent !== undefined ? { realizedProfitPercent: action.realizedProfitPercent } : {}) }).then(() => this.refreshPerformance()),
      onAiReview: (input, result) => this.repository?.saveAiReview({ strategyId: "gushi-ma", strategyName: "葛氏八法则 · MA 趋势", strategyVersion: "1.0.0", interval: this.runtime.client.interval ?? this.runtime.interval, input, result }),
    });
  }

  public async start(): Promise<void> {
    if (this.repository) {
      await this.repository.initialize();
      const [orders] = await Promise.all([this.repository.loadRecentOrders(100), this.refreshPerformance()]);
      this.orders = orders.map((order, index) => this.toDashboardOrder(order, index));
      logger.info(`PostgreSQL 已连接，加载 ${orders.length} 条历史订单`);
    } else {
      logger.warn("PostgreSQL 持久化已通过 POSTGRES_ENABLED=false 关闭");
    }
    const rawLimit = Number(process.env.BINANCE_HISTORY_LIMIT ?? process.env.OKX_HISTORY_LIMIT ?? 300);
    const historyLimit = Number.isInteger(rawLimit) && rawLimit >= 130 && rawLimit <= 1000 ? rawLimit : 300;
    await this.trader.start(historyLimit);
    this.latestPrice = this.trader.getStatus().latestCandle?.close ?? 0;
    try { this.instruments = await this.runtime.client.getSpotInstruments(this.runtime.quoteAsset); } catch (error) { logger.warn(`加载 OKX 交易对失败：${error instanceof Error ? error.message : String(error)}`); }
    await this.refreshAccount();
    this.addActivity({ type: "system", title: "交易服务已启动", detail: `${this.runtime.platform.toUpperCase()} ${this.runtime.mode} · ${this.trader.symbol} · ${this.runtime.interval}` });
    setInterval(() => { void this.refreshAccount(); void this.refreshLatestPrice(); void this.persistMonitorSnapshot(); }, 3000);
  }

  public state(): DashboardState {
    const status = this.trader.getStatus();
    const strategy = status.latestEvaluation;
    const rules = this.balances;
    const quote = rules.find((balance) => balance.asset === this.trader.quoteAsset);
    const baseAsset = this.trader.symbol.split("-")[0] ?? "";
    const base = rules.find((balance) => balance.asset === baseAsset);
    const latestPrice = this.latestPrice || status.latestCandle?.close || 0;
    const estimatedEquity = (quote?.free ?? 0) + (quote?.locked ?? 0) + ((base?.free ?? 0) + (base?.locked ?? 0)) * latestPrice;
    return {
      updatedAt: Date.now(),
      mode: this.runtime.mode === "testnet" || this.runtime.mode === "demo" ? this.runtime.mode : "live",
      platform: this.runtime.platform,
      symbol: this.trader.symbol,
      interval: this.runtime.client.interval ?? this.runtime.interval,
      instruments: this.instruments,
      connection: {
        market: status.marketConnected,
        userData: status.userDataConnected,
        lastAccountUpdate: this.lastAccountUpdate,
        error: this.accountError,
      },
      market: {
        latestPrice,
        latestCandle: status.latestCandle,
        recentCandles: status.recentCandles,
        candleCount: status.candleCount,
        lastCandleTimestamp: status.lastCandleTimestamp,
      },
      strategy: {
        buy: strategy?.signal.buy ?? null,
        sell: strategy?.signal.sell ?? null,
        trendFilter: strategy?.trendFilter ?? null,
        entrySignal: strategy?.entrySignal ?? null,
        support: strategy?.context.support ?? null,
        resistance: strategy?.context.resistance ?? null,
      },
      account: {
        balances: this.balances,
        quoteAsset: this.trader.quoteAsset,
        quoteFree: quote?.free ?? 0,
        quoteLocked: quote?.locked ?? 0,
        baseAsset,
        baseFree: base?.free ?? 0,
        baseLocked: base?.locked ?? 0,
        estimatedEquity,
      },
      position: status.position,
      lastAction: status.lastAction,
      ai: {
        enabled: this.aiAdvisor.enabled,
        decisionMode: this.aiAdvisor.decisionMode,
        model: this.aiAdvisor.modelName,
        latest: status.aiValidation,
        history: status.aiHistory,
      },
      activity: this.activity,
      strategies: this.strategySummaries(status),
      orders: this.orders,
    };
  }

  public async getOrders(query: { limit?: number; strategyId?: string; symbol?: string; side?: "BUY" | "SELL" }): Promise<PersistedOrder[]> {
    return this.repository ? this.repository.loadOrders(query) : [];
  }

  public async getAiReviews(query: { limit?: number; strategyId?: string; symbol?: string }): Promise<PersistedAiReviewRecord[]> {
    return this.repository ? this.repository.loadAiReviews(query) : [];
  }

  public async getPerformance(strategyId?: string): Promise<StrategyPerformance[]> {
    return this.repository ? this.repository.loadStrategyPerformance(strategyId) : [];
  }

  public async getInstruments(): Promise<import("../exchange/trading-types.js").SpotInstrument[]> {
    this.instruments = await this.runtime.client.getSpotInstruments(this.runtime.quoteAsset);
    return this.instruments;
  }

  public async switchInterval(body: string): Promise<void> {
    const parsed = JSON.parse(body) as { interval?: unknown };
    const interval = typeof parsed.interval === "string" ? parsed.interval : "";
    await this.trader.switchInterval(interval);
    this.addActivity({ type: "system", title: "时间周期已切换", detail: interval });
  }

  public async reviewLatest(): Promise<void> {
    await this.trader.reviewLatest();
  }

  public async manualTrade(body: string): Promise<void> {
    const parsed = JSON.parse(body) as { side?: unknown; strategyId?: unknown; interval?: unknown };
    const side = parsed.side === "BUY" || parsed.side === "SELL" ? parsed.side : null;
    if (!side) throw new Error("交易方向无效");
    if (side === "BUY") {
      if (parsed.strategyId !== "gushi-ma") throw new Error("买入前必须选择有效策略");
      const interval = typeof parsed.interval === "string" ? parsed.interval : "";
      if (!["1h", "1d", "1w", "1M", "1y"].includes(interval)) throw new Error("策略不允许该时间周期");
      if (interval !== (this.runtime.client.interval ?? this.runtime.interval)) await this.trader.switchInterval(interval);
      await this.trader.manualBuy();
    } else await this.trader.manualSell();
  }

  public async switchSymbol(body: string): Promise<void> {
    const parsed = JSON.parse(body) as { symbol?: unknown };
    const symbol = typeof parsed.symbol === "string" ? parsed.symbol.toUpperCase() : "";
    if (!this.instruments.some((instrument) => instrument.symbol === symbol)) throw new Error(`交易对不可交易或不在 OKX 现货列表中：${symbol}`);
    await this.trader.switchSymbol(symbol);
    this.addActivity({ type: "system", title: "交易对已切换", detail: `${this.runtime.platform.toUpperCase()} · ${symbol}` });
  }

  public addClient(socket: WebSocket): void {
    this.clients.add(socket);
    socket.send(JSON.stringify({ type: "state", payload: this.state() }));
    socket.on("close", () => this.clients.delete(socket));
    socket.on("error", () => this.clients.delete(socket));
  }

  public async stop(): Promise<void> {
    await this.trader.stop();
    await this.repository?.close();
    for (const socket of this.clients) socket.close();
    this.clients.clear();
  }

  private handleTraderUpdate(status: LiveTraderStatus): void {
    const action = status.lastAction;
    if (action && action.timestamp > this.previousActionTimestamp) {
      this.previousActionTimestamp = action.timestamp;
      this.orders = [{ id: this.activityId + 1, exchangeOrderId: action.exchangeOrderId, strategyId: "gushi-ma", strategyName: "葛氏八法则 · MA 趋势", symbol: this.trader.symbol, side: action.side, quantity: action.quantity, price: action.price, reason: action.reason, timestamp: action.timestamp, ...(action.realizedProfit !== undefined ? { realizedProfit: action.realizedProfit } : {}), ...(action.realizedProfitPercent !== undefined ? { realizedProfitPercent: action.realizedProfitPercent } : {}) }, ...this.orders].slice(0, 100);
      this.addActivity({
        type: "order",
        side: action.side,
        title: `${action.side === "BUY" ? "买入" : "卖出"} ${this.trader.symbol}`,
        detail: `${formatNumber(action.quantity)} · ${formatNumber(action.price)} · ${action.reason}`,
      });
    }
    const ai = status.aiValidation;
    if (ai && ai.generatedAt > this.previousAiTimestamp) {
      this.previousAiTimestamp = ai.generatedAt;
      this.addActivity({
        type: "ai",
        title: `AI 审核 ${ai.recommendation} · ${ai.ruleStatus}`,
        detail: `${Math.round(ai.confidence * 100)}% 置信度 · ${ai.summary}`,
      });
    }
    this.broadcast();
  }

  private async refreshLatestPrice(): Promise<void> {
    try {
      this.latestPrice = await this.runtime.client.getLatestPrice(this.trader.symbol);
      this.broadcast();
    } catch (error) {
      logger.warn(`实时价格刷新失败：${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async refreshAccount(): Promise<void> {
    if (this.refreshing) return;
    this.refreshing = true;
    try {
      const next = await this.runtime.client.getBalances();
      const changed = next.some((balance) => {
        const previous = this.previousBalance.get(balance.asset) ?? 0;
        return Math.abs(previous - balance.free - balance.locked) > 1e-12;
      });
      this.balances = next;
      this.previousBalance = new Map(next.map((balance) => [balance.asset, balance.free + balance.locked]));
      this.lastAccountUpdate = Date.now();
      this.accountError = null;
      if (changed && this.previousBalance.size > 0) {
        this.addActivity({ type: "balance", title: "账户余额已更新", detail: `${this.trader.quoteAsset} 可用 ${formatNumber(next.find((row) => row.asset === this.trader.quoteAsset)?.free ?? 0)}` });
      }
    } catch (error) {
      this.accountError = error instanceof Error ? error.message : String(error);
    } finally {
      this.refreshing = false;
      this.broadcast();
    }
  }

  private strategySummaries(status: LiveTraderStatus): StrategyDashboardSummary[] {
    const evaluation = status.latestEvaluation;
    const buy = evaluation?.signal.buy ?? null;
    const sell = evaluation?.signal.sell ?? null;
    const performance = this.strategyPerformance.get("gushi-ma");
    const unrealizedProfit = status.position ? ((status.latestCandle?.close ?? status.position.entryPrice) - status.position.entryPrice) * status.position.quantity : 0;
    const unrealizedPercent = status.position && status.position.entryPrice > 0 ? (unrealizedProfit / (status.position.entryPrice * status.position.quantity)) * 100 : 0;
    return [{ id: "gushi-ma", name: "葛氏八法则 · MA 趋势", version: "1.0.0", category: "趋势", status: status.marketConnected ? "running" : "stopped", profit: (performance?.realizedProfit ?? 0) + unrealizedProfit, profitPercent: (performance?.realizedProfitPercent ?? 0) + unrealizedPercent, orderCount: this.orders.filter((order) => order.strategyId === "gushi-ma").length, buySignal: buy, sellSignal: sell }];
  }

  private async persistMonitorSnapshot(): Promise<void> {
    if (!this.repository) return;
    const status = this.trader.getStatus();
    const candle = status.latestCandle;
    const position = status.position;
    const markPrice = candle?.close ?? 0;
    const unrealizedProfit = position ? (markPrice - position.entryPrice) * position.quantity : 0;
    const terminationCondition = position ? `固定止损 ${(this.runtime.config.strategy.stopLossPct * 100).toFixed(2)}% · 移动止损 ${(this.runtime.config.strategy.trailingStopPct * 100).toFixed(2)}% · 峰值激活 ${(this.runtime.config.strategy.trailingActivationProfit * 100).toFixed(2)}%` : "无持仓：等待策略入场信号";
    try { await this.repository.saveMonitorSnapshot({ strategyId: "gushi-ma", symbol: this.trader.symbol, interval: this.runtime.client.interval ?? this.runtime.interval, timestamp: Date.now(), equity: this.state().account.estimatedEquity, unrealizedProfit, positionQuantity: position?.quantity ?? 0, entryPrice: position?.entryPrice ?? 0, markPrice, terminationCondition, signal: status.latestEvaluation?.signal.buy ?? status.latestEvaluation?.signal.sell ?? "NONE" }); } catch (error) { logger.warn(`策略监控快照保存失败：${error instanceof Error ? error.message : String(error)}`); }
  }

  private async refreshPerformance(): Promise<void> {
    if (!this.repository) return;
    const rows = await this.repository.loadStrategyPerformance();
    this.strategyPerformance = new Map(rows.map((row) => [row.strategyId, row]));
  }

  private toDashboardOrder(order: PersistedOrder, index: number): DashboardOrder {
    return { id: index + 1, exchangeOrderId: order.exchangeOrderId, strategyId: order.strategyId, strategyName: order.strategyName, symbol: order.symbol, side: order.side, quantity: order.quantity, price: order.price, reason: order.reason, timestamp: order.executedAt, ...(order.realizedProfit !== undefined ? { realizedProfit: order.realizedProfit } : {}), ...(order.realizedProfitPercent !== undefined ? { realizedProfitPercent: order.realizedProfitPercent } : {}) };
  }

  private addActivity(input: Omit<DashboardActivity, "id" | "at">): void {
    this.activity = [{ id: ++this.activityId, at: Date.now(), ...input }, ...this.activity].slice(0, 30);
    this.broadcast();
  }

  private broadcast(): void {
    const message = JSON.stringify({ type: "state", payload: this.state() });
    for (const socket of this.clients) {
      if (socket.readyState === WebSocket.OPEN) socket.send(message);
    }
  }
}

async function main(): Promise<void> {
  const runtime = new DashboardRuntime();
  await runtime.start();
  const server = http.createServer((request, response) => {
    const requestUrl = new URL(request.url ?? "/", `http://${request.headers.host ?? "127.0.0.1"}`);
    const url = requestUrl.pathname;
    const queryLimit = Number(requestUrl.searchParams.get("limit") ?? "100");
    if (url === "/api/state") {
      json(response, 200, runtime.state());
      return;
    }
    if (url === "/api/instruments") {
      void runtime.getInstruments().then((instruments) => json(response, 200, instruments)).catch((error) => json(response, 500, { error: error instanceof Error ? error.message : String(error) }));
      return;
    }
    if (url === "/api/orders") {
      const orderQuery = { limit: queryLimit, ...(requestUrl.searchParams.get("strategyId") ? { strategyId: requestUrl.searchParams.get("strategyId")! } : {}), ...(requestUrl.searchParams.get("symbol") ? { symbol: requestUrl.searchParams.get("symbol")! } : {}), ...(requestUrl.searchParams.get("side") === "BUY" || requestUrl.searchParams.get("side") === "SELL" ? { side: requestUrl.searchParams.get("side") as "BUY" | "SELL" } : {}) };
      void runtime.getOrders(orderQuery).then((orders) => json(response, 200, orders)).catch((error) => json(response, 500, { error: error instanceof Error ? error.message : String(error) }));
      return;
    }
    if (url === "/api/ai-reviews") {
      const reviewQuery = { limit: queryLimit, ...(requestUrl.searchParams.get("strategyId") ? { strategyId: requestUrl.searchParams.get("strategyId")! } : {}), ...(requestUrl.searchParams.get("symbol") ? { symbol: requestUrl.searchParams.get("symbol")! } : {}) };
      void runtime.getAiReviews(reviewQuery).then((reviews) => json(response, 200, reviews)).catch((error) => json(response, 500, { error: error instanceof Error ? error.message : String(error) }));
      return;
    }
    if (url === "/api/performance") {
      void runtime.getPerformance(requestUrl.searchParams.get("strategyId") ?? undefined).then((rows) => json(response, 200, rows)).catch((error) => json(response, 500, { error: error instanceof Error ? error.message : String(error) }));
      return;
    }
    if (url === "/api/interval") {
      if (request.method !== "POST") { json(response, 405, { error: "POST required" }); return; }
      let body = "";
      request.on("data", (chunk) => { body += chunk; });
      request.on("end", () => { void runtime.switchInterval(body).then(() => json(response, 200, runtime.state())).catch((error) => json(response, 400, { error: error instanceof Error ? error.message : String(error) })); });
      return;
    }
    if (url === "/api/ai-review") {
      if (request.method !== "POST") { json(response, 405, { error: "POST required" }); return; }
      void runtime.reviewLatest().then(() => json(response, 200, runtime.state())).catch((error) => json(response, 400, { error: error instanceof Error ? error.message : String(error) }));
      return;
    }
    if (url === "/api/trade") {
      if (request.method !== "POST") { json(response, 405, { error: "POST required" }); return; }
      let body = "";
      request.on("data", (chunk) => { body += chunk; });
      request.on("end", () => {
        try {
          void runtime.manualTrade(body).then(() => json(response, 200, runtime.state())).catch((error) => json(response, 400, { error: error instanceof Error ? error.message : String(error) }));
        } catch (error) { json(response, 400, { error: error instanceof Error ? error.message : String(error) }); }
      });
      return;
    }
    if (url === "/api/symbol") {
      if (request.method !== "POST") { json(response, 405, { error: "POST required" }); return; }
      let body = "";
      request.on("data", (chunk) => { body += chunk; });
      request.on("end", () => { void runtime.switchSymbol(body).then(() => json(response, 200, runtime.state())).catch((error) => json(response, 400, { error: error instanceof Error ? error.message : String(error) })); });
      return;
    }
    if (url === "/api/health") {
      json(response, 200, { ok: true, updatedAt: Date.now() });
      return;
    }
    const filePath = safeFilePath(url);
    if (!filePath || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      json(response, 404, { error: "页面资源不存在，请先运行 npm run build:web" });
      return;
    }
    response.writeHead(200, { "Content-Type": contentType(filePath), "Cache-Control": "no-store" });
    fs.createReadStream(filePath).pipe(response);
  });
  const websocketServer = new WebSocketServer({ server });
  websocketServer.on("connection", (socket) => runtime.addClient(socket));
  server.listen(port, "127.0.0.1", () => logger.info(`Dashboard running at http://127.0.0.1:${port}`));

  const shutdown = async (): Promise<void> => {
    await runtime.stop();
    websocketServer.close();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    process.exitCode = 0;
  };
  process.once("SIGINT", () => { void shutdown(); });
  process.once("SIGTERM", () => { void shutdown(); });
}

void main().catch((error: unknown) => {
  logger.error(`Dashboard 启动失败：${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
