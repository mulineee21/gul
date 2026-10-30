import React, { useState } from "react";
import {
  Trash2,
  CheckCircle2,
  ShieldCheck,
  Terminal,
  Layers,
} from "lucide-react";
import { CleanResult, SystemCleanItem } from "../types";
import { formatBytes } from "../utils";

interface CleanerViewProps {
  items: SystemCleanItem[];
  loading: boolean;
  isCleaning: boolean;
  cleanResult: CleanResult | null;
  onClean: (selectedIds: string[]) => void;
}

export const CleanerView: React.FC<CleanerViewProps> = ({
  items,
  loading,
  isCleaning,
  cleanResult,
  onClean,
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>(items.map((i) => i.id));
  const [showCommands, setShowCommands] = useState(false);

  // Sync initial selection
  React.useEffect(() => {
    if (items.length > 0 && selectedIds.length === 0) {
      setSelectedIds(items.map((i) => i.id));
    }
  }, [items]);

  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((i) => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const selectAll = () => setSelectedIds(items.map((i) => i.id));
  const deselectAll = () => setSelectedIds([]);

  const totalReclaimable = items.reduce((acc, i) => acc + i.size_bytes, 0);
  const selectedReclaimable = items
    .filter((i) => selectedIds.includes(i.id))
    .reduce((acc, i) => acc + i.size_bytes, 0);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-zinc-950 p-6 space-y-6 overflow-y-auto">
      {/* Hero Space Recovery Card */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-teal-950/30 to-zinc-900 border border-emerald-500/30 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl">
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <span className="text-xs bg-emerald-500/20 text-emerald-300 font-mono px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-400" /> System Maintenance & Cleanup
            </span>
          </div>

          <h3 className="text-2xl font-black text-white tracking-tight">
            {formatBytes(totalReclaimable)}{" "}
            <span className="text-zinc-400 font-normal text-base">reclaimable on disk</span>
          </h3>

          <p className="text-xs text-zinc-300 max-w-lg leading-relaxed">
            Safely remove cached .pkg/.deb packages after installation, orphaned dependencies left behind by uninstalled apps, and unused Flatpak runtimes.
          </p>
        </div>

        <div className="flex flex-col items-end gap-2.5 shrink-0">
          <button
            onClick={() => onClean(selectedIds)}
            disabled={isCleaning || selectedIds.length === 0}
            className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-xl shadow-emerald-500/20 flex items-center gap-2.5 transition active:scale-95 disabled:opacity-50"
          >
            <Trash2 className={`w-5 h-5 ${isCleaning ? "animate-pulse" : ""}`} />
            <span>
              {isCleaning
                ? "Cleaning system..."
                : `Reclaim ${formatBytes(selectedReclaimable)}`}
            </span>
          </button>

          <span className="text-[11px] text-zinc-400 font-mono">
            {selectedIds.length} of {items.length} tasks selected
          </span>
        </div>
      </div>

      {/* Clean Result notification if any */}
      {cleanResult && (
        <div
          className={`p-4 rounded-xl border flex items-start space-x-3.5 ${
            cleanResult.success
              ? "bg-emerald-950/30 border-emerald-500/40 text-emerald-200"
              : "bg-red-950/30 border-red-500/40 text-red-200"
          }`}
        >
          <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="space-y-1 overflow-hidden w-full">
            <h5 className="text-sm font-bold">
              {cleanResult.success
                ? `Cleanup complete! Reclaimed ${formatBytes(cleanResult.cleaned_bytes)} of disk space.`
                : "Cleanup completed with some warnings."}
            </h5>
            {cleanResult.output_log && (
              <pre className="text-[11px] font-mono bg-zinc-950/80 p-2.5 rounded-lg border border-zinc-800 text-zinc-300 max-h-32 overflow-y-auto whitespace-pre-wrap">
                {cleanResult.output_log}
              </pre>
            )}
          </div>
        </div>
      )}

      {/* Cleaning Tasks List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-emerald-400" />
            Caches and Items Available for Cleanup
          </h4>

          <div className="flex items-center space-x-3 text-xs">
            <button
              onClick={selectAll}
              className="text-blue-400 hover:text-blue-300 font-medium"
            >
              Select all
            </button>
            <span className="text-zinc-700">|</span>
            <button
              onClick={deselectAll}
              className="text-zinc-500 hover:text-zinc-400"
            >
              Deselect all
            </button>
            <span className="text-zinc-700">|</span>
            <button
              onClick={() => setShowCommands(!showCommands)}
              className="text-zinc-400 hover:text-zinc-200 flex items-center gap-1"
            >
              <Terminal className="w-3 h-3" />
              <span>{showCommands ? "Hide commands" : "Show commands"}</span>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center h-48 text-zinc-500 space-y-2">
            <div className="w-7 h-7 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-mono">Calculating caches and orphaned packages...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="bg-zinc-900/30 border border-zinc-800/80 rounded-2xl p-8 flex flex-col items-center justify-center text-center space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            <h5 className="text-sm font-semibold text-white">Your system is optimized</h5>
            <p className="text-xs text-zinc-500">
              No leftover caches or orphaned packages found at this time.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => {
              const isSelected = selectedIds.includes(item.id);
              return (
                <div
                  key={item.id}
                  onClick={() => toggleSelect(item.id)}
                  className={`bg-zinc-900/50 border rounded-2xl p-4 cursor-pointer transition flex items-start space-x-3.5 ${
                    isSelected
                      ? "border-emerald-500/40 bg-zinc-900/80"
                      : "border-zinc-800/80 opacity-70 hover:opacity-100"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => {}}
                    className="mt-1 w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500 bg-zinc-950 border-zinc-700"
                  />

                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <h5 className="text-sm font-bold text-white">
                          {item.title}
                        </h5>
                        <span className="text-[10px] font-mono uppercase px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 border border-zinc-700">
                          {item.source}
                        </span>
                        {item.requires_sudo && (
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            Requires sudo/polkit
                          </span>
                        )}
                      </div>

                      <span className="text-sm font-mono font-bold text-emerald-400">
                        {formatBytes(item.size_bytes)}
                      </span>
                    </div>

                    <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                      {item.description}
                    </p>

                    {showCommands && (
                      <div className="mt-2.5 p-2 rounded-lg bg-zinc-950 border border-zinc-800 font-mono text-[11px] text-zinc-400 flex items-center gap-2">
                        <Terminal className="w-3 h-3 text-zinc-500 shrink-0" />
                        <span className="truncate">{item.command_preview}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
