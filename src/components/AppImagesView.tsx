import React, { useState } from "react";
import {
  Box,
  Plus,
  Play,
  Trash2,
  CheckCircle2,
  XCircle,
  Sparkles,
} from "lucide-react";
import { AppImageEntry } from "../types";
import { formatBytes } from "../utils";

interface AppImagesViewProps {
  entries: AppImageEntry[];
  loading: boolean;
  onIntegrate: (path: string) => void;
  onUnintegrate: (path: string) => void;
  onLaunch: (id: string, exec?: string) => void;
  onScanCustomPath: (path: string) => void;
  onDelete: (path: string, name?: string) => void;
}

export const AppImagesView: React.FC<AppImagesViewProps> = ({
  entries,
  loading,
  onIntegrate,
  onUnintegrate,
  onLaunch,
  onScanCustomPath,
  onDelete,
}) => {
  const [customPath, setCustomPath] = useState("");

  const handleAddCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (customPath.trim()) {
      onScanCustomPath(customPath.trim());
      setCustomPath("");
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-zinc-950 p-6 space-y-6 overflow-y-auto">
      {/* Hero Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-950/40 via-zinc-900 to-zinc-900 border border-emerald-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <Box className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              Gestor de Aplicaciones AppImage
              <span className="text-xs bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30 font-mono">
                {entries.length} detectadas
              </span>
            </h3>
            <p className="text-xs text-zinc-300 mt-1 max-w-xl">
              Integra tus ejecutables autónomos .AppImage en el lanzador y menú de tu escritorio Linux con iconos y asociaciones XDG estándar, sin necesidad de herramientas manuales.
            </p>
          </div>
        </div>

        {/* Custom Folder / File Scanner */}
        <form onSubmit={handleAddCustom} className="flex items-center gap-2">
          <input
            type="text"
            value={customPath}
            onChange={(e) => setCustomPath(e.target.value)}
            placeholder="Ruta personalizada (ej. ~/MisApps)"
            className="bg-zinc-900 border border-zinc-800 text-xs text-zinc-200 rounded-xl px-3 py-2 w-56 placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
          />
          <button
            type="submit"
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Escanear</span>
          </button>
        </form>
      </div>

      {/* AppImages List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center h-64 text-zinc-500 space-y-2">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-mono">Escaneando directorios de usuario...</p>
        </div>
      ) : entries.length === 0 ? (
        <div className="bg-zinc-900/30 border border-zinc-800/80 rounded-2xl p-8 flex flex-col items-center justify-center text-center space-y-3">
          <Box className="w-8 h-8 text-zinc-600" />
          <h4 className="text-sm font-semibold text-white">No se encontraron archivos .AppImage</h4>
          <p className="text-xs text-zinc-500 max-w-md">
            Coloca tus archivos .AppImage en <code className="text-zinc-300">~/Applications</code> o <code className="text-zinc-300">~/Downloads</code>, o añade una ruta personalizada arriba para integrarlos automáticamente.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {entries.map((entry) => (
            <div
              key={entry.path}
              className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 flex flex-col justify-between hover:border-zinc-700 transition"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3 overflow-hidden">
                    <div className="w-10 h-10 rounded-xl bg-emerald-950/40 border border-emerald-600/30 flex items-center justify-center font-bold text-emerald-400 text-base">
                      {entry.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="overflow-hidden">
                      <h4 className="text-sm font-bold text-white truncate">
                        {entry.name}
                      </h4>
                      <p className="text-xs font-mono text-zinc-400 truncate">
                        {entry.version ? `v${entry.version} • ` : ""}
                        {formatBytes(entry.size_bytes)}
                      </p>
                    </div>
                  </div>

                  {/* Integration Pill */}
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded-full flex items-center gap-1 border ${
                      entry.is_integrated
                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                        : "bg-zinc-800 text-zinc-400 border-zinc-700"
                    }`}
                  >
                    {entry.is_integrated ? (
                      <>
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        Integrada en menú
                      </>
                    ) : (
                      <>
                        <XCircle className="w-3 h-3 text-zinc-500" />
                        Sin integrar
                      </>
                    )}
                  </span>
                </div>

                <div className="bg-zinc-950/60 rounded-xl p-2.5 border border-zinc-800/80 font-mono text-[11px] text-zinc-400 truncate mb-3">
                  <span className="text-zinc-500">Ruta: </span>
                  <span className="text-zinc-300">{entry.path}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-zinc-800/60 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {entry.is_integrated ? (
                    <button
                      onClick={() => onUnintegrate(entry.path)}
                      className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition"
                    >
                      Quitar del menú
                    </button>
                  ) : (
                    <button
                      onClick={() => onIntegrate(entry.path)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 border border-emerald-500/40 text-xs font-semibold flex items-center gap-1.5 transition active:scale-95"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Integrar en menú (.desktop)</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center space-x-1.5">
                  <button
                    onClick={() => onLaunch(`appimage:${entry.path}`, entry.path)}
                    title="Ejecutar"
                    className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white transition"
                  >
                    <Play className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => {
                      onDelete(entry.path, entry.name);
                    }}
                    title="Eliminar archivo"
                    className="p-2 rounded-lg bg-red-950/40 hover:bg-red-900/50 text-red-400 border border-red-800/30 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
