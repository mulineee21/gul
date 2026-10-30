import React, { useState, useMemo } from "react";
import {
  Search,
  ArrowUpDown,
  Play,
  Trash2,
  HardDrive,
  Copy,
  Info,
  Monitor,
  Package,
} from "lucide-react";
import { AppInfo, SourceType } from "../types";
import { formatBytes, getSourceBadgeInfo } from "../utils";

interface AppsViewProps {
  desktopApps: AppInfo[];
  allPackages: AppInfo[];
  loading: boolean;
  onSelectApp: (app: AppInfo) => void;
  onLaunch: (id: string, exec?: string) => void;
  onUninstall: (id: string, name?: string) => void;
}

export const AppsView: React.FC<AppsViewProps> = ({
  desktopApps,
  allPackages,
  loading,
  onSelectApp,
  onLaunch,
  onUninstall,
}) => {
  const [viewMode, setViewMode] = useState<"desktop" | "all">("desktop");
  const [search, setSearch] = useState("");
  const [selectedSource, setSelectedSource] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"size" | "name" | "duplicates">("name");

  const currentDataset = viewMode === "desktop" ? desktopApps : allPackages;

  const sourcesList = useMemo(() => {
    const set = new Set<string>();
    currentDataset.forEach((a) => set.add(a.source));
    return Array.from(set);
  }, [currentDataset]);

  const filteredApps = useMemo(() => {
    return currentDataset
      .filter((app) => {
        const matchesSearch =
          app.name.toLowerCase().includes(search.toLowerCase()) ||
          app.canonical_name.toLowerCase().includes(search.toLowerCase()) ||
          app.description.toLowerCase().includes(search.toLowerCase());

        const matchesSource =
          selectedSource === "all" || app.source === selectedSource;

        return matchesSearch && matchesSource;
      })
      .sort((a, b) => {
        if (sortBy === "size") {
          return b.size_bytes - a.size_bytes;
        }
        if (sortBy === "name") {
          return a.name.localeCompare(b.name);
        }
        if (sortBy === "duplicates") {
          if (a.is_duplicate && !b.is_duplicate) return -1;
          if (!a.is_duplicate && b.is_duplicate) return 1;
          return b.size_bytes - a.size_bytes;
        }
        return 0;
      });
  }, [currentDataset, search, selectedSource, sortBy]);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-zinc-950">
      {/* Top Filter and Search Bar */}
      <div className="p-5 border-b border-zinc-800/80 bg-zinc-900/30 space-y-3.5">
        {/* Mode Selector Header */}
        <div className="flex items-center justify-between pb-1 flex-wrap gap-2">
          <div className="flex items-center bg-zinc-950 p-1 rounded-xl border border-zinc-800">
            <button
              onClick={() => {
                setViewMode("desktop");
                setSelectedSource("all");
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition ${
                viewMode === "desktop"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              <span>Apps de Escritorio ({desktopApps.length})</span>
            </button>

            <button
              onClick={() => {
                setViewMode("all");
                setSelectedSource("all");
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition ${
                viewMode === "all"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>Todos los Paquetes del Sistema ({allPackages.length})</span>
            </button>
          </div>

          <span className="text-xs text-zinc-400 font-mono">
            {filteredApps.length} de {currentDataset.length} mostradas
          </span>
        </div>

        <div className="flex items-center justify-between gap-4">
          {/* Search box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                viewMode === "desktop"
                  ? "Buscar por nombre de app (ej. Chrome, VS Code, OBS, Alacritty, Spotify)..."
                  : "Buscar paquetes del sistema (ej. gcc, python, libx11)..."
              }
              className="w-full bg-zinc-900/90 border border-zinc-800 rounded-xl pl-10 pr-4 py-2 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500/70 focus:ring-1 focus:ring-blue-500/50 transition"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500 hover:text-zinc-300"
              >
                Limpiar
              </button>
            )}
          </div>

          {/* Sort selector */}
          <div className="flex items-center space-x-2 shrink-0">
            <ArrowUpDown className="w-4 h-4 text-zinc-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 rounded-lg px-2.5 py-2 focus:outline-none focus:border-blue-500"
            >
              <option value="name">Alfabético (A - Z)</option>
              <option value="size">Mayor tamaño en disco</option>
              <option value="duplicates">Duplicados primero</option>
            </select>
          </div>
        </div>

        {/* Source Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <button
            onClick={() => setSelectedSource("all")}
            className={`px-3 py-1 rounded-full font-medium transition ${
              selectedSource === "all"
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800"
            }`}
          >
            Todos ({currentDataset.length})
          </button>
          {sourcesList.map((src) => {
            const count = currentDataset.filter((a) => a.source === src).length;
            const badge = getSourceBadgeInfo(src as SourceType);
            const isSelected = selectedSource === src;
            return (
              <button
                key={src}
                onClick={() => setSelectedSource(src)}
                className={`px-3 py-1 rounded-full font-medium transition flex items-center gap-1.5 ${
                  isSelected
                    ? "bg-zinc-100 text-zinc-950 font-bold"
                    : "bg-zinc-900/80 text-zinc-400 hover:text-zinc-200 border border-zinc-800"
                }`}
              >
                <span>{badge.label}</span>
                <span className="text-[10px] opacity-75 font-mono">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Apps List / Grid */}
      <div className="flex-1 overflow-y-auto p-5">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 text-zinc-500 space-y-3">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-mono">Escaneando aplicaciones instaladas...</p>
          </div>
        ) : filteredApps.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-zinc-500 space-y-2">
            <Info className="w-8 h-8 stroke-1" />
            <p className="text-sm font-medium">No se encontraron aplicaciones con ese filtro</p>
            <p className="text-xs text-zinc-600">Prueba ajustando los términos de búsqueda</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {filteredApps.map((app) => {
              const badge = getSourceBadgeInfo(app.source);
              return (
                <div
                  key={app.id}
                  onClick={() => onSelectApp(app)}
                  className={`group relative bg-zinc-900/70 hover:bg-zinc-900 border rounded-2xl p-4 transition-all duration-200 cursor-pointer hover:shadow-lg flex flex-col justify-between ${
                    app.is_duplicate
                      ? "border-amber-500/30 hover:border-amber-500/60"
                      : "border-zinc-800/80 hover:border-zinc-700"
                  }`}
                >
                  <div>
                    {/* Header: Icon + Name + Badges */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center space-x-3 overflow-hidden">
                        {app.icon ? (
                          <img
                            src={app.icon}
                            alt={app.name}
                            onError={(e) => {
                              (e.target as HTMLElement).style.display = "none";
                            }}
                            className="w-10 h-10 rounded-xl object-contain bg-zinc-950 p-1 border border-zinc-800 shrink-0 shadow-sm"
                          />
                        ) : null}
                        <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700/60 flex items-center justify-center font-bold text-white text-base shrink-0 shadow-inner">
                          {app.name.charAt(0).toUpperCase()}
                        </div>

                        <div className="overflow-hidden">
                          <h4 className="text-sm font-semibold text-white truncate group-hover:text-blue-400 transition" title={app.name}>
                            {app.name}
                          </h4>
                          <p className="text-[11px] font-mono text-zinc-500 truncate">
                            {app.canonical_name} {app.version ? `• ${app.version}` : ""}
                          </p>
                        </div>
                      </div>

                      <div className="shrink-0 flex flex-col items-end gap-1">
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded border ${badge.bgColor} ${badge.textColor} ${badge.borderColor}`}
                        >
                          {badge.label.split(" ")[0]}
                        </span>
                        {app.is_duplicate && (
                          <span
                            title="Esta app tiene otra versión instalada con otro gestor"
                            className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-0.5"
                          >
                            <Copy className="w-2.5 h-2.5" /> Duplicado
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Brief description */}
                    {app.description && (
                      <p className="text-xs text-zinc-400 line-clamp-2 mt-1 leading-relaxed">
                        {app.description}
                      </p>
                    )}
                  </div>

                  {/* Footer: Disk size + Sandboxing + Quick action */}
                  <div className="mt-4 pt-3 border-t border-zinc-800/60 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <HardDrive className="w-3.5 h-3.5 text-zinc-500" />
                      <span className="text-xs font-mono font-medium text-zinc-200">
                        {formatBytes(app.size_bytes)}
                      </span>
                      <span
                        className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${
                          app.is_sandboxed
                            ? "bg-emerald-950/40 text-emerald-400 border border-emerald-800/30"
                            : "bg-zinc-800 text-zinc-400"
                        }`}
                      >
                        {app.is_sandboxed ? "Aislado" : "Nativo"}
                      </span>
                    </div>

                    <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onLaunch(app.id, app.exec_path);
                        }}
                        title="Iniciar aplicación"
                        className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-300 hover:text-white"
                      >
                        <Play className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onUninstall(app.id, app.name);
                        }}
                        title="Desinstalar"
                        className="p-1.5 rounded-lg hover:bg-red-950/40 text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
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
