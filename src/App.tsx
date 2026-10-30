import { useState, useEffect, useCallback } from "react";
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
import {
  AppImageEntry,
  AppInfo,
  CatalogItem,
  CleanResult,
  DuplicateGroup,
  InstallProgressEvent,
  OsInfo,
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
      // 1. Fetch OS Info
      const os = await invoke<OsInfo>("get_os_info");
      setOsInfo(os);

      // 2. Fetch desktop GUI applications (with real icons & names)
      const [dApps, _dDups] = await invoke<[AppInfo[], DuplicateGroup[]]>("get_desktop_apps");
      setDesktopApps(dApps);

      // 3. Fetch all system packages
      const [allPkgs, dupGroups] = await invoke<[AppInfo[], DuplicateGroup[]]>("get_all_apps");
      setAllPackages(allPkgs);
      setDuplicates(dupGroups);

      // 4. Fetch overview and update count
      const ov = await invoke<SystemOverview>("get_system_overview");
      ov.total_apps = dApps.length > 0 ? dApps.length : allPkgs.length;
      setOverview(ov);

      // 5. Fetch updates
      const upds = await invoke<UpdateItem[]>("get_available_updates");
      setUpdates(upds);

      // 6. Fetch AppImages
      const ais = await invoke<AppImageEntry[]>("scan_appimages", { customPaths: customAppImagePaths });
      setAppimages(ais);

      // 7. Fetch cleaner items
      const cItems = await invoke<SystemCleanItem[]>("scan_cleaner");
      setCleanerItems(cItems);

      // 8. Pre-fetch popular Flathub catalog apps
      const popular = await invoke<CatalogItem[]>("get_catalog_popular");
      setCatalogItems(popular);
    } catch (err) {
      console.error("Error loading system data:", err);
      showToast(`Error al cargar datos: ${err}`);
    } finally {
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

  // Search catalog function
  const handleSearchCatalog = useCallback(async (query: string, sourceFilter: string) => {
    setStoreLoading(true);
    try {
      const results = await invoke<CatalogItem[]>("search_catalog", {
        query,
        filterSource: sourceFilter,
      });
      setCatalogItems(results);
    } catch (e) {
      console.error("Error buscando en catálogo:", e);
    } finally {
      setStoreLoading(false);
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
    setInstallStep("Iniciando entorno de instalación...");
    setInstallStatus("starting");
    setTerminalLogs([
      {
        text: `[OmniPkg] Iniciando proceso para instalar ${appToInstall.name} (${source.toUpperCase()})...`,
        time: new Date().toLocaleTimeString(),
      },
      {
        text: `[OmniPkg] Paquete objetivo: ${pkgId}`,
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
      setInstallStep("¡Instalación completada con éxito!");
      showToast(`¡${appToInstall.name} (${source}) se ha instalado correctamente!`);
    } catch (e) {
      setInstallStatus("error");
      setInstallStep("Error durante la instalación");
      showToast(`Error instalando ${appToInstall.name}: ${e}`);
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
        setInstallStep("Instalación cancelada por el usuario");
        setTerminalLogs((prev) => [
          ...prev,
          {
            text: "[OmniPkg] Instalación abortada por el usuario.",
            isStderr: true,
            time: new Date().toLocaleTimeString(),
          },
        ]);
      } catch (e) {
        console.error("Error al cancelar instalación:", e);
      }
    }
  };

  const handlePickLocalAppImage = async () => {
    try {
      showToast("Abriendo selector para archivo .AppImage local...");
      const desktopPath = await invoke<string>("pick_and_install_local_appimage");
      await loadSystemData();
      showToast(`¡AppImage integrada correctamente en el menú de aplicaciones! (${desktopPath})`);
      setFormatModalApp(null);
    } catch (e) {
      if (!String(e).includes("cancelada")) {
        showToast(`${e}`);
      }
    }
  };

  // Actions
  const handleLaunchApp = async (id: string, execPath?: string) => {
    try {
      await invoke("launch_app", { id, execPath: execPath || null });
      showToast("Lanzando aplicación...");
    } catch (e) {
      showToast(`No se pudo ejecutar: ${e}`);
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
        showToast("Caché de la app limpiada exitosamente");
        loadSystemData();
      } else {
        showToast("No había caché acumulada para borrar");
      }
    } catch (e) {
      showToast(`Error: ${e}`);
    }
  };

  const handleUninstall = async (id: string) => {
    try {
      const msg = await invoke<string>("uninstall_app", { id });
      showToast(`Desinstalado: ${msg || "Éxito"}`);
      loadSystemData();
    } catch (e) {
      showToast(`Error desinstalando: ${e}`);
    }
  };

  const handleKeepRecommended = async (_recommendedId: string, otherIds: string[]) => {
    if (confirm(`¿Conservar la versión recomendada y desinstalar las otras ${otherIds.length} versiones redundantes?`)) {
      for (const id of otherIds) {
        await handleUninstall(id);
      }
      showToast("Duplicados limpiados correctamente");
      loadSystemData();
    }
  };

  const handleRunUpdates = async (selectedManagers: string[]) => {
    setIsUpdating(true);
    setUpdateEvents({});
    try {
      showToast("Iniciando actualizaciones...");
      await invoke("start_update_all", { selectedManagers });
      showToast("Actualizaciones completadas");
      await loadSystemData();
    } catch (e) {
      showToast(`Error durante la actualización: ${e}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleIntegrateAppImage = async (path: string) => {
    try {
      await invoke("integrate_appimage", { path });
      showToast("AppImage integrada en el menú de aplicaciones");
      loadSystemData();
    } catch (e) {
      showToast(`Error al integrar: ${e}`);
    }
  };

  const handleUnintegrateAppImage = async (path: string) => {
    try {
      await invoke("unintegrate_appimage", { path });
      showToast("AppImage retirada del menú");
      loadSystemData();
    } catch (e) {
      showToast(`Error: ${e}`);
    }
  };

  const handleScanCustomAppImage = (path: string) => {
    if (!customAppImagePaths.includes(path)) {
      setCustomAppImagePaths([...customAppImagePaths, path]);
      showToast(`Escaneando ruta: ${path}`);
    }
  };

  const handleDeleteAppImageFile = async (path: string) => {
    try {
      await invoke("uninstall_app", { id: `appimage:${path}` });
      showToast("Archivo AppImage eliminado");
      loadSystemData();
    } catch (e) {
      showToast(`Error al eliminar: ${e}`);
    }
  };

  const handleCleanSystem = async (selectedIds: string[]) => {
    setIsCleaning(true);
    setCleanResult(null);
    try {
      const res = await invoke<CleanResult>("clean_system", { itemIds: selectedIds });
      setCleanResult(res);
      showToast("Limpieza del sistema completada");
      loadSystemData();
    } catch (e) {
      showToast(`Error al limpiar: ${e}`);
    } finally {
      setIsCleaning(false);
    }
  };

  const getHeaderInfo = () => {
    switch (currentTab) {
      case "apps":
        return {
          title: "Aplicaciones del Sistema",
          subtitle: `Detectadas ${desktopApps.length} aplicaciones con interfaz gráfica y ${allPackages.length} paquetes del sistema`,
        };
      case "store":
        return {
          title: "Tienda y Explorador de Paquetes",
          subtitle: `Conexión directa a Flathub y a los repositorios oficiales de ${osInfo?.distro_name || "tu distribución"} (${osInfo?.native_manager?.toUpperCase() || "Nativo"})`,
        };
      case "duplicates":
        return {
          title: "Detección de Duplicados",
          subtitle: "Programas instalados en múltiples formatos con recomendaciones inteligentes para ahorrar espacio",
        };
      case "updates":
        return {
          title: "Actualizaciones Unificadas",
          subtitle: "Actualiza todos tus gestores simultáneamente con registro en tiempo real",
        };
      case "appimages":
        return {
          title: "Gestor de AppImages",
          subtitle: "Integra ejecutables autónomos en el menú XDG de tu escritorio y actualízalos",
        };
      case "cleaner":
        return {
          title: "Mantenimiento y Limpieza",
          subtitle: "Recupera espacio eliminando cachés de descargas y dependencias huérfanas",
        };
      default:
        return { title: "OmniPkg", subtitle: "Linux App Manager" };
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
    </div>
  );
}

export default App;
