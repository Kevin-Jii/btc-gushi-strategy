import type { ReactElement } from "react";

interface ProgressProps {
  percent: number;
  showInfo?: boolean;
  className?: string;
}

export function Progress({ percent, showInfo = true, className = "" }: ProgressProps): ReactElement {
  const clampedPercent = Math.min(Math.max(percent, 0), 100);

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-800">
        <div
          className="h-full rounded-full bg-cyan-500 transition-all duration-300"
          style={{ width: `${clampedPercent}%` }}
        />
      </div>
      {showInfo && (
        <span className="min-w-12 text-right text-xs text-slate-400">
          {clampedPercent.toFixed(0)}%
        </span>
      )}
    </div>
  );
}
