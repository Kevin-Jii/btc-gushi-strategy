import { Card, Divider, Progress, Tag, Typography } from "@douyinfe/semi-ui";
import { Brain, LoaderCircle, Minus, TrendingDown, TrendingUp } from "lucide-react";
import { useState } from "react";
import type { ReactElement } from "react";
import type { DashboardState } from "../../../src/dashboard/dashboard-types";

const { Text, Title } = Typography;

export function AiAdvisorCard({ state }: { state: DashboardState }): ReactElement {
  const [reviewing, setReviewing] = useState(false);
  const review = async (): Promise<void> => {
    setReviewing(true);
    try {
      const response = await fetch("/api/ai-review", { method: "POST" });
      if (!response.ok) {
        const result = await response.json() as { error?: string };
        window.alert(result.error ?? "AI 分析失败");
      }
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "AI 分析失败");
    } finally {
      setReviewing(false);
    }
  };
  const latest = state.ai.latest;
  if (!latest) {
    return <Card className="ai-card" shadows="hover">
      <div className="ai-empty">
        <Brain size={32} />
        <Title heading={5}>LangChain 策略审核</Title>
        <Text type="tertiary">{state.ai.enabled ? "尚未分析当前行情" : "AI 审核未启用，请先配置模型和 API Key"}</Text>
        <button className="trade-button" onClick={() => void review()} disabled={!state.ai.enabled || reviewing}>
          {reviewing ? <LoaderCircle size={14} className="animate-spin" /> : <Brain size={14} />}
          {reviewing ? "分析中…" : "立即分析"}
        </button>
        {state.ai.enabled && <Text type="tertiary" size="small">点击后将分析最近一根已收盘 K 线，不会自动下单。</Text>}
      </div>
    </Card>;
  }
  const buy = latest.recommendation === "BUY";
  const sell = latest.recommendation === "SELL";
  return <Card className="ai-card" shadows="hover">
    <div className="ai-header">
      <div className="ai-title"><Brain size={24} /><div><Title heading={5}>LangChain 策略审核</Title><Text type="tertiary" size="small">{state.ai.model}</Text></div></div>
      <div className="flex items-center gap-2"><Tag color={state.ai.enabled ? "green" : "grey"} size="small">{state.ai.enabled ? "已启用" : "未启用"}</Tag><button className="trade-button" onClick={() => void review()} disabled={!state.ai.enabled || reviewing}>{reviewing ? "分析中…" : "再次分析"}</button></div>
    </div>
    <div className="ai-recommendation"><div className="recommendation-icon" data-type={latest.recommendation.toLowerCase()}>{buy ? <TrendingUp size={24} /> : sell ? <TrendingDown size={24} /> : <Minus size={24} />}</div><div className="recommendation-info"><Text type="tertiary" size="small">模型判断</Text><Title heading={4}>{buy ? "买入建议" : sell ? "卖出建议" : "观望"}</Title></div><div className="confidence"><Text type="tertiary" size="small">置信度</Text><div className="confidence-value"><span>{Math.round(latest.confidence * 100)}%</span><Progress percent={Math.round(latest.confidence * 100)} showInfo={false} size="small" stroke={buy ? "#22C55E" : sell ? "#EF4444" : "#F59E0B"} /></div></div></div>
    <div className="ai-tags"><Tag color={latest.ruleStatus === "PASS" ? "green" : "red"} size="small">{latest.ruleStatus === "PASS" ? "规则通过" : "规则不通过"}</Tag><Tag color={latest.allowEntry ? "green" : "orange"} size="small">{latest.allowEntry ? "允许入场" : "不允许入场"}</Tag></div>
    <Text className="ai-summary">{latest.summary}</Text><Divider margin="12px 0" /><div className="ai-insights"><Insight title="支持证据" items={latest.evidence} tone="positive" /><Insight title="主要风险" items={latest.risks} tone="negative" /></div>
  </Card>;
}

function Insight({ title, items, tone }: { title: string; items: string[]; tone: string }): ReactElement {
  return <div className="insight-section"><Text type="tertiary" size="small">{title}</Text><ul className={`insight-list ${tone}`}>{items.slice(0, 3).map((item, i) => <li key={i}>{item}</li>)}</ul></div>;
}
