pub mod models;
pub mod disk_usage;
pub mod duplicates;
pub mod cleaner;
pub mod updates;
pub mod managers;
pub mod os_detector;
pub mod catalog;
pub mod desktop_apps;
pub mod app_details;
pub mod install_options;
pub mod commands;

use commands::*;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            get_system_overview,
            get_all_apps,
            get_desktop_apps,
            get_duplicates,
            get_available_updates,
            start_update_all,
            scan_cleaner,
            clean_system,
            scan_appimages,
            integrate_appimage,
            unintegrate_appimage,
            launch_app,
            open_app_data_folder,
            clear_app_cache,
            uninstall_app,
            get_os_info,
            get_catalog_popular,
            search_catalog,
            install_package,
            get_app_details,
            get_install_options,
            install_appimage_from_url,
            pick_and_install_local_appimage,
            cancel_install
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
