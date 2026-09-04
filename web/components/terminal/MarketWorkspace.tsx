import { Crosshair, Maximize2 } from "lucide-react";
import type { ReactElement } from "react";
import type { DashboardState } from "../../../src/dashboard/dashboard-types";
import { MarketChart } from "../MarketChart";
const intervals = [{ value: "5m", label: "5 分钟" }, { value: "15m", label: "15 分钟" }, { value: "1h", label: "1 小时" }, { value: "1d", label: "1 天" }, { value: "1w", label: "1 周" }, { value: "1M", label: "1 个月" }, { value: "1y", label: "1 年" }];
export function MarketWorkspace({ state, onIntervalChange }: { state: DashboardState; onIntervalChange: (interval: string) => void }): ReactElement {
  const candle = state.market.latestCandle;
  return (
    <section className="min-w-0 overflow-hidden rounded-xl border border-slate-800/50 bg-slate-900/50 backdrop-blur-sm">
      <div className="flex min-h-[52px] flex-wrap items-center gap-4 border-b border-slate-800/50 px-5 py-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10">
          <Crosshair size={16} className="text-blue-400" />
        </div>
        <strong className="text-sm font-bold text-slate-100">{state.symbol}</strong>
        <span className="text-xs text-slate-500">
          · {state.interval} · {state.platform.toUpperCase()}
        </span>
        {candle && (
          <div className="hidden gap-4 text-xs lg:flex">
            <span className="text-slate-400">
              开 <b className="font-mono text-slate-200">{candle.open.toFixed(2)}</b>
            </span>
            <span className="text-slate-400">
              高 <b className="font-mono text-emerald-400">{candle.high.toFixed(2)}</b>
            </span>
            <span className="text-slate-400">
              低 <b className="font-mono text-rose-400">{candle.low.toFixed(2)}</b>
            </span>
            <span className="text-slate-400">
              收 <b className="font-mono text-slate-200">{candle.close.toFixed(2)}</b>
            </span>
          </div>
        )}
        <button
          className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-slate-800/50"
          title="全屏"
        >
          <Maximize2 size={16} className="text-slate-500" />
        </button>
      </div>

      <MarketChart
        state={state}
        heightClassName="h-[320px] min-h-[280px]"
        levels={[
          ...(state.strategy.support ? [{ price: state.strategy.support, title: "支撑", color: "#F59E0B" }] : []),
          ...(state.strategy.resistance ? [{ price: state.strategy.resistance, title: "阻力", color: "#22D3EE" }] : []),
        ]}
      />

      <div className="flex items-center gap-2 border-t border-slate-800/50 px-4 py-3">
        {intervals.map((interval) => (
          <button
            key={interval.value}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              state.interval === interval.value
                ? "bg-blue-500/15 text-blue-400 shadow-sm"
                : "text-slate-400 hover:bg-slate-800/50 hover:text-slate-300"
            }`}
            onClick={() => onIntervalChange(interval.value)}
          >
            {interval.label}
          </button>
        ))}
        <span className="ml-auto text-xs text-slate-500">
          {state.market.candleCount} 根 K 线 · ticker 实时更新
        </span>
      </div>
    </section>
  );
}
