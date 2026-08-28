import type { ReactNode } from "react";

export type BeautifulTone = "neutral" | "positive" | "negative" | "warning" | "info";

interface BeautifulStatusChipProps {
  label: string;
  tone?: BeautifulTone;
  icon?: ReactNode;
}

/** Beautiful UI 风格的紧凑状态芯片，统一处理状态文字与图标。 */
export function BeautifulStatusChip({ label, tone = "neutral", icon }: BeautifulStatusChipProps): ReactNode {
  return <span className={`bui-status-chip ${tone}`}>{icon}<span>{label}</span></span>;
}

interface BeautifulContextRowProps {
  label: string;
  value: ReactNode;
  tone?: BeautifulTone;
}

/** Beautiful UI 风格的上下文行，用于展示模型、模式和审核时间等事实。 */
export function BeautifulContextRow({ label, value, tone = "neutral" }: BeautifulContextRowProps): ReactNode {
  return <div className="bui-context-row"><span>{label}</span><strong className={tone}>{value}</strong></div>;
}

interface BeautifulInsightListProps {
  title: string;
  items: string[];
  tone?: BeautifulTone;
  emptyText?: string;
}

/** Beautiful UI 风格的洞察列表，以轻量分隔线承载证据与风险。 */
export function BeautifulInsightList({ title, items, tone = "info", emptyText = "暂无记录" }: BeautifulInsightListProps): ReactNode {
  return <section className={`bui-insight-list ${tone}`}>
    <h3>{title}</h3>
    {items.length ? <ul>{items.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul> : <p>{emptyText}</p>}
  </section>;
}
