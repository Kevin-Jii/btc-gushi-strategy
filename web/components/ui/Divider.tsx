import type { ReactElement } from "react";

interface DividerProps {
  className?: string;
}

export function Divider({ className = "" }: DividerProps): ReactElement {
  return <div className={`h-px bg-slate-800/50 ${className}`} />;
}
