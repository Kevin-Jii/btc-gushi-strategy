export interface KdjPoint { k: number; d: number; j: number; }
/** RSV + K/D 平滑的 KDJ(9,3,3) 序列。 */
export function calculateKdj(candles: Array<{ high: number; low: number; close: number }>, period = 9): Array<KdjPoint | null> {
  let k = 50; let d = 50;
  return candles.map((candle, index) => {
    if (index < period - 1) return null;
    const window = candles.slice(index - period + 1, index + 1);
    const high = Math.max(...window.map((item) => item.high)); const low = Math.min(...window.map((item) => item.low));
    const rsv = high === low ? 50 : ((candle.close - low) / (high - low)) * 100;
    k = (2 * k + rsv) / 3; d = (2 * d + k) / 3;
    return { k, d, j: 3 * k - 2 * d };
  });
}
