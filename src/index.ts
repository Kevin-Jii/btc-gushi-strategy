/**
 * BTC 葛氏策略命令行入口
 * 支持回测和 OKX 实盘
 */

import "dotenv/config";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { loadCandlesFromCsv } from "./data/market-data.js";
import { runBacktest } from "./backtest/backtest-engine.js";
import { formatPerformance } from "./backtest/performance.js";
import { logger } from "./utils/logger.js";
import { createStrategyConfig } from "./config/strategy.config.js";
import { LiveTrader } from "./live/live-trader.js";
import { createPlatformRuntime } from "./exchange/platform-factory.js";
import { createLangChainAdvisorConfig, LangChainAdvisor } from "./ai/langchain-advisor.js";

function optionalNumber(value: string | undefined): number | undefined {
  if (value === undefined || value.trim() === "") return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`Invalid numeric environment value: ${value}`);
  return parsed;
}

/** 运行命令行回测，同时导出以便进行轻量级集成测试。 */
export function main(argv: string[] = process.argv): number {
  const inputPath = argv[2] ?? process.env.CANDLES_CSV;
  if (!inputPath || inputPath === "--help" || inputPath === "-h") {
    logger.info("Usage: npm run backtest -- data/btc-usdt/BTCUSDT-1d.csv");
    return 0;
  }

  try {
    const candles = loadCandlesFromCsv(path.resolve(inputPath));
    const backtestOptions: Parameters<typeof runBacktest>[1] = {};
    const initialCapital = optionalNumber(process.env.INITIAL_CAPITAL);
    const feeRate = optionalNumber(process.env.FEE_RATE);
    const positionFraction = optionalNumber(process.env.POSITION_FRACTION);
    if (initialCapital !== undefined) backtestOptions.initialCapital = initialCapital;
    if (feeRate !== undefined) backtestOptions.feeRate = feeRate;
    if (positionFraction !== undefined) backtestOptions.positionFraction = positionFraction;
    const result = runBacktest(candles, backtestOptions);
    const first = candles[0];
    const last = candles.at(-1);
    logger.info(`Loaded ${candles.length} candles${first && last ? ` (${new Date(first.timestamp).toISOString()} -> ${new Date(last.timestamp).toISOString()})` : ""}`);
    console.log(formatPerformance(result.performance));
    console.log("Buy signals:", result.signals.buy);
    console.log("Sell signals:", result.signals.sell);
    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(message);
    return 1;
  }
}

/** 启动 OKX 现货策略 */
export async function runOkxCommand(mode?: "demo" | "live"): Promise<void> {
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    TRADING_PLATFORM: "okx",
    ...(mode ? { OKX_MODE: mode } : {})
  };
  const runtime = createPlatformRuntime(env, createStrategyConfig());
  const aiAdvisor = new LangChainAdvisor(createLangChainAdvisorConfig(env));
  const trader = new LiveTrader(runtime.client, {
    config: runtime.config.strategy,
    symbol: runtime.symbol,
    quoteAsset: runtime.quoteAsset,
    positionFraction: runtime.positionFraction,
    aiAdvisor,
    platform: runtime.platform,
    mode: runtime.mode,
    adoptExistingPosition: env.OKX_ADOPT_EXISTING_POSITION === "true",
  });
  const historyLimit = optionalNumber(env.OKX_HISTORY_LIMIT) ?? 300;
  if (!Number.isInteger(historyLimit) || historyLimit < 130 || historyLimit > 1000) {
    throw new Error("OKX_HISTORY_LIMIT must be an integer between 130 and 1000");
  }
  await trader.start(historyLimit);
  logger.info(`OKX ${runtime.mode} stream is running for ${runtime.symbol}. Press Ctrl+C to stop.`);
  const shutdown = async (): Promise<void> => {
    await trader.stop();
    process.exitCode = 0;
  };
  process.once("SIGINT", () => { void shutdown(); });
  process.once("SIGTERM", () => { void shutdown(); });
}

// 被测试或仪表盘导入时，不要自动运行 CLI。
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const command = process.argv[2];
  if (command === "okx" || command === "okx-demo" || command === "okx-live") {
    const mode = command === "okx-demo" ? "demo" : command === "okx-live" ? "live" : undefined;
    void runOkxCommand(mode).catch((error: unknown) => {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(message);
      process.exitCode = 1;
    });
  } else {
    process.exitCode = main();
  }
}
