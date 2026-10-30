use std::path::{Path, PathBuf};
use walkdir::WalkDir;
use crate::models::SizeBreakdown;

pub fn get_dir_size(path: &Path) -> u64 {
    if !path.exists() {
        return 0;
    }
    if path.is_file() {
        return path.metadata().map(|m| m.len()).unwrap_or(0);
    }
    WalkDir::new(path)
        .min_depth(1)
        .max_depth(6)
        .into_iter()
        .filter_map(|entry| entry.ok())
        .filter_map(|entry| entry.metadata().ok())
        .filter(|metadata| metadata.is_file())
        .map(|metadata| metadata.len())
        .sum()
}

pub fn get_app_data_breakdown(
    canonical_name: &str,
    app_id: &str,
    source_type: &str,
    binary_bytes: u64,
) -> SizeBreakdown {
    let mut breakdown = SizeBreakdown {
        binary_bytes,
        data_bytes: 0,
        cache_bytes: 0,
        config_bytes: 0,
    };

    let home = match dirs::home_dir() {
        Some(h) => h,
        None => return breakdown,
    };

    match source_type {
        "flatpak" => {
            // Flatpak sandboxes store everything in ~/.var/app/<app_id>
            let flatpak_var = home.join(".var/app").join(app_id);
            if flatpak_var.exists() {
                breakdown.config_bytes = get_dir_size(&flatpak_var.join("config"));
                breakdown.data_bytes = get_dir_size(&flatpak_var.join("data"));
                breakdown.cache_bytes = get_dir_size(&flatpak_var.join("cache"));
            }
        }
        "snap" => {
            // Snap stores data in ~/snap/<snap_name>
            let snap_dir = home.join("snap").join(canonical_name);
            if snap_dir.exists() {
                breakdown.data_bytes = get_dir_size(&snap_dir);
            }
        }
        _ => {
            // Native pacman/apt/dnf/appimage: standard XDG paths
            let names_to_check = vec![
                canonical_name.to_string(),
                canonical_name.replace('-', "_"),
                canonical_name.replace('_', "-"),
            ];

            let config_dir = dirs::config_dir().unwrap_or_else(|| home.join(".config"));
            let data_dir = dirs::data_dir().unwrap_or_else(|| home.join(".local/share"));
            let cache_dir = dirs::cache_dir().unwrap_or_else(|| home.join(".cache"));

            for name in &names_to_check {
                let p = config_dir.join(name);
                if p.exists() {
                    breakdown.config_bytes = breakdown.config_bytes.max(get_dir_size(&p));
                }

                let p = data_dir.join(name);
                if p.exists() {
                    breakdown.data_bytes = breakdown.data_bytes.max(get_dir_size(&p));
                }

                let p = cache_dir.join(name);
                if p.exists() {
                    breakdown.cache_bytes = breakdown.cache_bytes.max(get_dir_size(&p));
                }
            }
        }
    }

    breakdown
}

pub fn find_app_data_path(canonical_name: &str, app_id: &str, source_type: &str) -> Option<PathBuf> {
    let home = dirs::home_dir()?;

    match source_type {
        "flatpak" => {
            let p = home.join(".var/app").join(app_id);
            if p.exists() {
                return Some(p);
            }
        }
        "snap" => {
            let p = home.join("snap").join(canonical_name);
            if p.exists() {
                return Some(p);
            }
        }
        _ => {
            let config_dir = dirs::config_dir().unwrap_or_else(|| home.join(".config"));
            let data_dir = dirs::data_dir().unwrap_or_else(|| home.join(".local/share"));

            let p1 = config_dir.join(canonical_name);
            if p1.exists() {
                return Some(p1);
            }
            let p2 = data_dir.join(canonical_name);
            if p2.exists() {
                return Some(p2);
            }
        }
    }
    None
}
