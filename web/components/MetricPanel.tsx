import type { LucideIcon } from "lucide-react";
import type { ReactElement } from "react";

export function MetricPanel({ icon: Icon, label, value, detail, tone = "neutral" }: { icon: LucideIcon; label: string; value: string; detail: string; tone?: string }): ReactElement {
  return <section className={`metric-panel ${tone}`}><div className="metric-head"><span className="metric-icon"><Icon size={16} /></span><span>{label}</span></div><strong>{value}</strong><small>{detail}</small></section>;
}
