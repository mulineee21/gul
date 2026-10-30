import React, { useState, useEffect, useMemo } from "react";
import {
  Compass,
  Search,
  Download,
  CheckCircle2,
  Cpu,
  Globe,
  ShieldCheck,
  RefreshCw,
  Play,
  AlertCircle,
  FolderUp,
  Sparkles,
  PackageCheck,
} from "lucide-react";
import { CatalogItem, OsInfo } from "../types";
import { getSourceBadgeInfo } from "../utils";

interface StoreViewProps {
  osInfo: OsInfo | null;
  catalogItems: CatalogItem[];
  loading: boolean;
  onSearch: (query: string, sourceFilter: string) => void;
  onInstall: (item: CatalogItem) => void;
  installingId: string | null;
  onLaunch: (id: string, exec?: string) => void;
  onSelectCatalogItem: (item: CatalogItem) => void;
  onUninstall?: (id: string) => void;
  onPickLocalAppImage?: () => void;
}

export const StoreView: React.FC<StoreViewProps> = ({
  osInfo,
  catalogItems,
  loading,
  onSearch,
  onInstall,
  installingId,
  onLaunch,
  onSelectCatalogItem,
  onPickLocalAppImage,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [sourceFilter, setSourceFilter] = useState<"all" | "flatpak" | "native" | "aur" | "snap">("all");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const categories = [
    { id: "all", label: "Featured" },
    { id: "audiovideo", label: "Audio & Video" },
    { id: "graphics", label: "Graphics & Design" },
    { id: "development", label: "Development" },
    { id: "utility", label: "Utilities" },
    { id: "game", label: "Games" },
    { id: "office", label: "Office & Productivity" },
  ];

  // Debounced search trigger
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearch(searchTerm, sourceFilter);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm, sourceFilter, onSearch]);

  const filteredItems = useMemo(() => {
    if (selectedCategory === "all") return catalogItems;
    return catalogItems.filter((item) => {
      const cat = (item.category || "").toLowerCase();
      const desc = (item.summary + " " + item.description).toLowerCase();
      return cat.includes(selectedCategory) || desc.includes(selectedCategory);
    });
  }, [catalogItems, selectedCategory]);

  const nativeLabel = osInfo?.native_manager ? osInfo.native_manager.toUpperCase() : "Native";

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-zinc-950 p-6 space-y-5 overflow-y-auto">
      {/* OS & Ecosystem Detection Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-950/40 via-indigo-950/30 to-zinc-900 border border-blue-500/30 flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-blue-500/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shrink-0">
            <Compass className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-bold text-white">
                Universal Application Store
              </h3>
              <span className="text-xs bg-emerald-500/20 text-emerald-300 font-mono px-2 py-0.5 rounded-full border border-emerald-500/30 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                OS: {osInfo?.distro_name || "Linux"} ({osInfo?.architecture})
              </span>
            </div>
            <p className="text-xs text-zinc-300 mt-1 max-w-2xl leading-relaxed">
              Explore and install verified applications from{" "}
              <strong className="text-blue-300">Flathub</strong>,{" "}
              <strong className="text-orange-300">Snapcraft</strong>, and official{" "}
              <strong className="text-amber-300">{nativeLabel} repositories</strong>.
            </p>
          </div>
        </div>

        {/* Repositories status chips & AppImage button */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl px-3 py-2 flex items-center gap-2">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            <span className="text-[11px] font-mono font-medium text-blue-300">
              Flathub Active
            </span>
          </div>

          <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl px-3 py-2 flex items-center gap-2">
            <span className="flex h-2 w-2 relative">
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
            </span>
            <span className="text-[11px] font-mono font-medium text-amber-300">
              {nativeLabel} Repo
            </span>
          </div>

          {onPickLocalAppImage && (
            <button
              onClick={onPickLocalAppImage}
              title="Integrate a local .AppImage file into desktop menu"
              className="px-3 py-2 rounded-xl bg-zinc-800/80 hover:bg-zinc-700/80 text-zinc-300 border border-zinc-700/60 text-xs font-semibold flex items-center gap-1.5 transition active:scale-95"
            >
              <FolderUp className="w-3.5 h-3.5 text-purple-400" />
              <span>Integrate .AppImage</span>
            </button>
          )}
        </div>
      </div>

      {/* Search & Source Filter Bar */}
      <div className="p-4 bg-zinc-900/40 border border-zinc-800/80 rounded-2xl space-y-3.5">
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={`Search Flathub, Snapcraft, and ${nativeLabel} repositories (e.g. firefox, vlc, spotify, code, blender)...`}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-blue-500/70 focus:ring-1 focus:ring-blue-500/50 transition"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500 hover:text-zinc-300"
              >
                Clear
              </button>
            )}
          </div>

          {/* Source Filter Pills */}
          <div className="flex items-center gap-1.5 shrink-0 w-full md:w-auto">
            <button
              onClick={() => setSourceFilter("all")}
              className={`px-3 py-2 rounded-xl text-xs font-medium transition ${
                sourceFilter === "all"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800"
              }`}
            >
              All Sources
            </button>
            <button
              onClick={() => setSourceFilter("flatpak")}
              className={`px-3 py-2 rounded-xl text-xs font-medium transition flex items-center gap-1.5 ${
                sourceFilter === "flatpak"
                  ? "bg-blue-600/30 text-blue-300 border border-blue-500/50 font-bold"
                  : "bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800"
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Flathub (Flatpak)</span>
            </button>
            <button
              onClick={() => setSourceFilter("native")}
              className={`px-3 py-2 rounded-xl text-xs font-medium transition flex items-center gap-1.5 ${
                sourceFilter === "native"
                  ? "bg-amber-600/30 text-amber-300 border border-amber-500/50 font-bold"
                  : "bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800"
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>{nativeLabel} Repository</span>
            </button>

            {(osInfo?.has_snap || osInfo?.distro_family === "debian") && (
              <button
                onClick={() => setSourceFilter("snap")}
                className={`px-3 py-2 rounded-xl text-xs font-medium transition flex items-center gap-1.5 ${
                  sourceFilter === "snap"
                    ? "bg-orange-600/30 text-orange-300 border border-orange-500/50 font-bold"
                    : "bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800"
                }`}
              >
                <PackageCheck className="w-3.5 h-3.5 text-orange-400" />
                <span>Snap Store</span>
              </button>
            )}

            {osInfo?.native_manager === "pacman" && (
              <button
                onClick={() => setSourceFilter("aur")}
                className={`px-3 py-2 rounded-xl text-xs font-medium transition flex items-center gap-1.5 ${
                  sourceFilter === "aur"
                    ? "bg-fuchsia-600/30 text-fuchsia-300 border border-fuchsia-500/50 font-bold"
                    : "bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800"
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-fuchsia-400" />
                <span>AUR Community</span>
              </button>
            )}
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {categories.map((cat) => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1 rounded-full font-medium transition shrink-0 ${
                  isSelected
                    ? "bg-zinc-100 text-zinc-950 font-bold"
                    : "bg-zinc-900/60 text-zinc-400 hover:text-zinc-200 border border-zinc-800"
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Catalog Items Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center h-64 text-zinc-500 space-y-3">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-mono">Querying Flathub, Snapcraft, and {nativeLabel} repositories...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-zinc-900/30 border border-zinc-800/80 rounded-2xl p-8 flex flex-col items-center justify-center text-center space-y-2">
          <AlertCircle className="w-8 h-8 text-zinc-600" />
          <h5 className="text-sm font-semibold text-white">No packages found</h5>
          <p className="text-xs text-zinc-500 max-w-md">
            Try searching with another term or select "All Sources" to broaden your search.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => {
            const isInstalling = installingId === item.id;
            const badge = getSourceBadgeInfo(item.source);

            return (
              <div
                key={item.id}
                onClick={() => onSelectCatalogItem(item)}
                className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-4.5 flex flex-col justify-between hover:border-zinc-700 hover:shadow-lg transition cursor-pointer group"
              >
                <div>
                  {/* Top Bar: Icon + Name + Source Badge */}
                  <div className="flex items-start justify-between gap-3 mb-2.5">
                    <div className="flex items-center space-x-3 overflow-hidden">
                      {item.icon_url ? (
                        <img
                          src={item.icon_url}
                          alt={item.name}
                          onError={(e) => {
                            // Fallback to placeholder if icon load fails
                            (e.target as HTMLElement).style.display = "none";
                          }}
                          className="w-10 h-10 rounded-xl object-contain bg-zinc-950 p-1 border border-zinc-800 shrink-0"
                        />
                      ) : null}
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-zinc-800 to-zinc-700 border border-zinc-700/60 flex items-center justify-center font-bold text-white text-base shrink-0">
                        {item.name.charAt(0).toUpperCase()}
                      </div>

                      <div className="overflow-hidden">
                        <h4 className="text-sm font-bold text-white truncate" title={item.name}>
                          {item.name}
                        </h4>
                        <p className="text-[11px] font-mono text-zinc-400 truncate">
                          {item.developer || item.pkg_id}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded border shrink-0 ${badge.bgColor} ${badge.textColor} ${badge.borderColor}`}
                    >
                      {item.source === "flatpak" ? "Flathub" : badge.label.split(" ")[0]}
                    </span>
                  </div>

                  {/* Summary / Description */}
                  <p className="text-xs text-zinc-300 line-clamp-2 mt-1 leading-relaxed">
                    {item.summary || item.description || "No description available."}
                  </p>

                  {/* Metadata Tag */}
                  {item.category && (
                    <div className="mt-2.5">
                      <span className="text-[10px] font-mono text-zinc-500 bg-zinc-950/80 px-2 py-0.5 rounded border border-zinc-800">
                        {item.category}
                      </span>
                    </div>
                  )}
                </div>

                {/* Footer Actions */}
                <div className="mt-4 pt-3 border-t border-zinc-800/60 flex items-center justify-between">
                  <div className="flex items-center space-x-1.5 text-zinc-500 text-[11px] font-mono truncate max-w-[170px]">
                    <span className="truncate">{item.version || "stable"}</span>
                  </div>

                  <div>
                    {item.is_installed ? (
                      <div className="flex items-center space-x-1.5">
                        <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/30 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Installed
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onLaunch(item.id);
                          }}
                          title="Launch"
                          className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white transition"
                        >
                          <Play className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onInstall(item);
                        }}
                        disabled={isInstalling}
                        title="Choose packaging format (Native, Flatpak, AppImage, Snap)"
                        className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-md shadow-blue-500/20 flex items-center gap-1.5 transition active:scale-95 disabled:opacity-50"
                      >
                        {isInstalling ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Installing...</span>
                          </>
                        ) : (
                          <>
                            <Download className="w-3.5 h-3.5" />
                            <span>Install...</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
