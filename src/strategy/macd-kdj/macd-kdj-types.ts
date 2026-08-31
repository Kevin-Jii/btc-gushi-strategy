import type { MacdPoint } from "../../indicators/macd.js";
import type { KdjPoint } from "../../indicators/kdj.js";

export interface MacdKdjSnapshot {
  ema20: number;
  macd: MacdPoint;
  previousMacd: MacdPoint;
  kdj: KdjPoint;
  previousKdj: KdjPoint;
  volumeAverage: number;
  volumeConfirmed: boolean;
  atr: number;
  score: number;
  hardConditions: { macdTrend: boolean; emaTrend: boolean; kdjTiming: boolean; volume: boolean };
}
