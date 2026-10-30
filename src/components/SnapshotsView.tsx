import React, { useState } from "react";
import {
  RotateCcw,
  Plus,
  ShieldCheck,
  Calendar,
  Layers,
  HardDrive,
  RefreshCw,
  CheckCircle2,
  X,
} from "lucide-react";
import { SnapshotEntry, SnapshotSupportInfo } from "../types";

interface SnapshotsViewProps {
  supportInfo: SnapshotSupportInfo | null;
  snapshots: SnapshotEntry[];
  loading: boolean;
  onCreateSnapshot: (description: string) => Promise<void>;
  onRefresh: () => Promise<void>;
}

export const SnapshotsView: React.FC<SnapshotsViewProps> = ({
  supportInfo,
  snapshots,
  loading,
  onCreateSnapshot,
  onRefresh,
}) => {
  const [showModal, setShowModal] = useState(false);
  const [desc, setDesc] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      await onCreateSnapshot(desc.trim() || "Punto de restauración manual");
      setShowModal(false);
      setDesc("");
    } finally {
      setIsCreating(false);
    }
  };

  const isBtrfs = supportInfo?.filesystem === "btrfs";
  const backendName = supportInfo?.backend ? supportInfo.backend.toUpperCase() : "BTRFS";

  return (
    <div className="p-8 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-zinc-800/80">
        <div className="flex items-center space-x-3.5">
          <div className="p-3 rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-600 shadow-lg shadow-cyan-500/20 text-white">
            <RotateCcw className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <span>Puntos de Restauración y Snapshots</span>
              <span className="text-xs font-mono font-medium px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
                {backendName}
              </span>
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Instantáneas de seguridad del sistema operativo para proteger tus aplicaciones y datos ante cualquier cambio o actualización.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2.5 shrink-0">
          <button
            onClick={onRefresh}
            className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition"
            title="Recargar instantáneas"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-semibold flex items-center gap-2 transition active:scale-95 shadow-md shadow-cyan-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>Crear Punto de Restauración</span>
          </button>
        </div>
      </div>

      {/* System Status Banner */}
      <div className="p-5 rounded-3xl bg-gradient-to-r from-zinc-900 via-zinc-900/90 to-zinc-950 border border-zinc-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start space-x-4">
          <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white">
                Protección Activa del Sistema ({isBtrfs ? "Btrfs Subvolumes" : supportInfo?.filesystem})
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                Listo para Crear Instantáneas
              </span>
            </div>
            <p className="text-xs text-zinc-300 mt-1 max-w-2xl leading-relaxed">
              Las instantáneas de Btrfs se crean en menos de un segundo gracias al diseño Copy-on-Write (CoW),
              sin ocupar espacio adicional en disco hasta que los archivos del sistema cambian.
            </p>
          </div>
        </div>

        <div className="bg-zinc-950/80 border border-zinc-800 rounded-2xl p-3 px-4 flex items-center space-x-3 shrink-0">
          <HardDrive className="w-5 h-5 text-cyan-400" />
          <div>
            <div className="text-[10px] font-mono text-zinc-400 uppercase">Sistema de Archivos</div>
            <div className="text-xs font-bold text-white font-mono mt-0.5">
              {supportInfo?.filesystem.toUpperCase()} ({backendName})
            </div>
          </div>
        </div>
      </div>

      {/* Snapshot List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            <span>Puntos de Restauración Registrados ({snapshots.length})</span>
          </h4>
          <span className="text-xs text-zinc-500">Ordenados de más reciente a más antiguo</span>
        </div>

        {loading ? (
          <div className="py-20 text-center text-zinc-500 font-mono text-xs">
            Consultando instantáneas con privilegios de sistema...
          </div>
        ) : snapshots.length === 0 ? (
          <div className="py-16 text-center rounded-2xl border border-zinc-800 bg-zinc-950/40 space-y-2">
            <RotateCcw className="w-8 h-8 text-zinc-600 mx-auto" />
            <p className="text-sm font-semibold text-zinc-300">No hay instantáneas manuales registradas</p>
            <p className="text-xs text-zinc-500">
              Pulsa en "Crear Punto de Restauración" para guardar el estado actual antes de instalar software.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {snapshots.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-2xl border border-zinc-800 bg-zinc-900/60 hover:border-zinc-700/80 transition flex items-center justify-between gap-4"
              >
                <div className="flex items-center space-x-3.5 overflow-hidden">
                  <div className="w-9 h-9 rounded-xl bg-zinc-800/80 border border-zinc-700/60 flex items-center justify-center font-bold font-mono text-cyan-400 text-xs shrink-0">
                    {item.num !== undefined ? `#${item.num}` : "SNAP"}
                  </div>
                  <div className="overflow-hidden">
                    <h5 className="text-sm font-bold text-white truncate">{item.description}</h5>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] font-mono text-zinc-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-zinc-500" />
                        {item.date}
                      </span>
                      <span>•</span>
                      <span className="capitalize">{item.snapshot_type}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Guardado</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-5 border-b border-zinc-800 bg-zinc-950/70 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Crear Punto de Restauración</h3>
                  <p className="text-xs text-zinc-400">Instantánea rápida mediante {backendName}</p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  Descripción o Motivo del Punto de Restauración
                </label>
                <input
                  type="text"
                  placeholder="Ej. Antes de actualizar paquetes del sistema"
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <p className="text-[11px] text-zinc-400">
                🔒 El sistema puede solicitar tu contraseña de administrador para registrar la instantánea en el disco raíz.
              </p>

              <div className="pt-3 border-t border-zinc-800 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isCreating}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 text-white text-xs font-semibold shadow-md transition disabled:opacity-50"
                >
                  {isCreating ? "Creando..." : "Crear Instantánea"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
