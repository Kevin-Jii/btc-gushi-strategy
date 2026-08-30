/**
 * 订单管理器
 * 管理订单创建、执行和追踪
 */

import type { StrategyAction } from "../strategy/core/strategy-types.js";
import type { AggregatedSignal } from "../signal/signal-types.js";

/**
 * 订单类型
 */
export type OrderType = "market" | "limit" | "stop" | "stop-limit";

/**
 * 订单方向
 */
export type OrderSide = "buy" | "sell";

/**
 * 订单状态
 */
export type OrderStatus = "pending" | "open" | "filled" | "partially-filled" | "cancelled" | "rejected";

/**
 * 订单
 */
export interface Order {
  /** 订单 ID */
  orderId: string;

  /** 交易对 */
  symbol: string;

  /** 订单方向 */
  side: OrderSide;

  /** 订单类型 */
  type: OrderType;

  /** 订单状态 */
  status: OrderStatus;

  /** 数量 */
  quantity: number;

  /** 价格（限价单） */
  price: number | null;

  /** 触发价格（止损单） */
  stopPrice: number | null;

  /** 已成交数量 */
  filledQuantity: number;

  /** 平均成交价 */
  avgFillPrice: number | null;

  /** 创建时间 */
  createdAt: number;

  /** 更新时间 */
  updatedAt: number;

  /** 关联的信号 ID */
  signalId: string | null;

  /** 关联的策略 ID */
  strategyId: string | null;

  /** 备注 */
  note: string | null;
}

/**
 * 持仓信息
 */
export interface Position {
  /** 持仓 ID */
  positionId: string;

  /** 交易对 */
  symbol: string;

  /** 持仓方向 */
  side: "long" | "short";

  /** 持仓数量 */
  quantity: number;

  /** 开仓均价 */
  entryPrice: number;

  /** 当前价格 */
  currentPrice: number;

  /** 开仓时间 */
  entryTime: number;

  /** 止损价 */
  stopLossPrice: number | null;

  /** 止盈价 */
  takeProfitPrice: number | null;

  /** 未实现盈亏 */
  unrealizedPnl: number;

  /** 关联的订单 ID */
  orderId: string;
}

/**
 * 订单管理器配置
 */
export interface OrderManagerConfig {
  /** 最大同时持仓数 */
  maxPositions: number;

  /** 单笔最大仓位比例 */
  maxPositionSize: number;

  /** 订单超时时间（毫秒） */
  orderTimeout: number;

  /** 允许市价单 */
  allowMarketOrders: boolean;

  /** 滑点容忍（百分比） */
  slippageTolerance: number;
}

/**
 * 订单管理器
 * 管理订单生命周期和持仓
 */
export class OrderManager {
  private readonly orders = new Map<string, Order>();
  private readonly positions = new Map<string, Position>();
  private config: Required<OrderManagerConfig>;
  private orderCounter = 0;

  constructor(config?: Partial<OrderManagerConfig>) {
    this.config = {
      maxPositions: config?.maxPositions ?? 1,
      maxPositionSize: config?.maxPositionSize ?? 1,
      orderTimeout: config?.orderTimeout ?? 30000,
      allowMarketOrders: config?.allowMarketOrders ?? true,
      slippageTolerance: config?.slippageTolerance ?? 0.001,
    };
  }

  /**
   * 生成订单 ID
   */
  private generateOrderId(): string {
    return `ord-${Date.now()}-${++this.orderCounter}`;
  }

  /**
   * 创建订单
   */
  createOrder(params: {
    symbol: string;
    side: OrderSide;
    type: OrderType;
    quantity: number;
    price?: number | null;
    stopPrice?: number | null;
    signalId?: string | null;
    strategyId?: string | null;
    note?: string | null;
  }): Order {
    // 检查持仓限制
    if (params.side === "buy" && this.positions.size >= this.config.maxPositions) {
      throw new Error(`Maximum positions (${this.config.maxPositions}) reached`);
    }

    const now = Date.now();
    const order: Order = {
      orderId: this.generateOrderId(),
      symbol: params.symbol,
      side: params.side,
      type: params.type,
      status: "pending",
      quantity: params.quantity,
      price: params.price ?? null,
      stopPrice: params.stopPrice ?? null,
      filledQuantity: 0,
      avgFillPrice: null,
      createdAt: now,
      updatedAt: now,
      signalId: params.signalId ?? null,
      strategyId: params.strategyId ?? null,
      note: params.note ?? null,
    };

    this.orders.set(order.orderId, order);
    return order;
  }

  /**
   * 从信号创建订单
   */
  createOrderFromSignal(params: {
    symbol: string;
    signal: AggregatedSignal;
    quantity: number;
    price?: number;
  }): Order {
    const side: OrderSide = params.signal.action === "BUY" ? "buy" : "sell";
    const strategyId = params.signal.contributingSignals[0]?.strategyId ?? "unknown";

    return this.createOrder({
      symbol: params.symbol,
      side,
      type: this.config.allowMarketOrders ? "market" : "limit",
      quantity: params.quantity,
      price: params.price ?? null,
      signalId: params.signal.signalId,
      strategyId,
      note: params.signal.reason,
    });
  }

  /**
   * 更新订单状态
   */
  updateOrder(orderId: string, updates: Partial<Pick<Order, "status" | "filledQuantity" | "avgFillPrice" | "note">>): Order | null {
    const order = this.orders.get(orderId);
    if (!order) return null;

    const updated: Order = {
      ...order,
      ...updates,
      updatedAt: Date.now(),
    };

    this.orders.set(orderId, updated);
    return updated;
  }

  /**
   * 订单成交
   */
  fillOrder(orderId: string, fillPrice: number, fillQuantity?: number): Order | null {
    const order = this.orders.get(orderId);
    if (!order) return null;

    const qty = fillQuantity ?? order.quantity;
    const filledQty = order.filledQuantity + qty;
    const totalCost = (order.avgFillPrice ?? fillPrice) * order.filledQuantity + fillPrice * qty;
    const avgPrice = totalCost / filledQty;

    const updated: Order = {
      ...order,
      status: filledQty >= order.quantity ? "filled" : "partially-filled",
      filledQuantity: filledQty,
      avgFillPrice: avgPrice,
      updatedAt: Date.now(),
    };

    this.orders.set(orderId, updated);

    // 如果是买入且完全成交，创建持仓
    if (updated.status === "filled" && updated.side === "buy") {
      this.createPosition({
        symbol: updated.symbol,
        side: "long",
        quantity: updated.filledQuantity,
        entryPrice: avgPrice,
        orderId: updated.orderId,
      });
    }

    return updated;
  }

  /**
   * 取消订单
   */
  cancelOrder(orderId: string): boolean {
    const order = this.orders.get(orderId);
    if (!order) return false;

    if (order.status === "filled" || order.status === "cancelled") {
      return false;
    }

    this.orders.set(orderId, { ...order, status: "cancelled", updatedAt: Date.now() });
    return true;
  }

  /**
   * 创建持仓
   */
  createPosition(params: {
    symbol: string;
    side: "long" | "short";
    quantity: number;
    entryPrice: number;
    orderId: string;
  }): Position {
    const positionId = `pos-${Date.now()}-${params.orderId}`;
    const position: Position = {
      positionId,
      symbol: params.symbol,
      side: params.side,
      quantity: params.quantity,
      entryPrice: params.entryPrice,
      currentPrice: params.entryPrice,
      entryTime: Date.now(),
      stopLossPrice: null,
      takeProfitPrice: null,
      unrealizedPnl: 0,
      orderId: params.orderId,
    };

    this.positions.set(positionId, position);
    return position;
  }

  /**
   * 更新持仓
   */
  updatePosition(positionId: string, updates: Partial<Position>): Position | null {
    const position = this.positions.get(positionId);
    if (!position) return null;

    const updated = { ...position, ...updates };

    // 计算未实现盈亏
    if (updated.currentPrice !== undefined) {
      const priceDiff = updated.currentPrice - updated.entryPrice;
      updated.unrealizedPnl = updated.side === "long" 
        ? priceDiff * updated.quantity
        : -priceDiff * updated.quantity;
    }

    this.positions.set(positionId, updated);
    return updated;
  }

  /**
   * 平仓
   */
  closePosition(positionId: string, exitPrice: number): Position | null {
    const position = this.positions.get(positionId);
    if (!position) return null;

    const updated = this.updatePosition(positionId, {
      currentPrice: exitPrice,
    });

    // 从持仓列表移除
    this.positions.delete(positionId);

    return updated;
  }

  /**
   * 获取所有订单
   */
  getOrders(status?: OrderStatus): Order[] {
    const orders = [...this.orders.values()];
    if (status) {
      return orders.filter((o) => o.status === status);
    }
    return orders;
  }

  /**
   * 获取所有持仓
   */
  getPositions(): Position[] {
    return [...this.positions.values()];
  }

  /**
   * 获取单个持仓
   */
  getPosition(symbol: string): Position | undefined {
    for (const pos of this.positions.values()) {
      if (pos.symbol === symbol) {
        return pos;
      }
    }
    return undefined;
  }

  /**
   * 是否有持仓
   */
  hasPosition(symbol: string): boolean {
    return this.getPosition(symbol) !== undefined;
  }

  /**
   * 获取配置
   */
  getConfig(): OrderManagerConfig {
    return { ...this.config };
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<OrderManagerConfig>): void {
    this.config = { ...this.config, ...config };
  }
}
