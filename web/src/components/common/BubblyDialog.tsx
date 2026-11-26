import React, { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  ShieldAlert,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";

export type BubblyDialogVariant = "amber" | "danger" | "success" | "info";

interface DialogRequest {
  id: number;
  mode: "alert" | "confirm";
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  variant: BubblyDialogVariant;
  resolve: (result: boolean) => void;
}

const dialogQueue: DialogRequest[] = [];
const listeners = new Set<() => void>();
let nextDialogId = 1;

function notifyDialogListeners() {
  listeners.forEach((fn) => fn());
}

function inferVariant(text: string): BubblyDialogVariant {
  const lower = text.toLowerCase();
  if (
    /\b(delete|remove|block|logout|log out|leave|failed|error|required|could not|unavailable|deny|denied|warning)\b/.test(
      lower
    )
  ) {
    return "danger";
  }
  if (/\b(success|saved|updated|blocked|shared|sent|done)\b/.test(lower)) {
    return "success";
  }
  return "amber";
}

function inferTitle(message: string, variant: BubblyDialogVariant): string {
  const lower = message.toLowerCase();
  if (lower.includes("microphone") || lower.includes("camera")) return "Permission Required";
  if (lower.includes("call")) return "Call Notice";
  if (lower.includes("upload") || lower.includes("voice")) return "Upload Error";
  if (lower.includes("translate") || lower.includes("translation")) return "Translation";
  if (lower.includes("poll")) return "Poll Notice";
  if (lower.includes("group")) return "Group Notice";
  if (lower.includes("blocked")) return "Contact Blocked";
  if (variant === "danger") return "Heads Up";
  if (variant === "success") return "Done";
  return "Bubbly";
}

/**
 * Custom styled replacement for window.alert().
 * Supports either bubblyAlert("Message") or bubblyAlert("Title", "Message", { variant }).
 */
export function bubblyAlert(
  titleOrMessage: string,
  message?: string,
  options?: { confirmText?: string; variant?: BubblyDialogVariant }
): Promise<void> {
  const hasMessage = typeof message === "string" && message.length > 0;
  const resolvedMessage = hasMessage ? message! : titleOrMessage;
  const variant = options?.variant ?? inferVariant(`${titleOrMessage} ${resolvedMessage}`);
  const resolvedTitle = hasMessage ? titleOrMessage : inferTitle(titleOrMessage, variant);

  return new Promise((resolve) => {
    dialogQueue.push({
      id: nextDialogId++,
      mode: "alert",
      title: resolvedTitle,
      message: resolvedMessage,
      confirmText: options?.confirmText || "Got it",
      cancelText: "Cancel",
      variant,
      resolve: () => resolve(),
    });
    notifyDialogListeners();
  });
}

/**
 * Custom styled replacement for window.confirm().
 */
export function bubblyConfirm(options: {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: BubblyDialogVariant;
}): Promise<boolean> {
  const variant = options.variant ?? inferVariant(`${options.title} ${options.message}`);
  return new Promise((resolve) => {
    dialogQueue.push({
      id: nextDialogId++,
      mode: "confirm",
      title: options.title,
      message: options.message,
      confirmText: options.confirmText || "Confirm",
      cancelText: options.cancelText || "Cancel",
      variant,
      resolve,
    });
    notifyDialogListeners();
  });
}

export const BubblyDialogHost: React.FC = () => {
  const [, setTick] = useState(0);

  useEffect(() => {
    const update = () => setTick((t) => t + 1);
    listeners.add(update);
    return () => {
      listeners.delete(update);
    };
  }, []);

  const current = dialogQueue[0] ?? null;

  const closeCurrent = (result: boolean) => {
    if (!current) return;
    dialogQueue.shift();
    notifyDialogListeners();
    current.resolve(result);
  };

  useEffect(() => {
    if (!current) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeCurrent(current.mode === "alert");
      } else if (e.key === "Enter") {
        e.preventDefault();
        closeCurrent(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [current?.id]);

  if (!current) return null;

  const isDanger = current.variant === "danger";
  const isSuccess = current.variant === "success";
  const isDelete = /\b(delete|remove)\b/i.test(`${current.title} ${current.message}`);
  const isBlockOrLeave = /\b(block|leave|logout|log out)\b/i.test(`${current.title} ${current.message}`);

  const Icon = isDelete
    ? Trash2
    : isBlockOrLeave
    ? ShieldAlert
    : isDanger
    ? AlertTriangle
    : isSuccess
    ? CheckCircle2
    : current.variant === "info"
    ? Info
    : Sparkles;

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-md flex items-center justify-center p-4 select-none animate-fade-in"
      onClick={() => closeCurrent(current.mode === "alert")}
      role="dialog"
      aria-modal="true"
      aria-labelledby="bubbly-dialog-title"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative w-full max-w-sm rounded-[30px] overflow-hidden bg-white/95 dark:bg-[#1c1917]/95 backdrop-blur-2xl shadow-2xl border p-6 text-center animate-scale-in ${
          isDanger
            ? "border-rose-500/25"
            : isSuccess
            ? "border-emerald-500/25"
            : "border-amber-500/25"
        }`}
      >
        {/* Top Accent Strip */}
        <div
          className={`absolute top-0 inset-x-0 h-1 ${
            isDanger
              ? "bg-gradient-to-r from-rose-400 via-rose-500 to-red-600"
              : isSuccess
              ? "bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-600"
              : "bg-gradient-to-r from-amber-300 via-amber-500 to-amber-600"
          }`}
        />

        {/* Close Icon */}
        <button
          onClick={() => closeCurrent(current.mode === "alert")}
          className="absolute top-3.5 right-3.5 p-1.5 rounded-full text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-black/5 dark:hover:bg-white/10 transition"
          aria-label="Close dialog"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Medallion */}
        <div className="flex justify-center mb-3">
          <div
            className={`w-16 h-16 rounded-full flex items-center justify-center ${
              isDanger
                ? "bg-rose-500/15"
                : isSuccess
                ? "bg-emerald-500/15"
                : "bg-amber-500/15"
            }`}
          >
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center text-white shadow-lg ${
                isDanger
                  ? "bg-gradient-to-br from-rose-400 to-red-600 shadow-rose-500/30"
                  : isSuccess
                  ? "bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-emerald-500/30"
                  : "bg-gradient-to-br from-amber-400 to-amber-600 shadow-amber-500/30"
              }`}
            >
              <Icon className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Badge Pill */}
        <span
          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-[0.14em] uppercase mb-2 ${
            isDanger
              ? "bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400"
              : isSuccess
              ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400"
              : "bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400"
          }`}
        >
          {isDanger ? (current.mode === "confirm" ? "Confirm Action" : "Attention") : isSuccess ? "Success" : "Bubbly"}
        </span>

        <h3
          id="bubbly-dialog-title"
          className="text-lg font-extrabold text-stone-900 dark:text-white leading-snug mb-1.5"
        >
          {current.title}
        </h3>

        <p className="text-xs sm:text-sm text-stone-600 dark:text-zinc-300 leading-relaxed font-medium mb-6 whitespace-pre-wrap">
          {current.message}
        </p>

        {/* Actions */}
        <div className={`flex items-center gap-2.5 ${current.mode === "confirm" ? "" : "justify-center"}`}>
          {current.mode === "confirm" && (
            <button
              onClick={() => closeCurrent(false)}
              className="flex-1 py-2.5 px-4 rounded-full bg-stone-100 hover:bg-stone-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-stone-700 dark:text-zinc-200 font-bold text-xs sm:text-sm border border-stone-200 dark:border-white/10 transition active:scale-95"
            >
              {current.cancelText}
            </button>
          )}
          <button
            onClick={() => closeCurrent(true)}
            className={`flex-1 py-2.5 px-5 rounded-full font-extrabold text-xs sm:text-sm shadow-lg transition active:scale-95 ${
              isDanger
                ? "bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 text-white shadow-rose-500/30"
                : isSuccess
                ? "bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-emerald-500/30"
                : "bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-stone-950 shadow-amber-500/30"
            }`}
          >
            {current.confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
