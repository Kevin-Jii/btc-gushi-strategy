import type { StrategyConfig } from "../config/strategy.config.js";

/** Binance 运行环境。默认必须是测试网，避免误下真实订单。 */
export type BinanceMode = "testnet" | "live";

export interface BinanceConfig {
  mode: BinanceMode;
  apiKey: string;
  apiSecret: string;
  symbol: string;
  interval: string;
  quoteAsset: string;
  positionFraction: number;
  strategy: StrategyConfig;
}

function required(name: string, value: string | undefined): string {
  if (!value || value.trim() === "") throw new Error(`${name} is required`);
  return value.trim();
}

function numberEnv(name: string, value: string | undefined, fallback: number): number {
  if (value === undefined || value.trim() === "") return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`${name} must be a finite number`);
  return parsed;
}

/**
 * 从环境变量创建交易配置。live 模式需要额外的精确确认字符串，防止
 * 仅仅改错一个环境变量就把策略切到真实资金。
 */
export function createBinanceConfig(
  env: NodeJS.ProcessEnv = process.env,
  strategy: StrategyConfig,
): BinanceConfig {
  const mode = (env.BINANCE_MODE ?? "testnet").toLowerCase();
  if (mode !== "testnet" && mode !== "live") {
    throw new Error("BINANCE_MODE must be testnet or live");
  }
  if (mode === "live" && env.BINANCE_LIVE_CONFIRM !== "I_UNDERSTAND_LIVE_TRADING") {
    throw new Error("Live trading requires BINANCE_LIVE_CONFIRM=I_UNDERSTAND_LIVE_TRADING");
  }
  const positionFraction = numberEnv("BINANCE_POSITION_FRACTION", env.BINANCE_POSITION_FRACTION, strategy.targetPercent);
  if (positionFraction <= 0 || positionFraction > 1) {
    throw new Error("BINANCE_POSITION_FRACTION must be in the range (0, 1]");
  }
  return {
    mode,
    apiKey: required("BINANCE_API_KEY", env.BINANCE_API_KEY),
    apiSecret: required("BINANCE_API_SECRET", env.BINANCE_API_SECRET),
    symbol: (env.BINANCE_SYMBOL ?? "BTCUSDT").trim().toUpperCase(),
    interval: (env.BINANCE_INTERVAL ?? "1d").trim(),
    quoteAsset: (env.BINANCE_QUOTE_ASSET ?? "USDT").trim().toUpperCase(),
    positionFraction,
    strategy,
  };
}
