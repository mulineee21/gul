import React, { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  X,
  Download,
  CheckCircle2,
  Cpu,
  Globe,
  Zap,
  ShieldCheck,
  FolderUp,
  RefreshCw,
  Sparkles,
  Layers,
  Check,
  PackageCheck,
} from "lucide-react";
import { CatalogItem, InstallOption, OsInfo, SourceType } from "../types";

interface InstallFormatModalProps {
  app: CatalogItem;
  osInfo: OsInfo | null;
  onClose: () => void;
  onInstallFormat: (source: SourceType, pkgId: string, downloadUrl?: string) => Promise<void>;
  onPickLocalAppImage: () => Promise<void>;
  isInstalling: boolean;
  installingFormat: string | null;
}

export const InstallFormatModal: React.FC<InstallFormatModalProps> = ({
  app,
  osInfo,
  onClose,
  onInstallFormat,
  onPickLocalAppImage,
  isInstalling,
  installingFormat,
}) => {
  const [options, setOptions] = useState<InstallOption[]>([]);
  const [loadingOptions, setLoadingOptions] = useState<boolean>(true);
  const [selectedFormat, setSelectedFormat] = useState<SourceType | null>(null);

  useEffect(() => {
    setLoadingOptions(true);
    invoke<InstallOption[]>("get_install_options", {
      appName: app.name,
      canonicalName: app.canonical_name || app.name.toLowerCase(),
      currentPkgId: app.pkg_id || app.id,
    })
      .then((opts) => {
        setOptions(opts);
        // Default selected format to the first non-installed option, or native
        const firstUninstalled = opts.find((o) => !o.is_installed);
        if (firstUninstalled) {
          setSelectedFormat(firstUninstalled.source);
        } else if (opts.length > 0) {
          setSelectedFormat(opts[0].source);
        }
      })
      .catch((err) => {
        console.error("Error fetching installation options:", err);
      })
      .finally(() => {
        setLoadingOptions(false);
      });
  }, [app]);

  const nativeMgrName = osInfo?.native_manager.toUpperCase() || "PACMAN";
  const distroName = osInfo?.distro_name || "Linux";

  const getFormatIcon = (source: SourceType) => {
    switch (source) {
      case "flatpak":
        return <Globe className="w-5 h-5 text-sky-400" />;
      case "appimage":
        return <Zap className="w-5 h-5 text-emerald-400" />;
      case "snap":
        return <PackageCheck className="w-5 h-5 text-orange-400" />;
      default:
        return <Cpu className="w-5 h-5 text-amber-400" />;
    }
  };

  const getFormatColors = (source: SourceType, isSelected: boolean) => {
    switch (source) {
      case "flatpak":
        return {
          border: isSelected ? "border-sky-500 shadow-sky-500/10 shadow-lg" : "border-zinc-800 hover:border-zinc-700",
          headerBg: "bg-sky-500/10",
          accentColor: "text-sky-400",
          badgeBg: "bg-sky-500/20 text-sky-300 border-sky-500/40",
          btnBg: "bg-sky-600 hover:bg-sky-500 text-white shadow-sky-500/20",
        };
      case "appimage":
        return {
          border: isSelected ? "border-emerald-500 shadow-emerald-500/10 shadow-lg" : "border-zinc-800 hover:border-zinc-700",
          headerBg: "bg-emerald-500/10",
          accentColor: "text-emerald-400",
          badgeBg: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
          btnBg: "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-500/20",
        };
      case "snap":
        return {
          border: isSelected ? "border-orange-500 shadow-orange-500/10 shadow-lg" : "border-zinc-800 hover:border-zinc-700",
          headerBg: "bg-orange-500/10",
          accentColor: "text-orange-400",
          badgeBg: "bg-orange-500/20 text-orange-300 border-orange-500/40",
          btnBg: "bg-orange-600 hover:bg-orange-500 text-white shadow-orange-500/20",
        };
      default:
        return {
          border: isSelected ? "border-amber-500 shadow-amber-500/10 shadow-lg" : "border-zinc-800 hover:border-zinc-700",
          headerBg: "bg-amber-500/10",
          accentColor: "text-amber-400",
          badgeBg: "bg-amber-500/20 text-amber-300 border-amber-500/40",
          btnBg: "bg-amber-600 hover:bg-amber-500 text-white shadow-amber-500/20",
        };
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-zinc-900 border border-zinc-800 rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-zinc-800/80 bg-zinc-950/70 flex items-start justify-between">
          <div className="flex items-center space-x-4">
            {app.icon_url ? (
              <img
                src={app.icon_url}
                alt={app.name}
                className="w-16 h-16 rounded-2xl object-contain bg-zinc-950 p-2 border border-zinc-800 shadow-lg shrink-0"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-700 to-indigo-600 border border-blue-500/30 flex items-center justify-center font-bold text-white text-2xl shadow-inner shrink-0">
                {app.name.charAt(0).toUpperCase()}
              </div>
            )}

            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-xl font-bold text-white tracking-tight">{app.name}</h3>
                <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700/60 flex items-center gap-1.5">
                  <Layers className="w-3 h-3 text-blue-400" />
                  Choose Format
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-1 line-clamp-1 max-w-xl">
                {app.summary || "How would you like to install this application on your system?"}
              </p>
              <div className="flex items-center gap-2 mt-2 text-[11px] text-zinc-500 font-mono">
                <span className="text-zinc-400">Detected distribution:</span>
                <span className="text-zinc-200 font-medium bg-zinc-800/60 px-2 py-0.5 rounded border border-zinc-700/50">
                  {distroName} ({nativeMgrName})
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Options Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          <div className="flex items-center justify-between pb-1">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              Available Packaging Options
            </h4>
            <span className="text-xs text-zinc-500">
              Compare performance, isolation, and portability
            </span>
          </div>

          {loadingOptions ? (
            <div className="py-16 flex flex-col items-center justify-center space-y-3">
              <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
              <p className="text-xs text-zinc-400 font-mono">
                Querying {nativeMgrName} repositories, Flathub, and AppImage sources...
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {options.map((option) => {
                const isSelected = selectedFormat === option.source;
                const colors = getFormatColors(option.source, isSelected);
                const isCurrentlyInstalling = isInstalling && installingFormat === option.source;

                return (
                  <div
                    key={option.source}
                    onClick={() => setSelectedFormat(option.source)}
                    className={`relative rounded-2xl border bg-zinc-950/60 p-5 flex flex-col justify-between transition-all duration-200 cursor-pointer ${colors.border} ${
                      isSelected ? "ring-1 ring-offset-2 ring-offset-zinc-900 ring-blue-500/40" : ""
                    }`}
                  >
                    {/* Top Badges */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <div className={`p-2 rounded-xl ${colors.headerBg}`}>
                            {getFormatIcon(option.source)}
                          </div>
                          <div>
                            <span className="text-[11px] font-mono font-semibold uppercase text-zinc-400">
                              {option.badge_label}
                            </span>
                            <h5 className="text-sm font-bold text-white line-clamp-1">
                              {option.source === "pacman" || option.source === "apt" || option.source === "dnf" || option.source === "portage"
                                ? `Native (${nativeMgrName})`
                                : option.source === "flatpak"
                                ? "Flathub Flatpak"
                                : option.source === "snap"
                                ? "Snap Store"
                                : "AppImage"}
                            </h5>
                          </div>
                        </div>

                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-white shrink-0">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        )}
                      </div>

                      {/* Version & Pkg ID */}
                      <div className="mb-3.5 pb-3 border-b border-zinc-800/60">
                        <div className="text-[11px] text-zinc-400 font-mono truncate">
                          ID: <span className="text-zinc-200">{option.pkg_id}</span>
                        </div>
                        <div className="text-[11px] text-zinc-500 font-mono truncate mt-0.5">
                          Version: <span className="text-zinc-300">{option.version}</span>
                        </div>
                      </div>

                      {/* Pros & Advantages */}
                      <div className="space-y-2 mb-4">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500">
                          Advantages
                        </span>
                        {option.pros.map((pro, idx) => (
                          <div key={idx} className="flex items-start space-x-2 text-xs text-zinc-300 leading-snug">
                            <CheckCircle2 className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${colors.accentColor}`} />
                            <span>{pro}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Bottom Status / Action */}
                    <div className="mt-4 pt-3 border-t border-zinc-800/60">
                      {option.is_installed ? (
                        <div className="w-full py-2 px-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center gap-1.5 text-emerald-400 text-xs font-semibold">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Already installed</span>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onInstallFormat(option.source, option.pkg_id, option.download_url);
                          }}
                          disabled={isInstalling}
                          className={`w-full py-2.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition active:scale-95 disabled:opacity-50 shadow-md ${colors.btnBg}`}
                        >
                          {isCurrentlyInstalling ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>Installing...</span>
                            </>
                          ) : (
                            <>
                              <Download className="w-3.5 h-3.5" />
                              <span>
                                Install via{" "}
                                {option.source === "pacman" || option.source === "apt" || option.source === "dnf" || option.source === "portage"
                                  ? nativeMgrName
                                  : option.source === "flatpak"
                                  ? "Flatpak"
                                  : option.source === "snap"
                                  ? "Snap"
                                  : "AppImage"}
                              </span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Local AppImage Integration Banner */}
          <div className="mt-6 p-4 rounded-2xl bg-gradient-to-r from-zinc-950 to-zinc-900 border border-zinc-800 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-3.5">
              <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 shrink-0">
                <FolderUp className="w-5 h-5" />
              </div>
              <div>
                <h5 className="text-xs font-bold text-white">Already downloaded an .AppImage file?</h5>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Select any .AppImage from your disk and GUL will automatically integrate it into your system application menu with its icon.
                </p>
              </div>
            </div>

            <button
              onClick={onPickLocalAppImage}
              disabled={isInstalling}
              className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center gap-2 transition shrink-0 border border-zinc-700/60 active:scale-95 disabled:opacity-50"
            >
              <FolderUp className="w-3.5 h-3.5" />
              <span>Browse local file...</span>
            </button>
          </div>
        </div>

        {/* Footer Advice */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-950/80 flex items-center justify-between text-xs text-zinc-400">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              GUL automatically manages permissions, dependencies, and desktop shortcuts for each format.
            </span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
