import React, { useState } from "react";
import {
  RefreshCw,
  Zap,
  CheckCircle2,
  AlertCircle,
  Terminal,
  Layers,
  ShieldCheck,
} from "lucide-react";
import { UpdateItem, UpdateProgressEvent } from "../types";
import { getSourceBadgeInfo } from "../utils";

interface UpdatesViewProps {
  updates: UpdateItem[];
  loading: boolean;
  activeManagers: string[];
  isUpdating: boolean;
  updateEvents: Record<string, UpdateProgressEvent>;
  onRunUpdates: (selectedManagers: string[], createSnapshot: boolean) => void;
}

export const UpdatesView: React.FC<UpdatesViewProps> = ({
  updates,
  loading,
  activeManagers,
  isUpdating,
  updateEvents,
  onRunUpdates,
}) => {
  const [selectedMgrs, setSelectedMgrs] = useState<string[]>(activeManagers);
  const [createSnapshot, setCreateSnapshot] = useState<boolean>(true);

  const toggleManager = (mgr: string) => {
    if (selectedMgrs.includes(mgr)) {
      setSelectedMgrs(selectedMgrs.filter((m) => m !== mgr));
    } else {
      setSelectedMgrs([...selectedMgrs, mgr]);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-zinc-950 p-6 space-y-6 overflow-y-auto">
      {/* Hero Action Card */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-950/40 via-indigo-950/30 to-zinc-900 border border-blue-500/30 flex flex-col md:flex-row md:items-center justify-between gap-5 shadow-xl">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-white tracking-tight">
              Unified Update Center
            </h3>
            <span className="text-xs bg-blue-500/20 text-blue-300 font-mono px-2 py-0.5 rounded-full border border-blue-500/30">
              {updates.length} pending updates
            </span>
          </div>
          <p className="text-xs text-zinc-300 max-w-xl leading-relaxed">
            Trigger concurrent synchronization and upgrades across all active package managers (Pacman/APT/DNF/Portage, Flatpak, and Snap) from one unified dashboard.
          </p>

          {/* Active Managers Selector */}
          <div className="flex items-center gap-2 pt-2">
            <span className="text-[11px] text-zinc-400">Managers to include:</span>
            {activeManagers.map((mgr) => {
              const checked = selectedMgrs.includes(mgr);
              return (
                <button
                  key={mgr}
                  onClick={() => toggleManager(mgr)}
                  className={`text-[11px] font-mono px-2.5 py-1 rounded-lg border transition ${
                    checked
                      ? "bg-blue-600/30 text-blue-300 border-blue-500/50"
                      : "bg-zinc-900 text-zinc-500 border-zinc-800 line-through"
                  }`}
                >
                  {mgr}
                </button>
              );
            })}
          </div>
          {/* Snapshot before update toggle */}
          <div className="pt-2">
            <label className="flex items-center space-x-2 text-xs text-zinc-300 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={createSnapshot}
                onChange={(e) => setCreateSnapshot(e.target.checked)}
                className="rounded border-zinc-700 bg-zinc-950 text-cyan-500 focus:ring-0 focus:ring-offset-0"
              />
              <span className="flex items-center gap-1.5 font-medium text-cyan-300">
                <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                <span>Create system restore point (Btrfs Snapshot) before updating</span>
              </span>
            </label>
          </div>
        </div>

        <button
          onClick={() => onRunUpdates(selectedMgrs, createSnapshot)}
          disabled={isUpdating || selectedMgrs.length === 0}
          className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold text-sm shadow-xl shadow-blue-500/25 flex items-center justify-center gap-2.5 transition active:scale-95 disabled:opacity-50 shrink-0"
        >
          <Zap className={`w-5 h-5 ${isUpdating ? "animate-bounce" : ""}`} />
          <span>{isUpdating ? "Updating managers..." : "Update All Now"}</span>
        </button>
      </div>

      {/* Real-time Execution Cards if running or ran */}
      {Object.keys(updateEvents).length > 0 && (
        <div className="space-y-3">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
            <Terminal className="w-3.5 h-3.5 text-blue-400" />
            Execution Progress & Streaming Logs
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {Object.entries(updateEvents).map(([mgr, evt]) => {
              const isRunning = evt.status === "running" || evt.status === "starting";
              const isSuccess = evt.status === "success";
              const isError = evt.status === "error";

              return (
                <div
                  key={mgr}
                  className="bg-zinc-900/70 border border-zinc-800 rounded-xl p-4 flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-white">
                      {mgr}
                    </span>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full flex items-center gap-1 ${
                        isRunning
                          ? "bg-blue-500/20 text-blue-300 animate-pulse"
                          : isSuccess
                          ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                          : "bg-red-500/20 text-red-300 border border-red-500/30"
                      }`}
                    >
                      {isRunning && <RefreshCw className="w-2.5 h-2.5 animate-spin" />}
                      {isSuccess && <CheckCircle2 className="w-2.5 h-2.5" />}
                      {isError && <AlertCircle className="w-2.5 h-2.5" />}
                      {evt.status}
                    </span>
                  </div>

                  <div className="bg-zinc-950 p-2.5 rounded-lg border border-zinc-800/80 font-mono text-[11px] text-zinc-300 max-h-36 overflow-y-auto whitespace-pre-wrap">
                    {evt.message}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Pending Updates List */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-zinc-400" />
          Packages with Available Updates
        </h4>

        {loading ? (
          <div className="flex flex-col items-center justify-center h-48 text-zinc-500 space-y-2">
            <div className="w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-mono">Checking for available updates...</p>
          </div>
        ) : updates.length === 0 ? (
          <div className="bg-zinc-900/30 border border-zinc-800/80 rounded-2xl p-8 flex flex-col items-center justify-center text-center space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            <h5 className="text-sm font-semibold text-white">All software is up to date</h5>
            <p className="text-xs text-zinc-500">
              There are no pending updates across your configured package managers.
            </p>
          </div>
        ) : (
          <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl divide-y divide-zinc-800/60 overflow-hidden">
            {updates.map((item) => {
              const badge = getSourceBadgeInfo(item.source);
              return (
                <div
                  key={item.id}
                  className="p-3.5 flex items-center justify-between hover:bg-zinc-900/80 transition"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center font-bold text-white text-xs">
                      {item.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h5 className="text-sm font-semibold text-white">{item.name}</h5>
                      <div className="flex items-center space-x-2 text-xs font-mono text-zinc-400 mt-0.5">
                        <span>{item.current_version}</span>
                        <span>→</span>
                        <span className="text-blue-400 font-bold">{item.new_version}</span>
                      </div>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded border ${badge.bgColor} ${badge.textColor} ${badge.borderColor}`}
                  >
                    {badge.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
