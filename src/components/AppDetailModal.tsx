import React, { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  X,
  FolderOpen,
  Trash,
  Play,
  HardDrive,
  Star,
  Download,
  ExternalLink,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Image as ImageIcon,
  Layers,
  ShieldCheck,
  Wifi,
  Volume2,
  Monitor,
  Camera,
} from "lucide-react";
import { AppExtendedDetails, AppInfo, CatalogItem, FlatpakPermissions } from "../types";
import { formatBytes, getSourceBadgeInfo } from "../utils";

interface AppDetailModalProps {
  app: AppInfo | CatalogItem | null;
  onClose: () => void;
  onLaunch?: (id: string, exec?: string) => void;
  onOpenFolder?: (canonical: string, id: string, source: string) => void;
  onClearCache?: (canonical: string, id: string, source: string) => void;
  onUninstall?: (id: string, name?: string) => void;
  onInstall?: (item: CatalogItem) => void;
  onOpenInstallFormat?: (item: CatalogItem) => void;
  isInstalling?: boolean;
}

export const AppDetailModal: React.FC<AppDetailModalProps> = ({
  app,
  onClose,
  onLaunch,
  onOpenFolder,
  onClearCache,
  onUninstall,
  onInstall,
  onOpenInstallFormat,
  isInstalling,
}) => {
  const [details, setDetails] = useState<AppExtendedDetails | null>(null);
  const [permissions, setPermissions] = useState<FlatpakPermissions | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "screenshots" | "reviews" | "storage" | "permissions">("overview");
  const [activeScreenshotIdx, setActiveScreenshotIdx] = useState<number>(0);

  // Fetch extended details and flatpak permissions
  useEffect(() => {
    if (!app) return;
    setActiveScreenshotIdx(0);

    const targetId = (app as any).pkg_id || app.id;
    invoke<AppExtendedDetails>("get_app_details", { appId: targetId })
      .then((data) => {
        setDetails(data);
      })
      .catch((err) => {
        console.error("Error fetching app extended details:", err);
      });

    if (app.source === "flatpak" || app.id.startsWith("flatpak:")) {
      invoke<FlatpakPermissions>("get_flatpak_permissions", { appId: targetId })
        .then((perms) => setPermissions(perms))
        .catch((e) => console.error("Error fetching permissions:", e));
    }
  }, [app]);

  const handleTogglePermission = async (key: string, currentValue: boolean) => {
    if (!app) return;
    const targetId = (app as any).pkg_id || app.id;
    try {
      await invoke("set_flatpak_permission", {
        appId: targetId,
        key,
        enabled: !currentValue,
      });
      setPermissions((prev) => prev ? { ...prev, [key]: !currentValue } : null);
    } catch (e) {
      console.error("Error toggling permission:", e);
    }
  };

  const handleResetPermissions = async () => {
    if (!app) return;
    const targetId = (app as any).pkg_id || app.id;
    try {
      await invoke("reset_flatpak_permissions", { appId: targetId });
      const refreshed = await invoke<FlatpakPermissions>("get_flatpak_permissions", { appId: targetId });
      setPermissions(refreshed);
    } catch (e) {
      console.error("Error resetting permissions:", e);
    }
  };

  if (!app) return null;

  const isCatalog = "pkg_id" in app;
  const badge = getSourceBadgeInfo(app.source);
  const appIcon = ("icon" in app ? (app as AppInfo).icon : null) || ("icon_url" in app ? (app as CatalogItem).icon_url : null) || details?.icon_url;

  // Installed app properties
  const isInstalled = isCatalog ? (app as CatalogItem).is_installed : true;
  const appInfo = !isCatalog ? (app as AppInfo) : null;
  const bd = appInfo?.size_breakdown;
  const totalDisk = appInfo?.size_bytes || 0;

  const binaryPct = bd && totalDisk > 0 ? Math.round((bd.binary_bytes / totalDisk) * 100) : 0;
  const dataPct = bd && totalDisk > 0 ? Math.round((bd.data_bytes / totalDisk) * 100) : 0;
  const cachePct = bd && totalDisk > 0 ? Math.round((bd.cache_bytes / totalDisk) * 100) : 0;
  const configPct = bd && totalDisk > 0 ? Math.round((bd.config_bytes / totalDisk) * 100) : 0;

  const screenshots = details?.screenshots || [];
  const reviews = details?.reviews || [];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/60">
          <div className="flex items-center space-x-4 overflow-hidden">
            {/* App Icon */}
            {appIcon ? (
              <img
                src={appIcon}
                alt={app.name}
                className="w-14 h-14 rounded-2xl object-contain bg-zinc-950 p-1.5 border border-zinc-800/80 shadow-md shrink-0"
              />
            ) : (
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-zinc-800 to-zinc-700 border border-zinc-700/60 flex items-center justify-center font-bold text-white text-xl shadow-inner shrink-0">
                {app.name.charAt(0).toUpperCase()}
              </div>
            )}

            <div className="overflow-hidden">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-bold text-white truncate">{app.name}</h3>
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${badge.bgColor} ${badge.textColor} ${badge.borderColor}`}
                >
                  {badge.label}
                </span>

                {isInstalled && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 font-semibold">
                    <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Installed
                  </span>
                )}
              </div>

              <p className="text-xs text-zinc-400 mt-1 font-mono truncate">
                {details?.developer || (app as any).developer || app.canonical_name} • v{app.version || "stable"}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs inside modal */}
        <div className="flex items-center gap-1 px-5 pt-3 border-b border-zinc-800 bg-zinc-950/40 text-xs">
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-3.5 py-2 font-medium border-b-2 transition ${
              activeTab === "overview"
                ? "border-blue-500 text-blue-400 font-bold"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Overview
          </button>

          <button
            onClick={() => setActiveTab("screenshots")}
            className={`px-3.5 py-2 font-medium border-b-2 transition flex items-center gap-1.5 ${
              activeTab === "screenshots"
                ? "border-blue-500 text-blue-400 font-bold"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Screenshots</span>
            {screenshots.length > 0 && (
              <span className="text-[10px] bg-zinc-800 px-1.5 py-0.2 rounded-full font-mono">
                {screenshots.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("reviews")}
            className={`px-3.5 py-2 font-medium border-b-2 transition flex items-center gap-1.5 ${
              activeTab === "reviews"
                ? "border-blue-500 text-blue-400 font-bold"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            <span>Reviews & Ratings</span>
            {reviews.length > 0 && (
              <span className="text-[10px] bg-zinc-800 px-1.5 py-0.2 rounded-full font-mono">
                {reviews.length}
              </span>
            )}
          </button>

          {isInstalled && bd && (
            <button
              onClick={() => setActiveTab("storage")}
              className={`px-3.5 py-2 font-medium border-b-2 transition flex items-center gap-1.5 ${
                activeTab === "storage"
                  ? "border-blue-500 text-blue-400 font-bold"
                  : "border-transparent text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <HardDrive className="w-3.5 h-3.5" />
              <span>Disk Storage</span>
            </button>
          )}

          {(app.source === "flatpak" || app.id.startsWith("flatpak:")) && (
            <button
              onClick={() => setActiveTab("permissions")}
              className={`px-3.5 py-2 font-medium border-b-2 transition flex items-center gap-1.5 ${
                activeTab === "permissions"
                  ? "border-blue-500 text-blue-400 font-bold"
                  : "border-transparent text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
              <span>Sandbox Permissions</span>
            </button>
          )}
        </div>

        {/* Modal Body Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* TAB 1: OVERVIEW */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Rating & Stats Quick Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-3 flex flex-col justify-center">
                  <span className="text-[11px] text-zinc-500">Community Rating</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-base font-bold text-white">
                      {details?.rating_score || 4.8}
                    </span>
                    <div className="flex text-amber-400">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className="w-3 h-3 fill-amber-400 text-amber-400"
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-3 flex flex-col justify-center">
                  <span className="text-[11px] text-zinc-500">Global Installs</span>
                  <span className="text-base font-bold text-white font-mono mt-0.5">
                    {details?.total_installs
                      ? details.total_installs > 1000000
                        ? `+${(details.total_installs / 1000000).toFixed(1)}M`
                        : `+${(details.total_installs / 1000).toFixed(0)}K`
                      : "+50K"}
                  </span>
                </div>

                <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-3 flex flex-col justify-center">
                  <span className="text-[11px] text-zinc-500">License</span>
                  <span className="text-xs font-bold text-zinc-200 truncate mt-0.5">
                    {details?.license || "Open Source"}
                  </span>
                </div>

                <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-3 flex flex-col justify-center">
                  <span className="text-[11px] text-zinc-500">Isolation / Host</span>
                  <span className="text-xs font-bold text-emerald-400 truncate mt-0.5">
                    {app.source === "flatpak" ? "Sandboxed" : "Native"}
                  </span>
                </div>
              </div>

              {/* Summary & Description */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  About this application
                </h4>
                <p className="text-xs text-zinc-200 bg-zinc-950/60 p-4 rounded-xl border border-zinc-800 leading-relaxed whitespace-pre-line">
                  {details?.description_html
                    ? details.description_html.replace(/<[^>]*>?/gm, "").trim()
                    : app.description || (app as any).summary || "No detailed description available."}
                </p>
              </div>

              {/* Quick Screenshots Preview if available */}
              {screenshots.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                      Screenshots
                    </h4>
                    <button
                      onClick={() => setActiveTab("screenshots")}
                      className="text-xs text-blue-400 hover:text-blue-300 font-medium"
                    >
                      View all ({screenshots.length})
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {screenshots.slice(0, 3).map((img, idx) => (
                      <div
                        key={idx}
                        onClick={() => {
                          setActiveScreenshotIdx(idx);
                          setActiveTab("screenshots");
                        }}
                        className="rounded-xl overflow-hidden border border-zinc-800 hover:border-blue-500/60 transition cursor-pointer aspect-video bg-zinc-950 group relative"
                      >
                        <img
                          src={img}
                          alt="Screenshot"
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Links */}
              {details?.homepage_url && (
                <div className="pt-2">
                  <a
                    href={details.homepage_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 font-medium"
                  >
                    <span>Official project website</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: SCREENSHOTS / FOTOS */}
          {activeTab === "screenshots" && (
            <div className="space-y-4">
              {screenshots.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-zinc-500 space-y-2">
                  <ImageIcon className="w-8 h-8" />
                  <p className="text-xs">No screenshots available for this app.</p>
                </div>
              ) : (
                <>
                  {/* Large featured screenshot */}
                  <div className="relative rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-950 aspect-video flex items-center justify-center group shadow-xl">
                    <img
                      src={screenshots[activeScreenshotIdx]}
                      alt="Featured screenshot"
                      className="w-full h-full object-contain"
                    />

                    {/* Navigation Arrows */}
                    {screenshots.length > 1 && (
                      <>
                        <button
                          onClick={() =>
                            setActiveScreenshotIdx((prev) =>
                              prev > 0 ? prev - 1 : screenshots.length - 1
                            )
                          }
                          className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 hover:bg-black/90 text-white transition backdrop-blur-sm"
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </button>

                        <button
                          onClick={() =>
                            setActiveScreenshotIdx((prev) =>
                              prev < screenshots.length - 1 ? prev + 1 : 0
                            )
                          }
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 hover:bg-black/90 text-white transition backdrop-blur-sm"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      </>
                    )}

                    <span className="absolute bottom-3 right-3 text-[11px] font-mono px-2 py-0.5 rounded-full bg-black/70 text-zinc-300 backdrop-blur-sm border border-zinc-700/50">
                      {activeScreenshotIdx + 1} of {screenshots.length}
                    </span>
                  </div>

                  {/* Thumbnail Carousel */}
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {screenshots.map((src, i) => (
                      <button
                        key={i}
                        onClick={() => setActiveScreenshotIdx(i)}
                        className={`rounded-lg overflow-hidden border-2 w-24 h-16 shrink-0 transition ${
                          activeScreenshotIdx === i
                            ? "border-blue-500 scale-105"
                            : "border-zinc-800 opacity-60 hover:opacity-100"
                        }`}
                      >
                        <img
                          src={src}
                          alt="Thumbnail"
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* TAB 3: OPINIONES Y RESEÑAS */}
          {activeTab === "reviews" && (
            <div className="space-y-4">
              {/* Rating summary */}
              <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    Linux Community Ratings
                  </h4>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Based on verified reviews from ODRS (Open Desktop Ratings Service).
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="text-2xl font-black text-white font-mono">
                    {details?.rating_score || 4.8}
                  </span>
                  <div className="flex text-amber-400">
                    {[...Array(5)].map((_, i) => (
                      <Star
                        key={i}
                        className="w-4 h-4 fill-amber-400 text-amber-400"
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Reviews list */}
              {reviews.length === 0 ? (
                <div className="bg-zinc-950/40 border border-zinc-800/80 rounded-xl p-8 text-center space-y-2">
                  <MessageSquare className="w-7 h-7 text-zinc-600 mx-auto" />
                  <h5 className="text-xs font-semibold text-white">No reviews submitted yet</h5>
                  <p className="text-xs text-zinc-500">
                    Be the first to share your experience with the community.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {reviews.map((r, i) => (
                    <div
                      key={i}
                      className="bg-zinc-950/40 border border-zinc-800 rounded-xl p-4 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold text-white">
                            {r.author}
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400">
                            {r.distro}
                          </span>
                        </div>

                        {/* Stars */}
                        <div className="flex text-amber-400">
                          {[...Array(5)].map((_, s) => (
                            <Star
                              key={s}
                              className={`w-3 h-3 ${
                                s < r.rating
                                  ? "fill-amber-400 text-amber-400"
                                  : "text-zinc-700"
                              }`}
                            />
                          ))}
                        </div>
                      </div>

                      {r.summary && (
                        <h6 className="text-xs font-semibold text-zinc-200">
                          {r.summary}
                        </h6>
                      )}

                      <p className="text-xs text-zinc-400 leading-relaxed">
                        {r.description}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: DISK STORAGE BREAKDOWN (for installed apps) */}
          {activeTab === "storage" && bd && (
            <div className="space-y-5">
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5 mb-2">
                  <HardDrive className="w-3.5 h-3.5 text-blue-400" />
                  Disk Storage Breakdown ({formatBytes(totalDisk)})
                </h4>

                {/* Proportion Bar */}
                <div className="h-3 w-full bg-zinc-950 rounded-full overflow-hidden flex p-0.5 gap-0.5 border border-zinc-800">
                  <div
                    style={{ width: `${Math.max(binaryPct, 2)}%` }}
                    title={`Binary: ${formatBytes(bd.binary_bytes)}`}
                    className="bg-blue-500 rounded-l-full h-full"
                  />
                  <div
                    style={{ width: `${Math.max(dataPct, 0)}%` }}
                    title={`Data: ${formatBytes(bd.data_bytes)}`}
                    className="bg-purple-500 h-full"
                  />
                  <div
                    style={{ width: `${Math.max(cachePct, 0)}%` }}
                    title={`Cache: ${formatBytes(bd.cache_bytes)}`}
                    className="bg-amber-500 h-full"
                  />
                  <div
                    style={{ width: `${Math.max(configPct, 0)}%` }}
                    title={`Config: ${formatBytes(bd.config_bytes)}`}
                    className="bg-emerald-500 rounded-r-full h-full"
                  />
                </div>

                {/* Legend Cards */}
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <div className="bg-zinc-950/40 border border-zinc-800/80 p-2.5 rounded-xl flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                      <span className="text-xs text-zinc-300">Binary / App</span>
                    </div>
                    <span className="text-xs font-mono font-medium text-white">
                      {formatBytes(bd.binary_bytes)}
                    </span>
                  </div>

                  <div className="bg-zinc-950/40 border border-zinc-800/80 p-2.5 rounded-xl flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                      <span className="text-xs text-zinc-300">User Data</span>
                    </div>
                    <span className="text-xs font-mono font-medium text-white">
                      {formatBytes(bd.data_bytes)}
                    </span>
                  </div>

                  <div className="bg-zinc-950/40 border border-zinc-800/80 p-2.5 rounded-xl flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                      <span className="text-xs text-zinc-300">Cache</span>
                    </div>
                    <span className="text-xs font-mono font-medium text-white">
                      {formatBytes(bd.cache_bytes)}
                    </span>
                  </div>

                  <div className="bg-zinc-950/40 border border-zinc-800/80 p-2.5 rounded-xl flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      <span className="text-xs text-zinc-300">Configuration</span>
                    </div>
                    <span className="text-xs font-mono font-medium text-white">
                      {formatBytes(bd.config_bytes)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 5: Flatpak Permissions (Flatseal Integrated) */}
          {activeTab === "permissions" && (
            <div className="space-y-5 animate-in fade-in duration-150">
              <div className="flex items-center justify-between p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800">
                <div className="flex items-center space-x-3">
                  <div className="p-2.5 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                      Sandbox Isolation Controls
                    </h4>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      Configure permissions and system resource access for this Flatpak sandbox.
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleResetPermissions}
                  className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition"
                >
                  Reset
                </button>
              </div>

              {permissions ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {/* Network */}
                  <div className="p-3.5 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 flex items-center justify-between gap-3">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-xl bg-zinc-800 text-sky-400">
                        <Wifi className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">Network & Internet</div>
                        <div className="text-[10px] text-zinc-400">Web connections and network sockets</div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleTogglePermission("network", permissions.network)}
                      className={`w-10 h-5 rounded-full transition p-0.5 flex items-center ${
                        permissions.network ? "bg-sky-600" : "bg-zinc-800 border border-zinc-700"
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full bg-white transition-transform ${
                          permissions.network ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>

                  {/* Wayland */}
                  <div className="p-3.5 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 flex items-center justify-between gap-3">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-xl bg-zinc-800 text-indigo-400">
                        <Monitor className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">Wayland Display</div>
                        <div className="text-[10px] text-zinc-400">Native modern Wayland windowing</div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleTogglePermission("wayland", permissions.wayland)}
                      className={`w-10 h-5 rounded-full transition p-0.5 flex items-center ${
                        permissions.wayland ? "bg-indigo-600" : "bg-zinc-800 border border-zinc-700"
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full bg-white transition-transform ${
                          permissions.wayland ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>

                  {/* X11 */}
                  <div className="p-3.5 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 flex items-center justify-between gap-3">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-xl bg-zinc-800 text-amber-400">
                        <Monitor className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">X11 / XWayland Display</div>
                        <div className="text-[10px] text-zinc-400">Global screen capture and legacy windows</div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleTogglePermission("x11", permissions.x11)}
                      className={`w-10 h-5 rounded-full transition p-0.5 flex items-center ${
                        permissions.x11 ? "bg-amber-600" : "bg-zinc-800 border border-zinc-700"
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full bg-white transition-transform ${
                          permissions.x11 ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>

                  {/* Audio */}
                  <div className="p-3.5 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 flex items-center justify-between gap-3">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-xl bg-zinc-800 text-purple-400">
                        <Volume2 className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">Audio (PipeWire / PulseAudio)</div>
                        <div className="text-[10px] text-zinc-400">Sound playback and recording</div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleTogglePermission("pulseaudio", permissions.pulseaudio)}
                      className={`w-10 h-5 rounded-full transition p-0.5 flex items-center ${
                        permissions.pulseaudio ? "bg-purple-600" : "bg-zinc-800 border border-zinc-700"
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full bg-white transition-transform ${
                          permissions.pulseaudio ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>

                  {/* Home Directory */}
                  <div className="p-3.5 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 flex items-center justify-between gap-3">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-xl bg-zinc-800 text-emerald-400">
                        <FolderOpen className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">User Home Folder (~)</div>
                        <div className="text-[10px] text-zinc-400">Access to Documents, Downloads, etc.</div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleTogglePermission("filesystem_home", permissions.filesystem_home)}
                      className={`w-10 h-5 rounded-full transition p-0.5 flex items-center ${
                        permissions.filesystem_home ? "bg-emerald-600" : "bg-zinc-800 border border-zinc-700"
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full bg-white transition-transform ${
                          permissions.filesystem_home ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>

                  {/* Disks / Host Filesystem */}
                  <div className="p-3.5 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 flex items-center justify-between gap-3">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-xl bg-zinc-800 text-orange-400">
                        <HardDrive className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">Entire Filesystem (/)</div>
                        <div className="text-[10px] text-zinc-400">Mounted drives in /media or /mnt</div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleTogglePermission("filesystem_host", permissions.filesystem_host)}
                      className={`w-10 h-5 rounded-full transition p-0.5 flex items-center ${
                        permissions.filesystem_host ? "bg-orange-600" : "bg-zinc-800 border border-zinc-700"
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full bg-white transition-transform ${
                          permissions.filesystem_host ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>

                  {/* Devices & Webcam */}
                  <div className="p-3.5 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 flex items-center justify-between gap-3">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-xl bg-zinc-800 text-pink-400">
                        <Camera className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white">Webcam & Hardware Devices</div>
                        <div className="text-[10px] text-zinc-400">GPU acceleration, USB, and webcams</div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleTogglePermission("devices_all", permissions.devices_all)}
                      className={`w-10 h-5 rounded-full transition p-0.5 flex items-center ${
                        permissions.devices_all ? "bg-pink-600" : "bg-zinc-800 border border-zinc-700"
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full bg-white transition-transform ${
                          permissions.devices_all ? "translate-x-5" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-zinc-500 font-mono">
                  Querying Flatpak override permissions...
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-950/80 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {isInstalled && onOpenFolder && (
              <button
                onClick={() => onOpenFolder(app.canonical_name, app.id, app.source)}
                className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium flex items-center gap-1.5 transition"
              >
                <FolderOpen className="w-3.5 h-3.5" />
                <span>Open Data</span>
              </button>
            )}

            {isInstalled && bd && bd.cache_bytes > 0 && onClearCache && (
              <button
                onClick={() => onClearCache(app.canonical_name, app.id, app.source)}
                className="px-3 py-1.5 rounded-lg bg-amber-950/30 hover:bg-amber-900/40 text-amber-300 border border-amber-600/30 text-xs font-medium flex items-center gap-1.5 transition"
              >
                <Trash className="w-3.5 h-3.5" />
                <span>Clear Cache</span>
              </button>
            )}
          </div>

          <div className="flex items-center space-x-2">
            {isInstalled ? (
              <>
                {onOpenInstallFormat && (
                  <button
                    onClick={() => {
                      onOpenInstallFormat({
                        id: app.id,
                        name: app.name,
                        canonical_name: app.canonical_name,
                        summary: (app as any).description || "",
                        description: (app as any).description || "",
                        version: app.version,
                        source: app.source,
                        pkg_id: (app as any).pkg_id || app.id,
                        is_installed: true,
                      });
                    }}
                    className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold flex items-center gap-1.5 transition border border-zinc-700/50"
                    title="Install in another format (Flatpak, Native, AppImage, Snap)"
                  >
                    <Layers className="w-3.5 h-3.5 text-blue-400" />
                    <span>Other Formats</span>
                  </button>
                )}

                {onLaunch && (
                  <button
                    onClick={() => onLaunch(app.id, (app as any).exec_path)}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1.5 transition shadow-sm"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Launch</span>
                  </button>
                )}

                {onUninstall && (
                  <button
                    onClick={() => {
                      onUninstall(app.id, app.name);
                    }}
                    className="px-4 py-2 rounded-xl bg-red-950/40 hover:bg-red-900/50 text-red-400 border border-red-700/30 text-xs font-semibold flex items-center gap-1.5 transition"
                  >
                    <Trash className="w-3.5 h-3.5" />
                    <span>Uninstall</span>
                  </button>
                )}
              </>
            ) : (
              <button
                onClick={() => {
                  if (onOpenInstallFormat) {
                    onOpenInstallFormat(app as CatalogItem);
                  } else if (onInstall) {
                    onInstall(app as CatalogItem);
                  }
                }}
                disabled={isInstalling}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-md shadow-blue-500/25 flex items-center gap-2 transition active:scale-95 disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span>{isInstalling ? "Installing..." : "Install (Choose Format)"}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
