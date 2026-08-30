/**
 * 交易所平台工厂
 * 目前只支持 OKX
 */

import type { StrategyConfig } from "../config/strategy.config.js";
import { OkxClient } from "./okx-client.js";
import { createOkxConfig, type OkxConfig } from "./okx-config.js";

export type TradingPlatform = "okx";

export interface PlatformRuntime {
  platform: TradingPlatform;
  mode: string;
  client: OkxClient;
  config: OkxConfig;
  symbol: string;
  interval: string;
  quoteAsset: string;
  positionFraction: number;
}

/** 创建 OKX 交易所客户端 */
export function createPlatformRuntime(
  env: NodeJS.ProcessEnv = process.env,
  strategy: StrategyConfig,
): PlatformRuntime {
  const config = createOkxConfig(env, strategy);
  return {
    platform: "okx",
    mode: config.mode,
    client: new OkxClient(config),
    config,
    symbol: config.instId,
    interval: config.interval,
    quoteAsset: config.quoteAsset,
    positionFraction: config.positionFraction,
  };
}
