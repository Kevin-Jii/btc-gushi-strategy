import type { StrategyConfig } from "../config/strategy.config.js";
import { BinanceClient } from "./binance-client.js";
import { createBinanceConfig, type BinanceConfig } from "./binance-config.js";
import { OkxClient } from "./okx-client.js";
import { createOkxConfig, type OkxConfig } from "./okx-config.js";
import type { TradingClient } from "./binance-types.js";

export type TradingPlatform = "binance" | "okx";

export interface PlatformRuntime {
  platform: TradingPlatform;
  mode: string;
  client: TradingClient;
  config: BinanceConfig | OkxConfig;
  symbol: string;
  interval: string;
  quoteAsset: string;
  positionFraction: number;
}

/** 根据 TRADING_PLATFORM 创建交易所客户端；未设置时保持 Binance 默认行为。 */
export function createPlatformRuntime(
  env: NodeJS.ProcessEnv = process.env,
  strategy: StrategyConfig,
): PlatformRuntime {
  const platform = (env.TRADING_PLATFORM ?? "binance").trim().toLowerCase();
  if (platform === "okx") {
    const config = createOkxConfig(env, strategy);
    return { platform: "okx", mode: config.mode, client: new OkxClient(config), config, symbol: config.instId, interval: config.interval, quoteAsset: config.quoteAsset, positionFraction: config.positionFraction };
  }
  if (platform === "binance") {
    const config = createBinanceConfig(env, strategy);
    return { platform: "binance", mode: config.mode, client: new BinanceClient(config), config, symbol: config.symbol, interval: config.interval, quoteAsset: config.quoteAsset, positionFraction: config.positionFraction };
  }
  throw new Error("TRADING_PLATFORM must be binance or okx");
}
