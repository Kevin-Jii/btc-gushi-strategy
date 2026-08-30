import { BarChart3 } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";
import type { ReactElement } from "react";
import {
  CandlestickSeries,
  ColorType,
  createChart,
  LineSeries,
  LineStyle,
  type IChartApi,
  type ISeriesApi,
  type IPriceLine,
  type Time,
} from "lightweight-charts";
import type { DashboardState } from "../../src/dashboard/dashboard-types";

export interface ChartPriceLevel {
  price: number;
  title: string;
  color: string;
}

interface MarketChartProps {
  state: DashboardState;
  /** 后续可直接传入支撑位、阻力位或止损价，不需要改动图表实现。 */
  levels?: ChartPriceLevel[];
}

function movingAverage(values: number[], period: number): (number | null)[] {
  return values.map((_, index) => {
    if (index < period - 1) return null;
    const sample = values.slice(index - period + 1, index + 1);
    return sample.reduce((sum, value) => sum + value, 0) / period;
  });
}

function toTime(timestamp: number): Time {
  return Math.floor(timestamp / 1000) as Time;
}

function uniqueCandles(state: DashboardState): DashboardState["market"]["recentCandles"] {
  const seen = new Set<number>();
  return state.market.recentCandles.filter((candle) => {
    if (seen.has(candle.timestamp)) return false;
    seen.add(candle.timestamp);
    return true;
  });
}

/** TradingView Lightweight Charts 图表；使用 Canvas 渲染，避免 SVG 图表难以扩展的问题。 */
export function MarketChart({ state, levels = [] }: MarketChartProps): ReactElement {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const ma20SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const ma60SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const priceLinesRef = useRef<IPriceLine[]>([]);
  const candles = useMemo(() => uniqueCandles(state), [state.market.recentCandles]);
  const closes = useMemo(() => candles.map((candle) => candle.close), [candles]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;
    const chart = createChart(container, {
      width: container.clientWidth || 640,
      height: Math.max(container.clientHeight || 600, 420),
      layout: { background: { type: ColorType.Solid, color: "#0F141D" }, textColor: "#7D899B", fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif", fontSize: 12 },
      grid: { vertLines: { color: "#1E293B", style: LineStyle.Dotted }, horzLines: { color: "#1E293B", style: LineStyle.Dotted } },
      crosshair: { vertLine: { color: "#687983", width: 1, style: LineStyle.Dashed }, horzLine: { color: "#687983", width: 1, style: LineStyle.Dashed } },
      rightPriceScale: { borderColor: "#52636f", scaleMargins: { top: 0.08, bottom: 0.08 }, textColor: "#d6e0e7" },
      timeScale: { borderColor: "#52636f", timeVisible: true, secondsVisible: false, rightOffset: 3, barSpacing: 8, tickMarkFormatter: (time) => new Date(Number(time) * 1000).toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit" }) },
    });
    const candleSeries = chart.addSeries(CandlestickSeries, { upColor: "#79c79d", downColor: "#d98073", borderUpColor: "#79c79d", borderDownColor: "#d98073", wickUpColor: "#79c79d", wickDownColor: "#d98073", priceLineVisible: false, lastValueVisible: true });
    const ma20Series = chart.addSeries(LineSeries, { color: "#d6a64b", lineWidth: 2, title: "MA20", priceLineVisible: false, lastValueVisible: false });
    const ma60Series = chart.addSeries(LineSeries, { color: "#79a7c4", lineWidth: 2, title: "MA60", priceLineVisible: false, lastValueVisible: false });
    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    ma20SeriesRef.current = ma20Series;
    ma60SeriesRef.current = ma60Series;
    const resizeObserver = new ResizeObserver(() => {
      if (container.clientWidth > 0 && container.clientHeight > 0) chart.applyOptions({ width: container.clientWidth, height: Math.max(container.clientHeight, 420) });
    });
    requestAnimationFrame(() => {
      if (container.clientWidth > 0 && container.clientHeight > 0) chart.applyOptions({ width: container.clientWidth, height: Math.max(container.clientHeight, 420) });
    });
    resizeObserver.observe(container);
    return () => {
      resizeObserver.disconnect();
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      ma20SeriesRef.current = null;
      ma60SeriesRef.current = null;
      priceLinesRef.current = [];
    };
  }, []);

  useEffect(() => {
    const candleSeries = candleSeriesRef.current;
    const ma20Series = ma20SeriesRef.current;
    const ma60Series = ma60SeriesRef.current;
    if (!candleSeries || !ma20Series || !ma60Series) return;
    candleSeries.setData(candles.map((candle) => ({ time: toTime(candle.timestamp), open: candle.open, high: candle.high, low: candle.low, close: candle.close })));
    const ma20 = movingAverage(closes, 20);
    const ma60 = movingAverage(closes, 60);
    ma20Series.setData(candles.flatMap((candle, index) => ma20[index] === null ? [] : [{ time: toTime(candle.timestamp), value: ma20[index] as number }]));
    ma60Series.setData(candles.flatMap((candle, index) => ma60[index] === null ? [] : [{ time: toTime(candle.timestamp), value: ma60[index] as number }]));
    for (const line of priceLinesRef.current) candleSeries.removePriceLine(line);
    priceLinesRef.current = levels.filter((level) => Number.isFinite(level.price) && level.price > 0).map((level) => candleSeries.createPriceLine({ price: level.price, color: level.color, lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: level.title }));
    if (candles.length > 0) chartRef.current?.timeScale().fitContent();
  }, [candles, closes, levels]);

  const hasData = candles.length > 0;
  return <div className="chart-shell">
    <div className="market-chart-host" aria-label={`${state.symbol} K 线与均线图`}>
      <div ref={containerRef} className="market-chart" />
      {!hasData && <div className="empty-chart"><BarChart3 size={22} /><span>等待行情 K 线数据</span></div>}
    </div>
    <div className="chart-legend"><span><i className="legend-dot candle" />K 线</span><span><i className="legend-dot ma20" />MA20</span><span><i className="legend-dot ma60" />MA60</span>{levels.map((level) => <span key={`${level.title}-${level.price}`}><i className="legend-dot level" style={{ background: level.color }} />{level.title}</span>)}<span className="chart-window">最近 {candles.length} 根 · {state.interval}</span></div>
  </div>;
}
