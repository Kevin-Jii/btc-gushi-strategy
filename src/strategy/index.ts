/**
 * 策略模块导出
 * 统一的策略 API 入口
 */

// 核心抽象层
export * from "./core/index.js";

// 策略插件
export { GushiStrategy } from "./gushi/index.js";
export type { GushiStrategyConfig, GushiContext } from "./gushi/index.js";

// 保留旧接口以兼容现有代码
export {
  evaluateStrategyAtIndex,
  generateSignal,
  buildGushiContext,
  checkTrendFilter,
  StrategyEngine,
  type StrategyEvaluation,
} from "./strategy.js";
