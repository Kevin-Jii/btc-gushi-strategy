import type { ReactNode } from "react";
import { Check, CircleAlert, CircleDashed, LoaderCircle } from "lucide-react";

export type BeautifulTone = "neutral" | "positive" | "negative" | "warning" | "info";
interface BeautifulStatusChipProps { label: string; tone?: BeautifulTone; icon?: ReactNode; }
export function BeautifulStatusChip({ label, tone = "neutral", icon }: BeautifulStatusChipProps): ReactNode { return <span className={`bui-status-chip ${tone}`}>{icon}<span>{label}</span></span>; }
interface BeautifulContextRowProps { label: string; value: ReactNode; tone?: BeautifulTone; }
export function BeautifulContextRow({ label, value, tone = "neutral" }: BeautifulContextRowProps): ReactNode { return <div className="bui-context-row"><span>{label}</span><strong className={tone}>{value}</strong></div>; }
interface BeautifulInsightListProps { title: string; items: string[]; tone?: BeautifulTone; emptyText?: string; }
export function BeautifulInsightList({ title, items, tone = "info", emptyText = "暂无记录" }: BeautifulInsightListProps): ReactNode { return <section className={`bui-insight-list ${tone}`}><h3>{title}</h3>{items.length ? <ul>{items.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul> : <p>{emptyText}</p>}</section>; }
export interface BeautifulTask { title: string; detail: string; state: "done" | "running" | "pending" | "error"; }
export function BeautifulTaskRows({ tasks }: { tasks: BeautifulTask[] }): ReactNode { return <div className="bui-task-rows">{tasks.map((task, index) => <div className="bui-task-row" key={task.title}><span className={`bui-task-icon ${task.state}`}>{task.state === "done" ? <Check size={13} /> : task.state === "running" ? <LoaderCircle size={13} className="animate-spin" /> : task.state === "error" ? <CircleAlert size={13} /> : <CircleDashed size={13} />}</span><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><strong>{index + 1}. {task.title}</strong><span>{task.state === "done" ? "完成" : task.state === "running" ? "处理中" : task.state === "error" ? "异常" : "等待"}</span></div><p>{task.detail}</p></div></div>)}</div>; }
export function BeautifulLoadingState({ label = "AI 正在分析实时订单与行情" }: { label?: string }): ReactNode { return <div className="bui-loading-state"><LoaderCircle size={15} className="animate-spin" /><span>{label}</span><i /><i /><i /></div>; }
