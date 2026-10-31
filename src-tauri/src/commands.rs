use std::process::Command;
use tauri::AppHandle;
use crate::models::{
    AppExtendedDetails, AppImageEntry, AppInfo, AurPackageItem, AutostartEntry, CatalogItem,
    CleanResult, DuplicateGroup, FlatpakPermissions, InstallOption, OmniProfile, OsInfo,
    SnapshotEntry, SnapshotSupportInfo, SystemCleanItem, SystemOverview, UpdateItem,
};
use crate::managers;
use crate::duplicates;
use crate::cleaner;
use crate::updates;
use crate::os_detector;
use crate::catalog;
use crate::desktop_apps;
use crate::app_details;
use crate::install_options;
use crate::flatpak_permissions;
use crate::aur;
use crate::autostart;
use crate::snapshots;
use crate::backup_profile;
use crate::notifications;

#[tauri::command]
pub async fn get_system_overview() -> SystemOverview {
    tokio::task::spawn_blocking(|| {
        let managers_list = managers::get_active_managers();
        let raw_apps = managers::list_all_installed();
        let (apps, dup_groups) = duplicates::analyze_duplicates(raw_apps);
        let updates_list = updates::check_all_updates();
        let clean_items = cleaner::scan_items();

        let total_disk: u64 = apps.iter().map(|a| a.size_bytes).sum();
        let reclaimable: u64 = clean_items.iter().map(|i| i.size_bytes).sum();

        // Distro name from /etc/os-release
        let distro = std::fs::read_to_string("/etc/os-release")
            .ok()
            .and_then(|content| {
                for line in content.lines() {
                    if line.starts_with("PRETTY_NAME=") {
                        return Some(
                            line.trim_start_matches("PRETTY_NAME=")
                                .trim_matches('"')
                                .to_string(),
                        );
                    }
                }
                None
            })
            .unwrap_or_else(|| "Linux".to_string());

        SystemOverview {
            distro_name: distro,
            active_managers: managers_list,
            total_apps: apps.len(),
            duplicates_count: dup_groups.len(),
            updates_available: updates_list.len(),
            total_disk_used_bytes: total_disk,
            reclaimable_bytes: reclaimable,
        }
    })
    .await
    .unwrap_or_else(|_| SystemOverview {
        distro_name: "Linux".to_string(),
        active_managers: Vec::new(),
        total_apps: 0,
        duplicates_count: 0,
        updates_available: 0,
        total_disk_used_bytes: 0,
        reclaimable_bytes: 0,
    })
}

#[tauri::command]
pub async fn get_all_apps() -> (Vec<AppInfo>, Vec<DuplicateGroup>) {
    tokio::task::spawn_blocking(|| {
        let raw_apps = managers::list_all_installed();
        duplicates::analyze_duplicates(raw_apps)
    })
    .await
    .unwrap_or_default()
}

#[tauri::command]
pub async fn get_duplicates() -> Vec<DuplicateGroup> {
    tokio::task::spawn_blocking(|| {
        let raw_apps = managers::list_all_installed();
        let (_, groups) = duplicates::analyze_duplicates(raw_apps);
        groups
    })
    .await
    .unwrap_or_default()
}

#[tauri::command]
pub async fn get_available_updates() -> Vec<UpdateItem> {
    tokio::task::spawn_blocking(|| updates::check_all_updates())
        .await
        .unwrap_or_default()
}

#[tauri::command]
pub async fn start_update_all(app: AppHandle, selected_managers: Vec<String>) -> Result<(), String> {
    for manager in selected_managers {
        let _ = updates::run_update_manager(app.clone(), manager).await;
    }
    Ok(())
}

#[tauri::command]
pub async fn scan_cleaner() -> Vec<SystemCleanItem> {
    tokio::task::spawn_blocking(|| cleaner::scan_items())
        .await
        .unwrap_or_default()
}

#[tauri::command]
pub fn clean_system(item_ids: Vec<String>) -> CleanResult {
    cleaner::execute_clean(&item_ids)
}

#[tauri::command]
pub fn scan_appimages(custom_paths: Vec<String>) -> Vec<AppImageEntry> {
    managers::appimage::scan_appimages(&custom_paths)
}

#[tauri::command]
pub fn integrate_appimage(path: String) -> Result<String, String> {
    managers::appimage::integrate_appimage(&path)
}

#[tauri::command]
pub fn unintegrate_appimage(path: String) -> Result<bool, String> {
    managers::appimage::unintegrate_appimage(&path)
}

#[tauri::command]
pub fn launch_app(id: String, exec_path: Option<String>) -> Result<(), String> {
    if let Some(exec) = exec_path {
        let parts: Vec<&str> = exec.split_whitespace().collect();
        if !parts.is_empty() {
            let mut cmd = Command::new(parts[0]);
            for arg in &parts[1..] {
                cmd.arg(arg);
            }
            cmd.spawn().map_err(|e| e.to_string())?;
            return Ok(());
        }
    }

    if id.starts_with("flatpak:") {
        let app_id = id.trim_start_matches("flatpak:");
        Command::new("flatpak")
            .args(["run", app_id])
            .spawn()
            .map_err(|e| e.to_string())?;
        return Ok(());
    }

    if id.starts_with("appimage:") {
        let path = id.trim_start_matches("appimage:");
        Command::new(path)
            .spawn()
            .map_err(|e| e.to_string())?;
        return Ok(());
    }

    Err("No se pudo iniciar la aplicación".to_string())
}

#[tauri::command]
pub fn open_app_data_folder(canonical_name: String, app_id: String, source: String) -> Result<(), String> {
    if let Some(path) = crate::disk_usage::find_app_data_path(&canonical_name, &app_id, &source) {
        Command::new("xdg-open")
            .arg(&path)
            .spawn()
            .map_err(|e| e.to_string())?;
        return Ok(());
    }
    Err("No se encontró la carpeta de datos de esta aplicación".to_string())
}

#[tauri::command]
pub fn clear_app_cache(canonical_name: String, app_id: String, source: String) -> Result<bool, String> {
    let home = dirs::home_dir().ok_or("No se encontró directorio de usuario")?;

    match source.as_str() {
        "flatpak" => {
            let cache_path = home.join(".var/app").join(&app_id).join("cache");
            if cache_path.exists() {
                let _ = std::fs::remove_dir_all(&cache_path);
                let _ = std::fs::create_dir_all(&cache_path);
                return Ok(true);
            }
        }
        _ => {
            let cache_path = dirs::cache_dir().unwrap_or_else(|| home.join(".cache")).join(&canonical_name);
            if cache_path.exists() {
                let _ = std::fs::remove_dir_all(&cache_path);
                let _ = std::fs::create_dir_all(&cache_path);
                return Ok(true);
            }
        }
    }

    Ok(false)
}

#[tauri::command]
pub fn uninstall_app(id: String) -> Result<String, String> {
    if id.starts_with("flatpak:") {
        let app_id = id.trim_start_matches("flatpak:");
        let out = Command::new("flatpak")
            .args(["uninstall", "-y", app_id])
            .output()
            .map_err(|e| e.to_string())?;
        return Ok(String::from_utf8_lossy(&out.stdout).to_string());
    }

    if id.starts_with("snap:") {
        let snap_name = id.trim_start_matches("snap:");
        let out = Command::new("pkexec")
            .args(["snap", "remove", snap_name])
            .output()
            .map_err(|e| e.to_string())?;
        return Ok(String::from_utf8_lossy(&out.stdout).to_string());
    }

    if id.starts_with("pacman:") {
        let pkg_name = id.trim_start_matches("pacman:");
        let out = Command::new("pkexec")
            .args(["pacman", "-Rns", "--noconfirm", pkg_name])
            .output()
            .map_err(|e| e.to_string())?;
        return Ok(String::from_utf8_lossy(&out.stdout).to_string());
    }

    if id.starts_with("apt:") {
        let pkg_name = id.trim_start_matches("apt:");
        let out = Command::new("pkexec")
            .args(["apt-get", "remove", "--purge", "-y", pkg_name])
            .output()
            .map_err(|e| e.to_string())?;
        return Ok(String::from_utf8_lossy(&out.stdout).to_string());
    }

    if id.starts_with("dnf:") {
        let pkg_name = id.trim_start_matches("dnf:");
        let out = Command::new("pkexec")
            .args(["dnf", "remove", "-y", pkg_name])
            .output()
            .map_err(|e| e.to_string())?;
        return Ok(String::from_utf8_lossy(&out.stdout).to_string());
    }

    if id.starts_with("aur:") {
        let pkg_name = id.trim_start_matches("aur:");
        let out = Command::new("pkexec")
            .args(["pacman", "-Rns", "--noconfirm", pkg_name])
            .output()
            .map_err(|e| e.to_string())?;
        return Ok(String::from_utf8_lossy(&out.stdout).to_string());
    }

    if id.starts_with("portage:") {
        let pkg_name = id.trim_start_matches("portage:");
        let out = Command::new("pkexec")
            .args(["emerge", "--depclean", pkg_name])
            .output()
            .map_err(|e| e.to_string())?;
        return Ok(String::from_utf8_lossy(&out.stdout).to_string());
    }

    if id.starts_with("appimage:") {
        let path_str = id.trim_start_matches("appimage:");
        let _ = managers::appimage::unintegrate_appimage(path_str);
        std::fs::remove_file(path_str).map_err(|e| e.to_string())?;
        return Ok("Archivo AppImage eliminado".to_string());
    }

    Err("Gestor de origen no soportado para desinstalación".to_string())
}

#[tauri::command]
pub fn get_os_info() -> OsInfo {
    os_detector::detect_os()
}

#[tauri::command]
pub async fn get_catalog_popular() -> Vec<CatalogItem> {
    tokio::task::spawn_blocking(|| catalog::get_flathub_popular())
        .await
        .unwrap_or_default()
}

#[tauri::command]
pub async fn search_catalog(query: String, filter_source: Option<String>) -> Vec<CatalogItem> {
    tokio::task::spawn_blocking(move || catalog::search_all_catalog(&query, filter_source.as_deref()))
        .await
        .unwrap_or_default()
}

#[tauri::command]
pub async fn install_package(
    app: AppHandle,
    id: String,
    source: String,
    pkg_id: String,
) -> Result<String, String> {
    catalog::run_install_package(app, id, source, pkg_id).await
}

#[tauri::command]
pub async fn get_desktop_apps() -> (Vec<AppInfo>, Vec<DuplicateGroup>) {
    tokio::task::spawn_blocking(|| {
        let desktop = desktop_apps::list_desktop_apps();
        duplicates::analyze_duplicates(desktop)
    })
    .await
    .unwrap_or_default()
}

#[tauri::command]
pub async fn get_app_details(app_id: String) -> AppExtendedDetails {
    tokio::task::spawn_blocking(move || app_details::get_app_extended_details(&app_id))
        .await
        .unwrap_or_else(|_| app_details::get_app_extended_details(""))
}

#[tauri::command]
pub async fn get_install_options(
    app_name: String,
    canonical_name: String,
    current_pkg_id: String,
) -> Vec<InstallOption> {
    tokio::task::spawn_blocking(move || {
        install_options::get_install_options(&app_name, &canonical_name, &current_pkg_id)
    })
    .await
    .unwrap_or_default()
}

#[tauri::command]
pub async fn install_appimage_from_url(
    app: AppHandle,
    app_name: String,
    download_url: String,
) -> Result<String, String> {
    install_options::download_and_install_appimage(app, app_name, download_url).await
}

#[tauri::command]
pub fn pick_and_install_local_appimage(app: AppHandle) -> Result<String, String> {
    install_options::pick_and_install_local_appimage(app)
}

#[tauri::command]
pub async fn cancel_install(id: String) -> Result<(), String> {
    catalog::cancel_install(&id).await
}

// Flatpak Permissions & Engine Setup
#[tauri::command]
pub async fn setup_flatpak(app: AppHandle) -> Result<String, String> {
    managers::flatpak::setup_flatpak_engine(app).await
}

#[tauri::command]
pub fn get_flatpak_permissions(app_id: String) -> FlatpakPermissions {
    flatpak_permissions::get_flatpak_permissions(&app_id)
}

#[tauri::command]
pub fn set_flatpak_permission(app_id: String, key: String, enabled: bool) -> Result<(), String> {
    flatpak_permissions::set_flatpak_permission(&app_id, &key, enabled)
}

#[tauri::command]
pub fn reset_flatpak_permissions(app_id: String) -> Result<(), String> {
    flatpak_permissions::reset_flatpak_permissions(&app_id)
}

// AUR Support
#[tauri::command]
pub fn search_aur(query: String) -> Vec<AurPackageItem> {
    aur::search_aur(&query)
}

#[tauri::command]
pub async fn install_aur_package(app: AppHandle, pkg_name: String) -> Result<String, String> {
    aur::install_aur_package(app, pkg_name).await
}

// Autostart Management
#[tauri::command]
pub fn get_autostart_entries() -> Vec<AutostartEntry> {
    autostart::list_autostart_entries()
}

#[tauri::command]
pub fn toggle_autostart_entry(id: String, enable: bool) -> Result<(), String> {
    autostart::toggle_autostart(&id, enable)
}

#[tauri::command]
pub fn add_custom_autostart(name: String, exec: String, comment: String) -> Result<(), String> {
    autostart::add_custom_autostart(&name, &exec, &comment)
}

// System Snapshots (Btrfs / Snapper / Timeshift)
#[tauri::command]
pub fn get_snapshot_support() -> SnapshotSupportInfo {
    snapshots::check_snapshot_support()
}

#[tauri::command]
pub fn get_snapshots() -> Vec<SnapshotEntry> {
    snapshots::list_snapshots()
}

#[tauri::command]
pub fn create_system_snapshot(description: String) -> Result<String, String> {
    snapshots::create_system_snapshot(&description)
}

// Software Profile Backup & Clone
#[tauri::command]
pub fn export_system_profile() -> OmniProfile {
    backup_profile::export_profile()
}

#[tauri::command]
pub fn save_profile_file(custom_path: Option<String>) -> Result<String, String> {
    backup_profile::save_profile_file(custom_path)
}

#[tauri::command]
pub fn load_profile_file(custom_path: Option<String>) -> Result<OmniProfile, String> {
    backup_profile::load_profile_file(custom_path)
}

// Notifications
#[tauri::command]
pub fn send_notification(title: String, body: String) {
    notifications::send_desktop_notification(&title, &body);
}
