import assert from "node:assert/strict";
import { createStrategyConfig } from "../config/strategy.config.js";
import { createBinanceConfig } from "./binance-config.js";
import { floorToStep } from "./binance-client.js";
import { BinanceOrderExecutor } from "./order-executor.js";
import type { BinanceTradingClient, OrderFill, SymbolRules } from "./binance-types.js";

const rules: SymbolRules = {
  symbol: "BTCUSDT",
  baseAsset: "BTC",
  quoteAsset: "USDT",
  quantityStep: 0.00001,
  minQuantity: 0.0001,
  maxQuantity: 100,
  priceTick: 0.01,
  minNotional: 10,
};
const fill: OrderFill = { orderId: "1", status: "FILLED", executedQuantity: 0.001, averagePrice: 50_000, transactTime: Date.now() };
const calls: Array<{ side: string; value: number }> = [];
const mock: BinanceTradingClient = {
  interval: "1d",
  getSymbolRules: async () => rules,
  getBalances: async () => [],
  marketBuy: async (_symbol, quoteOrderQty) => { calls.push({ side: "BUY", value: quoteOrderQty }); return fill; },
  marketSell: async (_symbol, quantity) => { calls.push({ side: "SELL", value: quantity }); return fill; },
  getOrder: async () => fill,
  loadCandles: async () => [],
  subscribeKlines: async () => async () => undefined,
  subscribeUserData: async () => async () => undefined,
};

assert.equal(floorToStep(0.123456, 0.00001), 0.12345);
const executor = new BinanceOrderExecutor(mock, "BTCUSDT");
await executor.buyWithQuote(100);
await executor.sellQuantity(0.123456);
assert.deepEqual(calls.map((call) => call.value), [100, 0.12345]);
await assert.rejects(() => executor.buyWithQuote(9), /minNotional/);
await assert.rejects(() => executor.sellQuantity(0.00001), /minQty/);

const baseEnv = { BINANCE_API_KEY: "test-key", BINANCE_API_SECRET: "test-secret" };
assert.equal(createBinanceConfig(baseEnv, createStrategyConfig()).mode, "testnet");
assert.throws(() => createBinanceConfig({ ...baseEnv, BINANCE_MODE: "live" }, createStrategyConfig()), /BINANCE_LIVE_CONFIRM/);
assert.equal(createBinanceConfig({ ...baseEnv, BINANCE_MODE: "live", BINANCE_LIVE_CONFIRM: "I_UNDERSTAND_LIVE_TRADING" }, createStrategyConfig()).mode, "live");

console.log("order-executor tests passed");
