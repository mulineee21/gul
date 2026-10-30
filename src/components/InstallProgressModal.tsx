import React, { useState, useEffect, useRef } from "react";
import {
  Terminal,
  CheckCircle2,
  AlertTriangle,
  X,
  Play,
  Copy,
  Check,
  RefreshCw,
  Cpu,
  Globe,
  Zap,
  ArrowDownCircle,
  Square,
} from "lucide-react";
import { SourceType } from "../types";

export interface TerminalLogLine {
  text: string;
  isStderr?: boolean;
  time: string;
}

interface InstallProgressModalProps {
  appName: string;
  source: SourceType;
  pkgId: string;
  iconUrl?: string;
  progressPct: number;
  currentStep: string;
  status: "starting" | "running" | "success" | "error" | "cancelled";
  logs: TerminalLogLine[];
  onClose: () => void;
  onCancel: () => void;
  onLaunch?: () => void;
}

export const InstallProgressModal: React.FC<InstallProgressModalProps> = ({
  appName,
  source,
  pkgId,
  iconUrl,
  progressPct,
  currentStep,
  status,
  logs,
  onClose,
  onCancel,
  onLaunch,
}) => {
  const terminalEndRef = useRef<HTMLDivElement | null>(null);
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);

  // Auto-scroll terminal to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, autoScroll]);

  const handleCopyLogs = () => {
    const fullText = logs.map((l) => `[${l.time}] ${l.text}`).join("\n");
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isRunning = status === "starting" || status === "running";
  const isSuccess = status === "success";
  const isError = status === "error" || status === "cancelled";

  const getSourceIcon = () => {
    switch (source) {
      case "flatpak":
        return <Globe className="w-4 h-4 text-sky-400" />;
      case "appimage":
        return <Zap className="w-4 h-4 text-emerald-400" />;
      default:
        return <Cpu className="w-4 h-4 text-amber-400" />;
    }
  };

  const getSourceLabel = () => {
    switch (source) {
      case "flatpak":
        return "Flathub (Flatpak)";
      case "appimage":
        return "AppImage";
      case "snap":
        return "Snap Store";
      default:
        return `Native (${source.toUpperCase()})`;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 px-6 border-b border-zinc-800 bg-zinc-950/80 flex items-center justify-between">
          <div className="flex items-center space-x-3.5">
            {iconUrl ? (
              <img
                src={iconUrl}
                alt={appName}
                className="w-11 h-11 rounded-xl object-contain bg-zinc-950 p-1 border border-zinc-800 shrink-0"
              />
            ) : (
              <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-blue-700 to-indigo-600 flex items-center justify-center font-bold text-white text-lg shrink-0">
                {appName.charAt(0).toUpperCase()}
              </div>
            )}

            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">{appName}</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700 flex items-center gap-1">
                  {getSourceIcon()}
                  <span>{getSourceLabel()}</span>
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 font-mono mt-0.5 truncate max-w-md">
                ID: {pkgId}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Live Status Chip */}
            {isRunning && (
              <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                </span>
                <span className="text-[11px] font-mono font-semibold text-blue-400">
                  Installing Live
                </span>
              </div>
            )}

            {isSuccess && (
              <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Installed</span>
              </div>
            )}

            {isError && (
              <div className="flex items-center space-x-1.5 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/30 text-red-400 text-[11px] font-semibold">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Error</span>
              </div>
            )}

            {!isRunning && (
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Progress Bar Section */}
        <div className="p-5 border-b border-zinc-800/80 bg-zinc-950/40 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-zinc-200 flex items-center gap-2">
              {isRunning && <RefreshCw className="w-3.5 h-3.5 text-blue-400 animate-spin" />}
              {isSuccess && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
              {isError && <AlertTriangle className="w-3.5 h-3.5 text-red-400" />}
              <span>{currentStep || "Processing installation..."}</span>
            </span>
            <span className="font-mono font-bold text-zinc-300">
              {Math.min(100, Math.max(0, Math.round(progressPct)))}%
            </span>
          </div>

          {/* Progress track */}
          <div className="h-3 w-full bg-zinc-950 rounded-full overflow-hidden p-0.5 border border-zinc-800">
            <div
              className={`h-full rounded-full transition-all duration-300 ease-out shadow-sm ${
                isSuccess
                  ? "bg-gradient-to-r from-emerald-500 to-green-400 shadow-emerald-500/30"
                  : isError
                  ? "bg-red-500 shadow-red-500/30"
                  : "bg-gradient-to-r from-blue-600 via-indigo-500 to-sky-400 shadow-blue-500/30"
              }`}
              style={{ width: `${Math.max(4, Math.min(100, progressPct))}%` }}
            />
          </div>

          {isRunning && (
            <p className="text-[11px] text-zinc-400 italic">
              💡 If your system prompts for administrator password (sudo/root), please enter it to proceed with installation.
            </p>
          )}
        </div>

        {/* Real-time Terminal Output */}
        <div className="p-4 flex-1 flex flex-col min-h-0 bg-black/40">
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/90 shadow-2xl flex flex-col flex-1 overflow-hidden">
            {/* Terminal Top Bar */}
            <div className="px-4 py-2 border-b border-zinc-800/80 bg-zinc-950 flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-2">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
                <span className="text-[11px] font-mono text-zinc-400 ml-2 flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-zinc-500" />
                  installation terminal
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setAutoScroll(!autoScroll)}
                  className={`text-[10px] font-mono px-2 py-0.5 rounded border transition flex items-center gap-1 ${
                    autoScroll
                      ? "bg-blue-600/20 text-blue-300 border-blue-500/30"
                      : "bg-zinc-800 text-zinc-400 border-zinc-700"
                  }`}
                  title="Toggle auto-scroll"
                >
                  <ArrowDownCircle className="w-3 h-3" />
                  <span>Auto-scroll: {autoScroll ? "ON" : "OFF"}</span>
                </button>

                <button
                  onClick={handleCopyLogs}
                  className="text-[10px] font-mono px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition flex items-center gap-1"
                  title="Copy terminal output"
                >
                  {copied ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Terminal Log Lines Body */}
            <div className="p-3.5 overflow-y-auto flex-1 font-mono text-[11px] leading-5 space-y-1 select-text h-64 max-h-72">
              {logs.length === 0 ? (
                <div className="text-zinc-500 italic py-6 text-center">
                  Starting process communication...
                </div>
              ) : (
                logs.map((log, index) => {
                  let textColor = "text-zinc-300";
                  if (log.isStderr || log.text.toLowerCase().includes("error") || log.text.toLowerCase().includes("failed")) {
                    textColor = "text-red-400 font-medium";
                  } else if (log.text.startsWith("[GUL]") || log.text.startsWith("[OmniPkg]")) {
                    textColor = "text-blue-400 font-semibold";
                  } else if (log.text.includes("%") || log.text.toLowerCase().includes("downloading")) {
                    textColor = "text-emerald-400";
                  } else if (log.text.toLowerCase().includes("warning")) {
                    textColor = "text-amber-400";
                  }

                  return (
                    <div key={index} className="flex items-start space-x-2">
                      <span className="text-[10px] text-zinc-600 shrink-0 select-none">
                        [{log.time}]
                      </span>
                      <span className={`break-all ${textColor}`}>{log.text}</span>
                    </div>
                  );
                })
              )}
              {isRunning && (
                <div className="flex items-center space-x-1.5 text-blue-400">
                  <span className="animate-pulse">❯</span>
                  <span className="w-2 h-3.5 bg-blue-500 animate-pulse" />
                </div>
              )}
              <div ref={terminalEndRef} />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 px-6 border-t border-zinc-800 bg-zinc-950/80 flex items-center justify-between">
          <div>
            {isRunning && (
              <button
                onClick={onCancel}
                className="px-3.5 py-1.5 rounded-xl bg-red-950/40 hover:bg-red-900/50 text-red-400 border border-red-700/30 text-xs font-semibold flex items-center gap-1.5 transition active:scale-95"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Cancel Process</span>
              </button>
            )}
            {isError && (
              <span className="text-xs text-red-400">
                Installation could not be completed. Check the terminal logs above for details.
              </span>
            )}
            {isSuccess && (
              <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                Application installed successfully and ready to launch!
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2.5">
            {isSuccess && onLaunch && (
              <button
                onClick={onLaunch}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white text-xs font-bold shadow-md shadow-emerald-500/20 flex items-center gap-1.5 transition active:scale-95"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Launch Now</span>
              </button>
            )}

            {!isRunning && (
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-medium transition"
              >
                Close
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
