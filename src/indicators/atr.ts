export function calculateAtr(candles: Array<{ high: number; low: number; close: number }>, period = 14): Array<number | null> {
  let previousClose: number | null = null; let atr: number | null = null;
  return candles.map((candle, index) => {
    const tr = previousClose === null ? candle.high - candle.low : Math.max(candle.high - candle.low, Math.abs(candle.high - previousClose), Math.abs(candle.low - previousClose));
    previousClose = candle.close;
    if (index < period - 1) return null;
    atr = atr === null ? tr : ((atr * (period - 1)) + tr) / period;
    return atr;
  });
}
