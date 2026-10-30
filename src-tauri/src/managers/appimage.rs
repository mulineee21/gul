use std::fs;
use std::os::unix::fs::PermissionsExt;
use std::path::{Path, PathBuf};
use std::process::Command;
use crate::models::{AppImageEntry, AppInfo, SizeBreakdown, SourceType};

pub fn get_search_directories() -> Vec<PathBuf> {
    let mut dirs_list = Vec::new();
    if let Some(home) = dirs::home_dir() {
        let app_dir = home.join("Applications");
        if app_dir.exists() {
            dirs_list.push(app_dir);
        }

        let downloads = home.join("Downloads");
        if downloads.exists() {
            dirs_list.push(downloads);
        }

        let descargas = home.join("Descargas");
        if descargas.exists() {
            dirs_list.push(descargas);
        }

        let local_bin = home.join(".local/bin");
        if local_bin.exists() {
            dirs_list.push(local_bin);
        }

        let bin = home.join("bin");
        if bin.exists() {
            dirs_list.push(bin);
        }
    }
    dirs_list
}

pub fn parse_appimage_name(filename: &str) -> (String, Option<String>) {
    let stem = filename
        .strip_suffix(".AppImage")
        .or_else(|| filename.strip_suffix(".appimage"))
        .unwrap_or(filename);

    let parts: Vec<&str> = stem.split(&['-', '_'][..]).collect();
    if parts.len() > 1 {
        let last = parts[parts.len() - 1];
        if last.chars().any(|c| c.is_ascii_digit()) {
            let name = parts[..parts.len() - 1].join(" ");
            return (name, Some(last.to_string()));
        }
    }

    (stem.replace(['-', '_'], " "), None)
}

pub fn get_desktop_dir() -> Option<PathBuf> {
    dirs::data_dir().map(|d| d.join("applications"))
}

pub fn is_appimage_integrated(path: &Path) -> (bool, Option<PathBuf>) {
    let desktop_dir = match get_desktop_dir() {
        Some(d) => d,
        None => return (false, None),
    };

    let filename = path.file_name().and_then(|f| f.to_str()).unwrap_or("");
    let desktop_name = format!("omnipkg_{}.desktop", filename.replace(' ', "_"));
    let target = desktop_dir.join(desktop_name);

    if target.exists() {
        return (true, Some(target));
    }

    // Also check standard desktop files in desktop_dir containing path
    if let Ok(entries) = fs::read_dir(&desktop_dir) {
        for entry in entries.flatten() {
            if let Ok(content) = fs::read_to_string(entry.path()) {
                if content.contains(path.to_string_lossy().as_ref()) {
                    return (true, Some(entry.path()));
                }
            }
        }
    }

    (false, None)
}

pub fn scan_appimages(extra_paths: &[String]) -> Vec<AppImageEntry> {
    let mut search_paths = get_search_directories();
    for p in extra_paths {
        let pb = PathBuf::from(p);
        if pb.exists() && !search_paths.contains(&pb) {
            search_paths.push(pb);
        }
    }

    let mut entries = Vec::new();

    for dir in search_paths {
        if let Ok(read_dir) = fs::read_dir(&dir) {
            for entry in read_dir.flatten() {
                let path = entry.path();
                if path.is_file() {
                    let file_name = path.file_name().and_then(|f| f.to_str()).unwrap_or("");
                    if file_name.ends_with(".AppImage") || file_name.ends_with(".appimage") {
                        let (name, ver) = parse_appimage_name(file_name);
                        let meta = fs::metadata(&path).ok();
                        let size = meta.as_ref().map(|m| m.len()).unwrap_or(0);
                        let (is_integrated, desktop_path) = is_appimage_integrated(&path);

                        let mod_time = meta.and_then(|m| m.modified().ok()).map(|t| {
                            let dt: ChronoDummy = t.into();
                            dt.to_string()
                        });

                        entries.push(AppImageEntry {
                            path: path.to_string_lossy().to_string(),
                            name,
                            version: ver,
                            size_bytes: size,
                            is_integrated,
                            desktop_file_path: desktop_path.map(|p| p.to_string_lossy().to_string()),
                            icon_path: None,
                            has_update_info: true,
                            last_modified: mod_time,
                        });
                    }
                }
            }
        }
    }

    entries
}

pub fn integrate_appimage(appimage_path_str: &str) -> Result<String, String> {
    let path = PathBuf::from(appimage_path_str);
    if !path.exists() {
        return Err("El archivo AppImage no existe".to_string());
    }

    // 1. Ensure executable chmod +x
    if let Ok(meta) = fs::metadata(&path) {
        let mut perms = meta.permissions();
        perms.set_mode(perms.mode() | 0o111);
        let _ = fs::set_permissions(&path, perms);
    }

    // 2. Prepare desktop file
    let desktop_dir = get_desktop_dir().ok_or("No se encontró el directorio de aplicaciones XDG")?;
    if !desktop_dir.exists() {
        fs::create_dir_all(&desktop_dir).map_err(|e| e.to_string())?;
    }

    let filename = path.file_name().and_then(|f| f.to_str()).unwrap_or("app");
    let (name, _) = parse_appimage_name(filename);
    let desktop_file_name = format!("omnipkg_{}.desktop", filename.replace(' ', "_"));
    let target_desktop = desktop_dir.join(desktop_file_name);

    let desktop_content = format!(
        "[Desktop Entry]\n\
         Type=Application\n\
         Name={name}\n\
         Exec=\"{path_str}\" %U\n\
         Icon=application-x-executable\n\
         Terminal=false\n\
         Categories=Utility;Application;\n\
         Comment=Integrado y gestionado con GUL (Gestor Universal de Linux)\n\
         X-AppImage-Path={path_str}\n",
        name = name,
        path_str = path.to_string_lossy()
    );

    fs::write(&target_desktop, desktop_content).map_err(|e| e.to_string())?;

    // 3. Update desktop database if available
    let _ = Command::new("update-desktop-database")
        .arg(&desktop_dir)
        .output();

    Ok(target_desktop.to_string_lossy().to_string())
}

pub fn unintegrate_appimage(appimage_path_str: &str) -> Result<bool, String> {
    let path = PathBuf::from(appimage_path_str);
    let (is_integrated, desktop_path) = is_appimage_integrated(&path);

    if is_integrated {
        if let Some(dp) = desktop_path {
            let _ = fs::remove_file(dp);
            if let Some(desktop_dir) = get_desktop_dir() {
                let _ = Command::new("update-desktop-database")
                    .arg(desktop_dir)
                    .output();
            }
            return Ok(true);
        }
    }

    Ok(false)
}

pub fn to_app_info(entry: &AppImageEntry) -> AppInfo {
    let canonical = crate::duplicates::normalize_name(&entry.name);
    let breakdown = SizeBreakdown {
        binary_bytes: entry.size_bytes,
        data_bytes: 0,
        cache_bytes: 0,
        config_bytes: 0,
    };

    AppInfo {
        id: format!("appimage:{}", entry.path),
        name: entry.name.clone(),
        canonical_name: canonical,
        version: entry.version.clone().unwrap_or_else(|| "1.0".to_string()),
        source: SourceType::AppImage,
        description: format!(
            "AppImage portátil ({}) - {}",
            if entry.is_integrated { "Integrada en menú" } else { "Sin integrar" },
            entry.path
        ),
        size_bytes: entry.size_bytes,
        size_breakdown: breakdown,
        icon: None,
        install_date: entry.last_modified.clone(),
        is_duplicate: false,
        duplicate_group: None,
        exec_path: Some(entry.path.clone()),
        is_sandboxed: true,
        has_update: false,
    }
}

// Simple helper for time formatting without huge external crates
struct ChronoDummy(std::time::SystemTime);
impl From<std::time::SystemTime> for ChronoDummy {
    fn from(t: std::time::SystemTime) -> Self {
        ChronoDummy(t)
    }
}
impl std::fmt::Display for ChronoDummy {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{:?}", self.0)
    }
}
