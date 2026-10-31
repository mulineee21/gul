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
pub mod flatpak_permissions;
pub mod aur;
pub mod autostart;
pub mod snapshots;
pub mod backup_profile;
pub mod notifications;
pub mod commands;

use commands::*;

fn sanitize_appimage_env() {
    // When running inside an AppImage on non-Ubuntu distros (like Arch/CachyOS),
    // linuxdeploy's AppRun exports LD_LIBRARY_PATH, GIO_EXTRA_MODULES, etc. pointing
    // to Ubuntu 22.04 libraries bundled inside /tmp/.mount_gulXXXX.
    // Any host binary spawned by GUL (curl, pacman, flatpak, pkexec, paru) will crash
    // with ABI/symbol errors unless we strip the AppImage mount path from these vars.
    if std::env::var_os("APPIMAGE").is_some() || std::env::var_os("APPDIR").is_some() {
        let vars_to_clean = [
            "LD_LIBRARY_PATH",
            "LD_PRELOAD",
            "GIO_EXTRA_MODULES",
            "GIO_MODULE_DIR",
            "GSETTINGS_SCHEMA_DIR",
            "GTK_PATH",
            "GTK_EXE_PREFIX",
            "GTK_DATA_PREFIX",
            "GDK_PIXBUF_MODULE_FILE",
            "GDK_PIXBUF_MODULEDIR",
            "QT_PLUGIN_PATH",
            "PERL5LIB",
            "PYTHONHOME",
            "PYTHONPATH",
            "XDG_DATA_DIRS",
        ];

        let appdir = std::env::var("APPDIR").unwrap_or_else(|_| "/tmp/.mount_".to_string());

        for var in vars_to_clean {
            if let Ok(val) = std::env::var(var) {
                let filtered: Vec<&str> = val
                    .split(':')
                    .filter(|p| !p.is_empty() && !p.starts_with(&appdir) && !p.contains("/.mount_"))
                    .collect();
                unsafe {
                    if filtered.is_empty() {
                        std::env::remove_var(var);
                    } else {
                        std::env::set_var(var, filtered.join(":"));
                    }
                }
            }
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    sanitize_appimage_env();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            notifications::start_background_update_monitor(app.handle().clone());
            Ok(())
        })
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
            cancel_install,
            setup_flatpak,
            get_flatpak_permissions,
            set_flatpak_permission,
            reset_flatpak_permissions,
            search_aur,
            install_aur_package,
            get_autostart_entries,
            toggle_autostart_entry,
            add_custom_autostart,
            get_snapshot_support,
            get_snapshots,
            create_system_snapshot,
            export_system_profile,
            save_profile_file,
            load_profile_file,
            send_notification
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
