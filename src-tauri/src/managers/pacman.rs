use std::process::Command;
use crate::models::{AppInfo, SourceType, UpdateItem, SystemCleanItem};
use crate::disk_usage::get_app_data_breakdown;

pub fn is_available() -> bool {
    Command::new("which")
        .arg("pacman")
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
}

pub fn parse_size_to_bytes(size_str: &str) -> u64 {
    let clean = size_str.trim().replace(',', ".");
    let parts: Vec<&str> = clean.split_whitespace().collect();
    if parts.is_empty() {
        return 0;
    }

    let num: f64 = parts[0].parse().unwrap_or(0.0);
    if parts.len() < 2 {
        return num as u64;
    }

    let unit = parts[1].to_uppercase();
    let multiplier: f64 = match unit.as_str() {
        "B" | "BYTES" => 1.0,
        "KIB" | "KB" | "K" => 1024.0,
        "MIB" | "MB" | "M" => 1024.0 * 1024.0,
        "GIB" | "GB" | "G" => 1024.0 * 1024.0 * 1024.0,
        "TIB" | "TB" | "T" => 1024.0 * 1024.0 * 1024.0 * 1024.0,
        _ => 1.0,
    };

    (num * multiplier) as u64
}

pub fn list_installed() -> Vec<AppInfo> {
    let output = match Command::new("pacman")
        .env("LC_ALL", "C")
        .args(["-Qei"])
        .output()
    {
        Ok(out) => out,
        Err(_) => return Vec::new(),
    };

    let text = String::from_utf8_lossy(&output.stdout);
    let mut apps = Vec::new();

    let mut current_name = String::new();
    let mut current_ver = String::new();
    let mut current_desc = String::new();
    let mut current_size_bytes = 0u64;
    let mut current_install_date = None;

    for line in text.lines() {
        if line.trim().is_empty() {
            if !current_name.is_empty() {
                let canonical = crate::duplicates::normalize_name(&current_name);
                let breakdown = get_app_data_breakdown(&canonical, &current_name, "pacman", current_size_bytes);
                let total_size = breakdown.binary_bytes + breakdown.data_bytes + breakdown.cache_bytes + breakdown.config_bytes;

                apps.push(AppInfo {
                    id: format!("pacman:{}", current_name),
                    name: current_name.clone(),
                    canonical_name: canonical,
                    version: current_ver.clone(),
                    source: SourceType::Pacman,
                    description: current_desc.clone(),
                    size_bytes: total_size,
                    size_breakdown: breakdown,
                    icon: None,
                    install_date: current_install_date.clone(),
                    is_duplicate: false,
                    duplicate_group: None,
                    exec_path: Some(format!("/usr/bin/{}", current_name)),
                    is_sandboxed: false,
                    has_update: false,
                });

                current_name.clear();
                current_ver.clear();
                current_desc.clear();
                current_size_bytes = 0;
                current_install_date = None;
            }
            continue;
        }

        if let Some((key, val)) = line.split_once(':') {
            let key = key.trim();
            let val = val.trim();
            match key {
                "Name" => current_name = val.to_string(),
                "Version" => current_ver = val.to_string(),
                "Description" => current_desc = val.to_string(),
                "Installed Size" => current_size_bytes = parse_size_to_bytes(val),
                "Install Date" => current_install_date = Some(val.to_string()),
                _ => {}
            }
        }
    }

    if !current_name.is_empty() {
        let canonical = crate::duplicates::normalize_name(&current_name);
        let breakdown = get_app_data_breakdown(&canonical, &current_name, "pacman", current_size_bytes);
        let total_size = breakdown.binary_bytes + breakdown.data_bytes + breakdown.cache_bytes + breakdown.config_bytes;

        apps.push(AppInfo {
            id: format!("pacman:{}", current_name),
            name: current_name.clone(),
            canonical_name: canonical,
            version: current_ver,
            source: SourceType::Pacman,
            description: current_desc,
            size_bytes: total_size,
            size_breakdown: breakdown,
            icon: None,
            install_date: current_install_date,
            is_duplicate: false,
            duplicate_group: None,
            exec_path: Some(format!("/usr/bin/{}", current_name)),
            is_sandboxed: false,
            has_update: false,
        });
    }

    apps
}

pub fn check_updates() -> Vec<UpdateItem> {
    // Try checkupdates first (from pacman-contrib, safe check without locking DB)
    let output = Command::new("checkupdates")
        .output()
        .or_else(|_| Command::new("pacman").args(["-Qu"]).output());

    let mut updates = Vec::new();
    if let Ok(out) = output {
        let text = String::from_utf8_lossy(&out.stdout);
        for line in text.lines() {
            let parts: Vec<&str> = line.split_whitespace().collect();
            if parts.len() >= 4 && parts[2] == "->" {
                let name = parts[0].to_string();
                let cur_ver = parts[1].to_string();
                let new_ver = parts[3].to_string();
                updates.push(UpdateItem {
                    id: format!("pacman:{}", name),
                    name: name.clone(),
                    current_version: cur_ver,
                    new_version: new_ver,
                    source: SourceType::Pacman,
                    size_bytes: None,
                });
            }
        }
    }
    updates
}

pub fn scan_cleaner_items() -> Vec<SystemCleanItem> {
    let mut items = Vec::new();

    // 1. Pacman cache in /var/cache/pacman/pkg
    let cache_path = std::path::Path::new("/var/cache/pacman/pkg");
    if cache_path.exists() {
        let size = crate::disk_usage::get_dir_size(cache_path);
        if size > 0 {
            items.push(SystemCleanItem {
                id: "clean:pacman:cache".to_string(),
                title: "Caché de paquetes descargados (Pacman)".to_string(),
                category: "cache".to_string(),
                source: "pacman".to_string(),
                description: "Archivos .pkg.tar.zst antiguos descargados en /var/cache/pacman/pkg".to_string(),
                size_bytes: size,
                risk_level: "safe".to_string(),
                requires_sudo: true,
                command_preview: "paccache -rk1 || pacman -Sc --noconfirm".to_string(),
            });
        }
    }

    // 2. Orphan packages
    let orphans_output = Command::new("pacman")
        .args(["-Qtdq"])
        .output();

    if let Ok(out) = orphans_output {
        let text = String::from_utf8_lossy(&out.stdout);
        let orphans: Vec<&str> = text.lines().map(|l| l.trim()).filter(|l| !l.is_empty()).collect();
        if !orphans.is_empty() {
            // estimate size of orphans
            let count = orphans.len();
            items.push(SystemCleanItem {
                id: "clean:pacman:orphans".to_string(),
                title: format!("Dependencias huérfanas ({} paquetes)", count),
                category: "orphans".to_string(),
                source: "pacman".to_string(),
                description: format!("Paquetes instalados como dependencias que ya no utiliza ninguna app: {}", orphans.join(", ")),
                size_bytes: (count as u64) * 15 * 1024 * 1024, // approx 15MB each
                risk_level: "safe".to_string(),
                requires_sudo: true,
                command_preview: "pacman -Rns $(pacman -Qtdq) --noconfirm".to_string(),
            });
        }
    }

    items
}
