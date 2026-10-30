use std::collections::HashSet;
use std::fs;
use std::path::{Path, PathBuf};
use crate::models::{AppInfo, SourceType};
use crate::disk_usage::get_app_data_breakdown;

pub fn list_desktop_apps() -> Vec<AppInfo> {
    let mut desktop_files = Vec::new();

    // Standard XDG directories
    let sys_dirs = [
        "/usr/share/applications",
        "/usr/local/share/applications",
        "/var/lib/flatpak/exports/share/applications",
        "/var/lib/snapd/desktop/applications",
    ];

    for d in sys_dirs {
        let p = Path::new(d);
        if p.exists() {
            if let Ok(entries) = fs::read_dir(p) {
                for entry in entries.flatten() {
                    let path = entry.path();
                    if path.is_file() && path.extension().and_then(|s| s.to_str()) == Some("desktop") {
                        desktop_files.push(path);
                    }
                }
            }
        }
    }

    if let Some(home) = dirs::home_dir() {
        let user_dirs = [
            home.join(".local/share/applications"),
            home.join(".local/share/flatpak/exports/share/applications"),
        ];

        for d in user_dirs {
            if d.exists() {
                if let Ok(entries) = fs::read_dir(d) {
                    for entry in entries.flatten() {
                        let path = entry.path();
                        if path.is_file() && path.extension().and_then(|s| s.to_str()) == Some("desktop") {
                            desktop_files.push(path);
                        }
                    }
                }
            }
        }
    }

    let mut apps = Vec::new();
    let mut seen_canonicals = HashSet::new();

    for path in desktop_files {
        if let Some(app) = parse_desktop_file(&path) {
            // Deduplicate if identical desktop app found in multiple search paths
            let key = format!("{}:{}", app.source.as_str(), app.canonical_name);
            if !seen_canonicals.contains(&key) {
                seen_canonicals.insert(key);
                apps.push(app);
            }
        }
    }

    // Sort alphabetically by name
    apps.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    apps
}

fn parse_desktop_file(path: &Path) -> Option<AppInfo> {
    let content = fs::read_to_string(path).ok()?;

    let mut in_entry_section = false;
    let mut name = None;
    let mut generic_name = None;
    let mut comment = None;
    let mut exec = None;
    let mut icon_name = None;
    let mut no_display = false;
    let mut app_type = None;

    for line in content.lines() {
        let line = line.trim();
        if line.starts_with('[') && line.ends_with(']') {
            in_entry_section = line == "[Desktop Entry]";
            continue;
        }

        if !in_entry_section {
            continue;
        }

        if let Some((k, v)) = line.split_once('=') {
            let key = k.trim();
            let val = v.trim();

            match key {
                "Type" => app_type = Some(val.to_string()),
                "Name" if name.is_none() => name = Some(val.to_string()),
                "GenericName" if generic_name.is_none() => generic_name = Some(val.to_string()),
                "Comment" if comment.is_none() => comment = Some(val.to_string()),
                "Exec" if exec.is_none() => exec = Some(val.to_string()),
                "Icon" if icon_name.is_none() => icon_name = Some(val.to_string()),
                "NoDisplay" => no_display = val.eq_ignore_ascii_case("true"),
                _ => {}
            }
        }
    }

    // Must be an application and not hidden
    if app_type.as_deref() != Some("Application") || no_display {
        return None;
    }

    let display_name = name?;
    let path_str = path.to_string_lossy();

    // Determine package manager source
    let (source, is_sandboxed) = if path_str.contains("flatpak") {
        (SourceType::Flatpak, true)
    } else if path_str.contains("snap") {
        (SourceType::Snap, true)
    } else if path_str.contains("omnipkg_") {
        (SourceType::AppImage, true)
    } else {
        // Native (Pacman, APT, DNF based on active OS)
        let os = crate::os_detector::detect_os();
        let src = match os.native_manager.as_str() {
            "apt" => SourceType::Apt,
            "dnf" => SourceType::Dnf,
            _ => SourceType::Pacman,
        };
        (src, false)
    };

    let filename = path.file_stem().and_then(|s| s.to_str()).unwrap_or("");
    let canonical = crate::duplicates::normalize_name(filename);

    // Clean Exec command (strip parameters like %u, %F, @@u etc.)
    let clean_exec = exec.map(|e| {
        let mut parts = Vec::new();
        for p in e.split_whitespace() {
            if !p.starts_with('%') && !p.starts_with("@@") {
                parts.push(p);
            }
        }
        parts.join(" ")
    });

    let description = comment
        .or(generic_name)
        .unwrap_or_else(|| format!("Aplicación de escritorio {}", display_name));

    // Try resolving icon to a base64 data URI
    let icon_data_uri = icon_name.as_deref().and_then(resolve_icon_data_uri);

    // Calculate disk space
    let breakdown = get_app_data_breakdown(&canonical, filename, source.as_str(), 45 * 1024 * 1024);
    let total_size = breakdown.binary_bytes + breakdown.data_bytes + breakdown.cache_bytes + breakdown.config_bytes;

    Some(AppInfo {
        id: format!("{}:{}", source.as_str(), filename),
        name: display_name,
        canonical_name: canonical,
        version: "instalada".to_string(),
        source,
        description,
        size_bytes: total_size,
        size_breakdown: breakdown,
        icon: icon_data_uri,
        install_date: None,
        is_duplicate: false,
        duplicate_group: None,
        exec_path: clean_exec,
        is_sandboxed,
        has_update: false,
    })
}

fn resolve_icon_data_uri(icon_name: &str) -> Option<String> {
    // 1. Direct path
    let icon_path = Path::new(icon_name);
    if icon_path.is_absolute() && icon_path.exists() {
        return read_file_as_data_uri(icon_path);
    }

    // 2. Search pixmaps
    let pixmaps_dir = Path::new("/usr/share/pixmaps");
    for ext in &["png", "svg", "xpm"] {
        let candidate = pixmaps_dir.join(format!("{}.{}", icon_name, ext));
        if candidate.exists() {
            return read_file_as_data_uri(&candidate);
        }
    }

    // 3. Search hicolor icons
    let sizes = ["scalable", "128x128", "64x64", "48x48", "256x256", "32x32"];
    let icon_roots = [
        PathBuf::from("/usr/share/icons/hicolor"),
        PathBuf::from("/var/lib/flatpak/exports/share/icons/hicolor"),
    ];

    for root in &icon_roots {
        for size in &sizes {
            let apps_dir = root.join(size).join("apps");
            for ext in &["png", "svg"] {
                let candidate = apps_dir.join(format!("{}.{}", icon_name, ext));
                if candidate.exists() {
                    return read_file_as_data_uri(&candidate);
                }
            }
        }
    }

    None
}

fn read_file_as_data_uri(path: &Path) -> Option<String> {
    let bytes = fs::read(path).ok()?;
    let ext = path.extension().and_then(|s| s.to_str()).unwrap_or("png").to_lowercase();
    let mime = match ext.as_str() {
        "svg" => "image/svg+xml",
        "png" => "image/png",
        "xpm" => "image/x-xpixmap",
        _ => "image/png",
    };

    let b64 = to_base64(&bytes);
    Some(format!("data:{};base64,{}", mime, b64))
}

fn to_base64(data: &[u8]) -> String {
    const CHARSET: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    let mut result = String::with_capacity((data.len() + 2) / 3 * 4);
    for chunk in data.chunks(3) {
        let b0 = chunk[0] as usize;
        let b1 = if chunk.len() > 1 { chunk[1] as usize } else { 0 };
        let b2 = if chunk.len() > 2 { chunk[2] as usize } else { 0 };
        let triple = (b0 << 16) | (b1 << 8) | b2;
        result.push(CHARSET[(triple >> 18) & 0x3F] as char);
        result.push(CHARSET[(triple >> 12) & 0x3F] as char);
        if chunk.len() > 1 {
            result.push(CHARSET[(triple >> 6) & 0x3F] as char);
        } else {
            result.push('=');
        }
        if chunk.len() > 2 {
            result.push(CHARSET[triple & 0x3F] as char);
        } else {
            result.push('=');
        }
    }
    result
}

pub fn get_installed_canonical_identities() -> HashSet<String> {
    let mut set = HashSet::new();

    // Add all desktop apps
    for app in list_desktop_apps() {
        set.insert(app.canonical_name.to_lowercase());
        set.insert(app.name.to_lowercase());
        let id_part = app.id.split(':').nth(1).unwrap_or("").to_lowercase();
        if !id_part.is_empty() {
            set.insert(id_part);
        }
    }

    // Add flatpak IDs
    let flatpak_out = std::process::Command::new("flatpak")
        .args(["list", "--app", "--columns=application"])
        .output();
    if let Ok(out) = flatpak_out {
        for line in String::from_utf8_lossy(&out.stdout).lines() {
            let l = line.trim().to_lowercase();
            if !l.is_empty() {
                set.insert(l.clone());
                set.insert(crate::duplicates::normalize_name(&l));
            }
        }
    }

    // Add explicitly installed pacman packages
    let pacman_out = std::process::Command::new("pacman")
        .args(["-Qqe"])
        .output();
    if let Ok(out) = pacman_out {
        for line in String::from_utf8_lossy(&out.stdout).lines() {
            let l = line.trim().to_lowercase();
            if !l.is_empty() {
                set.insert(l.clone());
                set.insert(crate::duplicates::normalize_name(&l));
            }
        }
    }

    set
}
