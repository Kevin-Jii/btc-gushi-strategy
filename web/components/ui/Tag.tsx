import type { ReactNode, ReactElement } from "react";

interface TagProps {
  children: ReactNode;
  color?: "red" | "blue" | "green" | "amber" | "cyan" | "purple" | "slate";
  size?: "small" | "medium";
  className?: string;
}

export function Tag({ children, color = "slate", size = "medium", className = "" }: TagProps): ReactElement {
  const colors = {
    red: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    blue: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    green: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    amber: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    cyan: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
    purple: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    slate: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  };

  const sizes = {
    small: "px-2 py-0.5 text-xs",
    medium: "px-3 py-1 text-sm",
  };

  return (
    <span className={`inline-flex items-center rounded-full border font-semibold ${colors[color]} ${sizes[size]} ${className}`}>
      {children}
    </span>
  );
}
