/**
 * 葛氏策略专用上下文类型
 */

export interface GushiContext {
  /** 当前价格 */
  currentPrice: number;

  /** 前一根 K 线收盘价 */
  prevClose: number;

  /** 两根 K 线前收盘价 */
  prev2Close: number;

  /** 前一根 K 线开盘价 */
  prevOpen: number;

  /** 前一根 K 线最低价 */
  prevLow: number;

  /** 前一根 K 线最高价 */
  prevHigh: number;

  /** MA20 */
  ma20: number;

  /** MA60 */
  ma60: number;

  /** MA120 */
  ma120: number;

  /** 前一根 K 线的 MA60 */
  prevMA60: number;

  /** 3 根 K 线前的 MA60 */
  ma60_3: number;

  /** 4 根 K 线前的 MA60 */
  ma60_4: number;

  /** 5 根 K 线前的 MA60 */
  ma60_5: number;

  /** 6 根 K 线前的 MA60 */
  ma60_6: number;

  /** 前一根 K 线的 BIAS60 */
  prevBias60: number;

  /** 当前 BIAS60 */
  bias60: number;

  /** 成交量确认 */
  volumeConfirm: boolean;

  /** 阻力位 */
  resistance: number;

  /** 支撑位 */
  support: number;
}
