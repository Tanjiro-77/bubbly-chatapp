import React from "react";
import { CheckCircle2, AlertCircle, Sparkles, X } from "lucide-react";

export interface ToastMessage {
  id: string;
  type: "success" | "error" | "info";
  message: string;
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto relative overflow-hidden flex items-center justify-between p-3.5 rounded-2xl shadow-2xl backdrop-blur-2xl border animate-slide-up ${
            toast.type === "success"
              ? "bg-white/95 dark:bg-zinc-900/95 text-stone-900 dark:text-emerald-100 border-emerald-500/30"
              : toast.type === "error"
              ? "bg-white/95 dark:bg-zinc-900/95 text-stone-900 dark:text-rose-100 border-rose-500/30"
              : "bg-white/95 dark:bg-zinc-900/95 text-stone-900 dark:text-amber-100 border-amber-500/35"
          }`}
        >
          <div
            className={`absolute left-0 inset-y-0 w-1 ${
              toast.type === "success"
                ? "bg-emerald-500"
                : toast.type === "error"
                ? "bg-rose-500"
                : "bg-amber-500"
            }`}
          />
          <div className="flex items-center gap-3 pl-1.5">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                toast.type === "success"
                  ? "bg-emerald-500/15 text-emerald-500"
                  : toast.type === "error"
                  ? "bg-rose-500/15 text-rose-500"
                  : "bg-amber-500/15 text-amber-500"
              }`}
            >
              {toast.type === "success" && <CheckCircle2 className="w-4 h-4" />}
              {toast.type === "error" && <AlertCircle className="w-4 h-4" />}
              {toast.type === "info" && <Sparkles className="w-4 h-4" />}
            </div>
            <span className="text-xs sm:text-sm font-bold leading-snug">{toast.message}</span>
          </div>
          <button
            onClick={() => onDismiss(toast.id)}
            className="p-1.5 hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition shrink-0 ml-2 text-stone-400 hover:text-stone-700 dark:hover:text-white"
            aria-label="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};
