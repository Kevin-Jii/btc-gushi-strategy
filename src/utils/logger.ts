export type LogLevel = "info" | "warn" | "error";

export interface Logger {
  info(message: string): void;
  warn(message: string): void;
  error(message: string): void;
}

/** 小型无依赖日志器，同时适用于 CLI 和 Worker。 */
export function createLogger(scope = "app"): Logger {
  const write = (level: LogLevel, message: string): void => {
    const prefix = `[${new Date().toISOString()}] [${scope}] [${level.toUpperCase()}]`;
    if (level === "error") console.error(`${prefix} ${message}`);
    else if (level === "warn") console.warn(`${prefix} ${message}`);
    else console.log(`${prefix} ${message}`);
  };
  return {
    info: (message) => write("info", message),
    warn: (message) => write("warn", message),
    error: (message) => write("error", message),
  };
}

export const logger = createLogger("btc-gushi");
