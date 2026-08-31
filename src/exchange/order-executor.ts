/**
 * 订单执行器
 * 负责把策略的目标金额/数量转换为交易所可接受的现货订单
 */

import type { OrderFill, SymbolRules, TradingClient } from "./trading-types.js";

/**
 * 将数值向下取整到指定步长的倍数
 */
function floorToStep(value: number, step: number): number {
  if (step <= 0) return value;
  return Math.floor(value / step) * step;
}

/** 负责把策略的目标金额/数量转换为交易所可接受的现货订单。 */
export class OrderExecutor {
  private rules: SymbolRules | null = null;

  public constructor(
    private readonly client: TradingClient,
    private readonly symbol: string,
  ) {}

  public async loadRules(): Promise<SymbolRules> {
    this.rules = await this.client.getSymbolRules(this.symbol);
    if (this.rules.minNotional <= 0) {
      this.rules.minNotional = 0;
    }
    return this.rules;
  }

  private async getRules(): Promise<SymbolRules> {
    return this.rules ?? this.loadRules();
  }

  /** 使用 quoteOrderQty 买入，金额由账户可用余额和仓位比例决定。 */
  public async buyWithQuote(quoteAmount: number, leverage?: number, contracts?: number): Promise<OrderFill> {
    const rules = await this.getRules();
    if (!Number.isFinite(quoteAmount) || quoteAmount <= 0) throw new Error("Buy amount must be positive");
    if (rules.minNotional > 0 && quoteAmount < rules.minNotional) {
      throw new Error(`Buy amount ${quoteAmount} is below exchange minNotional ${rules.minNotional}`);
    }
    return this.client.marketBuy(this.symbol, quoteAmount, leverage, contracts);
  }

  /** 卖出数量向下对齐 stepSize，并在不足最小量时拒绝下单。 */
  public async sellQuantity(quantity: number): Promise<OrderFill> {
    const rules = await this.getRules();
    const normalized = floorToStep(quantity, rules.quantityStep);
    if (normalized < rules.minQuantity || normalized <= 0) {
      throw new Error(`Sell quantity ${quantity} is below exchange minQty ${rules.minQuantity}`);
    }
    if (normalized > rules.maxQuantity) {
      throw new Error(`Sell quantity ${normalized} exceeds exchange maxQty ${rules.maxQuantity}`);
    }
    return this.client.marketSell(this.symbol, normalized);
  }
}
