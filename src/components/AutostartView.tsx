import React, { useState } from "react";
import {
  Rocket,
  Plus,
  Power,
  Clock,
  Terminal,
  Search,
  CheckCircle2,
  XCircle,
  X,
} from "lucide-react";
import { AutostartEntry } from "../types";

interface AutostartViewProps {
  entries: AutostartEntry[];
  loading: boolean;
  onToggle: (id: string, enable: boolean) => Promise<void>;
  onAddCustom: (name: string, exec: string, comment: string) => Promise<void>;
}

export const AutostartView: React.FC<AutostartViewProps> = ({
  entries,
  loading,
  onToggle,
  onAddCustom,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterMode, setFilterMode] = useState<"all" | "enabled" | "disabled">("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newExec, setNewExec] = useState("");
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredEntries = entries.filter((entry) => {
    const matchesSearch =
      entry.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.exec.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.comment.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    if (filterMode === "enabled") return entry.enabled;
    if (filterMode === "disabled") return !entry.enabled;
    return true;
  });

  const enabledCount = entries.filter((e) => e.enabled).length;
  const disabledCount = entries.length - enabledCount;

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newExec.trim()) return;
    setIsSubmitting(true);
    try {
      await onAddCustom(newName.trim(), newExec.trim(), newComment.trim());
      setShowAddModal(false);
      setNewName("");
      setNewExec("");
      setNewComment("");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-zinc-800/80">
        <div className="flex items-center space-x-3.5">
          <div className="p-3 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 shadow-lg shadow-indigo-500/20 text-white">
            <Rocket className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <span>Aplicaciones de Inicio</span>
              <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
                {entries.length} programas
              </span>
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Administra qué aplicaciones y servicios se ejecutan automáticamente al iniciar la sesión de usuario.
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold flex items-center gap-2 transition active:scale-95 shadow-md shadow-blue-500/20 shrink-0 self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Añadir App al Inicio</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-zinc-900/60 border border-zinc-800/80 p-4 rounded-2xl flex items-center space-x-3.5">
          <div className="p-2.5 rounded-xl bg-zinc-800 text-zinc-300">
            <Power className="w-5 h-5 text-zinc-400" />
          </div>
          <div>
            <div className="text-[11px] font-mono text-zinc-400 uppercase">Total Detectadas</div>
            <div className="text-lg font-bold text-white mt-0.5">{entries.length}</div>
          </div>
        </div>

        <div className="bg-zinc-900/60 border border-zinc-800/80 p-4 rounded-2xl flex items-center space-x-3.5">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] font-mono text-emerald-400/80 uppercase">Activas al Inicio</div>
            <div className="text-lg font-bold text-emerald-300 mt-0.5">{enabledCount}</div>
          </div>
        </div>

        <div className="bg-zinc-900/60 border border-zinc-800/80 p-4 rounded-2xl flex items-center space-x-3.5">
          <div className="p-2.5 rounded-xl bg-zinc-800/60 text-zinc-400 border border-zinc-700/40">
            <XCircle className="w-5 h-5 text-zinc-500" />
          </div>
          <div>
            <div className="text-[11px] font-mono text-zinc-400 uppercase">Desactivadas</div>
            <div className="text-lg font-bold text-zinc-400 mt-0.5">{disabledCount}</div>
          </div>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 bg-zinc-900/40 p-3.5 rounded-2xl border border-zinc-800">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre, comando ejecutable o descripción..."
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-4 py-2 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500 transition"
          />
        </div>

        <div className="flex items-center space-x-1.5 shrink-0">
          <button
            onClick={() => setFilterMode("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${
              filterMode === "all"
                ? "bg-blue-600 text-white font-semibold shadow-sm"
                : "bg-zinc-900 text-zinc-400 hover:text-white"
            }`}
          >
            Todas ({entries.length})
          </button>
          <button
            onClick={() => setFilterMode("enabled")}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${
              filterMode === "enabled"
                ? "bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 font-semibold"
                : "bg-zinc-900 text-zinc-400 hover:text-white"
            }`}
          >
            Activas ({enabledCount})
          </button>
          <button
            onClick={() => setFilterMode("disabled")}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${
              filterMode === "disabled"
                ? "bg-zinc-800 text-zinc-200 border border-zinc-700 font-semibold"
                : "bg-zinc-900 text-zinc-400 hover:text-white"
            }`}
          >
            Desactivadas ({disabledCount})
          </button>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="py-20 text-center text-zinc-500 font-mono text-xs">
          Cargando entradas de inicio de sesión...
        </div>
      ) : filteredEntries.length === 0 ? (
        <div className="py-16 text-center rounded-2xl border border-zinc-800 bg-zinc-950/40 space-y-2">
          <Clock className="w-8 h-8 text-zinc-600 mx-auto" />
          <p className="text-sm font-semibold text-zinc-300">No se encontraron entradas de inicio</p>
          <p className="text-xs text-zinc-500">Prueba ajustando el término de búsqueda o el filtro.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredEntries.map((entry) => (
            <div
              key={entry.id}
              className={`p-4 rounded-2xl border bg-zinc-900/60 transition-all duration-200 flex flex-col justify-between ${
                entry.enabled
                  ? "border-zinc-800 hover:border-zinc-700"
                  : "border-zinc-800/40 opacity-70 hover:opacity-100"
              }`}
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center space-x-3 overflow-hidden">
                    <div className="w-10 h-10 rounded-xl bg-zinc-800/80 border border-zinc-700/50 flex items-center justify-center font-bold text-white shrink-0">
                      {entry.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="overflow-hidden">
                      <h4 className="text-sm font-bold text-white truncate" title={entry.name}>
                        {entry.name}
                      </h4>
                      <p className="text-[11px] text-zinc-400 line-clamp-1 mt-0.5">
                        {entry.comment || "Sin descripción"}
                      </p>
                    </div>
                  </div>

                  {/* Toggle Switch */}
                  <button
                    onClick={() => onToggle(entry.id, !entry.enabled)}
                    title={entry.enabled ? "Desactivar inicio automático" : "Activar inicio automático"}
                    className={`w-11 h-6 rounded-full transition-colors duration-200 ease-in-out p-1 shrink-0 relative flex items-center ${
                      entry.enabled ? "bg-emerald-600" : "bg-zinc-800 border border-zinc-700"
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white transition-transform duration-200 ease-in-out shadow-sm ${
                        entry.enabled ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                {/* Command Preview */}
                <div className="mt-3.5 p-2 rounded-xl bg-zinc-950/80 border border-zinc-800/60 flex items-center space-x-2 text-[11px] font-mono text-zinc-400">
                  <Terminal className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                  <span className="truncate text-zinc-300" title={entry.exec}>
                    {entry.exec}
                  </span>
                </div>
              </div>

              {/* Badges footer */}
              <div className="mt-4 pt-3 border-t border-zinc-800/50 flex items-center justify-between text-[11px]">
                <div className="flex items-center space-x-2">
                  <span
                    className={`px-2 py-0.5 rounded font-mono text-[10px] border ${
                      entry.is_system
                        ? "bg-zinc-800 text-zinc-400 border-zinc-700"
                        : "bg-blue-950/30 text-blue-300 border-blue-700/30"
                    }`}
                  >
                    {entry.is_system ? "Sistema (/etc/xdg)" : "Usuario (~/.config)"}
                  </span>
                </div>

                <span className={`font-medium ${entry.enabled ? "text-emerald-400" : "text-zinc-500"}`}>
                  {entry.enabled ? "Inicia con la sesión" : "Desactivado"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Custom Autostart Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-5 border-b border-zinc-800 bg-zinc-950/70 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  <Rocket className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Añadir Aplicación al Inicio</h3>
                  <p className="text-xs text-zinc-400">Crea un atajo en ~/.config/autostart/</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Nombre de la Aplicación *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Discord, Spotify, Conky, Script Personal"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Comando o Ruta Ejecutable *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. /usr/bin/discord --start-minimized"
                  value={newExec}
                  onChange={(e) => setNewExec(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs font-mono text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Descripción u Observaciones (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej. Inicia minimizado en segundo plano"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="pt-3 border-t border-zinc-800 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 text-white text-xs font-semibold shadow-md transition disabled:opacity-50"
                >
                  {isSubmitting ? "Guardando..." : "Guardar e Iniciar con Sesión"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
