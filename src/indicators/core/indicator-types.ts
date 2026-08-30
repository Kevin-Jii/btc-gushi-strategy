/**
 * 指标核心类型定义
 * 为所有技术指标提供统一的类型基础
 */

/** 指标类型 */
export type IndicatorType =
  | "ma"
  | "ema"
  | "rsi"
  | "macd"
  | "bollinger"
  | "atr"
  | "adx"
  | "stoch"
  | "volume"
  | "support-resistance"
  | "custom";

/** 指标计算方向 */
export type IndicatorDirection = "leading" | "lagging";

/** 指标分类 */
export type IndicatorCategory =
  | "trend"
  | "momentum"
  | "volatility"
  | "volume"
  | "levels";

/** 指标输入数据 */
export interface IndicatorInput {
  /** 收盘价数组 */
  closes?: number[];

  /** 开盘价数组 */
  opens?: number[];

  /** 最高价数组 */
  highs?: number[];

  /** 最低价数组 */
  lows?: number[];

  /** 成交量数组 */
  volumes?: number[];

  /** 自定义数据 */
  custom?: Record<string, number[]>;
}

/** 指标输出值 */
export interface IndicatorValue {
  /** 主值（如 MA 值、RSI 值） */
  main: number;

  /** 信号线值（如 MACD signal、BB 中轨） */
  signal?: number;

  /** 上轨值（如布林上轨） */
  upper?: number;

  /** 下轨值（如布林下轨） */
  lower?: number;

  /** 直方图值（如 MACD histogram） */
  histogram?: number;
}

/** 指标快照（单根 K 线） */
export interface IndicatorSnapshot {
  /** 指标名称 */
  name: string;

  /** 指标类型 */
  type: IndicatorType;

  /** 计算参数 */
  params: Record<string, number>;

  /** 指标值 */
  value: IndicatorValue;

  /** 是否有效（预热期可能为 NaN） */
  isValid: boolean;
}

/** 指标计算结果（多根 K 线） */
export interface IndicatorResult {
  /** 指标名称 */
  name: string;

  /** 指标类型 */
  type: IndicatorType;

  /** 计算参数 */
  params: Record<string, number>;

  /** 每个 K 线的指标值 */
  values: (IndicatorValue | null)[];

  /** 计算耗时（毫秒） */
  computeTimeMs?: number;
}

/** 指标计算器接口 */
export interface IndicatorCalculator {
  /** 指标名称 */
  readonly name: string;

  /** 指标类型 */
  readonly type: IndicatorType;

  /** 指标分类 */
  readonly category: IndicatorCategory;

  /** 所需参数定义 */
  readonly paramDefinitions: IndicatorParamDefinition[];

  /** 计算指标
   * @param input 输入数据
   * @param params 计算参数
   * @returns 指标结果
   */
  calculate(input: IndicatorInput, params: Record<string, number>): IndicatorResult;

  /** 获取指定 K 线的指标值
   * @param input 输入数据
   * @param params 计算参数
   * @param index K 线索引
   */
  getValueAt(
    input: IndicatorInput,
    params: Record<string, number>,
    index: number,
  ): IndicatorValue | null;
}

/** 指标参数定义 */
export interface IndicatorParamDefinition {
  /** 参数名 */
  name: string;

  /** 参数类型 */
  type: "number" | "string" | "boolean";

  /** 默认值 */
  default: number | string | boolean;

  /** 最小值 */
  min?: number;

  /** 最大值 */
  max?: number;

  /** 步进值 */
  step?: number;

  /** 参数描述 */
  description?: string;
}

/** 常用指标预设 */
export const COMMON_INDICATORS = {
  MA_20: { name: "MA", params: { period: 20 } },
  MA_60: { name: "MA", params: { period: 60 } },
  MA_120: { name: "MA", params: { period: 120 } },
  EMA_12: { name: "EMA", params: { period: 12 } },
  EMA_26: { name: "EMA", params: { period: 26 } },
  RSI_14: { name: "RSI", params: { period: 14 } },
} as const;
