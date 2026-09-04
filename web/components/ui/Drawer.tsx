import { X } from "lucide-react";
import { useEffect } from "react";
import type { ReactNode, ReactElement } from "react";

interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  width?: string;
}

export function Drawer({ open, onClose, title, children, width = "600px" }: DrawerProps): ReactElement | null {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className="fixed right-0 top-0 z-50 h-full overflow-auto border-l border-slate-800/50 bg-slate-900 shadow-2xl"
        style={{ width, maxWidth: "90vw" }}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-800/50 bg-slate-900/95 px-6 py-4 backdrop-blur-sm">
          <h2 className="text-lg font-bold text-slate-100">{title}</h2>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-slate-800/50"
          >
            <X size={18} className="text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">{children}</div>
      </div>
    </>
  );
}
