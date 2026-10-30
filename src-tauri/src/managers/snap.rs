use std::process::Command;
use crate::models::{AppInfo, SourceType, UpdateItem, SystemCleanItem};
use crate::disk_usage::get_app_data_breakdown;

pub fn is_available() -> bool {
    Command::new("which")
        .arg("snap")
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
}

pub fn list_installed() -> Vec<AppInfo> {
    let output = match Command::new("snap")
        .args(["list"])
        .output()
    {
        Ok(out) => out,
        Err(_) => return Vec::new(),
    };

    let text = String::from_utf8_lossy(&output.stdout);
    let mut apps = Vec::new();

    // Skip header line
    for line in text.lines().skip(1) {
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() < 3 {
            continue;
        }

        let name = parts[0];
        let version = parts[1];
        let publisher = parts.get(4).unwrap_or(&"-");

        // Filter system snaps if needed, but keep apps
        let canonical = crate::duplicates::normalize_name(name);
        let breakdown = get_app_data_breakdown(&canonical, name, "snap", 150 * 1024 * 1024);
        let total_size = breakdown.binary_bytes + breakdown.data_bytes + breakdown.cache_bytes + breakdown.config_bytes;

        apps.push(AppInfo {
            id: format!("snap:{}", name),
            name: name.to_string(),
            canonical_name: canonical,
            version: version.to_string(),
            source: SourceType::Snap,
            description: format!("Paquete Snap publicado por {}", publisher),
            size_bytes: total_size,
            size_breakdown: breakdown,
            icon: None,
            install_date: None,
            is_duplicate: false,
            duplicate_group: None,
            exec_path: Some(format!("/snap/bin/{}", name)),
            is_sandboxed: true,
            has_update: false,
        });
    }

    apps
}

pub fn check_updates() -> Vec<UpdateItem> {
    let output = match Command::new("snap")
        .args(["refresh", "--list"])
        .output()
    {
        Ok(out) => out,
        Err(_) => return Vec::new(),
    };

    let text = String::from_utf8_lossy(&output.stdout);
    let mut updates = Vec::new();

    for line in text.lines().skip(1) {
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() >= 3 {
            let name = parts[0];
            let new_ver = parts[1];
            updates.push(UpdateItem {
                id: format!("snap:{}", name),
                name: name.to_string(),
                current_version: "Instalada".to_string(),
                new_version: new_ver.to_string(),
                source: SourceType::Snap,
                size_bytes: None,
            });
        }
    }

    updates
}

pub fn scan_cleaner_items() -> Vec<SystemCleanItem> {
    let mut items = Vec::new();

    // Check old disabled snap revisions
    let output = Command::new("snap")
        .args(["list", "--all"])
        .output();

    if let Ok(out) = output {
        let text = String::from_utf8_lossy(&out.stdout);
        let disabled_count = text.lines().filter(|l| l.contains("disabled")).count();
        if disabled_count > 0 {
            items.push(SystemCleanItem {
                id: "clean:snap:revisions".to_string(),
                title: format!("Revisiones anteriores de Snaps ({} desactivadas)", disabled_count),
                category: "cache".to_string(),
                source: "snap".to_string(),
                description: "Versiones antiguas de paquetes Snap que se conservan en disco tras actualizar".to_string(),
                size_bytes: (disabled_count as u64) * 120 * 1024 * 1024,
                risk_level: "safe".to_string(),
                requires_sudo: true,
                command_preview: "snap remove --revision ...".to_string(),
            });
        }
    }

    items
}
