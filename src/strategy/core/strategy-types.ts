/**
 * 策略核心类型定义
 * 为所有策略提供统一的类型基础
 */

// ============ 基础枚举 ============

/** 交易市场类型 */
export type Market = "spot" | "futures";

/** 策略动作 */
export type StrategyAction = "BUY" | "SELL" | "HOLD";

/** 策略分类 */
export type StrategyCategory = "trend" | "breakout" | "mean-reversion" | "momentum";

/** 策略状态 */
export type StrategyStatus = "active" | "paused" | "stopped";

// ============ 策略信号 ============

/**
 * 标准化的策略信号
 * 所有策略输出统一使用此格式
 */
export interface StrategySignal {
  /** 信号 ID */
  signalId: string | null;

  /** 策略 ID */
  strategyId: string;

  /** 策略版本 */
  strategyVersion: string | null;

  /** 信号时间戳 */
  timestamp: number;

  /** 交易动作 */
  action: StrategyAction;

  /** 信号强度 0-1 */
  strength: number;

  /** 信号原因描述 */
  reason: string;

  /** 触发规则名称 */
  rule: string | null;

  /** K 线索引 */
  barIndex: number | null;

  /** 价格信息 */
  price: number | null;

  /** 附加元数据 */
  metadata: Record<string, unknown> | null;
}

// ============ 策略上下文 ============

/**
 * 策略执行所需的上下文数据
 * 从数据层和指标层聚合而来
 */
export interface StrategyContext {
  /** K 线数据 */
  candles: CandleContext;

  /** 指标快照 */
  indicators: IndicatorContext;

  /** 当前持仓状态 */
  position: PositionContext;

  /** 市场状态 */
  market: MarketContext;

  /** 配置 */
  config: StrategyConfigContext;
}

/** K 线上下文 */
export interface CandleContext {
  /** 当前 K 线 */
  current: CandleData;

  /** 历史 K 线数组 */
  history: CandleData[];

  /** 当前索引 */
  index: number;

  /** 时间范围 */
  timeframe: string;
}

/** K 线数据 */
export interface CandleData {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/** 指标上下文 */
export interface IndicatorContext {
  /** 当前指标值 */
  current: IndicatorValues;

  /** 历史指标值数组 */
  history: IndicatorValues[];

  /** 自定义指标（供插件使用） */
  custom?: Record<string, unknown>;
}

/** 指标值 */
export interface IndicatorValues {
  ma20: number;
  ma60: number;
  ma120: number;
  volumeMa20: number;
  support: number;
  resistance: number;
  bias60: number;
  volumeConfirm: boolean;
}

/** 持仓上下文 */
export interface PositionContext {
  /** 当前持仓 */
  current: PositionData | null;

  /** 持仓历史 */
  history: PositionData[];
}

/** 持仓数据 */
export interface PositionData {
  side: "long";
  entryPrice: number;
  quantity: number;
  entryTimestamp: number;
  entryBarIndex: number;
  peakPrice: number;
}

/** 市场上下文 */
export interface MarketContext {
  /** 交易对 */
  symbol: string;

  /** 市场类型 */
  market: Market;

  /** 最后更新时间 */
  lastUpdateTime: number;
}

/** 策略配置上下文 */
export interface StrategyConfigContext {
  /** 快速 MA 周期 */
  fastMA: number;

  /** 中速 MA 周期 */
  midMA: number;

  /** 慢速 MA 周期 */
  slowMA: number;

  /** 成交量 MA 周期 */
  volumeMA: number;

  /** 止损百分比 */
  stopLossPct: number;

  /** 移动止损百分比 */
  trailingStopPct: number;

  /** 移动止损激活利润 */
  trailingActivationProfit: number;

  /** 自定义参数 */
  custom?: Record<string, unknown>;
}

// ============ 策略元信息 ============

/**
 * 策略元信息
 * 描述策略的基本属性
 */
export interface StrategyMetadata {
  /** 策略 ID */
  id: string;

  /** 策略名称 */
  name: string;

  /** 策略版本 */
  version: string;

  /** 策略描述 */
  description?: string;

  /** 策略分类 */
  category: StrategyCategory;

  /** 适用的交易市场 */
  market: Market;

  /** 支持的时间周期 */
  supportedTimeframes: string[];

  /** 需要的指标列表 */
  requiredIndicators: string[];

  /** 参数定义 */
  parameterDefinitions?: ParameterDefinition[];

  /** 作者 */
  author?: string;

  /** 创建时间 */
  createdAt?: number;

  /** 更新时间 */
  updatedAt?: number;
}

/** 参数定义 */
export interface ParameterDefinition {
  name: string;
  type: "number" | "string" | "boolean";
  default: unknown;
  min?: number;
  max?: number;
  step?: number;
  description?: string;
}

// ============ 策略评估结果 ============

/**
 * 策略评估结果
 * 包含信号和详细的评估信息
 */
export interface StrategyEvaluation {
  /** 策略 ID */
  strategyId: string;

  /** 策略版本 */
  strategyVersion: string;

  /** 评估时间戳 */
  timestamp: number;

  /** K 线索引 */
  barIndex: number;

  /** 信号 */
  signal: StrategySignal;

  /** 趋势过滤结果 */
  trendFilter: boolean | null;

  /** 附加评估数据 */
  evaluation: Record<string, unknown> | null;

  /** 警告信息 */
  warnings: string[] | null;
}
