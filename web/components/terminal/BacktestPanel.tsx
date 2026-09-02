import { BarChart3, Upload } from "lucide-react";
import { useState } from "react";
import type { ReactElement } from "react";

type BacktestResult = { performance: { initialCapital: number; finalEquity: number; totalReturnPct: number; maxDrawdownPct: number; winRatePct: number; totalTrades: number; sharpeRatio: number }; trades: Array<{ entryTimestamp: number; exitTimestamp: number; netPnl: number; returnPct: number }> };

export function BacktestPanel(): ReactElement {
  const [csv, setCsv] = useState("");
  const [fileName, setFileName] = useState("");
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const loadFile = async (file: File): Promise<void> => { setFileName(file.name); setCsv(await file.text()); setResult(null); setError(""); };
  const run = async (): Promise<void> => {
    if (!csv) { setError("请先选择历史 K 线 CSV 文件"); return; }
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/backtest", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ csv }) });
      const body = await response.json() as BacktestResult & { error?: string };
      if (!response.ok) throw new Error(body.error ?? "回测失败");
      setResult(body);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "回测失败"); }
    finally { setLoading(false); }
  };
  return <section className="terminal-panel p-4"><div className="flex items-start justify-between gap-3"><div><span className="terminal-eyebrow">HISTORICAL SIMULATION</span><h2 className="terminal-title">历史数据回测</h2></div><BarChart3 size={18} className="text-cyan" /></div><p className="mt-2 text-xs leading-5 text-muted">上传包含 timestamp、open、high、low、close、volume 的 CSV，按当前葛氏策略逐根模拟，不连接真实账户。</p><div className="mt-3 flex flex-wrap items-center gap-2"><label className="flex cursor-pointer items-center gap-2 rounded border border-line bg-bg/40 px-3 py-2 text-xs text-muted hover:border-cyan/50"><Upload size={14} /><span>{fileName || "选择历史 CSV"}</span><input className="hidden" type="file" accept=".csv,text/csv" onChange={(event) => { const file = event.target.files?.[0]; if (file) void loadFile(file); }} /></label><button className="rounded border border-cyan/35 bg-cyan/10 px-3 py-2 text-xs text-cyan disabled:opacity-50" disabled={loading || !csv} onClick={() => void run()}>{loading ? "回测计算中…" : "运行回测"}</button></div>{error && <div className="mt-3 rounded border border-loss/30 bg-loss/8 p-3 text-xs text-loss">{error}</div>}{result && <div className="mt-4 grid gap-3"><div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">{[["最终权益", `${result.performance.finalEquity.toFixed(2)}`], ["总收益", `${result.performance.totalReturnPct.toFixed(2)}%`], ["最大回撤", `${result.performance.maxDrawdownPct.toFixed(2)}%`], ["胜率", `${result.performance.winRatePct.toFixed(2)}%`], ["交易次数", String(result.performance.totalTrades)], ["夏普", result.performance.sharpeRatio.toFixed(2)]].map(([label, value]) => <div key={label} className="rounded border border-line bg-bg/35 p-2"><span className="block text-[10px] text-muted">{label}</span><strong className="mt-1 block font-mono text-sm">{value}</strong></div>)}</div><div className="text-[10px] text-muted">展示最近 {result.trades.length} 笔已完成交易；最大回撤为权益曲线峰值到谷值的跌幅。</div></div>}</section>;
}
