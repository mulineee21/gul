use std::process::Command;
use tauri::AppHandle;
use crate::models::{
    AppExtendedDetails, AppImageEntry, AppInfo, CatalogItem, CleanResult, DuplicateGroup,
    InstallOption, OsInfo, SystemCleanItem, SystemOverview, UpdateItem,
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

#[tauri::command]
pub fn get_system_overview() -> SystemOverview {
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
                    return Some(line.trim_start_matches("PRETTY_NAME=").trim_matches('"').to_string());
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
}

#[tauri::command]
pub fn get_all_apps() -> (Vec<AppInfo>, Vec<DuplicateGroup>) {
    let raw_apps = managers::list_all_installed();
    duplicates::analyze_duplicates(raw_apps)
}

#[tauri::command]
pub fn get_duplicates() -> Vec<DuplicateGroup> {
    let raw_apps = managers::list_all_installed();
    let (_, groups) = duplicates::analyze_duplicates(raw_apps);
    groups
}

#[tauri::command]
pub fn get_available_updates() -> Vec<UpdateItem> {
    updates::check_all_updates()
}

#[tauri::command]
pub async fn start_update_all(app: AppHandle, selected_managers: Vec<String>) -> Result<(), String> {
    for manager in selected_managers {
        let _ = updates::run_update_manager(app.clone(), manager).await;
    }
    Ok(())
}

#[tauri::command]
pub fn scan_cleaner() -> Vec<SystemCleanItem> {
    cleaner::scan_items()
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
pub fn get_catalog_popular() -> Vec<CatalogItem> {
    catalog::get_flathub_popular()
}

#[tauri::command]
pub fn search_catalog(query: String, filter_source: Option<String>) -> Vec<CatalogItem> {
    catalog::search_all_catalog(&query, filter_source.as_deref())
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
pub fn get_desktop_apps() -> (Vec<AppInfo>, Vec<DuplicateGroup>) {
    let desktop = desktop_apps::list_desktop_apps();
    duplicates::analyze_duplicates(desktop)
}

#[tauri::command]
pub fn get_app_details(app_id: String) -> AppExtendedDetails {
    app_details::get_app_extended_details(&app_id)
}

#[tauri::command]
pub fn get_install_options(
    app_name: String,
    canonical_name: String,
    current_pkg_id: String,
) -> Vec<InstallOption> {
    install_options::get_install_options(&app_name, &canonical_name, &current_pkg_id)
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
