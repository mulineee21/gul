use std::process::Command;
use crate::models::{AppInfo, SourceType, UpdateItem, SystemCleanItem};
use crate::disk_usage::get_app_data_breakdown;

pub fn is_available() -> bool {
    crate::os_detector::command_exists("dnf")
}

pub fn list_installed() -> Vec<AppInfo> {
    let output = match Command::new("rpm")
        .args(["-qa", "--queryformat", "%{NAME}\t%{VERSION}-%{RELEASE}\t%{SIZE}\t%{SUMMARY}\n"])
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
        let binary_bytes: u64 = parts.get(2).and_then(|s| s.trim().parse().ok()).unwrap_or(0);
        let summary = parts.get(3).unwrap_or(&"").trim();

        let canonical = crate::duplicates::normalize_name(name);
        let breakdown = get_app_data_breakdown(&canonical, name, "dnf", binary_bytes);
        let total_size = breakdown.binary_bytes + breakdown.data_bytes + breakdown.cache_bytes + breakdown.config_bytes;

        apps.push(AppInfo {
            id: format!("dnf:{}", name),
            name: name.to_string(),
            canonical_name: canonical,
            version: version.to_string(),
            source: SourceType::Dnf,
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
    let output = match Command::new("dnf")
        .args(["check-update", "-q"])
        .output()
    {
        Ok(out) => out,
        Err(_) => return Vec::new(),
    };

    let text = String::from_utf8_lossy(&output.stdout);
    let mut updates = Vec::new();

    for line in text.lines() {
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() >= 2 {
            let name = parts[0].split('.').next().unwrap_or(parts[0]);
            let new_ver = parts[1];
            updates.push(UpdateItem {
                id: format!("dnf:{}", name),
                name: name.to_string(),
                current_version: "Instalada".to_string(),
                new_version: new_ver.to_string(),
                source: SourceType::Dnf,
                size_bytes: None,
            });
        }
    }

    updates
}

pub fn scan_cleaner_items() -> Vec<SystemCleanItem> {
    let mut items = Vec::new();

    let cache_path = std::path::Path::new("/var/cache/dnf");
    if cache_path.exists() {
        let size = crate::disk_usage::get_dir_size(cache_path);
        if size > 1024 * 1024 {
            items.push(SystemCleanItem {
                id: "clean:dnf:cache".to_string(),
                title: "Metadata and RPM package cache (DNF)".to_string(),
                category: "cache".to_string(),
                source: "dnf".to_string(),
                description: "Temporary package and metadata cache files in /var/cache/dnf".to_string(),
                size_bytes: size,
                risk_level: "safe".to_string(),
                requires_sudo: true,
                command_preview: "dnf clean all".to_string(),
            });
        }
    }

    items
}
