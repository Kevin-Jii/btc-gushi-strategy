import { X } from "lucide-react";
import { useEffect } from "react";
import type { ReactNode, ReactElement } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: string;
}

export function Modal({ open, onClose, title, children, footer, width = "600px" }: ModalProps): ReactElement | null {
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

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        onClose();
      }
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="relative max-h-[90vh] w-full overflow-auto rounded-xl border border-slate-800/50 bg-slate-900 shadow-2xl animate-fade-in"
          style={{ maxWidth: width }}
          onClick={(e) => e.stopPropagation()}
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

          {/* Footer */}
          {footer && (
            <div className="sticky bottom-0 border-t border-slate-800/50 bg-slate-900/95 px-6 py-4 backdrop-blur-sm">
              {footer}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
