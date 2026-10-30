use std::process::Command;
use crate::models::{AppInfo, SourceType, UpdateItem, SystemCleanItem};
use crate::disk_usage::get_app_data_breakdown;
use crate::managers::pacman::parse_size_to_bytes;

pub fn is_available() -> bool {
    Command::new("which")
        .arg("flatpak")
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
}

pub fn list_installed() -> Vec<AppInfo> {
    let output = match Command::new("flatpak")
        .args([
            "list",
            "--app",
            "--columns=application,name,version,size,origin,description,installation,branch",
        ])
        .output()
    {
        Ok(out) => out,
        Err(_) => return Vec::new(),
    };

    let text = String::from_utf8_lossy(&output.stdout);
    let mut apps = Vec::new();

    for line in text.lines() {
        let cols: Vec<&str> = line.split('\t').collect();
        if cols.len() < 2 {
            continue;
        }

        let app_id = cols[0].trim();
        let name = cols.get(1).map(|s| s.trim()).unwrap_or(app_id);
        let version = cols.get(2).map(|s| s.trim()).unwrap_or("");
        let size_str = cols.get(3).map(|s| s.trim()).unwrap_or("0");
        let _origin = cols.get(4).map(|s| s.trim()).unwrap_or("");
        let desc = cols.get(5).map(|s| s.trim()).unwrap_or("");

        let binary_bytes = parse_size_to_bytes(size_str);
        let canonical = crate::duplicates::normalize_name(app_id);
        let breakdown = get_app_data_breakdown(&canonical, app_id, "flatpak", binary_bytes);
        let total_size = breakdown.binary_bytes + breakdown.data_bytes + breakdown.cache_bytes + breakdown.config_bytes;

        apps.push(AppInfo {
            id: format!("flatpak:{}", app_id),
            name: name.to_string(),
            canonical_name: canonical,
            version: version.to_string(),
            source: SourceType::Flatpak,
            description: desc.to_string(),
            size_bytes: total_size,
            size_breakdown: breakdown,
            icon: None,
            install_date: None,
            is_duplicate: false,
            duplicate_group: None,
            exec_path: Some(format!("flatpak run {}", app_id)),
            is_sandboxed: true,
            has_update: false,
        });
    }

    apps
}

pub fn check_updates() -> Vec<UpdateItem> {
    let output = match Command::new("flatpak")
        .args(["remote-ls", "--updates", "--columns=application,name,version"])
        .output()
    {
        Ok(out) => out,
        Err(_) => return Vec::new(),
    };

    let text = String::from_utf8_lossy(&output.stdout);
    let mut updates = Vec::new();

    for line in text.lines() {
        let cols: Vec<&str> = line.split('\t').collect();
        if cols.is_empty() {
            continue;
        }
        let id = cols[0].trim();
        let name = cols.get(1).map(|s| s.trim()).unwrap_or(id);
        let version = cols.get(2).map(|s| s.trim()).unwrap_or("Nueva versión");

        updates.push(UpdateItem {
            id: format!("flatpak:{}", id),
            name: name.to_string(),
            current_version: "Instalada".to_string(),
            new_version: version.to_string(),
            source: SourceType::Flatpak,
            size_bytes: None,
        });
    }

    updates
}

pub fn scan_cleaner_items() -> Vec<SystemCleanItem> {
    let mut items = Vec::new();

    // 1. Unused flatpak runtimes
    let unused_output = Command::new("flatpak")
        .args(["uninstall", "--unused", "--dry-run"])
        .output();

    if let Ok(out) = unused_output {
        let text = String::from_utf8_lossy(&out.stdout);
        let count = text.lines().filter(|l| l.contains('/')).count();
        if count > 0 {
            items.push(SystemCleanItem {
                id: "clean:flatpak:unused".to_string(),
                title: format!("Obsolete Flatpak runtimes ({} items)", count),
                category: "flatpak_unused".to_string(),
                source: "flatpak".to_string(),
                description: "Unused Flatpak runtimes and libraries no longer needed by any installed application".to_string(),
                size_bytes: (count as u64) * 350 * 1024 * 1024, // Runtimes average ~350MB
                risk_level: "safe".to_string(),
                requires_sudo: false,
                command_preview: "flatpak uninstall --unused -y".to_string(),
            });
        }
    }

    // 2. Flatpak cache in ~/.cache/flatpak
    if let Some(home) = dirs::home_dir() {
        let cache_dir = home.join(".cache/flatpak");
        if cache_dir.exists() {
            let size = crate::disk_usage::get_dir_size(&cache_dir);
            if size > 1024 * 1024 { // > 1MB
                items.push(SystemCleanItem {
                    id: "clean:flatpak:cache".to_string(),
                    title: "Flatpak download cache".to_string(),
                    category: "cache".to_string(),
                    source: "flatpak".to_string(),
                    description: "Temporary metadata and files stored in ~/.cache/flatpak".to_string(),
                    size_bytes: size,
                    risk_level: "safe".to_string(),
                    requires_sudo: false,
                    command_preview: "rm -rf ~/.cache/flatpak/*".to_string(),
                });
            }
        }
    }

    items
}
