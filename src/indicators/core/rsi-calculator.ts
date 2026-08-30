/**
 * RSI、MACD、布林带等动量指标计算器
 */

import { BaseIndicatorCalculator } from "./indicator-base.js";
import { EMACalculator } from "./ma-calculator.js";
import type {
  IndicatorInput,
  IndicatorValue,
  IndicatorParamDefinition,
  IndicatorType,
  IndicatorCategory,
} from "./indicator-types.js";

/** RSI 相对强弱指标计算器 */
export class RSICalculator extends BaseIndicatorCalculator {
  readonly name = "RSI";
  readonly type: IndicatorType = "rsi";
  readonly category: IndicatorCategory = "momentum";

  readonly paramDefinitions: IndicatorParamDefinition[] = [
    {
      name: "period",
      type: "number",
      default: 14,
      min: 2,
      max: 100,
      step: 1,
      description: "RSI 周期",
    },
  ];

  protected computeValues(
    input: IndicatorInput,
    params: Record<string, number>,
  ): (IndicatorValue | null)[] {
    const closes = input.closes ?? [];
    const period = Math.floor(params.period ?? 14);
    const result: (IndicatorValue | null)[] = [];

    if (period <= 1 || closes.length < period + 1) {
      return closes.map(() => null);
    }

    // 计算价格变化
    const changes: number[] = [];
    for (let i = 1; i < closes.length; i++) {
      changes.push((closes[i] ?? 0) - (closes[i - 1] ?? 0));
    }

    // 初始化前 period 个为 null
    result.push(null);

    // 计算初始平均值
    let avgGain = 0;
    let avgLoss = 0;
    for (let i = 0; i < period; i++) {
      const change = changes[i] ?? 0;
      if (change > 0) avgGain += change;
      else avgLoss -= change;
    }
    avgGain /= period;
    avgLoss /= period;

    // 计算第一个 RSI
    const firstRS = avgLoss === 0 ? 100 : avgGain / avgLoss;
    const firstRSI = 100 - 100 / (1 + firstRS);
    result.push(this.validValue(firstRSI));

    // 平滑 RSI
    for (let i = period; i < changes.length; i++) {
      const change = changes[i] ?? 0;
      const gain = change > 0 ? change : 0;
      const loss = change < 0 ? -change : 0;

      avgGain = (avgGain * (period - 1) + gain) / period;
      avgLoss = (avgLoss * (period - 1) + loss) / period;

      const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
      const rsi = 100 - 100 / (1 + rs);
      result.push(this.validValue(rsi));
    }

    // 最后一个 closes 对应的 RSI
    result.push(null);

    return result;
  }
}

/** MACD 指标计算器 */
export class MACDCalculator extends BaseIndicatorCalculator {
  readonly name = "MACD";
  readonly type: IndicatorType = "macd";
  readonly category: IndicatorCategory = "momentum";

  readonly paramDefinitions: IndicatorParamDefinition[] = [
    {
      name: "fastPeriod",
      type: "number",
      default: 12,
      min: 2,
      max: 100,
      step: 1,
      description: "快线周期",
    },
    {
      name: "slowPeriod",
      type: "number",
      default: 26,
      min: 2,
      max: 200,
      step: 1,
      description: "慢线周期",
    },
    {
      name: "signalPeriod",
      type: "number",
      default: 9,
      min: 2,
      max: 100,
      step: 1,
      description: "信号线周期",
    },
  ];

  private readonly emaCalculator = new EMACalculator();

  protected computeValues(
    input: IndicatorInput,
    params: Record<string, number>,
  ): (IndicatorValue | null)[] {
    const fastPeriod = Math.floor(params.fastPeriod ?? 12);
    const slowPeriod = Math.floor(params.slowPeriod ?? 26);
    const signalPeriod = Math.floor(params.signalPeriod ?? 9);

    // 计算快线和慢线 EMA
    const fastEMA = this.emaCalculator.calculate(input, { period: fastPeriod });
    const slowEMA = this.emaCalculator.calculate(input, { period: slowPeriod });

    // 计算 MACD 线 (DIF)
    const macdLine: (IndicatorValue | null)[] = [];
    for (let i = 0; i < (input.closes?.length ?? 0); i++) {
      const fast = fastEMA.values[i];
      const slow = slowEMA.values[i];
      if (!fast || !slow) {
        macdLine.push(null);
      } else {
        macdLine.push(this.validValue(fast.main - slow.main));
      }
    }

    // 计算信号线 (DEA) - MACD 的 EMA
    const macdInput: IndicatorInput = {
      closes: macdLine.map((v) => v?.main ?? 0),
    };
    const signalEMA = this.emaCalculator.calculate(macdInput, { period: signalPeriod });

    // 构建完整结果
    const result: (IndicatorValue | null)[] = [];
    for (let i = 0; i < macdLine.length; i++) {
      const macd = macdLine[i];
      const signal = signalEMA.values[i];

      if (!macd || !signal) {
        result.push(null);
      } else {
        result.push({
          main: macd.main,           // DIF
          signal: signal.main,       // DEA
          histogram: macd.main - signal.main,
        });
      }
    }

    return result;
  }
}

/** 布林带指标计算器 */
export class BollingerCalculator extends BaseIndicatorCalculator {
  readonly name = "BOLL";
  readonly type: IndicatorType = "bollinger";
  readonly category: IndicatorCategory = "volatility";

  readonly paramDefinitions: IndicatorParamDefinition[] = [
    {
      name: "period",
      type: "number",
      default: 20,
      min: 2,
      max: 100,
      step: 1,
      description: "布林带周期",
    },
    {
      name: "stdDev",
      type: "number",
      default: 2,
      min: 0.5,
      max: 5,
      step: 0.5,
      description: "标准差倍数",
    },
  ];

  protected computeValues(
    input: IndicatorInput,
    params: Record<string, number>,
  ): (IndicatorValue | null)[] {
    const closes = input.closes ?? [];
    const period = Math.floor(params.period ?? 20);
    const stdDevMultiplier = params.stdDev ?? 2;
    const result: (IndicatorValue | null)[] = [];

    if (period <= 0 || closes.length < period) {
      return closes.map(() => null);
    }

    for (let i = 0; i < closes.length; i++) {
      if (i + 1 < period) {
        result.push(null);
        continue;
      }

      // 计算 SMA
      let sum = 0;
      for (let j = i - period + 1; j <= i; j++) {
        sum += closes[j] ?? 0;
      }
      const sma = sum / period;

      // 计算标准差
      let sumSquaredDiff = 0;
      for (let j = i - period + 1; j <= i; j++) {
        const diff = (closes[j] ?? 0) - sma;
        sumSquaredDiff += diff * diff;
      }
      const stdDev = Math.sqrt(sumSquaredDiff / period);

      result.push({
        main: sma,
        upper: sma + stdDevMultiplier * stdDev,
        lower: sma - stdDevMultiplier * stdDev,
      });
    }

    return result;
  }
}
