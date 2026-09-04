import type { ReactNode, ReactElement, ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "small" | "medium" | "large";
  children: ReactNode;
}

export function Button({
  variant = "primary",
  size = "medium",
  className = "",
  children,
  disabled,
  ...props
}: ButtonProps): ReactElement {
  const baseClasses = "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors";

  const variantClasses = {
    primary: "bg-cyan-600 text-white hover:bg-cyan-700 disabled:bg-slate-800 disabled:text-slate-600",
    secondary: "border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 disabled:opacity-50",
    danger: "bg-red-600 text-white hover:bg-red-700 disabled:bg-slate-800 disabled:text-slate-600",
    ghost: "text-slate-300 hover:bg-slate-800 disabled:text-slate-600 disabled:hover:bg-transparent",
  };

  const sizeClasses = {
    small: "h-7 px-3 text-xs",
    medium: "h-9 px-4 text-sm",
    large: "h-11 px-6 text-base",
  };

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
