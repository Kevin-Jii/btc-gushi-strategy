export interface MacdPoint {
  dif: number;
  dea: number;
  histogram: number;
}

function ema(values: number[], period: number): number[] {
  if (!values.length) return [];
  const alpha = 2 / (period + 1);
  const result: number[] = [values[0]!];
  for (let index = 1; index < values.length; index += 1) {
    result.push(values[index]! * alpha + result[index - 1]! * (1 - alpha));
  }
  return result;
}

/** MACD(12,26,9) 序列；只使用当前及之前的收盘价，避免未来数据。 */
export function calculateMacd(closes: number[], fast = 12, slow = 26, signal = 9): Array<MacdPoint | null> {
  if (closes.length < slow) return closes.map(() => null);
  const fastEma = ema(closes, fast);
  const slowEma = ema(closes, slow);
  const dif = closes.map((_, index) => fastEma[index]! - slowEma[index]!);
  const dea = ema(dif, signal);
  return closes.map((_, index) => index < slow - 1 ? null : { dif: dif[index]!, dea: dea[index]!, histogram: dif[index]! - dea[index]! });
}

export function calculateEma(values: number[], period: number): Array<number | null> {
  if (values.length < period) return values.map(() => null);
  const series = ema(values, period);
  return series.map((value, index) => index < period - 1 ? null : value);
}
