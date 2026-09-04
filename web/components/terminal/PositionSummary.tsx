import { BriefcaseBusiness } from "lucide-react";
import type { ReactElement } from "react";
import type { DashboardState } from "../../../src/dashboard/dashboard-types";
import { formatAsset, formatMoney } from "../ui";
export function PositionSummary({ state }: { state: DashboardState }): ReactElement {
  const managedPosition = state.position;
  const externalPositions = state.exchangePositions;
  const position = managedPosition ?? externalPositions[0];
  const isExternal = !managedPosition && Boolean(position);
  const pnl = position ? isExternal ? position.unrealizedProfit : (state.market.latestPrice - position.entryPrice) * position.quantity : 0;
  const pct = position && position.entryPrice > 0 ? (pnl / (position.entryPrice * position.quantity)) * 100 : 0;

  return (
    <section className="rounded-xl border border-slate-800/50 bg-slate-900/50 p-5 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10">
          <BriefcaseBusiness size={18} className="text-blue-400" />
        </div>
        <h2 className="text-base font-bold text-slate-100">持仓信息</h2>
        {position ? (
          <span className={`ml-auto rounded-full px-3 py-1 text-xs font-semibold ${position.side === "long" ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}`}>
            {position.side === "long" ? "多头" : "空头"}{isExternal ? " · OKX" : ""}
          </span>
        ) : (
          <span className="ml-auto rounded-full bg-slate-800/50 px-3 py-1 text-xs font-medium text-slate-400">空仓</span>
        )}
      </div>

      {position ? (
        <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-5 md:grid-cols-4">
          <Value label="持仓数量" value={`${formatAsset(position.quantity)} ${isExternal ? position.symbol : state.account.baseAsset}`} />
          <Value label="开仓均价" value={formatMoney(position.entryPrice)} />
          <Value label="当前价格" value={formatMoney(isExternal ? position.markPrice : state.market.latestPrice)} />
          <Value
            label="未实现盈亏"
            value={`${pnl >= 0 ? "+" : ""}${formatMoney(pnl)} (${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%)`}
            tone={pnl >= 0 ? "text-emerald-400" : "text-rose-400"}
          />
          {isExternal ? (
            <>
              <Value label="杠杆" value={`${position.leverage}x`} />
              <Value label="保证金模式" value={position.marginMode === "cross" ? "全仓" : "逐仓"} />
              <Value label="强平价格" value={position.liquidationPrice ? formatMoney(position.liquidationPrice) : "--"} />
              <Value label="状态" value="OKX 已开仓 · 未接管" />
            </>
          ) : (
            <>
              <Value label="最高价格" value={formatMoney(position.peakPrice)} />
              <Value label="保证金模式" value="全仓 · 单向" />
              <Value label="固定止损" value="由风控引擎监控" />
              <Value label="移动止损" value="峰值价格动态更新" />
            </>
          )}
        </div>
      ) : (
        <div className="mt-5 grid min-h-32 place-items-center rounded-lg border border-dashed border-slate-700/50 bg-slate-800/20 text-center text-sm text-slate-400">
          <div>
            <div className="mb-2 text-slate-500">当前无持仓</div>
            <div className="text-xs">等待确定性策略产生合规入场信号</div>
          </div>
        </div>
      )}
    </section>
  );
}
function Value({ label, value, tone = "text-slate-100" }: { label: string; value: string; tone?: string }): ReactElement {
  return (
    <div>
      <span className="text-[10px] font-medium uppercase tracking-wider text-slate-500">{label}</span>
      <strong className={`mt-2 block truncate font-mono text-sm font-semibold ${tone}`}>{value}</strong>
    </div>
  );
}
