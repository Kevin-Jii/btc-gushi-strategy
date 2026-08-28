export function calculateMA(values: number[], period: number): number[] {
  if (!Number.isInteger(period) || period <= 0) {
    throw new Error("MA period must be a positive integer");
  }

  const result: number[] = [];
  let rollingSum = 0;

  for (let i = 0; i < values.length; i++) {
    rollingSum += values[i] ?? 0;

    if (i + 1 < period) {
      result.push(NaN);
      continue;
    }

    if (i >= period) {
      rollingSum -= values[i - period] ?? 0;
    }

    result.push(rollingSum / period);
  }

  return result;
}

/** 返回价格相对于移动平均线的百分比距离。 */
export function calculateBias(price: number, ma: number): number {
  return ma > 0 ? price / ma - 1 : 0;
}
