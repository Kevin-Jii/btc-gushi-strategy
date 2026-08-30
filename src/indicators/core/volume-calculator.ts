/**
 * 成交量和支撑阻力位指标计算器
 */

import { BaseIndicatorCalculator } from "./indicator-base.js";
import type {
  IndicatorInput,
  IndicatorValue,
  IndicatorParamDefinition,
  IndicatorType,
  IndicatorCategory,
} from "./indicator-types.js";

/** 成交量移动平均计算器 */
export class VolumeMACalculator extends BaseIndicatorCalculator {
  readonly name = "VolumeMA";
  readonly type: IndicatorType = "volume";
  readonly category: IndicatorCategory = "volume";

  readonly paramDefinitions: IndicatorParamDefinition[] = [
    {
      name: "period",
      type: "number",
      default: 20,
      min: 2,
      max: 200,
      step: 1,
      description: "成交量 MA 周期",
    },
  ];

  protected computeValues(
    input: IndicatorInput,
    params: Record<string, number>,
  ): (IndicatorValue | null)[] {
    const volumes = input.volumes ?? [];
    const period = Math.floor(params.period ?? 20);
    const result: (IndicatorValue | null)[] = [];

    if (period <= 0 || volumes.length < period) {
      return volumes.map(() => null);
    }

    for (let i = 0; i < volumes.length; i++) {
      if (i + 1 < period) {
        result.push(null);
        continue;
      }

      // 计算前 period 根 K 线的平均成交量（不含当前）
      let sum = 0;
      for (let j = i - period; j < i; j++) {
        sum += volumes[j] ?? 0;
      }
      result.push(this.validValue(sum / period));
    }

    return result;
  }
}

/** 支撑位计算器 */
export class SupportCalculator extends BaseIndicatorCalculator {
  readonly name = "Support";
  readonly type: IndicatorType = "support-resistance";
  readonly category: IndicatorCategory = "levels";

  readonly paramDefinitions: IndicatorParamDefinition[] = [
    {
      name: "lookback",
      type: "number",
      default: 20,
      min: 3,
      max: 200,
      step: 1,
      description: "回溯周期",
    },
  ];

  protected computeValues(
    input: IndicatorInput,
    params: Record<string, number>,
  ): (IndicatorValue | null)[] {
    const lows = input.lows ?? [];
    const lookback = Math.floor(params.lookback ?? 20);
    const result: (IndicatorValue | null)[] = [];

    if (lookback <= 0 || lows.length < lookback) {
      return lows.map(() => null);
    }

    for (let i = 0; i < lows.length; i++) {
      if (i < lookback) {
        result.push(null);
        continue;
      }

      // 获取前 lookback 根 K 线的最低价
      let min = Infinity;
      for (let j = i - lookback; j < i; j++) {
        const low = lows[j] ?? 0;
        if (low < min) min = low;
      }

      result.push(this.validValue(min));
    }

    return result;
  }
}

/** 阻力位计算器 */
export class ResistanceCalculator extends BaseIndicatorCalculator {
  readonly name = "Resistance";
  readonly type: IndicatorType = "support-resistance";
  readonly category: IndicatorCategory = "levels";

  readonly paramDefinitions: IndicatorParamDefinition[] = [
    {
      name: "lookback",
      type: "number",
      default: 20,
      min: 3,
      max: 200,
      step: 1,
      description: "回溯周期",
    },
  ];

  protected computeValues(
    input: IndicatorInput,
    params: Record<string, number>,
  ): (IndicatorValue | null)[] {
    const highs = input.highs ?? [];
    const lookback = Math.floor(params.lookback ?? 20);
    const result: (IndicatorValue | null)[] = [];

    if (lookback <= 0 || highs.length < lookback) {
      return highs.map(() => null);
    }

    for (let i = 0; i < highs.length; i++) {
      if (i < lookback) {
        result.push(null);
        continue;
      }

      // 获取前 lookback 根 K 线的最高价
      let max = -Infinity;
      for (let j = i - lookback; j < i; j++) {
        const high = highs[j] ?? 0;
        if (high > max) max = high;
      }

      result.push(this.validValue(max));
    }

    return result;
  }
}

/** ATR 平均真实波幅计算器 */
export class ATRCalculator extends BaseIndicatorCalculator {
  readonly name = "ATR";
  readonly type: IndicatorType = "atr";
  readonly category: IndicatorCategory = "volatility";

  readonly paramDefinitions: IndicatorParamDefinition[] = [
    {
      name: "period",
      type: "number",
      default: 14,
      min: 2,
      max: 100,
      step: 1,
      description: "ATR 周期",
    },
  ];

  protected computeValues(
    input: IndicatorInput,
    params: Record<string, number>,
  ): (IndicatorValue | null)[] {
    const closes = input.closes ?? [];
    const highs = input.highs ?? [];
    const lows = input.lows ?? [];
    const period = Math.floor(params.period ?? 14);
    const result: (IndicatorValue | null)[] = [];

    if (period <= 0 || closes.length < period + 1) {
      return closes.map(() => null);
    }

    // 计算 True Range
    const trs: number[] = [];
    for (let i = 0; i < closes.length; i++) {
      if (i === 0) {
        trs.push((highs[i] ?? 0) - (lows[i] ?? 0));
      } else {
        const hl = (highs[i] ?? 0) - (lows[i] ?? 0);
        const hc = Math.abs((highs[i] ?? 0) - (closes[i - 1] ?? 0));
        const lc = Math.abs((lows[i] ?? 0) - (closes[i - 1] ?? 0));
        trs.push(Math.max(hl, hc, lc));
      }
    }

    // 前 period 个为 null
    for (let i = 0; i < period; i++) {
      result.push(null);
    }

    // 计算初始 ATR
    let sum = 0;
    for (let i = 0; i < period; i++) {
      sum += trs[i] ?? 0;
    }
    let atr = sum / period;
    result.push(this.validValue(atr));

    // 平滑 ATR
    for (let i = period; i < trs.length - 1; i++) {
      atr = (atr * (period - 1) + (trs[i] ?? 0)) / period;
      result.push(this.validValue(atr));
    }

    // 最后一个为 null
    result.push(null);

    return result;
  }
}
