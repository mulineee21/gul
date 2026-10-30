use std::process::Command;
use crate::models::{AppInfo, SourceType, UpdateItem, SystemCleanItem};
use crate::disk_usage::get_app_data_breakdown;

pub fn is_available() -> bool {
    Command::new("which")
        .arg("apt")
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
}

pub fn list_installed() -> Vec<AppInfo> {
    // dpkg-query is standard and fast on all Debian/Ubuntu systems
    let output = match Command::new("dpkg-query")
        .args(["-W", "-f=${Package}\t${Version}\t${Installed-Size}\t${binary:Summary}\n"])
        .output()
    {
        Ok(out) => out,
        Err(_) => return Vec::new(),
    };

    let text = String::from_utf8_lossy(&output.stdout);
    let mut apps = Vec::new();

    for line in text.lines() {
        let parts: Vec<&str> = line.split('\t').collect();
        if parts.len() < 2 {
            continue;
        }

        let name = parts[0].trim();
        let version = parts[1].trim();
        let size_kb: u64 = parts.get(2).and_then(|s| s.trim().parse().ok()).unwrap_or(0);
        let summary = parts.get(3).unwrap_or(&"").trim();

        // Installed-Size in dpkg is in kilobytes
        let binary_bytes = size_kb * 1024;
        let canonical = crate::duplicates::normalize_name(name);
        let breakdown = get_app_data_breakdown(&canonical, name, "apt", binary_bytes);
        let total_size = breakdown.binary_bytes + breakdown.data_bytes + breakdown.cache_bytes + breakdown.config_bytes;

        apps.push(AppInfo {
            id: format!("apt:{}", name),
            name: name.to_string(),
            canonical_name: canonical,
            version: version.to_string(),
            source: SourceType::Apt,
            description: summary.to_string(),
            size_bytes: total_size,
            size_breakdown: breakdown,
            icon: None,
            install_date: None,
            is_duplicate: false,
            duplicate_group: None,
            exec_path: Some(format!("/usr/bin/{}", name)),
            is_sandboxed: false,
            has_update: false,
        });
    }

    apps
}

pub fn check_updates() -> Vec<UpdateItem> {
    let output = match Command::new("apt")
        .args(["list", "--upgradable"])
        .output()
    {
        Ok(out) => out,
        Err(_) => return Vec::new(),
    };

    let text = String::from_utf8_lossy(&output.stdout);
    let mut updates = Vec::new();

    // Listing format: name/suite version arch [upgradable from: old_version]
    for line in text.lines().skip(1) {
        if line.contains('/') && line.contains('[') {
            let parts: Vec<&str> = line.split_whitespace().collect();
            if parts.len() >= 2 {
                let name = parts[0].split('/').next().unwrap_or(parts[0]);
                let new_ver = parts[1];
                updates.push(UpdateItem {
                    id: format!("apt:{}", name),
                    name: name.to_string(),
                    current_version: "Instalada".to_string(),
                    new_version: new_ver.to_string(),
                    source: SourceType::Apt,
                    size_bytes: None,
                });
            }
        }
    }

    updates
}

pub fn scan_cleaner_items() -> Vec<SystemCleanItem> {
    let mut items = Vec::new();

    // 1. Apt cache /var/cache/apt/archives
    let cache_path = std::path::Path::new("/var/cache/apt/archives");
    if cache_path.exists() {
        let size = crate::disk_usage::get_dir_size(cache_path);
        if size > 1024 * 1024 {
            items.push(SystemCleanItem {
                id: "clean:apt:cache".to_string(),
                title: "Caché de paquetes deb (APT)".to_string(),
                category: "cache".to_string(),
                source: "apt".to_string(),
                description: "Archivos .deb guardados en /var/cache/apt/archives".to_string(),
                size_bytes: size,
                risk_level: "safe".to_string(),
                requires_sudo: true,
                command_preview: "apt-get clean".to_string(),
            });
        }
    }

    // 2. Apt autoremove orphans
    let dry_run = Command::new("apt-get")
        .args(["--dry-run", "autoremove"])
        .output();

    if let Ok(out) = dry_run {
        let text = String::from_utf8_lossy(&out.stdout);
        if text.contains("Remv ") {
            let count = text.lines().filter(|l| l.starts_with("Remv ")).count();
            if count > 0 {
                items.push(SystemCleanItem {
                    id: "clean:apt:orphans".to_string(),
                    title: format!("Dependencias huérfanas ({} paquetes)", count),
                    category: "orphans".to_string(),
                    source: "apt".to_string(),
                    description: "Paquetes que se instalaron automáticamente y ya no son necesarios".to_string(),
                    size_bytes: (count as u64) * 20 * 1024 * 1024,
                    risk_level: "safe".to_string(),
                    requires_sudo: true,
                    command_preview: "apt-get autoremove -y".to_string(),
                });
            }
        }
    }

    items
}
