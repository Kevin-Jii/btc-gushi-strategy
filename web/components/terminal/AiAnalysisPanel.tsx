import { Bot, Check, CircleAlert, CircleCheck, CircleDashed, Clock3, LoaderCircle, ShieldX, Sparkles, TrendingUp, Activity, Target } from "lucide-react";
import { useState } from "react";
import type { ReactElement } from "react";
import type { AiValidation } from "../../../src/ai/ai-types";
import type { DashboardState } from "../../../src/dashboard/dashboard-types";
import { BeautifulContextRow, BeautifulInsightList, BeautifulLoadingState, BeautifulStatusChip, BeautifulTaskRows, type BeautifulTask, type BeautifulTone } from "../beautiful-ui";
import { formatTime } from "../ui";

type AnalysisType = "market-trend" | "strategy-signal" | "risk-assessment" | "position-review";

interface AnalysisOption {
  id: AnalysisType;
  icon: ReactElement;
  title: string;
  description: string;
  color: string;
}

const ANALYSIS_OPTIONS: AnalysisOption[] = [
  {
    id: "market-trend",
    icon: <TrendingUp size={20} />,
    title: "市场趋势分析",
    description: "分析当前市场趋势、支撑阻力位和价格走势",
    color: "blue",
  },
  {
    id: "strategy-signal",
    icon: <Target size={20} />,
    title: "策略信号评估",
    description: "评估当前策略信号的有效性和入场时机",
    color: "purple",
  },
  {
    id: "risk-assessment",
    icon: <ShieldX size={20} />,
    title: "风险评估",
    description: "分析当前持仓风险和市场波动风险",
    color: "amber",
  },
  {
    id: "position-review",
    icon: <Activity size={20} />,
    title: "持仓复盘",
    description: "复盘最近的交易，总结经验教训",
    color: "cyan",
  },
];

function recommendationTone(value: AiValidation["recommendation"]): BeautifulTone { return value === "BUY" ? "positive" : value === "SELL" ? "negative" : "warning"; }
function ruleTone(value: AiValidation["ruleStatus"]): BeautifulTone { return value === "PASS" ? "positive" : value === "FAIL" ? "negative" : "warning"; }
function ruleLabel(value: AiValidation["ruleStatus"]): string { return value === "PASS" ? "规则通过" : value === "FAIL" ? "规则不通过" : "规则不确定"; }
function ResultIcon({ result }: { result: AiValidation["recommendation"] }): ReactElement { return result === "BUY" ? <CircleCheck size={15} /> : result === "SELL" ? <ShieldX size={15} /> : <CircleAlert size={15} />; }

export function AiAnalysisPanel({ state }: { state: DashboardState }): ReactElement {
  const [selectedType, setSelectedType] = useState<AnalysisType | null>(null);
  const [reviewing, setReviewing] = useState(false);

  const review = async (): Promise<void> => {
    if (!selectedType) return;
    setReviewing(true);
    try {
      const response = await fetch("/api/ai-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysisType: selectedType }),
      });
      if (!response.ok) {
        const body = await response.json() as { error?: string };
        window.alert(body.error ?? "AI 分析失败");
      }
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "AI 分析失败");
    } finally {
      setReviewing(false);
    }
  };

  const latest = state.ai.latest;
  const outcomeReviews = state.ai.outcomeReviews ?? [];

  // 如果还没有选择分析类型，显示选择界面
  if (!selectedType && !latest) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20">
            <Bot size={20} className="text-cyan-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100">AI 智能分析</h2>
            <p className="text-xs text-slate-400">选择分析维度，获取专业建议</p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {ANALYSIS_OPTIONS.map((option) => (
            <button
              key={option.id}
              onClick={() => setSelectedType(option.id)}
              disabled={!state.ai.enabled}
              className={`group relative overflow-hidden rounded-lg border p-4 text-left transition-all hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100 ${
                option.color === "blue" ? "border-blue-500/30 bg-blue-500/5 hover:border-blue-500/50 hover:bg-blue-500/10" :
                option.color === "purple" ? "border-purple-500/30 bg-purple-500/5 hover:border-purple-500/50 hover:bg-purple-500/10" :
                option.color === "amber" ? "border-amber-500/30 bg-amber-500/5 hover:border-amber-500/50 hover:bg-amber-500/10" :
                "border-cyan-500/30 bg-cyan-500/5 hover:border-cyan-500/50 hover:bg-cyan-500/10"
              }`}
            >
              <div className="absolute right-0 top-0 h-20 w-20 translate-x-8 -translate-y-8 rounded-full bg-gradient-to-br from-white/5 to-transparent blur-2xl transition-all group-hover:scale-150" />
              <div className="relative flex items-start gap-3">
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${
                  option.color === "blue" ? "bg-blue-500/10 text-blue-400" :
                  option.color === "purple" ? "bg-purple-500/10 text-purple-400" :
                  option.color === "amber" ? "bg-amber-500/10 text-amber-400" :
                  "bg-cyan-500/10 text-cyan-400"
                }`}>
                  {option.icon}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-slate-100">{option.title}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-slate-400">{option.description}</p>
                </div>
              </div>
            </button>
          ))}
        </div>

        {!state.ai.enabled && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-400">
            <div className="flex items-center gap-2 font-semibold">
              <CircleAlert size={14} />
              AI 分析未启用
            </div>
            <p className="mt-1 text-amber-400/80">请在配置中启用 AI 功能后使用智能分析</p>
          </div>
        )}
      </div>
    );
  }

  // 已选择分析类型，显示分析界面
  const selectedOption = ANALYSIS_OPTIONS.find(opt => opt.id === selectedType);
  const stages = [
    { title: "读取已收盘 K 线", detail: `${state.market.recentCandles.length} 根上下文 · ${state.interval}`, done: Boolean(state.market.latestCandle) },
    { title: "确定性策略评估", detail: state.strategy.entrySignal ? `${state.strategy.buy} 买入候选` : "无买入候选", done: state.strategy.entrySignal !== null },
    { title: "趋势与持仓门控", detail: `${state.strategy.trendFilter ? "趋势通过" : "趋势未通过"} · ${state.position ? "已有持仓" : "空仓"}`, done: true },
    { title: "LangChain 模型审核", detail: latest ? `${latest.model} · ${latest.source}` : "尚未运行", done: latest?.source === "langchain", error: latest?.source === "error" },
    { title: "执行权限判定", detail: latest?.allowEntry ? "AI 允许入场" : "不允许入场", done: Boolean(latest) },
  ];
  const taskRows: BeautifulTask[] = stages.map((stage, index) => ({ title: stage.title, detail: stage.detail, state: reviewing && index === 3 ? "running" : stage.error ? "error" : stage.done ? "done" : "pending" }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start gap-3">
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${
            selectedOption?.color === "blue" ? "bg-blue-500/10 text-blue-400" :
            selectedOption?.color === "purple" ? "bg-purple-500/10 text-purple-400" :
            selectedOption?.color === "amber" ? "bg-amber-500/10 text-amber-400" :
            "bg-cyan-500/10 text-cyan-400"
          }`}>
            {selectedOption?.icon || <Bot size={20} />}
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-100">{selectedOption?.title || "AI 分析"}</h2>
            <p className="text-xs text-slate-400">{selectedOption?.description}</p>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            className="h-8 rounded-lg border border-slate-700/50 bg-slate-800/50 px-3 text-xs text-slate-300 transition-all hover:bg-slate-800/80"
            onClick={() => setSelectedType(null)}
          >
            重新选择
          </button>
          <button
            className="inline-flex h-8 items-center gap-2 rounded-lg border border-cyan-500/35 bg-cyan-500/10 px-3 text-xs text-cyan-400 transition-all hover:bg-cyan-500/20 disabled:opacity-40"
            onClick={() => void review()}
            disabled={!state.ai.enabled || reviewing}
          >
            {reviewing ? <LoaderCircle size={14} className="animate-spin" /> : <Sparkles size={14} />}
            {reviewing ? "分析中" : latest ? "再次分析" : "开始分析"}
          </button>
        </div>
      </div>

      <div className="bui-thinking-trace">
        <div className="bui-thinking-heading">
          <span><Sparkles size={13} />分析进度</span>
          <span>{reviewing ? "运行中" : latest ? "已完成" : "等待触发"}</span>
        </div>
        {reviewing && <BeautifulLoadingState label="AI 正在读取行情、审核策略并监控订单" />}
        <BeautifulTaskRows tasks={taskRows} />
      </div>

      {latest ? (
        <div className="space-y-4">
          <div className="bui-recommendation">
            <div className="bui-recommendation-main">
              <span className={`bui-recommendation-icon ${recommendationTone(latest.recommendation)}`}>
                <ResultIcon result={latest.recommendation} />
              </span>
              <div>
                <span className="bui-kicker">模型判断</span>
                <strong>{latest.recommendation === "BUY" ? "买入建议" : latest.recommendation === "SELL" ? "卖出建议" : "观望"}</strong>
              </div>
            </div>
            <div className="bui-confidence">
              <span>置信度</span>
              <strong>{Math.round(latest.confidence * 100)}%</strong>
              <div className="bui-confidence-track">
                <span style={{ width: `${Math.round(latest.confidence * 100)}%` }} />
              </div>
            </div>
          </div>

          <div className="bui-chip-row">
            <BeautifulStatusChip label={ruleLabel(latest.ruleStatus)} tone={ruleTone(latest.ruleStatus)} icon={<CircleCheck size={13} />} />
            <BeautifulStatusChip label={latest.allowEntry ? "允许入场" : "不允许入场"} tone={latest.allowEntry ? "positive" : "warning"} />
            <span className="bui-generated"><Clock3 size={13} />{formatTime(latest.generatedAt)}</span>
          </div>

          <p className="bui-summary">{latest.summary}</p>

          <div className="bui-context-grid">
            <BeautifulContextRow label="交易对" value={state.symbol} />
            <BeautifulContextRow label="审核来源" value={latest.source === "error" ? "异常回退" : "LangChain"} tone={latest.source === "error" ? "negative" : "info"} />
            <BeautifulContextRow label="入场门" value={state.ai.decisionMode === "veto" ? "AI 必须放行" : "确定性策略"} />
            <BeautifulContextRow label="判断失效" value={latest.invalidation} tone="warning" />
          </div>

          <div className="bui-insight-grid">
            <BeautifulInsightList title="支持证据" items={latest.evidence} tone="positive" emptyText="模型未提供支持证据" />
            <BeautifulInsightList title="风险与冲突" items={latest.risks} tone="negative" emptyText="模型未识别额外风险" />
          </div>

          {outcomeReviews[0] && (
            <div className="rounded-lg border border-amber-500/25 bg-amber-500/5 p-3">
              <div className="text-xs font-semibold text-amber-400">
                最近交易复盘 · {outcomeReviews[0].review.outcome} · 盈亏 {outcomeReviews[0].realizedProfit.toFixed(4)} USDT
              </div>
              <p className="m-0 mt-2 text-xs leading-5 text-slate-300">{outcomeReviews[0].review.summary}</p>
              <div className="mt-2 grid gap-1 text-[10px] text-slate-400">
                {outcomeReviews[0].review.lessons.slice(0, 3).map((lesson) => (
                  <span key={lesson}>复盘学习：{lesson}</span>
                ))}
              </div>
            </div>
          )}

          <details className="border-t border-slate-800/50 pt-3">
            <summary className="cursor-pointer text-xs text-slate-400 hover:text-slate-300">
              历史审核记录 ({state.ai.history.length})
            </summary>
            <div className="mt-2 grid gap-1.5">
              {state.ai.history.slice(1, 6).map((item) => (
                <div key={item.generatedAt} className="flex items-center gap-2 rounded bg-slate-800/20 px-2 py-2 text-[10px]">
                  <span className="font-mono text-slate-500">{formatTime(item.generatedAt)}</span>
                  <span className="text-slate-300">{item.recommendation} · {item.ruleStatus}</span>
                  <span className="ml-auto text-slate-500">{Math.round(item.confidence * 100)}%</span>
                </div>
              ))}
            </div>
          </details>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-slate-700/50 bg-slate-800/20 p-8 text-center">
          <div className="text-sm text-slate-400">点击"开始分析"执行 AI 审核</div>
          <div className="mt-1 text-xs text-slate-500">将分析最近 K 线和策略状态</div>
        </div>
      )}
    </div>
  );
}
