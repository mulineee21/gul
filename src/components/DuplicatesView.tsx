import React from "react";
import {
  Copy,
  Sparkles,
  CheckCircle2,
  Trash2,
  HardDrive,
  Shield,
} from "lucide-react";
import { DuplicateGroup } from "../types";
import { formatBytes, getSourceBadgeInfo } from "../utils";

interface DuplicatesViewProps {
  groups: DuplicateGroup[];
  loading: boolean;
  onUninstall: (id: string) => void;
  onKeepRecommended: (recommendedId: string, otherIds: string[]) => void;
}

export const DuplicatesView: React.FC<DuplicatesViewProps> = ({
  groups,
  loading,
  onUninstall,
  onKeepRecommended,
}) => {
  const totalPotentialSavings = groups.reduce(
    (acc, g) => acc + g.potential_savings_bytes,
    0
  );

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-zinc-950 p-6 space-y-6 overflow-y-auto">
      {/* Hero Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-950/40 via-zinc-900/60 to-zinc-900 border border-amber-600/30 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
            <Copy className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              Detector de Aplicaciones Duplicadas
              <span className="text-xs bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30 font-mono">
                {groups.length} grupos encontrados
              </span>
            </h3>
            <p className="text-xs text-zinc-300 mt-1 max-w-xl">
              Identifica programas instalados simultáneamente por diferentes medios (APT/Pacman, Flatpak, Snap, AppImage). OmniPkg evalúa rendimiento, versiones y consumo de disco para recomendarte la mejor opción.
            </p>
          </div>
        </div>

        {totalPotentialSavings > 0 && (
          <div className="text-right bg-zinc-950/60 px-4 py-2.5 rounded-xl border border-zinc-800">
            <span className="text-[11px] text-zinc-400 block">Ahorro potencial de disco</span>
            <span className="text-base font-mono font-bold text-emerald-400">
              +{formatBytes(totalPotentialSavings)}
            </span>
          </div>
        )}
      </div>

      {/* Duplicate Groups list */}
      {loading ? (
        <div className="flex flex-col items-center justify-center h-64 text-zinc-500 space-y-2">
          <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-mono">Analizando duplicados cruzados...</p>
        </div>
      ) : groups.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-72 text-zinc-400 space-y-3 bg-zinc-900/30 rounded-2xl border border-zinc-800/80 p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h4 className="text-base font-semibold text-white">¡No hay aplicaciones duplicadas!</h4>
          <p className="text-xs text-zinc-500 max-w-md">
            Tu sistema está completamente limpio de paquetes redundantes entre gestores. Cada aplicación cuenta con una única fuente de instalación.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {groups.map((group) => {
            const others = group.apps.filter(
              (a) => a.id !== group.recommended_id
            );

            return (
              <div
                key={group.canonical_name}
                className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 space-y-4 hover:border-zinc-700 transition"
              >
                {/* Group Header */}
                <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center font-bold text-white text-base">
                      {group.display_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-white">
                        {group.display_name}
                      </h4>
                      <p className="text-xs text-zinc-500 font-mono">
                        Identificador común: {group.canonical_name} ({group.apps.length} versiones instaladas)
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() =>
                      onKeepRecommended(
                        group.recommended_id,
                        others.map((o) => o.id)
                      )
                    }
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold shadow-md shadow-emerald-500/20 flex items-center gap-2 transition active:scale-95"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Conservar recomendada y limpiar el resto</span>
                  </button>
                </div>

                {/* Recommendation Reason Box */}
                <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-xl p-3 flex items-start space-x-3">
                  <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-emerald-200 leading-relaxed">
                    {group.reason}
                  </p>
                </div>

                {/* Side-by-side cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {group.apps.map((app) => {
                    const isRec = app.id === group.recommended_id;
                    const badge = getSourceBadgeInfo(app.source);

                    return (
                      <div
                        key={app.id}
                        className={`rounded-xl p-4 border flex flex-col justify-between transition ${
                          isRec
                            ? "bg-zinc-900 border-emerald-500/40 shadow-sm"
                            : "bg-zinc-950/50 border-zinc-800/80 opacity-90"
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span
                              className={`text-[10px] font-mono px-2 py-0.5 rounded border ${badge.bgColor} ${badge.textColor} ${badge.borderColor}`}
                            >
                              {badge.label}
                            </span>
                            {isRec ? (
                              <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> RECOMENDADA
                              </span>
                            ) : (
                              <span className="text-[10px] text-zinc-500 font-mono">
                                Versión redundante
                              </span>
                            )}
                          </div>

                          <h5 className="text-sm font-semibold text-white">
                            {app.name}
                          </h5>
                          <p className="text-xs text-zinc-400 font-mono mt-0.5">
                            v{app.version || "Desconocida"}
                          </p>

                          {/* Quick specs */}
                          <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-zinc-800/60 text-xs">
                            <div className="text-zinc-400 flex items-center gap-1.5">
                              <HardDrive className="w-3.5 h-3.5 text-zinc-500" />
                              <span>{formatBytes(app.size_bytes)}</span>
                            </div>
                            <div className="text-zinc-400 flex items-center gap-1.5">
                              <Shield className="w-3.5 h-3.5 text-zinc-500" />
                              <span>{app.is_sandboxed ? "Aislado (Sandbox)" : "Nativo (Host)"}</span>
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="mt-4 pt-3 border-t border-zinc-800/60 flex items-center justify-between">
                          <span className="text-[11px] text-zinc-500 truncate max-w-[200px]">
                            {app.id}
                          </span>

                          <button
                            onClick={() => {
                              if (confirm(`¿Desinstalar ${app.name} (${app.source})?`)) {
                                onUninstall(app.id);
                              }
                            }}
                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                              isRec
                                ? "bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                                : "bg-red-950/40 hover:bg-red-900/50 text-red-400 border border-red-700/30"
                            }`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Desinstalar esta</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
