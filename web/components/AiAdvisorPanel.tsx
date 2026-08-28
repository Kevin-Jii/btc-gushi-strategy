import { ArrowDownRight, ArrowUpRight, BrainCircuit, CircleAlert, CircleCheck, CircleX, Clock3, Sparkles } from "lucide-react";
import type { ReactElement } from "react";
import type { AiValidation } from "../../src/ai/ai-types";
import type { DashboardState } from "../../src/dashboard/dashboard-types";
import { BeautifulContextRow, BeautifulInsightList, BeautifulStatusChip, type BeautifulTone } from "./beautiful-ui";
import { formatTime } from "./ui";

interface AiAdvisorPanelProps {
  state: DashboardState;
}

function recommendationLabel(value: AiValidation["recommendation"]): string {
  if (value === "BUY") return "买入建议";
  if (value === "SELL") return "卖出建议";
  return "观望";
}

function recommendationTone(value: AiValidation["recommendation"]): BeautifulTone {
  if (value === "BUY") return "positive";
  if (value === "SELL") return "negative";
  return "neutral";
}

function ruleLabel(value: AiValidation["ruleStatus"]): string {
  if (value === "PASS") return "规则通过";
  if (value === "FAIL") return "规则不通过";
  return "规则不确定";
}

function ruleTone(value: AiValidation["ruleStatus"]): BeautifulTone {
  if (value === "PASS") return "positive";
  if (value === "FAIL") return "negative";
  return "warning";
}

function RecommendationIcon({ recommendation }: { recommendation: AiValidation["recommendation"] }): ReactElement {
  if (recommendation === "BUY") return <ArrowUpRight size={16} />;
  if (recommendation === "SELL") return <ArrowDownRight size={16} />;
  return <CircleAlert size={16} />;
}

function RuleIcon({ status }: { status: AiValidation["ruleStatus"] }): ReactElement {
  if (status === "PASS") return <CircleCheck size={14} />;
  if (status === "FAIL") return <CircleX size={14} />;
  return <CircleAlert size={14} />;
}

function ReviewHistory({ history }: { history: AiValidation[] }): ReactElement | null {
  if (history.length < 2) return null;
  return <div className="bui-history">
    <div className="bui-history-heading"><span>最近审核</span><span>{history.length} 条</span></div>
    <div className="bui-history-table" role="table" aria-label="最近 AI 审核记录">
      {history.slice(0, 5).map((item) => <div className="bui-history-row" role="row" key={item.generatedAt}>
        <time>{formatTime(item.generatedAt)}</time>
        <span className={`bui-history-recommendation ${recommendationTone(item.recommendation)}`}>{item.recommendation}</span>
        <span className={`bui-history-rule ${ruleTone(item.ruleStatus)}`}>{ruleLabel(item.ruleStatus)}</span>
        <span className="bui-history-confidence">{Math.round(item.confidence * 100)}%</span>
      </div>)}
    </div>
  </div>;
}

export function AiAdvisorPanel({ state }: AiAdvisorPanelProps): ReactElement {
  const latest = state.ai.latest;
  const modeLabel = state.ai.decisionMode === "veto" ? "入场否决" : "只给建议";

  return <section className="panel ai-panel">
    <div className="panel-header ai-panel-header">
      <div className="ai-title-lockup"><span className="ai-title-icon"><BrainCircuit size={17} /></span><div><h2>LangChain 策略审核</h2><p>{state.ai.model} · {modeLabel}</p></div></div>
      <BeautifulStatusChip
        label={state.ai.enabled ? "已启用" : "未启用"}
        tone={state.ai.enabled ? "positive" : "neutral"}
        icon={state.ai.enabled ? <CircleCheck size={13} /> : <CircleAlert size={13} />}
      />
    </div>
    {!latest ? <div className="bui-ai-empty"><Sparkles size={19} /><div><strong>{state.ai.enabled ? "等待第一条审核结果" : "AI 审核未启用"}</strong><span>{state.ai.enabled ? "下一根已收盘 K 线完成后，将在这里显示结构化审核。" : "设置 LANGCHAIN_ENABLED=true 和模型密钥后启用。"}</span></div></div> : <>
      <div className="bui-recommendation">
        <div className="bui-recommendation-main"><span className={`bui-recommendation-icon ${recommendationTone(latest.recommendation)}`}><RecommendationIcon recommendation={latest.recommendation} /></span><div><span className="bui-kicker">模型判断</span><strong>{recommendationLabel(latest.recommendation)}</strong></div></div>
        <div className="bui-confidence"><span>置信度</span><strong>{Math.round(latest.confidence * 100)}%</strong><div className="bui-confidence-track"><span style={{ width: `${Math.round(latest.confidence * 100)}%` }} /></div></div>
      </div>
      <div className="bui-chip-row"><BeautifulStatusChip label={ruleLabel(latest.ruleStatus)} tone={ruleTone(latest.ruleStatus)} icon={<RuleIcon status={latest.ruleStatus} />} /><BeautifulStatusChip label={latest.allowEntry ? "允许入场" : "不允许入场"} tone={latest.allowEntry ? "positive" : "warning"} /><span className="bui-generated"><Clock3 size={13} />{formatTime(latest.generatedAt)}</span></div>
      <p className="bui-summary">{latest.summary}</p>
      <div className="bui-context-grid"><BeautifulContextRow label="交易对" value={state.symbol} /><BeautifulContextRow label="审核来源" value={latest.source === "error" ? "异常回退" : "LangChain"} tone={latest.source === "error" ? "negative" : "info"} /><BeautifulContextRow label="入场门" value={state.ai.decisionMode === "veto" ? "AI 必须放行" : "确定性策略"} /><BeautifulContextRow label="失效条件" value={latest.invalidation} tone="warning" /></div>
      <div className="bui-insight-grid"><BeautifulInsightList title="支持证据" items={latest.evidence} tone="positive" /><BeautifulInsightList title="主要风险" items={latest.risks} tone="negative" /></div>
      <ReviewHistory history={state.ai.history} />
    </>}
  </section>;
}
