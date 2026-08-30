/**
 * 指标计算器基类
 * 提供通用的默认实现
 */

import type {
  IndicatorCalculator,
  IndicatorInput,
  IndicatorResult,
  IndicatorValue,
  IndicatorParamDefinition,
  IndicatorType,
  IndicatorCategory,
} from "./indicator-types.js";

/**
 * 指标计算器基类
 * 所有指标计算器应继承此类
 */
export abstract class BaseIndicatorCalculator implements IndicatorCalculator {
  abstract readonly name: string;
  abstract readonly type: IndicatorType;
  abstract readonly category: IndicatorCategory;
  abstract readonly paramDefinitions: IndicatorParamDefinition[];

  /**
   * 计算指标
   */
  calculate(input: IndicatorInput, params: Record<string, number>): IndicatorResult {
    const startTime = performance.now();
    const values = this.computeValues(input, params);
    const computeTimeMs = performance.now() - startTime;

    return {
      name: this.name,
      type: this.type,
      params,
      values,
      computeTimeMs,
    };
  }

  /**
   * 获取指定 K 线的指标值
   */
  getValueAt(
    input: IndicatorInput,
    params: Record<string, number>,
    index: number,
  ): IndicatorValue | null {
    const result = this.calculate(input, params);
    return result.values[index] ?? null;
  }

  /**
   * 核心计算方法 - 子类必须实现
   */
  protected abstract computeValues(
    input: IndicatorInput,
    params: Record<string, number>,
  ): (IndicatorValue | null)[];

  /**
   * 验证参数
   */
  protected validateParams(params: Record<string, number>): void {
    for (const def of this.paramDefinitions) {
      const value = params[def.name];
      if (value === undefined) continue;

      if (def.type === "number") {
        if (typeof value !== "number") {
          throw new Error(`${this.name}: Parameter ${def.name} must be a number`);
        }
        if (def.min !== undefined && value < def.min) {
          throw new Error(`${this.name}: Parameter ${def.name} must be >= ${def.min}`);
        }
        if (def.max !== undefined && value > def.max) {
          throw new Error(`${this.name}: Parameter ${def.name} must be <= ${def.max}`);
        }
      }
    }
  }

  /**
   * 获取 closes 数组的长度
   */
  protected getLength(input: IndicatorInput): number {
    return input.closes?.length ?? 0;
  }

  /**
   * 创建无效的指标值
   */
  protected invalidValue(): null {
    return null;
  }

  /**
   * 创建有效的指标值
   */
  protected validValue(main: number, extra?: Partial<IndicatorValue>): IndicatorValue {
    return {
      main,
      ...extra,
    };
  }
}

/**
 * 指标注册表
 * 管理所有已注册的指标计算器
 */
export class IndicatorRegistry {
  private readonly calculators = new Map<string, IndicatorCalculator>();

  /**
   * 注册指标计算器
   */
  register(calculator: IndicatorCalculator): void {
    const key = `${calculator.name}-${JSON.stringify(calculator.paramDefinitions.map(p => p.default))}`;
    this.calculators.set(calculator.name, calculator);
  }

  /**
   * 获取指标计算器
   */
  get(name: string): IndicatorCalculator | undefined {
    return this.calculators.get(name);
  }

  /**
   * 检查指标是否已注册
   */
  has(name: string): boolean {
    return this.calculators.has(name);
  }

  /**
   * 获取所有已注册的指标
   */
  all(): IndicatorCalculator[] {
    return [...this.calculators.values()];
  }

  /**
   * 按类别获取指标
   */
  getByCategory(category: IndicatorCategory): IndicatorCalculator[] {
    return this.all().filter((calc) => calc.category === category);
  }

  /**
   * 清空注册表
   */
  clear(): void {
    this.calculators.clear();
  }
}

/** 全局指标注册表单例 */
export const globalIndicatorRegistry = new IndicatorRegistry();
