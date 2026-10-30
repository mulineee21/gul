use std::collections::HashMap;
use std::fs;
use std::os::unix::fs::PermissionsExt;
use std::process::Command;
use tauri::{AppHandle, Emitter};
use crate::models::{InstallOption, InstallProgressEvent, SourceType};
use crate::os_detector::detect_os;

pub fn get_install_options(app_name: &str, canonical_name: &str, current_pkg_id: &str) -> Vec<InstallOption> {
    let os_info = detect_os();
    let installed_identities = crate::desktop_apps::get_installed_canonical_identities();

    let mut options = Vec::new();
    let clean_name = crate::duplicates::normalize_name(
        if !canonical_name.is_empty() {
            canonical_name
        } else {
            app_name
        }
    );

    // 1. NATIVE PACKAGE MANAGER (Pacman / APT / DNF based on detected OS)
    let native_mgr = os_info.native_manager.clone();
    let (native_pkg_name, native_version) = resolve_native_package(app_name, canonical_name, current_pkg_id, &native_mgr);
    let native_installed = installed_identities.contains(&native_pkg_name.to_lowercase())
        || installed_identities.contains(&clean_name)
        || installed_identities.contains(&app_name.to_lowercase());

    let native_source = match native_mgr.as_str() {
        "apt" => SourceType::Apt,
        "dnf" => SourceType::Dnf,
        _ => SourceType::Pacman,
    };

    options.push(InstallOption {
        source: native_source,
        title: format!("Paquete Nativo del Sistema ({})", native_mgr.to_uppercase()),
        subtitle: format!("Compilado específicamente para {}", os_info.distro_name),
        version: if native_version.is_empty() { "Repositorio Oficial".to_string() } else { native_version },
        pkg_id: native_pkg_name,
        is_installed: native_installed,
        pros: vec![
            "Mayor velocidad y rendimiento sin sobrecarga".to_string(),
            "Arranque instantáneo y menor consumo de RAM".to_string(),
            "Integración nativa con el tema y hardware de tu sistema".to_string(),
        ],
        badge_label: format!("Nativo ({})", native_mgr.to_uppercase()),
        download_url: None,
    });

    // 2. FLATPAK (FLATHUB)
    let flathub_id = resolve_flathub_id(&clean_name, current_pkg_id);
    let flatpak_installed = installed_identities.contains(&flathub_id.to_lowercase())
        || installed_identities.contains(&clean_name);

    options.push(InstallOption {
        source: SourceType::Flatpak,
        title: "Contenedor Flatpak (Flathub)".to_string(),
        subtitle: "Aplicación en contenedor aislado con permisos seguros".to_string(),
        version: "Última versión estable".to_string(),
        pkg_id: flathub_id,
        is_installed: flatpak_installed,
        pros: vec![
            "Aislamiento seguro (Sandbox): no altera librerías del sistema".to_string(),
            "Versión siempre actualizada directamente por los desarrolladores".to_string(),
            "Compatible con cualquier distribución de Linux".to_string(),
        ],
        badge_label: "Flathub".to_string(),
        download_url: None,
    });

    // 3. APPIMAGE (PORTABLE)
    let (appimage_url, appimage_available) = resolve_appimage_url(&clean_name);
    let appimage_installed = check_appimage_installed(&clean_name);

    options.push(InstallOption {
        source: SourceType::AppImage,
        title: "AppImage Portable".to_string(),
        subtitle: "Ejecutable autocontenido que se integra automáticamente en tu menú".to_string(),
        version: if appimage_available { "Versión Portable Oficial".to_string() } else { "Instalación desde URL o archivo".to_string() },
        pkg_id: format!("appimage:{}", clean_name),
        is_installed: appimage_installed,
        pros: vec![
            "Ejecutable autónomo: llévalo en USB o carpeta personal".to_string(),
            "Integración automática en el menú de aplicaciones (.desktop)".to_string(),
            "No requiere permisos de superusuario (root/sudo)".to_string(),
        ],
        badge_label: "AppImage".to_string(),
        download_url: appimage_url,
    });

    options
}

fn resolve_native_package(
    app_name: &str,
    canonical_name: &str,
    pkg_id: &str,
    native_mgr: &str,
) -> (String, String) {
    let mut candidates = Vec::new();

    // Candidate 1: Normalized app name (e.g. "darktable", "vlc", "blender")
    let norm_app = crate::duplicates::normalize_name(app_name);
    if !norm_app.is_empty() {
        candidates.push(norm_app.clone());
    }

    // Candidate 2: Normalized canonical name
    let norm_canon = crate::duplicates::normalize_name(canonical_name);
    if !norm_canon.is_empty() && !candidates.contains(&norm_canon) {
        candidates.push(norm_canon);
    }

    // Candidate 3: Normalized pkg_id
    let clean_pkg_id = pkg_id.trim_start_matches("pacman:").trim_start_matches("flatpak:").trim_start_matches("apt:").trim_start_matches("dnf:");
    let norm_pkg = crate::duplicates::normalize_name(clean_pkg_id);
    if !norm_pkg.is_empty() && !candidates.contains(&norm_pkg) {
        candidates.push(norm_pkg);
    }

    // Candidate 4: Last segment of reverse-DNS
    if clean_pkg_id.contains('.') {
        if let Some(last) = clean_pkg_id.split('.').last() {
            let last_low = last.to_lowercase();
            if !candidates.contains(&last_low) {
                candidates.push(last_low);
            }
        }
    }

    // Candidate 5: lowercase app name directly
    let direct_low = app_name.to_lowercase().replace(' ', "-");
    if !candidates.contains(&direct_low) {
        candidates.push(direct_low);
    }

    if native_mgr == "pacman" {
        // Step 1: Check exact match with `pacman -Si`
        for candidate in &candidates {
            if let Ok(out) = Command::new("pacman").env("LC_ALL", "C").args(["-Si", candidate]).output() {
                if out.status.success() {
                    let text = String::from_utf8_lossy(&out.stdout);
                    let mut version = "Repositorio Oficial".to_string();
                    for line in text.lines() {
                        if line.starts_with("Version") || line.starts_with("Versión") {
                            if let Some((_, v)) = line.split_once(':') {
                                version = v.trim().to_string();
                                break;
                            }
                        }
                    }
                    return (candidate.clone(), version);
                }
            }
        }

        // Step 2: Fallback query with `pacman -Ss`
        for candidate in &candidates {
            if let Ok(out) = Command::new("pacman").env("LC_ALL", "C").args(["-Ss", candidate]).output() {
                let text = String::from_utf8_lossy(&out.stdout);
                for line in text.lines() {
                    let parts: Vec<&str> = line.split_whitespace().collect();
                    if !parts.is_empty() && parts[0].contains('/') {
                        let pkg = parts[0].split('/').nth(1).unwrap_or(parts[0]);
                        if pkg == candidate || pkg == norm_app {
                            let ver = parts.get(1).unwrap_or(&"").to_string();
                            return (pkg.to_string(), ver);
                        }
                    }
                }
            }
        }
    } else if native_mgr == "apt" {
        for candidate in &candidates {
            if let Ok(out) = Command::new("apt-cache").args(["show", candidate]).output() {
                if out.status.success() {
                    let text = String::from_utf8_lossy(&out.stdout);
                    for line in text.lines() {
                        if line.starts_with("Version:") {
                            let ver = line.trim_start_matches("Version:").trim().to_string();
                            return (candidate.clone(), ver);
                        }
                    }
                    return (candidate.clone(), "Repositorio APT".to_string());
                }
            }
        }
    } else if native_mgr == "dnf" {
        for candidate in &candidates {
            if let Ok(out) = Command::new("dnf").args(["info", "-q", candidate]).output() {
                if out.status.success() {
                    return (candidate.clone(), "Repositorio DNF".to_string());
                }
            }
        }
    }

    // Default to the cleanest candidate
    let fallback = candidates.into_iter().next().unwrap_or_else(|| norm_app);
    (fallback, "Repositorio Oficial".to_string())
}

fn resolve_flathub_id(canonical_name: &str, current_pkg_id: &str) -> String {
    if current_pkg_id.contains('.') && !current_pkg_id.starts_with("pacman:") && !current_pkg_id.starts_with("appimage:") {
        return current_pkg_id.trim_start_matches("flatpak:").to_string();
    }

    let map: HashMap<&str, &str> = HashMap::from([
        ("vlc", "org.videolan.VLC"),
        ("gimp", "org.gimp.GIMP"),
        ("blender", "org.blender.Blender"),
        ("firefox", "org.mozilla.firefox"),
        ("spotify", "com.spotify.Client"),
        ("alacritty", "org.alacritty.Alacritty"),
        ("obs", "com.obsproject.Studio"),
        ("obs-studio", "com.obsproject.Studio"),
        ("code", "com.visualstudio.code"),
        ("vscode", "com.visualstudio.code"),
        ("audacity", "org.audacityteam.Audacity"),
        ("discord", "com.discordapp.Discord"),
        ("steam", "com.valvesoftware.Steam"),
        ("telegram", "org.telegram.desktop"),
        ("google-chrome", "com.google.Chrome"),
        ("chrome", "com.google.Chrome"),
        ("brave", "com.brave.Browser"),
        ("brave-browser", "com.brave.Browser"),
        ("inkscape", "org.inkscape.Inkscape"),
        ("kdenlive", "org.kde.kdenlive"),
        ("krita", "org.kde.krita"),
        ("libreoffice", "org.libreoffice.LibreOffice"),
        ("thunderbird", "org.mozilla.Thunderbird"),
        ("handbrake", "fr.handbrake.ghb"),
    ]);

    if let Some(&id) = map.get(canonical_name) {
        return id.to_string();
    }

    format!("org.{}.{}", canonical_name, canonical_name)
}

fn resolve_appimage_url(canonical_name: &str) -> (Option<String>, bool) {
    let map: HashMap<&str, &str> = HashMap::from([
        ("blender", "https://download.blender.org/release/Blender4.3/blender-4.3.2-linux-x64.tar.xz"),
        ("krita", "https://download.kde.org/stable/krita/5.2.6/krita-5.2.6-x86_64.appimage"),
        ("inkscape", "https://media.inkscape.org/dl/resources/file/Inkscape-e7c3feb-x86_64.AppImage"),
        ("freecad", "https://github.com/FreeCAD/FreeCAD/releases/download/1.0.0/FreeCAD_1.0.0-conda-Linux-x86_64-py311.AppImage"),
        ("kdenlive", "https://download.kde.org/stable/kdenlive/24.12/linux/kdenlive-24.12.2-x86_64.AppImage"),
        ("lmms", "https://github.com/LMMS/lmms/releases/download/v1.2.2/lmms-1.2.2-linux-x86_64.AppImage"),
        ("obsidian", "https://github.com/obsidianmd/obsidian-releases/releases/download/v1.7.7/Obsidian-1.7.7.AppImage"),
        ("cura", "https://github.com/Ultimaker/Cura/releases/download/5.9.0/UltiMaker-Cura-5.9.0-linux-X64.AppImage"),
    ]);

    if let Some(&url) = map.get(canonical_name) {
        (Some(url.to_string()), true)
    } else {
        (None, false)
    }
}

fn check_appimage_installed(canonical_name: &str) -> bool {
    let entries = crate::managers::appimage::scan_appimages(&[]);
    entries.iter().any(|e| {
        let c = crate::duplicates::normalize_name(&e.name);
        c == canonical_name || e.name.to_lowercase().contains(canonical_name)
    })
}

pub async fn download_and_install_appimage(
    app: AppHandle,
    app_name: String,
    download_url: String,
) -> Result<String, String> {
    let id = format!("appimage:{}", app_name);

    let _ = app.emit("install-progress", InstallProgressEvent {
        id: id.clone(),
        status: "starting".to_string(),
        message: format!("Descargando AppImage para {}...", app_name),
        line: Some(format!("[GUL] Conectando con servidor de descarga: {}", download_url)),
        progress_pct: Some(5.0),
        step: Some("Iniciando descarga...".to_string()),
        is_stderr: Some(false),
    });

    let home = dirs::home_dir().ok_or("No se encontró el directorio de usuario")?;
    let app_dir = home.join("Applications");
    if !app_dir.exists() {
        fs::create_dir_all(&app_dir).map_err(|e| e.to_string())?;
    }

    let clean_filename = format!("{}.AppImage", app_name.replace(' ', "_"));
    let target_path = app_dir.join(clean_filename);

    let mut child = tokio::process::Command::new("curl")
        .args([
            "-L",
            "--progress-bar",
            "-o",
            target_path.to_str().unwrap(),
            &download_url,
        ])
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn()
        .map_err(|e| format!("Fallo al iniciar comando curl: {}", e))?;

    let stdout = child.stdout.take();
    let stderr = child.stderr.take();

    let app_out = app.clone();
    let id_out = id.clone();
    let stdout_handle = tokio::spawn(async move {
        if let Some(out) = stdout {
            crate::catalog::stream_process_output(out, app_out, id_out, false).await;
        }
    });

    let app_err = app.clone();
    let id_err = id.clone();
    let stderr_handle = tokio::spawn(async move {
        if let Some(err) = stderr {
            crate::catalog::stream_process_output(err, app_err, id_err, true).await;
        }
    });

    let _ = tokio::join!(stdout_handle, stderr_handle);
    let status = child.wait().await.map_err(|e| e.to_string())?;

    if !status.success() {
        let err = format!("Curl finalizó con código de error {:?}", status.code());
        let _ = app.emit("install-progress", InstallProgressEvent {
            id: id.clone(),
            status: "error".to_string(),
            message: err.clone(),
            line: Some(format!("[GUL Error] {}", err)),
            progress_pct: None,
            step: Some("Error al descargar".to_string()),
            is_stderr: Some(true),
        });
        return Err(err);
    }

    // chmod +x
    let _ = app.emit("install-progress", InstallProgressEvent {
        id: id.clone(),
        status: "installing".to_string(),
        message: "Asignando permisos ejecutables...".to_string(),
        line: Some("[GUL] Asignando permisos de ejecución (chmod +x)...".to_string()),
        progress_pct: Some(85.0),
        step: Some("Configurando permisos...".to_string()),
        is_stderr: Some(false),
    });

    if let Ok(meta) = fs::metadata(&target_path) {
        let mut perms = meta.permissions();
        perms.set_mode(perms.mode() | 0o111);
        let _ = fs::set_permissions(&target_path, perms);
    }

    // Integrate into desktop menu
    let _ = app.emit("install-progress", InstallProgressEvent {
        id: id.clone(),
        status: "installing".to_string(),
        message: "Integrando aplicación en el menú de escritorio...".to_string(),
        line: Some(format!("[GUL] Generando acceso directo .desktop en ~/.local/share/applications/ para {}", app_name)),
        progress_pct: Some(95.0),
        step: Some("Integrando en menú...".to_string()),
        is_stderr: Some(false),
    });

    let desktop_file = crate::managers::appimage::integrate_appimage(&target_path.to_string_lossy())?;

    let _ = app.emit("install-progress", InstallProgressEvent {
        id: id.clone(),
        status: "success".to_string(),
        message: format!("¡AppImage de {} integrada con éxito en el lanzador!", app_name),
        line: Some(format!("[GUL] Archivo de acceso directo creado: {}\n[GUL] ¡Completado!", desktop_file)),
        progress_pct: Some(100.0),
        step: Some("Instalación completada".to_string()),
        is_stderr: Some(false),
    });

    Ok(desktop_file)
}

pub fn pick_and_install_local_appimage(app: AppHandle) -> Result<String, String> {
    // Try zenity first, then kdialog
    let zenity_res = Command::new("zenity")
        .args([
            "--file-selection",
            "--title=Selecciona un archivo .AppImage para integrar",
            "--file-filter=Archivos AppImage (*.AppImage *.appimage) | *.AppImage *.appimage",
        ])
        .output();

    let path_str = match zenity_res {
        Ok(out) if out.status.success() => {
            String::from_utf8_lossy(&out.stdout).trim().to_string()
        }
        _ => {
            let kdialog_res = Command::new("kdialog")
                .args([
                    "--getopenfilename",
                    ":",
                    "*.AppImage *.appimage|Archivos AppImage",
                ])
                .output();

            match kdialog_res {
                Ok(out) if out.status.success() => {
                    String::from_utf8_lossy(&out.stdout).trim().to_string()
                }
                _ => return Err("Operación cancelada por el usuario".to_string()),
            }
        }
    };

    if path_str.is_empty() {
        return Err("No se seleccionó ningún archivo".to_string());
    }

    let desktop_path = crate::managers::appimage::integrate_appimage(&path_str)?;

    let _ = app.emit("install-progress", InstallProgressEvent {
        id: format!("appimage:{}", path_str),
        status: "success".to_string(),
        message: format!("¡AppImage integrada correctamente en el menú de aplicaciones!"),
        line: Some(format!("[GUL] AppImage integrada con éxito: {}", desktop_path)),
        progress_pct: Some(100.0),
        step: Some("Integración completada".to_string()),
        is_stderr: Some(false),
    });

    Ok(desktop_path)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_darktable_options() {
        let opts = get_install_options("Darktable", "org.darktable.Darktable", "org.darktable.Darktable");
        let pacman_opt = opts.iter().find(|o| o.source == SourceType::Pacman).expect("pacman option missing");
        assert_eq!(pacman_opt.pkg_id, "darktable");
    }

    #[test]
    fn test_vlc_options() {
        let opts = get_install_options("VLC media player", "vlc", "org.videolan.VLC");
        let pacman_opt = opts.iter().find(|o| o.source == SourceType::Pacman).expect("pacman option missing");
        assert_eq!(pacman_opt.pkg_id, "vlc");
    }
}
