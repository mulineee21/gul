import React from "react";
import { AlertTriangle, Trash2, X } from "lucide-react";

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "info";
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  const isDanger = variant === "danger";

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        <div className="p-5 flex items-start space-x-4">
          <div
            className={`p-3 rounded-2xl shrink-0 ${
              isDanger
                ? "bg-red-500/10 text-red-400 border border-red-500/20"
                : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
            }`}
          >
            {isDanger ? (
              <Trash2 className="w-6 h-6 stroke-[2.2]" />
            ) : (
              <AlertTriangle className="w-6 h-6 stroke-[2.2]" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h4 className="text-base font-bold text-white tracking-tight">{title}</h4>
            <p className="text-xs text-zinc-300 mt-1.5 leading-relaxed">{message}</p>
          </div>

          <button
            onClick={onCancel}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-3.5 bg-zinc-950/80 border-t border-zinc-800/80 flex items-center justify-end space-x-2.5">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition active:scale-95"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded-xl text-white text-xs font-semibold shadow-md transition active:scale-95 flex items-center gap-1.5 ${
              isDanger
                ? "bg-red-600 hover:bg-red-500 shadow-red-500/20"
                : "bg-amber-600 hover:bg-amber-500 shadow-amber-500/20"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
