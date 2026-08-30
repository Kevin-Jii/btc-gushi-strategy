import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Pool, type PoolConfig } from "pg";
import type { AiReviewQuery, PersistedAiReview, PersistedAiReviewRecord, PersistedOrder, OrderQuery, StrategyMonitorSnapshot, StrategyPerformance, TradingPersistence } from "./persistence-types.js";

function finiteNumber(value: string | number | null | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

export class PostgresRepository implements TradingPersistence {
  private readonly pool: Pool;

  public constructor(config: PoolConfig) {
    this.pool = new Pool(config);
  }

  public async initialize(): Promise<void> {
    const compiledSchemaPath = path.join(path.dirname(fileURLToPath(import.meta.url)), "postgres-schema.sql");
    const sourceSchemaPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../src/persistence/postgres-schema.sql");
    let sql: string;
    try {
      sql = await fs.readFile(compiledSchemaPath, "utf8");
    } catch {
      sql = await fs.readFile(sourceSchemaPath, "utf8");
    }
    await this.pool.query(sql);
  }

  public async saveOrder(order: PersistedOrder): Promise<void> {
    await this.pool.query(
      `INSERT INTO strategy_orders (
        exchange_order_id, strategy_id, strategy_name, strategy_version,
        platform, trading_mode, symbol, candle_interval, side, quantity,
        price, reason, executed_at, entry_order_id, realized_profit,
        realized_profit_percent
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
      ON CONFLICT (platform, trading_mode, exchange_order_id) DO UPDATE SET
        quantity = EXCLUDED.quantity,
        price = EXCLUDED.price,
        reason = EXCLUDED.reason,
        entry_order_id = EXCLUDED.entry_order_id,
        realized_profit = EXCLUDED.realized_profit,
        realized_profit_percent = EXCLUDED.realized_profit_percent`,
      [order.exchangeOrderId, order.strategyId, order.strategyName, order.strategyVersion,
        order.platform, order.mode, order.symbol, order.interval, order.side,
        order.quantity, order.price, order.reason, new Date(order.executedAt),
        order.entryOrderId ?? null, order.realizedProfit ?? null,
        order.realizedProfitPercent ?? null],
    );
  }

  public async saveAiReview(review: PersistedAiReview): Promise<void> {
    const { input, result } = review;
    await this.pool.query(
      `INSERT INTO ai_strategy_reviews (
        strategy_id, strategy_name, strategy_version, platform, trading_mode,
        symbol, candle_interval, candle_timestamp, recommendation, confidence,
        rule_status, allow_entry, model, source, summary, evidence, risks,
        invalidation, strategy_signal, market_context, generated_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16::jsonb,$17::jsonb,$18,$19::jsonb,$20::jsonb,$21)
      ON CONFLICT (strategy_id, symbol, candle_interval, candle_timestamp, generated_at) DO NOTHING`,
      [review.strategyId, review.strategyName, review.strategyVersion, input.platform,
        input.mode, input.symbol, review.interval, new Date(input.candle.timestamp),
        result.recommendation, result.confidence, result.ruleStatus, result.allowEntry,
        result.model, result.source, result.summary, JSON.stringify(result.evidence),
        JSON.stringify(result.risks), result.invalidation,
        JSON.stringify(input.evaluation),
        JSON.stringify({ candle: input.candle, recentCandles: input.recentCandles, position: input.position }),
        new Date(result.generatedAt)],
    );
  }

  public async saveMonitorSnapshot(snapshot: StrategyMonitorSnapshot): Promise<void> {
    await this.pool.query(`INSERT INTO strategy_monitor_snapshots (strategy_id,symbol,candle_interval,recorded_at,equity,unrealized_profit,position_quantity,entry_price,mark_price,termination_condition,strategy_signal) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`, [snapshot.strategyId, snapshot.symbol, snapshot.interval, new Date(snapshot.timestamp), snapshot.equity, snapshot.unrealizedProfit, snapshot.positionQuantity, snapshot.entryPrice, snapshot.markPrice, snapshot.terminationCondition, snapshot.signal]);
  }

  public async loadRecentOrders(limit = 100): Promise<PersistedOrder[]> {
    return this.loadOrders({ limit });
  }

  public async loadOrders(query: OrderQuery = {}): Promise<PersistedOrder[]> {
    const boundedLimit = Math.max(1, Math.min(query.limit ?? 100, 1000));
    const values: unknown[] = [];
    const conditions: string[] = [];
    if (query.strategyId) { values.push(query.strategyId); conditions.push(`strategy_id = $${values.length}`); }
    if (query.symbol) { values.push(query.symbol); conditions.push(`symbol = $${values.length}`); }
    if (query.side) { values.push(query.side); conditions.push(`side = $${values.length}`); }
    values.push(boundedLimit);
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const result = await this.pool.query(`SELECT * FROM strategy_orders ${where} ORDER BY executed_at DESC LIMIT $${values.length}`, values);
    return result.rows.map((row) => ({
      exchangeOrderId: String(row.exchange_order_id), strategyId: String(row.strategy_id),
      strategyName: String(row.strategy_name), strategyVersion: String(row.strategy_version),
      platform: String(row.platform), mode: String(row.trading_mode), symbol: String(row.symbol),
      interval: String(row.candle_interval), side: row.side as "BUY" | "SELL",
      quantity: finiteNumber(row.quantity), price: finiteNumber(row.price), reason: String(row.reason),
      executedAt: new Date(row.executed_at).getTime(),
      ...(row.entry_order_id ? { entryOrderId: String(row.entry_order_id) } : {}),
      ...(row.realized_profit !== null ? { realizedProfit: finiteNumber(row.realized_profit) } : {}),
      ...(row.realized_profit_percent !== null ? { realizedProfitPercent: finiteNumber(row.realized_profit_percent) } : {}),
    }));
  }

  public async loadAiReviews(query: AiReviewQuery = {}): Promise<PersistedAiReviewRecord[]> {
    const boundedLimit = Math.max(1, Math.min(query.limit ?? 100, 1000));
    const values: unknown[] = [];
    const conditions: string[] = [];
    if (query.strategyId) { values.push(query.strategyId); conditions.push(`strategy_id = $${values.length}`); }
    if (query.symbol) { values.push(query.symbol); conditions.push(`symbol = $${values.length}`); }
    values.push(boundedLimit);
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const result = await this.pool.query(`SELECT * FROM ai_strategy_reviews ${where} ORDER BY generated_at DESC LIMIT $${values.length}`, values);
    return result.rows.map((row): PersistedAiReviewRecord => ({
      id: Number(row.id), strategyId: String(row.strategy_id), strategyName: String(row.strategy_name), strategyVersion: String(row.strategy_version),
      platform: String(row.platform), mode: String(row.trading_mode), symbol: String(row.symbol), interval: String(row.candle_interval),
      input: { symbol: String(row.symbol), platform: String(row.platform), mode: String(row.trading_mode), candle: row.market_context.candle, recentCandles: row.market_context.recentCandles, evaluation: row.strategy_signal, position: row.market_context.position },
      result: { generatedAt: new Date(row.generated_at).getTime(), recommendation: row.recommendation, confidence: finiteNumber(row.confidence), ruleStatus: row.rule_status, allowEntry: Boolean(row.allow_entry), model: String(row.model), source: row.source, summary: String(row.summary), evidence: row.evidence, risks: row.risks, invalidation: String(row.invalidation) },
      generatedAt: new Date(row.generated_at).getTime(),
    }));
  }

  public async loadStrategyPerformance(strategyId?: string): Promise<StrategyPerformance[]> {
    const values = strategyId ? [strategyId] : [];
    const filter = strategyId ? "WHERE strategy_id = $1" : "";
    const result = await this.pool.query(`SELECT strategy_id,
      COALESCE(SUM(realized_profit), 0) AS realized_profit,
      COALESCE(SUM(realized_profit_percent), 0) AS realized_profit_percent,
      COUNT(*) FILTER (WHERE side = 'SELL')::int AS completed_trades
      FROM strategy_orders ${filter} GROUP BY strategy_id`, values);
    return result.rows.map((row) => ({ strategyId: String(row.strategy_id),
      realizedProfit: finiteNumber(row.realized_profit),
      realizedProfitPercent: finiteNumber(row.realized_profit_percent),
      completedTrades: finiteNumber(row.completed_trades) }));
  }

  public async close(): Promise<void> {
    await this.pool.end();
  }
}

export function createPostgresRepository(env: NodeJS.ProcessEnv): PostgresRepository | null {
  if ((env.POSTGRES_ENABLED ?? "true").toLowerCase() === "false") return null;
  const connectionString = env.DATABASE_URL?.trim();
  if (!connectionString) throw new Error("缺少 DATABASE_URL；如需关闭 PostgreSQL 持久化，请设置 POSTGRES_ENABLED=false");
  const ssl = (env.POSTGRES_SSL ?? "false").toLowerCase() === "true" ? { rejectUnauthorized: false } : undefined;
  return new PostgresRepository({ connectionString, ...(ssl ? { ssl } : {}), max: Number(env.POSTGRES_POOL_MAX ?? 10) });
}
