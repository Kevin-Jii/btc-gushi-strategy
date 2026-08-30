/**
 * 移动平均线指标计算器
 */

import { BaseIndicatorCalculator } from "./indicator-base.js";
import type {
  IndicatorInput,
  IndicatorValue,
  IndicatorParamDefinition,
  IndicatorType,
  IndicatorCategory,
} from "./indicator-types.js";

/** 简单移动平均线计算器 */
export class MACalculator extends BaseIndicatorCalculator {
  readonly name = "MA";
  readonly type: IndicatorType = "ma";
  readonly category: IndicatorCategory = "trend";

  readonly paramDefinitions: IndicatorParamDefinition[] = [
    {
      name: "period",
      type: "number",
      default: 20,
      min: 2,
      max: 500,
      step: 1,
      description: "移动平均周期",
    },
  ];

  protected computeValues(
    input: IndicatorInput,
    params: Record<string, number>,
  ): (IndicatorValue | null)[] {
    const closes = input.closes ?? [];
    const period = Math.floor(params.period ?? 20);
    const result: (IndicatorValue | null)[] = [];

    if (period <= 0 || closes.length < period) {
      return closes.map(() => null);
    }

    let sum = 0;
    for (let i = 0; i < closes.length; i++) {
      sum += closes[i] ?? 0;

      if (i + 1 < period) {
        result.push(null);
        continue;
      }

      if (i >= period) {
        sum -= closes[i - period] ?? 0;
      }

      result.push(this.validValue(sum / period));
    }

    return result;
  }
}

/** 指数移动平均线计算器 */
export class EMACalculator extends BaseIndicatorCalculator {
  readonly name = "EMA";
  readonly type: IndicatorType = "ema";
  readonly category: IndicatorCategory = "trend";

  readonly paramDefinitions: IndicatorParamDefinition[] = [
    {
      name: "period",
      type: "number",
      default: 12,
      min: 2,
      max: 500,
      step: 1,
      description: "EMA 周期",
    },
  ];

  protected computeValues(
    input: IndicatorInput,
    params: Record<string, number>,
  ): (IndicatorValue | null)[] {
    const closes = input.closes ?? [];
    const period = Math.floor(params.period ?? 12);
    const result: (IndicatorValue | null)[] = [];

    if (period <= 0 || closes.length < period) {
      return closes.map(() => null);
    }

    const multiplier = 2 / (period + 1);
    let sum = 0;

    // 初始化：使用前 period 个值的 SMA
    for (let i = 0; i < period; i++) {
      sum += closes[i] ?? 0;
      result.push(null);
    }

    let ema = sum / period;
    result[period - 1] = this.validValue(ema);

    // 计算剩余的 EMA
    for (let i = period; i < closes.length; i++) {
      ema = ((closes[i] ?? 0) - ema) * multiplier + ema;
      result.push(this.validValue(ema));
    }

    return result;
  }
}

/** 移动平均线偏差计算器 */
export class BIASCalculator extends BaseIndicatorCalculator {
  readonly name = "BIAS";
  readonly type: IndicatorType = "ma";
  readonly category: IndicatorCategory = "momentum";

  readonly paramDefinitions: IndicatorParamDefinition[] = [
    {
      name: "period",
      type: "number",
      default: 60,
      min: 5,
      max: 500,
      step: 1,
      description: "BIAS 计算周期（应与 MA 周期一致）",
    },
  ];

  private readonly maCalculator = new MACalculator();

  protected computeValues(
    input: IndicatorInput,
    params: Record<string, number>,
  ): (IndicatorValue | null)[] {
    const closes = input.closes ?? [];
    const period = Math.floor(params.period ?? 60);

    const maResult = this.maCalculator.calculate(input, { period });
    const result: (IndicatorValue | null)[] = [];

    for (let i = 0; i < closes.length; i++) {
      const maValue = maResult.values[i];
      if (!maValue || !Number.isFinite(maValue.main) || maValue.main === 0) {
        result.push(null);
        continue;
      }

      const bias = (closes[i] ?? 0) / maValue.main - 1;
      result.push(this.validValue(bias));
    }

    return result;
  }
}
