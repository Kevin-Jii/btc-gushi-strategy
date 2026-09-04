import type { ReactNode, ReactElement } from "react";

interface CardProps {
  title?: string;
  children: ReactNode;
  className?: string;
  headerExtra?: ReactNode;
}

export function Card({ title, children, className = "", headerExtra }: CardProps): ReactElement {
  return (
    <div className={`rounded-lg border border-slate-800/50 bg-slate-900/50 ${className}`}>
      {title && (
        <div className="flex items-center justify-between border-b border-slate-800/50 px-4 py-3">
          <h3 className="text-sm font-semibold text-slate-100">{title}</h3>
          {headerExtra}
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  );
}
