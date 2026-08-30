import type { StrategyConfig } from "../config/strategy.config.js";

/** OKX 的运行环境；demo 使用 OKX 模拟盘，live 使用真实现货账户。 */
export type OkxMode = "demo" | "live";

export interface OkxConfig {
  mode: OkxMode;
  apiKey: string;
  apiSecret: string;
  passphrase: string;
  instId: string;
  interval: string;
  bar: string;
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

/** 从环境变量读取 OKX 配置；真实盘需要精确确认字符串。 */
export function createOkxConfig(
  env: NodeJS.ProcessEnv = process.env,
  strategy: StrategyConfig,
): OkxConfig {
  const mode = (env.OKX_MODE ?? "demo").toLowerCase();
  if (mode !== "demo" && mode !== "live") throw new Error("OKX_MODE must be demo or live");
  if (mode === "live" && env.OKX_LIVE_CONFIRM !== "I_UNDERSTAND_LIVE_TRADING") {
    throw new Error("OKX live trading requires OKX_LIVE_CONFIRM=I_UNDERSTAND_LIVE_TRADING");
  }
  const positionFraction = numberEnv("OKX_POSITION_FRACTION", env.OKX_POSITION_FRACTION, strategy.targetPercent);
  if (positionFraction <= 0 || positionFraction > 1) throw new Error("OKX_POSITION_FRACTION must be in the range (0, 1]");
  const instId = (env.OKX_INST_ID ?? "BTC-USDT").trim().toUpperCase();
  const interval = (env.OKX_INTERVAL ?? "1d").trim();
  return {
    mode,
    apiKey: required("OKX_API_KEY", env.OKX_API_KEY),
    apiSecret: required("OKX_API_SECRET", env.OKX_API_SECRET),
    passphrase: required("OKX_API_PASSPHRASE", env.OKX_API_PASSPHRASE),
    instId,
    interval,
    bar: (env.OKX_BAR ?? intervalToBar(interval)).trim(),
    quoteAsset: (env.OKX_QUOTE_ASSET ?? instId.split("-")[1] ?? "USDT").trim().toUpperCase(),
    positionFraction,
    strategy,
  };
}

function intervalToBar(interval: string): string {
  const normalized = interval.toLowerCase();
  const known: Record<string, string> = { "1m": "1m", "3m": "3m", "5m": "5m", "15m": "15m", "30m": "30m", "1h": "1H", "2h": "2H", "4h": "4H", "6h": "6H", "12h": "12H", "1d": "1D", "3d": "3D", "1w": "1W", "1M": "1M", "1y": "1Y" };
  return known[normalized] ?? interval;
}
