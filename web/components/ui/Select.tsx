import { ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import type { ReactElement } from "react";

interface Option {
  value: string;
  label: string;
}

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  className?: string;
}

export function Select({ value, onChange, options, className = "" }: SelectProps): ReactElement {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find((opt) => opt.value === value);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex h-8 w-full items-center justify-between gap-2 rounded-lg border border-slate-700/50 bg-slate-800/50 px-3 text-sm text-slate-200 transition-all hover:border-slate-600 hover:bg-slate-800/80"
      >
        <span>{selectedOption?.label || "选择"}</span>
        <ChevronDown size={14} className={`transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-auto rounded-lg border border-slate-700/50 bg-slate-800 py-1 shadow-xl">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
              className={`w-full px-3 py-2 text-left text-sm transition-colors hover:bg-slate-700/50 ${
                option.value === value ? "bg-slate-700/30 text-blue-400" : "text-slate-300"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
