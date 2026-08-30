# BTC GuShi Strategy

This project implements the quantitative GuShi MA strategy as a TypeScript
backtesting engine and multi-platform spot executor. Binance remains supported;
OKX Demo is available as a separate entry, and live trading requires an explicit
confirmation environment variable.

## Run a backtest

The CSV must contain this header and one daily candle per row:

```csv
timestamp,open,high,low,close,volume
2025-01-01,93400,95000,92000,94500,12345
```

Then run:

```bash
npm install
npm run backtest -- data/btc-usdt/BTCUSDT-1d.csv
```

Optional environment variables are `INITIAL_CAPITAL`, `FEE_RATE`,
`POSITION_FRACTION`, and `CANDLES_CSV`. The default position fraction comes
from `targetPercent` in `src/config/strategy.config.ts`.

## Module map

- `src/data`: candle types, CSV loading, and no-look-ahead indicators.
- `src/indicators`: moving averages, bias, volume averages, support, and resistance.
- `src/strategy`: G1-G8 rules, trend filter, and per-bar evaluation.
- `src/risk`: fixed/trailing stops and cooldown bookkeeping.
- `src/backtest`: spot execution simulation and performance statistics.
- `src/exchange`: Binance and OKX Spot REST/WebSocket adapters, symbol filters, and order precision.
- `src/live`: close-only K-line strategy runner with balance/order synchronization.
- `src/ai`: LangChain 结构化策略审核器；默认关闭，可配置为建议或入场否决模式。
- `src/dashboard`: dashboard server, state aggregation, REST `/api/state`, `/api/orders`, `/api/ai-reviews`, `/api/performance`, and browser WebSocket `/ws`.
- `src/persistence`: PostgreSQL schema/repository for confirmed orders, AI reviews, and realized performance.
- `web/components`: independent React panels for market chart, assets, position, activity, metrics, AI审核、top bar, and sidebar。

Useful checks:

```bash
npm run check
npm run build
npm test
```

## Binance testnet and live trading

Copy `.env.example` to `.env`, then fill in a Binance API key and secret. Use
the Spot Testnet key for testnet mode:

```bash
npm run testnet
```

The runner loads historical candles for indicator warm-up, processes only
closed (`x=true`) WebSocket candles, and uses Binance `LOT_SIZE`,
`MARKET_LOT_SIZE`, and notional filters before placing market orders. It also
uses the signed WebSocket API user-data subscription and refreshes balances
after filled orders.

Real trading is disabled unless both the command and confirmation variable are
explicit:

```bash
BINANCE_LIVE_CONFIRM=I_UNDERSTAND_LIVE_TRADING npm run live
```

Never put API credentials in source code or logs. `BINANCE_ADOPT_EXISTING_POSITION`
is `false` by default; enabling it adopts the current base-asset balance on
restart and marks its entry at the current price because exchange history is
not assumed to belong to this strategy.

## Start the visual dashboard

The dashboard keeps API credentials on the Node.js server. The React page only
receives sanitized account, strategy, market, and activity state.

```bash
npm run start
```

This single command starts both the Node.js dashboard backend and the Vite
frontend. Open `http://127.0.0.1:5173`; Vite proxies `/api` and `/ws` to the
backend on port `8787`.

The backend-only command remains available as `npm run dashboard` for server
diagnostics. PostgreSQL persistence is enabled by default; set `DATABASE_URL` to your PostgreSQL connection string. For a local database, run `docker compose up -d postgres` after copying `.env.example` to `.env`. To intentionally run without persistence, set `POSTGRES_ENABLED=false`. The schema is applied automatically at dashboard startup. Historical replay APIs support filters such as `/api/orders?symbol=BTC-USDT&side=SELL&limit=100`, `/api/ai-reviews?limit=100`, and `/api/performance?strategyId=gushi-ma`.

Backtesting remains available through
`npm run backtest -- data/btc-usdt/BTCUSDT-1d.csv`.

## OKX Demo and live trading

OKX is selected independently through `TRADING_PLATFORM=okx`. Configure an OKX
API key, secret, and passphrase in `.env`. The Demo entry uses OKX simulated
trading and does not share balances with Binance Testnet:

```bash
TRADING_PLATFORM=okx OKX_MODE=demo npm run okx-demo
```

The dashboard uses the same platform selection:

```bash
TRADING_PLATFORM=okx OKX_MODE=demo npm run start
```

For OKX live trading, use a mainnet OKX key and set
`OKX_LIVE_CONFIRM=I_UNDERSTAND_LIVE_TRADING` before running `npm run okx-live`.
Never place either exchange's credentials in frontend code.

## LangChain 策略审核

LangChain 只接收必要的已收盘 K 线、确定性策略评估和非敏感持仓摘要，API 密钥始终留在 Node.js 后端。
复制 `.env.example` 后按需配置：

```env
LANGCHAIN_ENABLED=true
LANGCHAIN_DECISION_MODE=advisory
LANGCHAIN_OPENAI_API_KEY=你的 OpenAI API Key
LANGCHAIN_MODEL=gpt-4o-mini
```

`advisory` 模式只把 BUY/SELL/HOLD、规则状态、证据和风险显示在 Dashboard 中，不会阻止确定性策略下单。
`veto` 模式只有在确定性策略已经给出入场信号时才会等待 AI；AI 必须返回 BUY、PASS 且置信度达到
`LANGCHAIN_MIN_CONFIDENCE`，否则本次入场被否决。AI 没有下单工具，止损和确定性退出逻辑始终优先。

没有 API Key、AI 未启用、模型请求失败或返回 HOLD 时，原有策略继续运行；模型异常会以 HOLD 和 UNCERTAIN
记录在审核历史中。`LANGCHAIN_MIN_INTERVAL_MS` 默认 15 分钟，用于限制模型调用频率。
