import { Typography } from "@douyinfe/semi-ui";
import type { ReactElement } from "react";
import type { DashboardState } from "../../../src/dashboard/dashboard-types";

const { Title, Paragraph } = Typography;

export function WorkspaceIntro({ state }: { state: DashboardState }): ReactElement {
  return <section className="workspace-intro">
    <div>
      <div className="eyebrow"><span className="eyebrow-dot" />LIVE STRATEGY WORKSPACE</div>
      <Title heading={1}>交易工作台</Title>
      <Paragraph>用一套可回溯的策略信号，观察行情、风险与执行状态。</Paragraph>
    </div>
    <div className="intro-context">
      <span className="context-label">当前策略</span>
      <strong>葛氏八法则 · MA 趋势</strong>
      <span className="context-meta">v1.0.0 · {state.interval} · {state.platform.toUpperCase()}</span>
    </div>
  </section>;
}
