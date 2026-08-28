import { BarChart3 } from "lucide-react";
import type { ReactElement } from "react";
import type { DashboardState } from "../../src/dashboard/dashboard-types";
import { formatMoney } from "./ui";

function movingAverage(values: number[], period: number): (number | null)[] {
  return values.map((_, index) => {
    if (index < period - 1) return null;
    const sample = values.slice(index - period + 1, index + 1);
    return sample.reduce((sum, value) => sum + value, 0) / period;
  });
}

export function MarketChart({ state }: { state: DashboardState }): ReactElement {
  const candles = state.market.recentCandles;
  const width = 860;
  const height = 310;
  const padding = { top: 18, right: 18, bottom: 30, left: 58 };
  const closes = candles.map((candle) => candle.close);
  const ma20 = movingAverage(closes, 20);
  const ma60 = movingAverage(closes, 60);
  const allValues = [...closes, ...ma20.filter((value): value is number => value !== null), ...ma60.filter((value): value is number => value !== null)];
  const min = allValues.length ? Math.min(...allValues) : 0;
  const max = allValues.length ? Math.max(...allValues) : 1;
  const range = max - min || 1;
  const x = (index: number) => padding.left + (index / Math.max(candles.length - 1, 1)) * (width - padding.left - padding.right);
  const y = (value: number) => padding.top + ((max - value) / range) * (height - padding.top - padding.bottom);
  const line = (values: (number | null)[]) => values.reduce<string[]>((points, value, index) => {
    if (value === null) return points;
    points.push(`${points.length ? "L" : "M"}${x(index).toFixed(1)},${y(value).toFixed(1)}`);
    return points;
  }, []).join(" ");
  const gridValues = [0, 0.5, 1].map((ratio) => max - range * ratio);
  return <div className="chart-shell">{candles.length ? <svg className="market-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${state.symbol} 收盘价与均线`}>{gridValues.map((value) => <g key={value}><line x1={padding.left} x2={width - padding.right} y1={y(value)} y2={y(value)} className="chart-grid" /><text x={8} y={y(value) + 4} className="chart-label">{formatMoney(value, 0)}</text></g>)}<path d={line(closes)} className="price-line" /><path d={line(ma20)} className="ma20-line" /><path d={line(ma60)} className="ma60-line" />{candles.map((candle, index) => <line key={candle.timestamp} x1={x(index)} x2={x(index)} y1={height - padding.bottom + 4} y2={height - padding.bottom + 10} className="chart-tick" />)}</svg> : <div className="empty-chart"><BarChart3 size={22} /><span>等待行情 K 线数据</span></div>}<div className="chart-legend"><span><i className="legend-dot price" />收盘价</span><span><i className="legend-dot ma20" />MA20</span><span><i className="legend-dot ma60" />MA60</span><span className="chart-window">最近 {candles.length} 根 · {state.interval}</span></div></div>;
}
