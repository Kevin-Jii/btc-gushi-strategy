/**
 * 指标模块导出
 * 统一的指标 API 入口
 */

// 核心抽象层
export * from "./core/index.js";

// 保留旧代码（兼容）
export { calculateMA, calculateBias } from "./moving-average.js";
export { calculateMacd, calculateEma } from "./macd.js";
export { calculateKdj } from "./kdj.js";
export { calculateAtr } from "./atr.js";
export {
  calculateAverage,
  calculatePreviousVolumeMA,
  calculatePreviousExtreme,
} from "./volume.js";
