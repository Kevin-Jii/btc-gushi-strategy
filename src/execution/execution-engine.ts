/**
 * 执行引擎
 * 协调信号聚合、风险管理、订单执行
 */

import { Decimal } from "decimal.js";
import type { StrategyConfig } from "../config/strategy.config.js";
import type { Candle } from "../data/types.js";
import type { Strategy } from "../strategy/core/strategy.interface.js";
import type { StrategySignal, PositionData } from "../strategy/core/strategy-types.js";
import { StrategyRegistry } from "../strategy/core/strategy-registry.js";
import { StrategyContextBuilder } from "../strategy/core/strategy-context.js";
import { IndicatorEngine } from "../indicators/core/indicator-engine.js";
import type { AggregatedSignal } from "../signal/signal-types.js";
import { SignalAggregator } from "../signal/signal-aggregator.js";
import { OrderManager, type Order, type Position } from "./order-manager.js";
import { RiskEngine } from "./risk-engine.js";

/**
 * 执行引擎配置
 */
export interface ExecutionEngineConfig {
  /** 交易对 */
  symbol: string;

  /** 初始资金 */
  initialCapital: number;

  /** 手续费率 */
  feeRate: number;

  /** 策略配置 */
  strategyConfig: StrategyConfig;

  /** 滑点容忍 */
  slippageTolerance: number;

  /** 允许市价单 */
  allowMarketOrders: boolean;
}

/**
 * 执行结果
 */
export interface ExecutionResult {
  /** 执行的信号 */
  signal: AggregatedSignal;

  /** 创建的订单 */
  order: Order | null;

  /** 错误信息 */
  error: string | null;

  /** 执行时间 */
  executedAt: number;
}

/**
 * 执行引擎状态
 */
export interface ExecutionState {
  /** 可用资金 */
  availableCapital: number;

  /** 持仓列表 */
  positions: Position[];

  /** 当前信号 */
  lastSignal: AggregatedSignal | null;

  /** 最后执行结果 */
  lastExecution: ExecutionResult | null;
}

/**
 * 执行引擎
 * 核心执行层，协调各组件
 */
export class ExecutionEngine {
  private readonly symbol: string;
  private readonly initialCapital: number;
  private readonly feeRate: number;
  private readonly slippageTolerance: number;
  private readonly allowMarketOrders: boolean;

  private readonly strategyRegistry: StrategyRegistry;
  private readonly indicatorEngine: IndicatorEngine;
  private readonly signalAggregator: SignalAggregator;
  private readonly orderManager: OrderManager;
  private readonly riskEngine: RiskEngine;

  private readonly strategyConfig: StrategyConfig;
  private readonly contextBuilder: StrategyContextBuilder;

  private capital: Decimal;
  private candles: Candle[] = [];
  private lastIndicators: Map<string, unknown> = new Map();

  constructor(config: ExecutionEngineConfig) {
    this.symbol = config.symbol;
    this.initialCapital = config.initialCapital;
    this.feeRate = config.feeRate;
    this.slippageTolerance = config.slippageTolerance;
    this.allowMarketOrders = config.allowMarketOrders;

    this.capital = Decimal(config.initialCapital);
    this.strategyConfig = config.strategyConfig;

    // 初始化组件
    this.strategyRegistry = new StrategyRegistry();
    this.indicatorEngine = new IndicatorEngine(
      IndicatorEngine.fromStrategyConfig(config.strategyConfig),
    );
    this.signalAggregator = new SignalAggregator({
      combineMode: "weighted",
      minWeight: 0.3,
    });
    this.orderManager = new OrderManager({
      allowMarketOrders: config.allowMarketOrders,
      slippageTolerance: config.slippageTolerance,
    });
    this.riskEngine = new RiskEngine({
      stopLossPct: config.strategyConfig.stopLossPct,
      trailingStopPct: config.strategyConfig.trailingStopPct,
      trailingActivationProfit: config.strategyConfig.trailingActivationProfit,
      cooldownBars: config.strategyConfig.cooldownBars,
    });

    this.contextBuilder = new StrategyContextBuilder({
      symbol: config.symbol,
      timeframe: "1d",
    });
  }

  /**
   * 注册策略
   */
  registerStrategy(strategy: Strategy, weight: number = 1.0): void {
    this.strategyRegistry.register(strategy);
    this.signalAggregator.setStrategyWeight(strategy.getMetadata().id, weight);
  }

  /**
   * 注册多个策略
   */
  registerStrategies(strategies: Array<{ strategy: Strategy; weight: number }>): void {
    for (const { strategy, weight } of strategies) {
      this.registerStrategy(strategy, weight);
    }
  }

  /**
   * 处理新 K 线
   */
  processCandle(candle: Candle): void {
    this.candles.push(candle);

    // 计算指标
    const indicatorResults = this.indicatorEngine.calculate(this.candles);

    // 获取所有策略信号
    const signals: StrategySignal[] = [];
    const metadata = new Map<string, { name: string }>();

    for (const strategy of this.strategyRegistry.all()) {
      const meta = strategy.getMetadata();
      metadata.set(meta.id, { name: meta.name });

      // 转换持仓格式（只支持做多）
      const pos = this.orderManager.getPosition(this.symbol);
      const positionData: PositionData | null = pos && pos.side === "long" ? {
        side: "long" as const,
        entryPrice: pos.entryPrice,
        quantity: pos.quantity,
        entryTimestamp: pos.entryTime,
        entryBarIndex: 0,
        peakPrice: pos.currentPrice,
      } : null;

      const context = this.contextBuilder.buildWithEngine(
        this.candles,
        indicatorResults,
        this.candles.length - 1,
        positionData,
        this.strategyConfig,
      );

      if (context) {
        const signal = strategy.evaluate(context);
        signals.push(signal);
      }
    }

    // 聚合信号
    const aggregated = this.signalAggregator.aggregate(
      signals,
      metadata,
      this.candles.length - 1,
      candle.close,
    );

    if (aggregated) {
      // 检查是否需要执行
      const result = this.executeSignal(aggregated, candle);
      if (result.order) {
        console.log(`[Execution] ${result.order.side.toUpperCase()} ${result.order.quantity} @ ${result.order.avgFillPrice ?? "market"}`);
      }
    }

    // 检查持仓风险
    this.checkRiskExit(candle);

    this.lastIndicators = indicatorResults;
  }

  /**
   * 执行信号
   */
  private executeSignal(signal: AggregatedSignal, candle: Candle): ExecutionResult {
    const result: ExecutionResult = {
      signal,
      order: null,
      error: null,
      executedAt: Date.now(),
    };

    // 检查 cooldown
    const barIndex = this.candles.length - 1;
    if (!this.riskEngine.canEnter(barIndex)) {
      result.error = "Cooldown period active";
      return result;
    }

    // 检查持仓状态
    const hasPosition = this.orderManager.hasPosition(this.symbol);

    if (signal.action === "BUY" && !hasPosition) {
      // 开仓
      const positionValue = this.capital.mul(this.strategyConfig.targetPercent);
      const fee = positionValue.mul(this.feeRate);
      const availableForPosition = positionValue.sub(fee);
      const quantity = availableForPosition.div(candle.close).toNumber();

      if (quantity > 0) {
        try {
          const order = this.orderManager.createOrderFromSignal({
            symbol: this.symbol,
            signal,
            quantity,
          });

          // 模拟成交
          const fillPrice = candle.close * (1 + this.slippageTolerance);
          this.orderManager.fillOrder(order.orderId, fillPrice);
          this.capital = this.capital.sub(positionValue);

          result.order = this.orderManager.getOrders().at(-1) ?? null;
        } catch (e) {
          result.error = e instanceof Error ? e.message : "Order failed";
        }
      }
    } else if (signal.action === "SELL" && hasPosition) {
      // 平仓
      const position = this.orderManager.getPosition(this.symbol);
      if (position) {
        try {
          const order = this.orderManager.createOrderFromSignal({
            symbol: this.symbol,
            signal,
            quantity: position.quantity,
          });

          const fillPrice = candle.close * (1 - this.slippageTolerance);
          this.orderManager.fillOrder(order.orderId, fillPrice);
          this.orderManager.closePosition(position.positionId, fillPrice);

          // 计算收益
          const exitValue = position.quantity * fillPrice;
          const fee = exitValue * this.feeRate;
          this.capital = this.capital.add(exitValue).sub(fee);
          this.riskEngine.registerExit(barIndex);

          result.order = this.orderManager.getOrders().at(-1) ?? null;
        } catch (e) {
          result.error = e instanceof Error ? e.message : "Order failed";
        }
      }
    }

    return result;
  }

  /**
   * 检查风险退出
   */
  private checkRiskExit(candle: Candle): void {
    const position = this.orderManager.getPosition(this.symbol);
    if (!position) return;

    const barIndex = this.candles.length - 1;
    const riskExit = this.riskEngine.evaluateExit(candle, {
      entryPrice: position.entryPrice,
      peakPrice: position.currentPrice,
      quantity: position.quantity,
      side: position.side,
    });

    if (riskExit) {
      const order = this.orderManager.createOrder({
        symbol: this.symbol,
        side: "sell",
        type: "market",
        quantity: position.quantity,
        note: `Risk exit: ${riskExit.reason}`,
      });

      const fillPrice = candle.close * (1 - this.slippageTolerance);
      this.orderManager.fillOrder(order.orderId, fillPrice);
      this.orderManager.closePosition(position.positionId, fillPrice);

      const exitValue = position.quantity * fillPrice;
      const fee = exitValue * this.feeRate;
      this.capital = this.capital.add(exitValue).sub(fee);
      this.riskEngine.registerExit(barIndex);

      console.log(`[Risk Exit] ${riskExit.reason} @ ${fillPrice}`);
    } else {
      // 更新当前价格
      this.orderManager.updatePosition(position.positionId, {
        currentPrice: candle.close,
      });
    }
  }

  /**
   * 获取当前状态
   */
  getState(): ExecutionState {
    return {
      availableCapital: this.capital.toNumber(),
      positions: this.orderManager.getPositions(),
      lastSignal: this.signalAggregator.getRecentSignals(1)[0] ?? null,
      lastExecution: null,
    };
  }

  /**
   * 获取账户余额
   */
  getBalance(): number {
    return this.capital.toNumber();
  }

  /**
   * 获取总权益（资金 + 持仓价值）
   */
  getTotalEquity(candle?: Candle): number {
    const cash = this.capital.toNumber();
    let positionValue = 0;

    for (const pos of this.orderManager.getPositions()) {
      const price = candle?.close ?? pos.currentPrice;
      positionValue += pos.quantity * price;
    }

    return cash + positionValue;
  }
}
