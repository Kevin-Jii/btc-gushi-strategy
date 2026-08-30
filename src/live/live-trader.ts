import type { StrategyConfig } from "../config/strategy.config.js";
import type { Candle, GushiBuySignal, Position } from "../data/types.js";
import { evaluateRiskExit, RiskManager } from "../risk/risk-manager.js";
import { StrategyEngine } from "../strategy/strategy.js";
import type { TradingClient } from "../exchange/trading-types.js";
import { OrderExecutor } from "../exchange/order-executor.js";
import { logger } from "../utils/logger.js";
import type { StrategyEvaluation } from "../strategy/strategy.js";
import type { AiReviewInput, AiValidation } from "../ai/ai-types.js";
import { LangChainAdvisor } from "../ai/langchain-advisor.js";

export interface LiveTraderAction {
  exchangeOrderId: string;
  side: "BUY" | "SELL";
  quantity: number;
  price: number;
  reason: string;
  timestamp: number;
  entryOrderId?: string;
  realizedProfit?: number;
  realizedProfitPercent?: number;
}

export interface LiveTraderStatus {
  position: Position | null;
  latestCandle: Candle | null;
  latestEvaluation: StrategyEvaluation | null;
  candleCount: number;
  lastAction: LiveTraderAction | null;
  lastCandleTimestamp: number;
  marketConnected: boolean;
  userDataConnected: boolean;
  recentCandles: Candle[];
  aiValidation: AiValidation | null;
  aiHistory: AiValidation[];
}

export interface LiveTraderOptions {
  config: StrategyConfig;
  symbol: string;
  quoteAsset: string;
  positionFraction: number;
  /** 可选的 LangChain 审核器；未配置时不影响确定性策略。 */
  aiAdvisor?: LangChainAdvisor;
  platform?: string;
  mode?: string;
  adoptExistingPosition?: boolean;
  onUpdate?: (status: LiveTraderStatus) => void | Promise<void>;
  onOrder?: (action: LiveTraderAction) => void | Promise<void>;
  onAiReview?: (input: AiReviewInput, result: AiValidation) => void | Promise<void>;
}

/** 将回测策略接到交易所收盘 K 线，订单状态仍以交易所返回为准。 */
export class LiveTrader {
  private strategy: StrategyEngine;
  private executor: OrderExecutor;
  private readonly riskManager = new RiskManager();
  private currentSymbol: string;
  private currentQuoteAsset: string;
  private readonly candles: Candle[] = [];
  private position: Position | null = null;
  private stopMarketStream: (() => Promise<void>) | null = null;
  private stopUserStream: (() => Promise<void>) | null = null;
  private lastCandleTimestamp = 0;
  private latestCandle: Candle | null = null;
  private latestEvaluation: StrategyEvaluation | null = null;
  private lastAction: LiveTraderAction | null = null;
  private marketConnected = false;
  private userDataConnected = false;
  private aiValidation: AiValidation | null = null;
  private readonly aiHistory: AiValidation[] = [];
  private entryOrderId: string | null = null;

  public constructor(
    private readonly client: TradingClient,
    private readonly options: LiveTraderOptions,
  ) {
    this.strategy = new StrategyEngine(options.config);
    this.currentSymbol = options.symbol;
    this.currentQuoteAsset = options.quoteAsset;
    this.executor = new OrderExecutor(client, this.currentSymbol);
  }

  /** 切换交易对；会重置该交易对的行情和本地策略状态。 */
  public async switchInterval(interval: string, historyLimit = 300): Promise<void> {
    const normalized = interval.trim();
    if (!/^(1h|1d|1w|1M|1y)$/.test(normalized)) throw new Error("Unsupported chart interval");
    if (this.stopMarketStream) await this.stopMarketStream();
    this.stopMarketStream = null;
    this.marketConnected = false;
    this.client.setInterval?.(normalized);
    this.strategy = new StrategyEngine(this.options.config);
    this.candles.length = 0;
    this.latestCandle = null;
    this.latestEvaluation = null;
    this.lastCandleTimestamp = 0;
    await this.start(historyLimit);
  }

  public async switchSymbol(symbol: string, historyLimit = 300): Promise<void> {
    const nextSymbol = symbol.trim().toUpperCase();
    if (!/^[A-Z0-9]+-[A-Z0-9]+$/.test(nextSymbol)) throw new Error("Invalid OKX spot instrument");
    if (this.stopMarketStream) await this.stopMarketStream();
    if (this.stopUserStream) await this.stopUserStream();
    this.stopMarketStream = null;
    this.stopUserStream = null;
    this.userDataConnected = false;
    this.marketConnected = false;
    this.currentSymbol = nextSymbol;
    this.currentQuoteAsset = nextSymbol.split("-")[1] ?? this.currentQuoteAsset;
    this.strategy = new StrategyEngine(this.options.config);
    this.executor = new OrderExecutor(this.client, nextSymbol);
    this.candles.length = 0;
    this.latestCandle = null;
    this.latestEvaluation = null;
    this.lastCandleTimestamp = 0;
    this.position = null;
    this.entryOrderId = null;
    await this.start(historyLimit);
  }

  public get symbol(): string { return this.currentSymbol; }
  public get quoteAsset(): string { return this.currentQuoteAsset; }

  /** 手动交易入口，供受控 Dashboard 操作使用。 */
  public async manualBuy(): Promise<void> {
    if (this.position) throw new Error("当前已有持仓，不能重复买入");
    await this.openPosition(this.latestCandle?.close ?? 0, "manual-buy");
  }

  public async manualSell(): Promise<void> {
    if (!this.position) throw new Error("当前没有可卖出的持仓");
    await this.closePosition("manual-sell");
  }

  /** 启动前加载足够的历史数据，使 MA120 和 G 规则立即可用。 */
  public async start(historyLimit = 300): Promise<void> {
    try {
      await this.executor.loadRules();
    } catch (error) {
      throw new Error(`加载交易所交易规则失败：${error instanceof Error ? error.message : String(error)}`);
    }
    let history: Candle[];
    try {
      history = await this.client.loadCandles(this.currentSymbol, this.client.interval ?? "1d", historyLimit);
    } catch (error) {
      throw new Error(`加载历史 K 线失败：${error instanceof Error ? error.message : String(error)}`);
    }
    for (const candle of history) {
      this.candles.push(candle);
      this.latestEvaluation = this.strategy.process(candle);
      this.lastCandleTimestamp = Math.max(this.lastCandleTimestamp, candle.timestamp);
      this.latestCandle = candle;
    }
    const latest = history.at(-1);
    if (latest && this.options.adoptExistingPosition) await this.syncExistingPosition(latest.close);

    try {
      this.stopMarketStream = await this.client.subscribeKlines(this.currentSymbol, this.client.interval ?? "1d", (candle) => this.onClosedCandle(candle));
      this.marketConnected = true;
    } catch (error) {
      throw new Error(`建立行情 WebSocket 订阅失败：${error instanceof Error ? error.message : String(error)}`);
    }
    try {
      this.stopUserStream = await this.client.subscribeUserData((event) => {
        // 成交/余额事件到达后重新读取账户，避免仅依赖本地状态。
        if (event.symbol === this.currentSymbol && event.orderStatus === "FILLED") {
          void this.refreshPositionFromBalance();
        }
      });
      this.userDataConnected = true;
    } catch (error) {
      // 行情流仍然可以驱动策略；用户流失败时定期通过 REST 读取余额，避免整个进程退出。
      logger.warn(`用户数据 WebSocket 订阅失败，将继续运行行情策略：${error instanceof Error ? error.message : String(error)}`);
      this.stopUserStream = null;
      this.userDataConnected = false;
    }
    logger.info(`Live trader started for ${this.currentSymbol}`);
    this.emitUpdate();
  }

  /** 处理一根已收盘 K 线；未收盘更新不会进入策略。 */
  public async onClosedCandle(candle: Candle): Promise<void> {
    // OKX 推送的是同一根 K 线的增量；未收盘更新只刷新价格和图表，不触发策略或下单。
    if (candle.timestamp === this.lastCandleTimestamp) {
      const lastIndex = this.candles.length - 1;
      if (this.candles[lastIndex]?.timestamp === candle.timestamp) this.candles[lastIndex] = candle;
      this.latestCandle = candle;
      // 增量行情只更新当前蜡烛和最新价格；下一根已收盘 K 线再触发策略。
      this.emitUpdate();
      return;
    }
    if (candle.timestamp < this.lastCandleTimestamp) return;
    this.lastCandleTimestamp = candle.timestamp;
    this.candles.push(candle);
    if (!candle.isClosed) { this.latestCandle = candle; this.emitUpdate(); return; }
    const evaluation = this.strategy.process(candle);
    this.latestCandle = candle;
    this.latestEvaluation = evaluation;
    this.emitUpdate();
    if (!evaluation) return;

    const wantsEntry = !this.position
      && evaluation.entrySignal
      && evaluation.signal.buy !== null
      && this.riskManager.canEnter(this.candles.length - 1, this.options.config.cooldownBars);
    const vetoEntry = wantsEntry && this.options.aiAdvisor?.isVetoMode() === true;
    // 审核调用与确定性策略并行；veto 模式下只有入场信号需要等待审核结果。
    const reviewPromise = this.runAiReview(candle, evaluation, vetoEntry);

    if (this.position) {
      this.position.peakPrice = Math.max(this.position.peakPrice, candle.high);
      const riskExit = evaluateRiskExit(candle, this.position, this.options.config);
      if (riskExit) {
        await this.closePosition(riskExit.reason);
        return;
      }
      if (evaluation.signal.sell) {
        await this.closePosition(evaluation.signal.sell);
        return;
      }
    }

    if (wantsEntry && evaluation.signal.buy) {
      if (vetoEntry) {
        const review = await reviewPromise;
        if (!review?.allowEntry) {
          logger.info("LangChain veto 已阻止本次确定性策略入场");
          return;
        }
      } else {
        void reviewPromise;
      }
      await this.openPosition(candle.close, evaluation.signal.buy);
    } else {
      void reviewPromise;
    }
  }

  /** 将必要的行情、策略和非敏感持仓摘要交给 LangChain，不传递任何 API 凭证。 */
  private async runAiReview(
    candle: Candle,
    evaluation: StrategyEvaluation,
    force: boolean,
  ): Promise<AiValidation | null> {
    const advisor = this.options.aiAdvisor;
    if (!advisor) return null;
    const input: AiReviewInput = {
      symbol: this.currentSymbol,
      platform: this.options.platform ?? "okx",
      mode: this.options.mode ?? "unknown",
      candle,
      recentCandles: this.candles.slice(-30),
      evaluation,
      position: this.position ? { ...this.position } : null,
    };
    const result = await advisor.review(input, force);
    if (!result) return null;
    this.aiValidation = result;
    this.aiHistory.unshift({ ...result, evidence: [...result.evidence], risks: [...result.risks] });
    if (this.aiHistory.length > 30) this.aiHistory.length = 30;
    await this.persistSafely("AI 审核", () => this.options.onAiReview?.(input, result));
    this.emitUpdate();
    return result;
  }

  private async openPosition(price: number, reason: string): Promise<void> {
    const balances = await this.client.getBalances();
    const quote = balances.find((balance) => balance.asset === this.currentQuoteAsset);
    const quoteAmount = (quote?.free ?? 0) * this.options.positionFraction;
    const fill = await this.executor.buyWithQuote(quoteAmount);
    if (fill.executedQuantity <= 0 || fill.averagePrice <= 0) throw new Error("交易所买单没有成交");
    this.position = { side: "long", entryPrice: fill.averagePrice || price, quantity: fill.executedQuantity, entryTimestamp: fill.transactTime, entryBarIndex: this.candles.length - 1, peakPrice: fill.averagePrice || price };
    this.entryOrderId = fill.orderId;
    this.lastAction = { exchangeOrderId: fill.orderId, side: "BUY", quantity: fill.executedQuantity, price: fill.averagePrice || price, reason, timestamp: fill.transactTime };
    await this.persistSafely("买入订单", () => this.options.onOrder?.(this.lastAction as LiveTraderAction));
    logger.info(`BUY ${this.currentSymbol} ${fill.executedQuantity} at ${fill.averagePrice} (${reason})`);
    this.emitUpdate();
  }

  private async closePosition(reason: string): Promise<void> {
    if (!this.position) return;
    const position = this.position;
    const fill = await this.executor.sellQuantity(position.quantity);
    if (fill.executedQuantity > 0) {
      const realizedProfit = (fill.averagePrice - position.entryPrice) * fill.executedQuantity;
      const realizedProfitPercent = position.entryPrice > 0 ? ((fill.averagePrice - position.entryPrice) / position.entryPrice) * 100 : 0;
      this.position = null;
      this.riskManager.registerExit(this.candles.length - 1);
      this.lastAction = { exchangeOrderId: fill.orderId, side: "SELL", quantity: fill.executedQuantity, price: fill.averagePrice, reason, timestamp: fill.transactTime, ...(this.entryOrderId ? { entryOrderId: this.entryOrderId } : {}), realizedProfit, realizedProfitPercent };
      this.entryOrderId = null;
      await this.persistSafely("卖出订单", () => this.options.onOrder?.(this.lastAction as LiveTraderAction));
      logger.info(`SELL ${this.currentSymbol} ${fill.executedQuantity} at ${fill.averagePrice} (${reason})`);
      this.emitUpdate();
    }
  }

  private async persistSafely(label: string, operation: () => void | Promise<void> | undefined): Promise<void> {
    try {
      await operation();
    } catch (error) {
      logger.error(`${label}已成交/生成，但 PostgreSQL 保存失败：${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /** 重启时可选择接管已有 BTC；默认关闭，避免误接管人工持仓。 */
  private async syncExistingPosition(markPrice: number): Promise<void> {
    const rules = await this.client.getSymbolRules(this.currentSymbol);
    const balances = await this.client.getBalances();
    const base = balances.find((balance) => balance.asset === rules.baseAsset);
    const quantity = base?.free ?? 0;
    if (quantity >= rules.minQuantity) {
      this.position = { side: "long", entryPrice: markPrice, quantity, entryTimestamp: Date.now(), entryBarIndex: this.candles.length - 1, peakPrice: markPrice };
      logger.warn(`Adopted existing ${rules.baseAsset} balance as a position; entry price is marked at current price`);
    }
  }

  private async refreshPositionFromBalance(): Promise<void> {
    if (!this.position) return;
    const rules = await this.client.getSymbolRules(this.currentSymbol);
    const balances = await this.client.getBalances();
    const base = balances.find((balance) => balance.asset === rules.baseAsset);
    const quantity = base?.free ?? 0;
    if (quantity < rules.minQuantity) this.position = null;
    else this.position.quantity = quantity;
    this.emitUpdate();
  }

  /** 返回页面所需的策略状态；不暴露 API 密钥或原始交易客户端。 */
  public getStatus(): LiveTraderStatus {
    return {
      position: this.position ? { ...this.position } : null,
      latestCandle: this.latestCandle ? { ...this.latestCandle } : null,
      latestEvaluation: this.latestEvaluation,
      candleCount: this.candles.length,
      lastAction: this.lastAction ? { ...this.lastAction } : null,
      lastCandleTimestamp: this.lastCandleTimestamp,
      marketConnected: this.marketConnected,
      userDataConnected: this.userDataConnected,
      recentCandles: this.candles.slice(-120).map((candle) => ({ ...candle })),
      aiValidation: this.aiValidation ? {
        ...this.aiValidation,
        evidence: [...this.aiValidation.evidence],
        risks: [...this.aiValidation.risks],
      } : null,
      aiHistory: this.aiHistory.map((item) => ({ ...item, evidence: [...item.evidence], risks: [...item.risks] })),
    };
  }

  private emitUpdate(): void {
    const callback = this.options.onUpdate;
    if (!callback) return;
    void Promise.resolve(callback(this.getStatus())).catch((error: unknown) => {
      logger.warn(`仪表盘状态更新失败：${error instanceof Error ? error.message : String(error)}`);
    });
  }

  public async stop(): Promise<void> {
    if (this.stopMarketStream) await this.stopMarketStream();
    if (this.stopUserStream) await this.stopUserStream();
    this.marketConnected = false;
    this.userDataConnected = false;
    this.stopMarketStream = null;
    this.stopUserStream = null;
  }
}
