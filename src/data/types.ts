export interface Candle {
  timestamp: number;

  /** Binance REST K 线提供的收盘时间；CSV 数据没有该字段。 */
  closeTime?: number;

  /** WebSocket K 线是否已收盘；实时未收盘 K 线用于价格跳动展示。 */
  isClosed?: boolean;

  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface IndicatorData {
  ma20: number;
  ma60: number;
  ma120: number;

  volumeMa20: number;

  support: number;
  resistance: number;

  bias60: number;

  /** 成交量均值不包含当前 K 线，用于避免未来数据泄漏。 */
  volumeConfirm: boolean;
}

export type GushiBuySignal = "G1" | "G2" | "G3" | "G4" | null;

export type GushiSellSignal = "G5" | "G6" | "G7" | "G8" | null;

export interface StrategySignal {
  buy: GushiBuySignal;
  sell: GushiSellSignal;

  buyReason?: string;
  sellReason?: string;
}

export interface Position {
  side: "long";
  entryPrice: number;
  quantity: number;
  entryTimestamp: number;
  entryBarIndex: number;
  peakPrice: number;
}

export type ExitReason =
  | Exclude<GushiSellSignal, null>
  | "fixed-stop"
  | "trailing-stop"
  | "end-of-data";

export interface Trade {
  entryTimestamp: number;
  exitTimestamp: number;
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  grossPnl: number;
  fees: number;
  netPnl: number;
  returnPct: number;
  entryReason: GushiBuySignal;
  exitReason: ExitReason;
}

export interface EquityPoint {
  timestamp: number;
  equity: number;
}
