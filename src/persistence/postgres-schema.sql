CREATE TABLE IF NOT EXISTS strategy_orders (
  id BIGSERIAL PRIMARY KEY,
  exchange_order_id TEXT NOT NULL,
  strategy_id TEXT NOT NULL,
  strategy_name TEXT NOT NULL,
  strategy_version TEXT NOT NULL,
  platform TEXT NOT NULL,
  trading_mode TEXT NOT NULL,
  symbol TEXT NOT NULL,
  candle_interval TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('BUY', 'SELL')),
  quantity NUMERIC(36, 18) NOT NULL,
  price NUMERIC(36, 18) NOT NULL,
  reason TEXT NOT NULL,
  executed_at TIMESTAMPTZ NOT NULL,
  entry_order_id TEXT,
  realized_profit NUMERIC(36, 18),
  realized_profit_percent NUMERIC(18, 8),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (platform, trading_mode, exchange_order_id)
);

CREATE INDEX IF NOT EXISTS strategy_orders_strategy_time_idx
  ON strategy_orders (strategy_id, executed_at DESC);
CREATE INDEX IF NOT EXISTS strategy_orders_symbol_time_idx
  ON strategy_orders (symbol, executed_at DESC);

CREATE TABLE IF NOT EXISTS ai_strategy_reviews (
  id BIGSERIAL PRIMARY KEY,
  strategy_id TEXT NOT NULL,
  strategy_name TEXT NOT NULL,
  strategy_version TEXT NOT NULL,
  platform TEXT NOT NULL,
  trading_mode TEXT NOT NULL,
  symbol TEXT NOT NULL,
  candle_interval TEXT NOT NULL,
  candle_timestamp TIMESTAMPTZ NOT NULL,
  recommendation TEXT NOT NULL CHECK (recommendation IN ('BUY', 'SELL', 'HOLD')),
  confidence NUMERIC(8, 6) NOT NULL,
  rule_status TEXT NOT NULL CHECK (rule_status IN ('PASS', 'FAIL', 'UNCERTAIN')),
  allow_entry BOOLEAN NOT NULL,
  model TEXT NOT NULL,
  source TEXT NOT NULL,
  summary TEXT NOT NULL,
  evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
  risks JSONB NOT NULL DEFAULT '[]'::jsonb,
  invalidation TEXT NOT NULL,
  strategy_signal JSONB NOT NULL,
  market_context JSONB NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (strategy_id, symbol, candle_interval, candle_timestamp, generated_at)
);

CREATE INDEX IF NOT EXISTS ai_reviews_strategy_time_idx
  ON ai_strategy_reviews (strategy_id, generated_at DESC);
CREATE INDEX IF NOT EXISTS ai_reviews_symbol_time_idx
  ON ai_strategy_reviews (symbol, generated_at DESC);
