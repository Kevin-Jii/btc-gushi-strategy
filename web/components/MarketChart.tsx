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
import { calculateKdj } from "../../src/indicators/kdj";

export interface ChartPriceLevel {
  price: number;
  title: string;
  color: string;
}

interface MarketChartProps {
  state: DashboardState;
  /** 后续可直接传入支撑位、阻力位或止损价，不需要改动图表实现。 */
  levels?: ChartPriceLevel[];
  heightClassName?: string;
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
export function MarketChart({ state, levels = [], heightClassName = "" }: MarketChartProps): ReactElement {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const kdjContainerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const ma20SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const ma60SeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const kdjChartRef = useRef<IChartApi | null>(null);
  const kSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const dSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const jSeriesRef = useRef<ISeriesApi<"Line"> | null>(null);
  const kdjPriceLinesRef = useRef<IPriceLine[]>([]);
  const priceLinesRef = useRef<IPriceLine[]>([]);
  const candles = useMemo(() => uniqueCandles(state), [state.market.recentCandles]);
  const closes = useMemo(() => candles.map((candle) => candle.close), [candles]);
  const kdj = useMemo(() => calculateKdj(candles), [candles]);

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
    const kdjContainer = kdjContainerRef.current;
    const kdjChart = kdjContainer ? createChart(kdjContainer, { width: kdjContainer.clientWidth || 640, height: kdjContainer.clientHeight || 128, layout: { background: { type: ColorType.Solid, color: "#0F141D" }, textColor: "#7D899B", fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif", fontSize: 10 }, grid: { vertLines: { color: "#1E293B", style: LineStyle.Dotted }, horzLines: { color: "#1E293B", style: LineStyle.Dotted } }, rightPriceScale: { borderColor: "#52636f", scaleMargins: { top: 0.08, bottom: 0.08 }, textColor: "#d6e0e7" }, timeScale: { borderColor: "#52636f", visible: false }, crosshair: { vertLine: { color: "#687983", width: 1, style: LineStyle.Dashed }, horzLine: { color: "#687983", width: 1, style: LineStyle.Dashed } } }) : null;
    const kSeries = kdjChart?.addSeries(LineSeries, { color: "#38BDF8", lineWidth: 1, title: "K", priceLineVisible: false, lastValueVisible: true });
    const dSeries = kdjChart?.addSeries(LineSeries, { color: "#F59E0B", lineWidth: 1, title: "D", priceLineVisible: false, lastValueVisible: true });
    const jSeries = kdjChart?.addSeries(LineSeries, { color: "#E879F9", lineWidth: 1, title: "J", priceLineVisible: false, lastValueVisible: true });
    if (kdjChart && kSeries) for (const value of [20, 80]) kdjPriceLinesRef.current.push(kSeries.createPriceLine({ price: value, color: "#52636f", lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: false, title: "" }));
    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    ma20SeriesRef.current = ma20Series;
    ma60SeriesRef.current = ma60Series;
    kdjChartRef.current = kdjChart;
    kSeriesRef.current = kSeries ?? null;
    dSeriesRef.current = dSeries ?? null;
    jSeriesRef.current = jSeries ?? null;
    const resizeObserver = new ResizeObserver(() => {
      if (container.clientWidth > 0 && container.clientHeight > 0) chart.applyOptions({ width: container.clientWidth, height: Math.max(container.clientHeight, 320) });
      if (kdjChart && kdjContainer && kdjContainer.clientWidth > 0) kdjChart.applyOptions({ width: kdjContainer.clientWidth, height: kdjContainer.clientHeight || 128 });
    });
    requestAnimationFrame(() => {
      if (container.clientWidth > 0 && container.clientHeight > 0) chart.applyOptions({ width: container.clientWidth, height: Math.max(container.clientHeight, 320) });
      if (kdjChart && kdjContainer && kdjContainer.clientWidth > 0) kdjChart.applyOptions({ width: kdjContainer.clientWidth, height: kdjContainer.clientHeight || 128 });
    });
    resizeObserver.observe(container);
    return () => {
      resizeObserver.disconnect();
      chart.remove();
      kdjChart?.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      ma20SeriesRef.current = null;
      ma60SeriesRef.current = null;
      kdjChartRef.current = null;
      kSeriesRef.current = null;
      dSeriesRef.current = null;
      jSeriesRef.current = null;
      kdjPriceLinesRef.current = [];
      priceLinesRef.current = [];
    };
  }, []);

  useEffect(() => {
    const candleSeries = candleSeriesRef.current;
    const ma20Series = ma20SeriesRef.current;
    const ma60Series = ma60SeriesRef.current;
    const kSeries = kSeriesRef.current;
    const dSeries = dSeriesRef.current;
    const jSeries = jSeriesRef.current;
    if (!candleSeries || !ma20Series || !ma60Series) return;
    candleSeries.setData(candles.map((candle) => ({ time: toTime(candle.timestamp), open: candle.open, high: candle.high, low: candle.low, close: candle.close })));
    const ma20 = movingAverage(closes, 20);
    const ma60 = movingAverage(closes, 60);
    ma20Series.setData(candles.flatMap((candle, index) => ma20[index] === null ? [] : [{ time: toTime(candle.timestamp), value: ma20[index] as number }]));
    ma60Series.setData(candles.flatMap((candle, index) => ma60[index] === null ? [] : [{ time: toTime(candle.timestamp), value: ma60[index] as number }]));
    if (kSeries && dSeries && jSeries) {
      kSeries.setData(candles.flatMap((candle, index) => kdj[index] ? [{ time: toTime(candle.timestamp), value: kdj[index]!.k }] : []));
      dSeries.setData(candles.flatMap((candle, index) => kdj[index] ? [{ time: toTime(candle.timestamp), value: kdj[index]!.d }] : []));
      jSeries.setData(candles.flatMap((candle, index) => kdj[index] ? [{ time: toTime(candle.timestamp), value: kdj[index]!.j }] : []));
    }
    for (const line of priceLinesRef.current) candleSeries.removePriceLine(line);
    priceLinesRef.current = levels.filter((level) => Number.isFinite(level.price) && level.price > 0).map((level) => candleSeries.createPriceLine({ price: level.price, color: level.color, lineWidth: 1, lineStyle: LineStyle.Dashed, axisLabelVisible: true, title: level.title }));
    if (candles.length > 0) {
      chartRef.current?.timeScale().fitContent();
      kdjChartRef.current?.timeScale().fitContent();
    }
  }, [candles, closes, kdj, levels]);

  const hasData = candles.length > 0;
  return <div className="chart-shell">
    <div className={`market-chart-host ${heightClassName}`} aria-label={`${state.symbol} K 线与均线图`}>
      <div ref={containerRef} className="market-chart" />
      {!hasData && <div className="empty-chart"><BarChart3 size={22} /><span>等待行情 K 线数据</span></div>}
    </div>
    <div className="border-t border-line bg-[#0F141D]"><div className="flex h-7 items-center gap-4 border-b border-line px-3 text-[10px] text-muted"><strong className="text-ink">KDJ (9,3,3)</strong><span className="text-[#38BDF8]">K</span><span className="text-[#F59E0B]">D</span><span className="text-[#E879F9]">J</span><span className="ml-auto">超卖 20 · 超买 80</span></div><div ref={kdjContainerRef} className="kdj-chart h-32 w-full" aria-label={`${state.symbol} KDJ 走势图`} /></div>
    <div className="chart-legend"><span><i className="legend-dot candle" />K 线</span><span><i className="legend-dot ma20" />MA20</span><span><i className="legend-dot ma60" />MA60</span>{levels.map((level) => <span key={`${level.title}-${level.price}`}><i className="legend-dot level" style={{ background: level.color }} />{level.title}</span>)}<span className="chart-window">最近 {candles.length} 根 · {state.interval}</span></div>
  </div>;
}
