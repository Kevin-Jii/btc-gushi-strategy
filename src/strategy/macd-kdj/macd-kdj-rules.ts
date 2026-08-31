import { calculateAtr } from "../../indicators/atr.js";
import { calculateEma, calculateMacd } from "../../indicators/macd.js";
import { calculateKdj } from "../../indicators/kdj.js";
import type { Candle } from "../../data/types.js";
import type { MacdKdjStrategyConfig } from "./macd-kdj-config.js";
import type { MacdKdjSnapshot } from "./macd-kdj-types.js";

export function evaluateMacdKdj(candles: Candle[], config: MacdKdjStrategyConfig): MacdKdjSnapshot | null {
  const index = candles.length - 1;
  if (index < Math.max(config.macdSlow + config.macdSignal, config.kdjPeriod, config.emaPeriod, config.volumePeriod, config.atrPeriod)) return null;
  const closes = candles.map((candle) => candle.close);
  const macd = calculateMacd(closes, config.macdFast, config.macdSlow, config.macdSignal);
  const kdj = calculateKdj(candles, config.kdjPeriod);
  const ema = calculateEma(closes, config.emaPeriod);
  const atr = calculateAtr(candles, config.atrPeriod);
  const currentMacd = macd[index]; const previousMacd = macd[index - 1]; const currentKdj = kdj[index]; const previousKdj = kdj[index - 1];
  const ema20 = ema[index]; const atrValue = atr[index];
  if (!currentMacd || !previousMacd || !currentKdj || !previousKdj || ema20 == null || atrValue == null) return null;
  const currentCandle = candles[index]!;
  const averageVolume = candles.slice(index - config.volumePeriod, index).reduce((sum, candle) => sum + candle.volume, 0) / config.volumePeriod;
  const volumeConfirmed = currentCandle.volume > averageVolume * config.volumeMultiplier;
  const macdTrend = currentMacd.dif > currentMacd.dea && currentMacd.dif > 0 && currentMacd.histogram > previousMacd.histogram;
  const kdjTiming = (currentKdj.j < config.jOversold || currentKdj.k < config.kdjOversold) && previousKdj.k <= previousKdj.d && currentKdj.k > currentKdj.d;
  const emaTrend = currentCandle.close > ema20;
  const score = (currentMacd.dif > currentMacd.dea ? 1 : 0) + (currentMacd.dif > 0 ? 1 : 0) + (currentMacd.histogram > previousMacd.histogram ? 1 : 0) + (currentKdj.k > currentKdj.d ? 1 : 0) + (currentKdj.j < config.jOversold ? 1 : 0) + (currentKdj.k < config.kdjOversold ? 1 : 0) + (emaTrend ? 2 : 0) + (volumeConfirmed ? 2 : 0);
  return { ema20, macd: currentMacd, previousMacd, kdj: currentKdj, previousKdj, volumeAverage: averageVolume, volumeConfirmed, atr: atrValue, score, hardConditions: { macdTrend, emaTrend, kdjTiming, volume: volumeConfirmed } };
}

export function shouldBuy(snapshot: MacdKdjSnapshot, config: MacdKdjStrategyConfig): boolean { return snapshot.hardConditions.macdTrend && snapshot.hardConditions.emaTrend && snapshot.hardConditions.kdjTiming && snapshot.hardConditions.volume && snapshot.score >= config.scoreThreshold; }
export function shouldSell(snapshot: MacdKdjSnapshot): boolean { return snapshot.macd.dif < snapshot.macd.dea && snapshot.macd.histogram < snapshot.previousMacd.histogram && snapshot.ema20 > 0; }
