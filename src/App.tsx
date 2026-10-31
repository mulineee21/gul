import { useState, useEffect, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { Sidebar } from "./components/Sidebar";
import { Header } from "./components/Header";
import { AppsView } from "./components/AppsView";
import { StoreView } from "./components/StoreView";
import { DuplicatesView } from "./components/DuplicatesView";
import { UpdatesView } from "./components/UpdatesView";
import { AppImagesView } from "./components/AppImagesView";
import { CleanerView } from "./components/CleanerView";
import { AppDetailModal } from "./components/AppDetailModal";
import { InstallFormatModal } from "./components/InstallFormatModal";
import {
  InstallProgressModal,
  TerminalLogLine,
} from "./components/InstallProgressModal";
import { ConfirmModal } from "./components/ConfirmModal";
import { AutostartView } from "./components/AutostartView";
import { SnapshotsView } from "./components/SnapshotsView";
import { BackupProfileModal } from "./components/BackupProfileModal";
import {
  AppImageEntry,
  AppInfo,
  AutostartEntry,
  CatalogItem,
  CleanResult,
  DuplicateGroup,
  InstallProgressEvent,
  OsInfo,
  SnapshotEntry,
  SnapshotSupportInfo,
  SourceType,
  SystemCleanItem,
  SystemOverview,
  UpdateItem,
  UpdateProgressEvent,
} from "./types";

export function App() {
  const [currentTab, setCurrentTab] = useState<string>("apps");
  const [overview, setOverview] = useState<SystemOverview | null>(null);
  const [osInfo, setOsInfo] = useState<OsInfo | null>(null);
  const [desktopApps, setDesktopApps] = useState<AppInfo[]>([]);
  const [allPackages, setAllPackages] = useState<AppInfo[]>([]);
  const [duplicates, setDuplicates] = useState<DuplicateGroup[]>([]);
  const [updates, setUpdates] = useState<UpdateItem[]>([]);
  const [appimages, setAppimages] = useState<AppImageEntry[]>([]);
  const [cleanerItems, setCleanerItems] = useState<SystemCleanItem[]>([]);
  const [cleanResult, setCleanResult] = useState<CleanResult | null>(null);
  const [selectedApp, setSelectedApp] = useState<AppInfo | CatalogItem | null>(null);

  // Autostart, Snapshots & Clone Profile States
  const [autostartEntries, setAutostartEntries] = useState<AutostartEntry[]>([]);
  const [snapshotSupport, setSnapshotSupport] = useState<SnapshotSupportInfo | null>(null);
  const [snapshots, setSnapshots] = useState<SnapshotEntry[]>([]);
  const [showCloneModal, setShowCloneModal] = useState<boolean>(false);

  // Store / Catalog State
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>([]);
  const [storeLoading, setStoreLoading] = useState<boolean>(false);
  const [installingId, setInstallingId] = useState<string | null>(null);
  const [formatModalApp, setFormatModalApp] = useState<CatalogItem | null>(null);
  const [installingFormat, setInstallingFormat] = useState<string | null>(null);

  // Live Installation Progress & Terminal State
  const [installModalData, setInstallModalData] = useState<{
    appName: string;
    source: SourceType;
    pkgId: string;
    iconUrl?: string;
  } | null>(null);
  const [installProgressPct, setInstallProgressPct] = useState<number>(0);
  const [installStep, setInstallStep] = useState<string>("Iniciando...");
  const [installStatus, setInstallStatus] = useState<
    "starting" | "running" | "success" | "error" | "cancelled"
  >("starting");
  const [terminalLogs, setTerminalLogs] = useState<TerminalLogLine[]>([]);

  // Custom Confirmation Modal state (eliminates browser JavaScript / localhost popups)
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmLabel?: string;
    variant?: "danger" | "warning" | "info";
    onConfirm: () => void;
  } | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [isCleaning, setIsCleaning] = useState<boolean>(false);
  const [updateEvents, setUpdateEvents] = useState<Record<string, UpdateProgressEvent>>({});
  const [customAppImagePaths, setCustomAppImagePaths] = useState<string[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 5000);
  };

  // Main load function
  const loadSystemData = useCallback(async () => {
    setLoading(true);
    try {
      // Phase 1: Critical UI data in parallel (instant startup)
      const [os, [dApps, _dDups], popular] = await Promise.all([
        invoke<OsInfo>("get_os_info"),
        invoke<[AppInfo[], DuplicateGroup[]]>("get_desktop_apps"),
        invoke<CatalogItem[]>("get_catalog_popular"),
      ]);
      setOsInfo(os);
      setDesktopApps(dApps);
      setCatalogItems(popular);
      setLoading(false);

      // Phase 2: Secondary background data in parallel (non-blocking)
      Promise.all([
        invoke<[AppInfo[], DuplicateGroup[]]>("get_all_apps"),
        invoke<SystemOverview>("get_system_overview"),
        invoke<UpdateItem[]>("get_available_updates"),
        invoke<AppImageEntry[]>("scan_appimages", { customPaths: customAppImagePaths }),
        invoke<SystemCleanItem[]>("scan_cleaner"),
        invoke<AutostartEntry[]>("get_autostart_entries"),
        invoke<SnapshotSupportInfo>("get_snapshot_support"),
      ])
        .then(async ([allRes, ov, upds, ais, cItems, autoApps, snapSup]) => {
          const [allPkgs, dupGroups] = allRes;
          setAllPackages(allPkgs);
          setDuplicates(dupGroups);
          ov.total_apps = dApps.length > 0 ? dApps.length : allPkgs.length;
          setOverview(ov);
          setUpdates(upds);
          setAppimages(ais);
          setCleanerItems(cItems);
          setAutostartEntries(autoApps);
          setSnapshotSupport(snapSup);
          if (snapSup.supported) {
            const snaps = await invoke<SnapshotEntry[]>("get_snapshots");
            setSnapshots(snaps);
          }
        })
        .catch((err) => console.warn("Background system scan warning:", err));
    } catch (err) {
      console.error("Error loading system data:", err);
      showToast(`Error al cargar datos: ${err}`);
      setLoading(false);
    }
  }, [customAppImagePaths]);

  // Initial load and event listening
  useEffect(() => {
    loadSystemData();

    // Listen to real-time update events
    const unlistenUpdate = listen<UpdateProgressEvent>("update-progress", (event) => {
      const evt = event.payload;
      setUpdateEvents((prev) => ({
        ...prev,
        [evt.manager]: evt,
      }));
    });

    // Listen to installation progress events (real-time terminal lines and progress)
    const unlistenInstall = listen<InstallProgressEvent>("install-progress", (event) => {
      const evt = event.payload;
      const timeStr = new Date().toLocaleTimeString();

      if (evt.line) {
        setTerminalLogs((prev) => [
          ...prev,
          {
            text: evt.line || evt.message,
            isStderr: evt.is_stderr,
            time: timeStr,
          },
        ]);
      } else if (evt.message) {
        setTerminalLogs((prev) => [
          ...prev,
          {
            text: evt.message,
            isStderr: evt.is_stderr,
            time: timeStr,
          },
        ]);
      }

      if (evt.progress_pct !== undefined && evt.progress_pct !== null) {
        setInstallProgressPct(evt.progress_pct);
      }
      if (evt.step) {
        setInstallStep(evt.step);
      }
      if (evt.status === "success") {
        setInstallStatus("success");
        setInstallProgressPct(100);
      } else if (evt.status === "error") {
        setInstallStatus("error");
      } else if (evt.status === "running") {
        setInstallStatus("running");
      }
    });

    return () => {
      unlistenUpdate.then((unlisten) => unlisten());
      unlistenInstall.then((unlisten) => unlisten());
    };
  }, [loadSystemData]);

  // Search catalog function (ignores stale responses when typing fast)
  const searchReqIdRef = useRef<number>(0);
  const handleSearchCatalog = useCallback(async (query: string, sourceFilter: string) => {
    const reqId = ++searchReqIdRef.current;
    setStoreLoading(true);
    try {
      const results = await invoke<CatalogItem[]>("search_catalog", {
        query,
        filterSource: sourceFilter,
      });
      if (reqId === searchReqIdRef.current) {
        setCatalogItems(results);
      }
    } catch (e) {
      console.error("Error buscando en catálogo:", e);
    } finally {
      if (reqId === searchReqIdRef.current) {
        setStoreLoading(false);
      }
    }
  }, []);

  // Open format selection modal when user clicks install
  const handleInstallPackage = (item: CatalogItem) => {
    setFormatModalApp(item);
  };

  // Execute installation after user selects desired format (Pacman / Flatpak / AppImage)
  const handleExecuteInstallFormat = async (
    source: SourceType,
    pkgId: string,
    downloadUrl?: string
  ) => {
    if (!formatModalApp) return;
    const appToInstall = formatModalApp;
    setInstallingFormat(source);
    setInstallingId(appToInstall.id);

    // Initialize live installation progress & terminal modal
    setInstallModalData({
      appName: appToInstall.name,
      source,
      pkgId,
      iconUrl: appToInstall.icon_url,
    });
    setInstallProgressPct(4);
    setInstallStep("Initializing installation environment...");
    setInstallStatus("starting");
    setTerminalLogs([
      {
        text: `[GUL] Starting installation process for ${appToInstall.name} (${source.toUpperCase()})...`,
        time: new Date().toLocaleTimeString(),
      },
      {
        text: `[GUL] Target package: ${pkgId}`,
        time: new Date().toLocaleTimeString(),
      },
    ]);

    // Close format modal so progress modal takes over
    setFormatModalApp(null);

    try {
      if (source === "appimage" && downloadUrl) {
        await invoke("install_appimage_from_url", {
          appName: appToInstall.name,
          downloadUrl,
        });
      } else {
        await invoke("install_package", {
          id: appToInstall.id,
          source: source,
          pkgId: pkgId,
        });
      }
      await loadSystemData();
      setInstallProgressPct(100);
      setInstallStatus("success");
      setInstallStep("Installation completed successfully!");
      showToast(`${appToInstall.name} (${source}) installed successfully!`);
    } catch (e) {
      setInstallStatus("error");
      setInstallStep("Error during installation");
      showToast(`Error installing ${appToInstall.name}: ${e}`);
    } finally {
      setInstallingId(null);
      setInstallingFormat(null);
    }
  };

  const handleCancelInstall = async () => {
    if (installModalData) {
      try {
        await invoke("cancel_install", { id: installModalData.pkgId });
        setInstallStatus("cancelled");
        setInstallStep("Installation cancelled by user");
        setTerminalLogs((prev) => [
          ...prev,
          {
            text: "[GUL] Installation aborted by user.",
            isStderr: true,
            time: new Date().toLocaleTimeString(),
          },
        ]);
      } catch (e) {
        console.error("Error cancelling installation:", e);
      }
    }
  };

  const handlePickLocalAppImage = async () => {
    try {
      showToast("Opening file picker for local .AppImage...");
      const desktopPath = await invoke<string>("pick_and_install_local_appimage");
      await loadSystemData();
      showToast(`AppImage successfully integrated into desktop menu! (${desktopPath})`);
      setFormatModalApp(null);
    } catch (e) {
      if (!String(e).includes("cancelada") && !String(e).includes("cancelled")) {
        showToast(`${e}`);
      }
    }
  };

  const handleSetupFlatpak = async () => {
    setInstallModalData({
      appName: "Flatpak & Flathub Engine",
      source: "flatpak",
      pkgId: "flatpak",
    });
    setInstallProgressPct(5);
    setInstallStep("Preparing Flatpak installation...");
    setInstallStatus("starting");
    setTerminalLogs([
      {
        text: "[GUL] Starting Flatpak engine and Flathub repository setup...",
        time: new Date().toLocaleTimeString(),
      },
    ]);

    try {
      await invoke("setup_flatpak");
      await loadSystemData();
      setInstallProgressPct(100);
      setInstallStatus("success");
      setInstallStep("Flatpak & Flathub configured successfully!");
      showToast("Flatpak and Flathub installed and enabled!");
    } catch (e) {
      setInstallStatus("error");
      setInstallStep("Error installing Flatpak");
      showToast(`Error installing Flatpak: ${e}`);
    }
  };

  // Actions
  const handleLaunchApp = async (id: string, execPath?: string) => {
    try {
      await invoke("launch_app", { id, execPath: execPath || null });
      showToast("Launching application...");
    } catch (e) {
      showToast(`Failed to launch: ${e}`);
    }
  };

  const handleOpenFolder = async (canonical: string, id: string, source: string) => {
    try {
      await invoke("open_app_data_folder", {
        canonicalName: canonical,
        appId: id,
        source,
      });
    } catch (e) {
      showToast(`${e}`);
    }
  };

  const handleClearCache = async (canonical: string, id: string, source: string) => {
    try {
      const cleared = await invoke<boolean>("clear_app_cache", {
        canonicalName: canonical,
        appId: id,
        source,
      });
      if (cleared) {
        showToast("App cache cleared successfully");
        loadSystemData();
      } else {
        showToast("No accumulated cache to clear");
      }
    } catch (e) {
      showToast(`Error: ${e}`);
    }
  };

  const handleUninstall = (id: string, name?: string) => {
    const displayName = name || id.split(":").pop() || "the application";
    setConfirmDialog({
      isOpen: true,
      title: `Uninstall ${displayName}?`,
      message: `This action will remove ${displayName} from your system and free up associated disk space.`,
      confirmLabel: "Uninstall",
      variant: "danger",
      onConfirm: async () => {
        setConfirmDialog(null);
        showToast(`Uninstalling ${displayName}...`);
        try {
          const msg = await invoke<string>("uninstall_app", { id });
          showToast(`Uninstalled: ${msg || "Success"}`);
          await loadSystemData();
          if (selectedApp && (selectedApp.id === id || (selectedApp as any).pkg_id === id)) {
            setSelectedApp(null);
          }
        } catch (e) {
          showToast(`Error uninstalling: ${e}`);
        }
      },
    });
  };

  const handleKeepRecommended = (
    _recommendedId: string,
    otherIds: string[],
    groupName?: string
  ) => {
    const titleName = groupName || "the application";
    setConfirmDialog({
      isOpen: true,
      title: "Clean redundant duplicate versions?",
      message: `Do you want to keep the recommended version of ${titleName} and remove the other ${otherIds.length} redundant versions?`,
      confirmLabel: "Keep Recommended",
      variant: "warning",
      onConfirm: async () => {
        setConfirmDialog(null);
        showToast("Cleaning duplicate versions...");
        for (const id of otherIds) {
          try {
            await invoke("uninstall_app", { id });
          } catch (e) {
            console.error(`Error uninstalling duplicate ${id}:`, e);
          }
        }
        showToast("Duplicates cleaned successfully");
        await loadSystemData();
      },
    });
  };

  const handleRunUpdates = async (selectedManagers: string[], createSnapshot: boolean = false) => {
    setIsUpdating(true);
    setUpdateEvents({});

    // Create system snapshot before updates if requested
    if (createSnapshot && snapshotSupport?.supported) {
      try {
        showToast("Creating Btrfs restore point (snapshot) for safety...");
        await invoke("create_system_snapshot", {
          description: "GUL: Safety restore point before package updates",
        });
        showToast("System restore point created successfully!");
      } catch (e) {
        console.warn("Could not create previous snapshot:", e);
      }
    }

    try {
      showToast("Starting system updates...");
      await invoke("start_update_all", { selectedManagers });
      showToast("All updates completed successfully");
      await loadSystemData();
    } catch (e) {
      showToast(`Error during update: ${e}`);
    } finally {
      setIsUpdating(false);
    }
  };

  // Autostart Handlers
  const handleToggleAutostart = async (id: string, enable: boolean) => {
    try {
      await invoke("toggle_autostart_entry", { id, enable });
      const refreshed = await invoke<AutostartEntry[]>("get_autostart_entries");
      setAutostartEntries(refreshed);
      showToast(`Application ${enable ? "enabled" : "disabled"} at startup.`);
    } catch (e) {
      showToast(`Error updating startup entry: ${e}`);
    }
  };

  const handleAddCustomAutostart = async (name: string, exec: string, comment: string) => {
    try {
      await invoke("add_custom_autostart", { name, exec, comment });
      const refreshed = await invoke<AutostartEntry[]>("get_autostart_entries");
      setAutostartEntries(refreshed);
      showToast(`${name} added to startup applications!`);
    } catch (e) {
      showToast(`Error adding startup entry: ${e}`);
    }
  };

  // Snapshot Handlers
  const handleCreateSnapshot = async (description: string) => {
    try {
      showToast("Creating system restore point (snapshot)...");
      const res = await invoke<string>("create_system_snapshot", { description });
      const refreshed = await invoke<SnapshotEntry[]>("get_snapshots");
      setSnapshots(refreshed);
      showToast(res);
    } catch (e) {
      showToast(`Error creating snapshot: ${e}`);
    }
  };

  // Batch Restore / Clone Handlers
  const handleStartBatchInstall = async (packages: string[], source: string) => {
    if (packages.length === 0) return;

    setInstallModalData({
      appName: "Batch Profile Reinstallation",
      source: (source as SourceType) || "pacman",
      pkgId: `${packages.length} selected packages`,
    });
    setInstallProgressPct(5);
    setInstallStep(`Starting installation of ${packages.length} packages...`);
    setInstallStatus("running");
    setTerminalLogs([
      {
        text: `[GUL] Starting profile restore (${packages.length} packages via ${source})...`,
        time: new Date().toLocaleTimeString(),
      },
    ]);

    try {
      // Install all packages sequentially
      for (let i = 0; i < packages.length; i++) {
        const pkg = packages[i];
        setInstallStep(`Installing package ${i + 1}/${packages.length}: ${pkg}...`);
        setInstallProgressPct(Math.round(((i + 1) / packages.length) * 100));

        await invoke("install_package", {
          id: `${source}:${pkg}`,
          source: source,
          pkgId: pkg,
        });
      }

      await loadSystemData();
      setInstallProgressPct(100);
      setInstallStatus("success");
      setInstallStep("All packages restored successfully!");
      showToast("Batch profile restore completed successfully!");
    } catch (e) {
      setInstallStatus("error");
      setInstallStep("Error during batch restoration");
      showToast(`Batch install error: ${e}`);
    }
  };

  const handleIntegrateAppImage = async (path: string) => {
    try {
      await invoke("integrate_appimage", { path });
      showToast("AppImage integrated into application menu");
      loadSystemData();
    } catch (e) {
      showToast(`Error integrating: ${e}`);
    }
  };

  const handleUnintegrateAppImage = async (path: string) => {
    try {
      await invoke("unintegrate_appimage", { path });
      showToast("AppImage removed from menu");
      loadSystemData();
    } catch (e) {
      showToast(`Error: ${e}`);
    }
  };

  const handleScanCustomAppImage = (path: string) => {
    if (!customAppImagePaths.includes(path)) {
      setCustomAppImagePaths([...customAppImagePaths, path]);
      showToast(`Scanning path: ${path}`);
    }
  };

  const handleDeleteAppImageFile = (path: string, name?: string) => {
    const displayName = name || path.split("/").pop() || "the file";
    setConfirmDialog({
      isOpen: true,
      title: "Delete AppImage file?",
      message: `Are you sure you want to permanently delete ${displayName}? It will be removed from your desktop menu.`,
      confirmLabel: "Delete Permanently",
      variant: "danger",
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          await invoke("uninstall_app", { id: `appimage:${path}` });
          showToast("AppImage file deleted.");
          await loadSystemData();
        } catch (e) {
          showToast(`Error deleting file: ${e}`);
        }
      },
    });
  };

  const handleCleanSystem = async (selectedIds: string[]) => {
    setIsCleaning(true);
    setCleanResult(null);
    try {
      const res = await invoke<CleanResult>("clean_system", { itemIds: selectedIds });
      setCleanResult(res);
      showToast("System cleanup completed successfully");
      loadSystemData();
    } catch (e) {
      showToast(`Cleanup error: ${e}`);
    } finally {
      setIsCleaning(false);
    }
  };

  const getHeaderInfo = () => {
    switch (currentTab) {
      case "apps":
        return {
          title: "System Applications",
          subtitle: `Detected ${desktopApps.length} desktop applications and ${allPackages.length} system packages`,
        };
      case "store":
        return {
          title: "GUL Store & Package Explorer",
          subtitle: `Direct connection to Flathub, Snapcraft, AUR, and official repositories of ${osInfo?.distro_name || "your distribution"} (${osInfo?.native_manager?.toUpperCase() || "Native"})`,
        };
      case "duplicates":
        return {
          title: "Duplicate App Detection",
          subtitle: "Programs installed across multiple packaging formats with intelligent storage recommendations",
        };
      case "updates":
        return {
          title: "Unified Update Center",
          subtitle: "Update all active package managers simultaneously with real-time streaming logs",
        };
      case "appimages":
        return {
          title: "AppImage Manager",
          subtitle: "Integrate standalone executables into your desktop XDG menu with automatic desktop entry creation",
        };
      case "cleaner":
        return {
          title: "System Maintenance & Cleaner",
          subtitle: "Reclaim disk space by clearing download caches and orphaned dependencies",
        };
      case "autostart":
        return {
          title: "Startup Applications (Autostart)",
          subtitle: "Manage applications that automatically launch when your desktop session starts",
        };
      case "snapshots":
        return {
          title: "System Restore Points (Btrfs Snapshots)",
          subtitle: "Create and manage safe system snapshots with Snapper and Timeshift",
        };
      default:
        return { title: "GUL", subtitle: "Universal Linux Manager" };
    }
  };

  const headerInfo = getHeaderInfo();

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-zinc-950 text-zinc-100">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-zinc-900 border border-blue-500/50 text-white text-xs px-4 py-2.5 rounded-xl shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-200 flex items-center space-x-2 max-w-md">
          <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping shrink-0" />
          <span className="truncate">{toastMessage}</span>
        </div>
      )}

      {/* Main Sidebar */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        overview={overview}
        osInfo={osInfo}
        loading={loading}
        onOpenCloneModal={() => setShowCloneModal(true)}
        onSetupFlatpak={handleSetupFlatpak}
      />

      {/* Main Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <Header
          title={headerInfo.title}
          subtitle={headerInfo.subtitle}
          onRefresh={loadSystemData}
          onUpdateAll={() => handleRunUpdates(overview?.active_managers || ["pacman", "flatpak"])}
          loading={loading}
          updatesCount={updates.length}
        />

        <main className="flex-1 overflow-hidden flex flex-col">
          {currentTab === "apps" && (
            <AppsView
              desktopApps={desktopApps}
              allPackages={allPackages}
              loading={loading}
              onSelectApp={(app) => setSelectedApp(app)}
              onLaunch={handleLaunchApp}
              onUninstall={handleUninstall}
            />
          )}

          {currentTab === "store" && (
            <StoreView
              osInfo={osInfo}
              catalogItems={catalogItems}
              loading={storeLoading || loading}
              onSearch={handleSearchCatalog}
              onInstall={handleInstallPackage}
              installingId={installingId}
              onLaunch={handleLaunchApp}
              onSelectCatalogItem={(item) => setSelectedApp(item)}
              onUninstall={handleUninstall}
              onPickLocalAppImage={handlePickLocalAppImage}
              onSetupFlatpak={handleSetupFlatpak}
            />
          )}

          {currentTab === "duplicates" && (
            <DuplicatesView
              groups={duplicates}
              loading={loading}
              onUninstall={handleUninstall}
              onKeepRecommended={handleKeepRecommended}
            />
          )}

          {currentTab === "updates" && (
            <UpdatesView
              updates={updates}
              loading={loading}
              activeManagers={overview?.active_managers || []}
              isUpdating={isUpdating}
              updateEvents={updateEvents}
              onRunUpdates={handleRunUpdates}
            />
          )}

          {currentTab === "appimages" && (
            <AppImagesView
              entries={appimages}
              loading={loading}
              onIntegrate={handleIntegrateAppImage}
              onUnintegrate={handleUnintegrateAppImage}
              onLaunch={handleLaunchApp}
              onScanCustomPath={handleScanCustomAppImage}
              onDelete={handleDeleteAppImageFile}
            />
          )}

          {currentTab === "cleaner" && (
            <CleanerView
              items={cleanerItems}
              loading={loading}
              isCleaning={isCleaning}
              cleanResult={cleanResult}
              onClean={handleCleanSystem}
            />
          )}

          {currentTab === "autostart" && (
            <AutostartView
              entries={autostartEntries}
              loading={loading}
              onToggle={handleToggleAutostart}
              onAddCustom={handleAddCustomAutostart}
            />
          )}

          {currentTab === "snapshots" && (
            <SnapshotsView
              supportInfo={snapshotSupport}
              snapshots={snapshots}
              loading={loading}
              onCreateSnapshot={handleCreateSnapshot}
              onRefresh={async () => {
                const s = await invoke<SnapshotEntry[]>("get_snapshots");
                setSnapshots(s);
              }}
            />
          )}
        </main>
      </div>

      {/* Detail Modal (Supports screenshots, reviews, opinions, stats and storage) */}
      {selectedApp && (
        <AppDetailModal
          app={selectedApp}
          onClose={() => setSelectedApp(null)}
          onLaunch={handleLaunchApp}
          onOpenFolder={handleOpenFolder}
          onClearCache={handleClearCache}
          onUninstall={handleUninstall}
          onInstall={handleInstallPackage}
          onOpenInstallFormat={handleInstallPackage}
          isInstalling={installingId === selectedApp?.id}
        />
      )}

      {/* Format Selector Modal (Pacman / Native vs Flatpak vs AppImage) */}
      {formatModalApp && (
        <InstallFormatModal
          app={formatModalApp}
          osInfo={osInfo}
          onClose={() => setFormatModalApp(null)}
          onInstallFormat={handleExecuteInstallFormat}
          onPickLocalAppImage={handlePickLocalAppImage}
          onSetupFlatpak={handleSetupFlatpak}
          isInstalling={installingId !== null}
          installingFormat={installingFormat}
        />
      )}

      {/* Live Installation Terminal & Progress Modal */}
      {installModalData && (
        <InstallProgressModal
          appName={installModalData.appName}
          source={installModalData.source}
          pkgId={installModalData.pkgId}
          iconUrl={installModalData.iconUrl}
          progressPct={installProgressPct}
          currentStep={installStep}
          status={installStatus}
          logs={terminalLogs}
          onClose={() => setInstallModalData(null)}
          onCancel={handleCancelInstall}
          onLaunch={() => {
            handleLaunchApp(installModalData.pkgId);
            setInstallModalData(null);
          }}
        />
      )}

      {/* Clone / Backup Profile Modal */}
      <BackupProfileModal
        isOpen={showCloneModal}
        onClose={() => setShowCloneModal(false)}
        onStartBatchInstall={handleStartBatchInstall}
        showToast={showToast}
      />

      {/* Modern Confirmation Dialog (Replaces browser confirm) */}
      {confirmDialog && (
        <ConfirmModal
          isOpen={confirmDialog.isOpen}
          title={confirmDialog.title}
          message={confirmDialog.message}
          confirmLabel={confirmDialog.confirmLabel}
          variant={confirmDialog.variant}
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog(null)}
        />
      )}
    </div>
  );
}

export default App;
