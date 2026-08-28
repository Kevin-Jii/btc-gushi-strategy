/** 计算算术平均值。 */
export function calculateAverage(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/**
 * 计算前 `period` 根 K 线的平均成交量。明确排除当前 K 线，
 * 避免当前的大成交量影响自己的确认阈值。
 */
export function calculatePreviousVolumeMA(
  volumes: number[],
  index: number,
  period: number,
): number {
  const start = Math.max(0, index - period);
  const previous = volumes.slice(start, index);
  return previous.length === period ? calculateAverage(previous) : NaN;
}

/** 返回前序 K 线（不含当前 K 线）的最小值或最大值。 */
export function calculatePreviousExtreme(
  values: number[],
  index: number,
  lookback: number,
  mode: "min" | "max",
): number {
  const previous = values.slice(Math.max(0, index - lookback), index);
  if (previous.length === 0) return NaN;
  return mode === "min" ? Math.min(...previous) : Math.max(...previous);
}
