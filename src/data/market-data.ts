import fs from "node:fs";
import { parse } from "csv-parse/sync";
import type { StrategyConfig } from "../config/strategy.config.js";
import { calculateBias, calculateMA } from "../indicators/moving-average.js";
import {
  calculatePreviousExtreme,
  calculatePreviousVolumeMA,
} from "../indicators/volume.js";
import type { Candle, IndicatorData } from "./types.js";

/** 读取约定格式的 BTC/USDT CSV，并校验每个数值字段。 */
export function loadCandlesFromCsv(filePath: string): Candle[] {
  const content = fs.readFileSync(filePath, "utf8");
  const rows = parse(content, {
    bom: true,
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as Record<string, string>[];
  const candles = rows.map((row, index): Candle => {
    const rawTimestamp = (row.timestamp ?? "").trim();
    const numericTimestamp = Number(rawTimestamp);
    let timestamp = Number.isFinite(numericTimestamp) && rawTimestamp !== ""
      ? numericTimestamp
      : Date.parse(rawTimestamp);
    // 交易所导出数据常用 Unix 秒，而浏览器日期通常使用毫秒。
    if (Number.isFinite(timestamp) && timestamp > 0 && timestamp < 1_000_000_000_000) {
      timestamp *= 1000;
    }
    const candle: Candle = {
      timestamp,
      open: Number(row.open),
      high: Number(row.high),
      low: Number(row.low),
      close: Number(row.close),
      volume: Number(row.volume),
    };
    if (!Number.isFinite(candle.timestamp) || [candle.open, candle.high, candle.low, candle.close, candle.volume].some((value) => !Number.isFinite(value))) {
      throw new Error(`Invalid candle at CSV row ${index + 2}`);
    }
    if (candle.high < candle.low || candle.volume < 0) {
      throw new Error(`Invalid high/low/volume at CSV row ${index + 2}`);
    }
    return candle;
  });
  return candles.sort((a, b) => a.timestamp - b.timestamp);
}

/** 一次性计算全部指标，并保持不使用未来数据的规则。 */
export function calculateIndicators(candles: Candle[], config: StrategyConfig): IndicatorData[] {
  const closes = candles.map((candle) => candle.close);
  const volumes = candles.map((candle) => candle.volume);
  const lows = candles.map((candle) => candle.low);
  const highs = candles.map((candle) => candle.high);
  const ma20 = calculateMA(closes, config.fastMA);
  const ma60 = calculateMA(closes, config.midMA);
  const ma120 = calculateMA(closes, config.slowMA);

  return candles.map((candle, index) => {
    const volumeAverage = calculatePreviousVolumeMA(volumes, index, config.volumeMA);
    const mid = ma60[index] ?? NaN;
    return {
      ma20: ma20[index] ?? NaN,
      ma60: mid,
      ma120: ma120[index] ?? NaN,
      volumeMa20: volumeAverage,
      support: calculatePreviousExtreme(lows, index, config.supportLookback, "min"),
      resistance: calculatePreviousExtreme(highs, index, config.breakoutLookback, "max"),
      bias60: calculateBias(candle.close, mid),
      volumeConfirm: Number.isFinite(volumeAverage) && candle.volume > volumeAverage * config.volumeMultiplier,
    };
  });
}
