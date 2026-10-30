import React from "react";
import { RefreshCw, Zap } from "lucide-react";

interface HeaderProps {
  title: string;
  subtitle: string;
  onRefresh: () => void;
  onUpdateAll: () => void;
  loading: boolean;
  updatesCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  onRefresh,
  onUpdateAll,
  loading,
  updatesCount,
}) => {
  return (
    <header className="h-18 px-6 bg-zinc-950/80 backdrop-blur border-b border-zinc-800/80 flex items-center justify-between z-10 shrink-0">
      <div>
        <h2 className="text-lg font-bold text-white tracking-tight">{title}</h2>
        <p className="text-xs text-zinc-400">{subtitle}</p>
      </div>

      <div className="flex items-center space-x-3">
        <button
          onClick={onRefresh}
          disabled={loading}
          title="Reload inventory and refresh system state"
          className="p-2 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800 transition disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-blue-400" : ""}`} />
        </button>

        <button
          onClick={onUpdateAll}
          className="px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-md shadow-blue-500/20 flex items-center gap-2 transition active:scale-95"
        >
          <Zap className="w-3.5 h-3.5" />
          <span>Update All</span>
          {updatesCount > 0 && (
            <span className="bg-white/20 text-white px-1.5 py-0.2 rounded-full font-mono text-[10px]">
              {updatesCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
};
