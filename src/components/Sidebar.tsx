import React from "react";
import {
  Layers,
  Compass,
  Copy,
  RefreshCw,
  Box,
  Trash2,
  HardDrive,
  Rocket,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { OsInfo, SystemOverview } from "../types";
import { formatBytes } from "../utils";

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  overview: SystemOverview | null;
  osInfo: OsInfo | null;
  loading?: boolean;
  onOpenCloneModal?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  overview,
  osInfo,
  onOpenCloneModal,
}) => {
  const navItems = [
    {
      id: "apps",
      label: "Aplicaciones",
      icon: Layers,
      count: overview?.total_apps,
      badgeColor: "bg-zinc-800 text-zinc-300",
    },
    {
      id: "store",
      label: "Tienda / Flathub",
      icon: Compass,
      count: undefined,
      badgeColor: "bg-blue-500/20 text-blue-300 border border-blue-500/30 font-mono",
    },
    {
      id: "duplicates",
      label: "Duplicados",
      icon: Copy,
      count: overview?.duplicates_count,
      badgeColor:
        overview && overview.duplicates_count > 0
          ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
          : "bg-zinc-800 text-zinc-500",
    },
    {
      id: "updates",
      label: "Actualizaciones",
      icon: RefreshCw,
      count: overview?.updates_available,
      badgeColor:
        overview && overview.updates_available > 0
          ? "bg-blue-500/20 text-blue-400 border border-blue-500/40 animate-pulse"
          : "bg-zinc-800 text-zinc-500",
    },
    {
      id: "autostart",
      label: "Inicio (Autostart)",
      icon: Rocket,
      count: undefined,
      badgeColor: "bg-zinc-800 text-zinc-300",
    },
    {
      id: "snapshots",
      label: "Puntos / Snapshots",
      icon: RotateCcw,
      count: undefined,
      badgeColor: "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-mono",
    },
    {
      id: "appimages",
      label: "AppImages",
      icon: Box,
      count: undefined,
      badgeColor: "bg-zinc-800 text-zinc-300",
    },
    {
      id: "cleaner",
      label: "Limpiador",
      icon: Trash2,
      count: overview?.reclaimable_bytes
        ? formatBytes(overview.reclaimable_bytes, 1)
        : undefined,
      badgeColor:
        overview && overview.reclaimable_bytes > 0
          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
          : "bg-zinc-800 text-zinc-500",
    },
  ];

  return (
    <aside className="w-64 bg-zinc-950 border-r border-zinc-800/80 flex flex-col justify-between select-none">
      <div>
        {/* Brand Header */}
        <div className="p-5 flex items-center space-x-3 border-b border-zinc-800/60">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Layers className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-wide flex items-center gap-1.5">
              OmniPkg
              <span className="text-[10px] bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded border border-blue-500/30 font-mono">
                Linux
              </span>
            </h1>
            <p className="text-xs text-zinc-400">Gestor Universal</p>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentTab(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? "bg-blue-600/15 text-blue-400 border border-blue-500/30 shadow-sm"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon
                    className={`w-4 h-4 ${
                      isActive ? "text-blue-400" : "text-zinc-500"
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {item.count !== undefined && (
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-mono ${item.badgeColor}`}
                  >
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Clone System Quick Button */}
        {onOpenCloneModal && (
          <div className="px-3 pt-2">
            <button
              onClick={onOpenCloneModal}
              className="w-full p-2.5 rounded-xl bg-gradient-to-r from-amber-600/20 to-orange-600/20 hover:from-amber-600/30 hover:to-orange-600/30 text-amber-300 border border-amber-500/30 text-xs font-semibold flex items-center justify-between transition group"
            >
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
                <span>Clonar mi Sistema</span>
              </div>
              <span className="text-[10px] bg-amber-500/20 text-amber-200 px-1.5 py-0.5 rounded font-mono">
                Sync
              </span>
            </button>
          </div>
        )}
      </div>

      {/* System Footer info */}
      <div className="p-4 border-t border-zinc-800/60 bg-zinc-900/40">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5 truncate max-w-[170px]" title={osInfo?.distro_name || overview?.distro_name}>
            <HardDrive className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
            <span className="truncate">{osInfo?.distro_name || overview?.distro_name || "Linux"}</span>
          </span>
          <span className="flex h-2 w-2 relative shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
        </div>

        {/* Detected OS & Managers Chips */}
        <div className="flex flex-wrap gap-1 mt-2">
          {osInfo?.native_manager && (
            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/30">
              {osInfo.native_manager}
            </span>
          )}
          {osInfo?.has_flathub && (
            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/30">
              Flathub
            </span>
          )}
          {osInfo?.has_snap && (
            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-300 border border-orange-500/30">
              Snap
            </span>
          )}
        </div>

        {overview?.total_disk_used_bytes ? (
          <div className="mt-3 pt-2.5 border-t border-zinc-800/60 flex items-center justify-between text-xs text-zinc-400">
            <span>Espacio apps:</span>
            <span className="font-mono text-zinc-200 font-medium">
              {formatBytes(overview.total_disk_used_bytes)}
            </span>
          </div>
        ) : null}
      </div>
    </aside>
  );
};
