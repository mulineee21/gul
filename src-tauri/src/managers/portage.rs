use std::fs;
use std::path::Path;
use std::process::Command;
use crate::models::{AppInfo, SourceType, UpdateItem, SystemCleanItem};
use crate::disk_usage::get_app_data_breakdown;

pub fn is_available() -> bool {
    Command::new("which")
        .arg("emerge")
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false)
}

pub fn list_installed() -> Vec<AppInfo> {
    let mut apps = Vec::new();

    // 1. In Gentoo, the VDB (Virtual Database) is located at /var/db/pkg/<category>/<package>-<version>
    let vdb_path = Path::new("/var/db/pkg");
    if vdb_path.exists() {
        if let Ok(categories) = fs::read_dir(vdb_path) {
            for cat_entry in categories.flatten() {
                let cat_path = cat_entry.path();
                if !cat_path.is_dir() {
                    continue;
                }
                let cat_name = cat_entry.file_name().to_string_lossy().to_string();

                if let Ok(packages) = fs::read_dir(&cat_path) {
                    for pkg_entry in packages.flatten() {
                        let pkg_path = pkg_entry.path();
                        if !pkg_path.is_dir() {
                            continue;
                        }
                        let full_pkg_ver = pkg_entry.file_name().to_string_lossy().to_string();

                        let (pkg_name, version) = split_gentoo_pkg_version(&full_pkg_ver);

                        let summary = fs::read_to_string(pkg_path.join("DESCRIPTION"))
                            .unwrap_or_default()
                            .trim()
                            .to_string();

                        let size_bytes: u64 = fs::read_to_string(pkg_path.join("SIZE"))
                            .ok()
                            .and_then(|s| s.trim().parse().ok())
                            .unwrap_or(50 * 1024 * 1024);

                        let canonical = crate::duplicates::normalize_name(&pkg_name);
                        let breakdown = get_app_data_breakdown(&canonical, &pkg_name, "portage", size_bytes);
                        let total_size = breakdown.binary_bytes + breakdown.data_bytes + breakdown.cache_bytes + breakdown.config_bytes;

                        apps.push(AppInfo {
                            id: format!("portage:{}/{}", cat_name, pkg_name),
                            name: pkg_name.clone(),
                            canonical_name: canonical,
                            version,
                            source: SourceType::Portage,
                            description: if summary.is_empty() {
                                format!("Gentoo ebuild ({}/{})", cat_name, pkg_name)
                            } else {
                                summary
                            },
                            size_bytes: total_size,
                            size_breakdown: breakdown,
                            icon: None,
                            install_date: None,
                            is_duplicate: false,
                            duplicate_group: None,
                            exec_path: Some(format!("/usr/bin/{}", pkg_name)),
                            is_sandboxed: false,
                            has_update: false,
                        });
                    }
                }
            }
        }
    }

    // Fallback using `qlist -Iv` if /var/db/pkg had no access or 0 items
    if apps.is_empty() && is_available() {
        if let Ok(out) = Command::new("qlist").args(["-Iv"]).output() {
            let text = String::from_utf8_lossy(&out.stdout);
            for line in text.lines() {
                let trimmed = line.trim();
                if let Some((_cat, rest)) = trimmed.split_once('/') {
                    let (pkg_name, version) = split_gentoo_pkg_version(rest);
                    let canonical = crate::duplicates::normalize_name(&pkg_name);
                    let breakdown = get_app_data_breakdown(&canonical, &pkg_name, "portage", 40 * 1024 * 1024);
                    let total_size = breakdown.binary_bytes + breakdown.data_bytes + breakdown.cache_bytes + breakdown.config_bytes;

                    apps.push(AppInfo {
                        id: format!("portage:{}", trimmed),
                        name: pkg_name.clone(),
                        canonical_name: canonical,
                        version,
                        source: SourceType::Portage,
                        description: format!("Gentoo ebuild ({})", trimmed),
                        size_bytes: total_size,
                        size_breakdown: breakdown,
                        icon: None,
                        install_date: None,
                        is_duplicate: false,
                        duplicate_group: None,
                        exec_path: Some(format!("/usr/bin/{}", pkg_name)),
                        is_sandboxed: false,
                        has_update: false,
                    });
                }
            }
        }
    }

    apps
}

fn split_gentoo_pkg_version(full: &str) -> (String, String) {
    let bytes = full.as_bytes();
    for i in 0..bytes.len() {
        if bytes[i] == b'-' && i + 1 < bytes.len() && bytes[i + 1].is_ascii_digit() {
            return (full[..i].to_string(), full[i + 1..].to_string());
        }
    }
    (full.to_string(), "installed".to_string())
}

pub fn check_updates() -> Vec<UpdateItem> {
    let mut updates = Vec::new();
    if !is_available() {
        return updates;
    }

    if let Ok(out) = Command::new("emerge").args(["-pquDN", "@world"]).output() {
        let text = String::from_utf8_lossy(&out.stdout);
        for line in text.lines() {
            let trimmed = line.trim();
            if trimmed.starts_with("[ebuild") {
                let parts: Vec<&str> = trimmed.split_whitespace().collect();
                if let Some(pkg_str) = parts.iter().find(|p| p.contains('/')) {
                    if let Some((_, rest)) = pkg_str.split_once('/') {
                        let (name, new_ver) = split_gentoo_pkg_version(rest);
                        updates.push(UpdateItem {
                            id: format!("portage:{}", pkg_str),
                            name: name.clone(),
                            current_version: "Instalada".to_string(),
                            new_version: new_ver,
                            source: SourceType::Portage,
                            size_bytes: None,
                        });
                    }
                }
            }
        }
    }

    updates
}

pub fn scan_cleaner_items() -> Vec<SystemCleanItem> {
    let mut items = Vec::new();

    // 1. Gentoo distfiles cache in /var/cache/distfiles
    let distfiles_path = Path::new("/var/cache/distfiles");
    if distfiles_path.exists() {
        let size = crate::disk_usage::get_dir_size(distfiles_path);
        if size > 10 * 1024 * 1024 {
            items.push(SystemCleanItem {
                id: "clean:portage:distfiles".to_string(),
                title: "Source tarballs cache (Portage Distfiles)".to_string(),
                category: "cache".to_string(),
                source: "portage".to_string(),
                description: "Downloaded source archives used to compile packages in /var/cache/distfiles".to_string(),
                size_bytes: size,
                risk_level: "safe".to_string(),
                requires_sudo: true,
                command_preview: "eclean-dist -d || rm -rf /var/cache/distfiles/*".to_string(),
            });
        }
    }

    // 2. Gentoo orphaned packages (emerge --depclean)
    if is_available() {
        items.push(SystemCleanItem {
            id: "clean:portage:orphans".to_string(),
            title: "Orphaned build dependencies (Portage Depclean)".to_string(),
            category: "orphans".to_string(),
            source: "portage".to_string(),
            description: "Packages no longer required by any entry in @world".to_string(),
            size_bytes: 80 * 1024 * 1024,
            risk_level: "moderate".to_string(),
            requires_sudo: true,
            command_preview: "emerge --depclean -q".to_string(),
        });
    }

    items
}
