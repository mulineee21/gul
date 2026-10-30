import React, { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  Download,
  Upload,
  Copy,
  Check,
  Sparkles,
  X,
  RefreshCw,
  FolderOpen,
} from "lucide-react";
import { OmniProfile } from "../types";

interface BackupProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onStartBatchInstall: (packages: string[], source: string) => void;
  showToast: (msg: string) => void;
}

export const BackupProfileModal: React.FC<BackupProfileModalProps> = ({
  isOpen,
  onClose,
  onStartBatchInstall,
  showToast,
}) => {
  const [activeTab, setActiveTab] = useState<"export" | "import">("export");
  const [currentProfile, setCurrentProfile] = useState<OmniProfile | null>(null);
  const [loadedProfile, setLoadedProfile] = useState<OmniProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      invoke<OmniProfile>("export_system_profile")
        .then((p) => setCurrentProfile(p))
        .catch((e) => console.error("Error cargando perfil:", e))
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopyJson = () => {
    if (currentProfile) {
      navigator.clipboard.writeText(JSON.stringify(currentProfile, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      showToast("¡Perfil copiado al portapapeles!");
    }
  };

  const handleSaveFile = async () => {
    try {
      showToast("Guardando archivo de perfil...");
      const savedPath = await invoke<string>("save_profile_file", { customPath: null });
      showToast(`Perfil guardado con éxito en: ${savedPath}`);
    } catch (e) {
      showToast(`Error al guardar: ${e}`);
    }
  };

  const handleOpenFile = async () => {
    try {
      const p = await invoke<OmniProfile>("load_profile_file", { customPath: null });
      setLoadedProfile(p);
      showToast(`Perfil cargado: ${p.total_apps} aplicaciones detectadas`);
    } catch (e) {
      if (!String(e).includes("cancelada")) {
        showToast(`Error al cargar perfil: ${e}`);
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-zinc-800 bg-zinc-950/80 flex items-center justify-between">
          <div className="flex items-center space-x-3.5">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-600 text-white shadow-lg shadow-orange-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-tight">
                Clonar y Respaldar Sistema (OmniSync)
              </h3>
              <p className="text-xs text-zinc-400">
                Exporta la lista de todas tus apps para restaurarla en otro equipo o tras reinstalar.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-zinc-800 bg-zinc-950/40 px-5 pt-3 text-xs">
          <button
            onClick={() => setActiveTab("export")}
            className={`px-4 py-2 font-semibold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === "export"
                ? "border-amber-500 text-amber-400"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Exportar Perfil Actual</span>
          </button>

          <button
            onClick={() => setActiveTab("import")}
            className={`px-4 py-2 font-semibold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === "import"
                ? "border-amber-500 text-amber-400"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Importar y Restaurar</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {activeTab === "export" && (
            <div className="space-y-4">
              {loading ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-2">
                  <RefreshCw className="w-6 h-6 text-amber-400 animate-spin" />
                  <p className="text-xs font-mono text-zinc-400">Escaneando paquetes explícitos del sistema...</p>
                </div>
              ) : currentProfile ? (
                <>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3.5 rounded-2xl bg-zinc-950/60 border border-zinc-800">
                      <div className="text-[10px] font-mono text-zinc-500 uppercase">Distribución</div>
                      <div className="text-sm font-bold text-white mt-0.5 truncate">{currentProfile.distro}</div>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-zinc-950/60 border border-zinc-800">
                      <div className="text-[10px] font-mono text-zinc-500 uppercase">Paquetes Nativos</div>
                      <div className="text-sm font-bold text-amber-400 mt-0.5 font-mono">
                        {currentProfile.native_packages.length}
                      </div>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-zinc-950/60 border border-zinc-800">
                      <div className="text-[10px] font-mono text-zinc-500 uppercase">Flatpaks</div>
                      <div className="text-sm font-bold text-blue-400 mt-0.5 font-mono">
                        {currentProfile.flatpak_apps.length}
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-zinc-950/90 border border-zinc-800 font-mono text-[11px] text-zinc-400 max-h-48 overflow-y-auto space-y-1">
                    <div className="text-zinc-500 uppercase text-[10px] pb-1 border-b border-zinc-800 font-sans font-bold">
                      Vista previa de paquetes a respaldar ({currentProfile.total_apps})
                    </div>
                    {currentProfile.native_packages.slice(0, 15).map((pkg, idx) => (
                      <div key={idx} className="text-zinc-300">
                        📦 {pkg}
                      </div>
                    ))}
                    {currentProfile.flatpak_apps.slice(0, 10).map((app, idx) => (
                      <div key={idx} className="text-blue-300">
                        🌐 {app}
                      </div>
                    ))}
                    {currentProfile.total_apps > 25 && (
                      <div className="text-zinc-500 italic">... y {currentProfile.total_apps - 25} paquetes más.</div>
                    )}
                  </div>

                  <div className="flex items-center justify-end space-x-3 pt-2">
                    <button
                      onClick={handleCopyJson}
                      className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center gap-1.5 transition active:scale-95"
                    >
                      {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      <span>{copied ? "Copiado" : "Copiar JSON"}</span>
                    </button>

                    <button
                      onClick={handleSaveFile}
                      className="px-5 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-xs font-semibold shadow-md shadow-orange-500/20 flex items-center gap-2 transition active:scale-95"
                    >
                      <Download className="w-4 h-4" />
                      <span>Guardar como omnipkg-perfil.json</span>
                    </button>
                  </div>
                </>
              ) : null}
            </div>
          )}

          {activeTab === "import" && (
            <div className="space-y-4">
              {!loadedProfile ? (
                <div className="p-8 border-2 border-dashed border-zinc-800 rounded-3xl text-center space-y-3 bg-zinc-950/40">
                  <FolderOpen className="w-10 h-10 text-zinc-500 mx-auto" />
                  <div>
                    <h4 className="text-sm font-bold text-white">Cargar archivo de respaldo</h4>
                    <p className="text-xs text-zinc-400 mt-1 max-w-sm mx-auto">
                      Selecciona un archivo <span className="font-mono text-amber-400">omnipkg-perfil.json</span> exportado previamente en este u otro equipo.
                    </p>
                  </div>
                  <button
                    onClick={handleOpenFile}
                    className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold transition active:scale-95 border border-zinc-700"
                  >
                    Examinar archivo JSON...
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">Perfil cargado con éxito</span>
                      <span className="text-[11px] font-mono text-zinc-400">{loadedProfile.export_date}</span>
                    </div>
                    <p className="text-xs text-zinc-300">
                      Origen: <strong className="text-amber-400">{loadedProfile.distro}</strong> ({loadedProfile.native_manager.toUpperCase()}).
                      Contiene <strong className="text-white">{loadedProfile.native_packages.length}</strong> paquetes nativos y{" "}
                      <strong className="text-blue-400">{loadedProfile.flatpak_apps.length}</strong> aplicaciones Flatpak.
                    </p>
                  </div>

                  <div className="flex items-center justify-end space-x-3">
                    <button
                      onClick={() => setLoadedProfile(null)}
                      className="px-3.5 py-1.5 rounded-xl bg-zinc-800 text-zinc-400 hover:text-white text-xs font-medium"
                    >
                      Elegir otro archivo
                    </button>

                    <button
                      onClick={() => {
                        onClose();
                        onStartBatchInstall(loadedProfile.native_packages, loadedProfile.native_manager);
                      }}
                      className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-500/20 flex items-center gap-2 active:scale-95 transition"
                    >
                      <Check className="w-4 h-4" />
                      <span>Reinstalar Todo en Lote</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
