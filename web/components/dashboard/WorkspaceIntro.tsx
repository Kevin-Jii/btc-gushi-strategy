import type { ReactElement } from "react";
import type { DashboardState } from "../../../src/dashboard/dashboard-types";

export function WorkspaceIntro({ state }: { state: DashboardState }): ReactElement {
  return <section className="workspace-intro">
    <div>
      <div className="eyebrow"><span className="eyebrow-dot" />LIVE STRATEGY WORKSPACE</div>
      <h1 className="text-4xl font-bold text-slate-100">交易工作台</h1>
      <p className="text-slate-400">用一套可回溯的策略信号，观察行情、风险与执行状态。</p>
    </div>
    <div className="intro-context">
      <span className="context-label">当前策略</span>
      <strong>葛氏八法则 · MA 趋势</strong>
      <span className="context-meta">v1.0.0 · {state.interval} · {state.platform.toUpperCase()}</span>
    </div>
  </section>;
}
