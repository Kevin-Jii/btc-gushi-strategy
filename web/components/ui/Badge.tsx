import type { ReactNode, ReactElement } from "react";

interface BadgeProps {
  children: ReactNode;
  count?: number;
  dot?: boolean;
  className?: string;
}

export function Badge({ children, count, dot, className = "" }: BadgeProps): ReactElement {
  return (
    <div className={`relative inline-block ${className}`}>
      {children}
      {(count !== undefined || dot) && (
        <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
          {dot ? "" : count}
        </span>
      )}
    </div>
  );
}
