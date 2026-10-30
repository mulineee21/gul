use std::fs;
use std::process::Command;
use crate::models::OmniProfile;
use crate::os_detector::detect_os;

pub fn export_profile() -> OmniProfile {
    let os_info = detect_os();

    // 1. Gather explicitly installed native packages
    let mut native_packages = Vec::new();
    if os_info.native_manager == "pacman" {
        if let Ok(out) = Command::new("pacman").args(["-Qe", "-q"]).output() {
            let text = String::from_utf8_lossy(&out.stdout);
            for line in text.lines() {
                let pkg = line.trim();
                if !pkg.is_empty() {
                    native_packages.push(pkg.to_string());
                }
            }
        }
    } else if os_info.native_manager == "apt" {
        if let Ok(out) = Command::new("apt-mark").arg("showmanual").output() {
            let text = String::from_utf8_lossy(&out.stdout);
            for line in text.lines() {
                let pkg = line.trim();
                if !pkg.is_empty() {
                    native_packages.push(pkg.to_string());
                }
            }
        }
    } else if os_info.native_manager == "dnf" {
        if let Ok(out) = Command::new("dnf").args(["repoquery", "--userinstalled", "-q"]).output() {
            let text = String::from_utf8_lossy(&out.stdout);
            for line in text.lines() {
                let pkg = line.trim();
                if !pkg.is_empty() {
                    native_packages.push(pkg.to_string());
                }
            }
        }
    } else if os_info.native_manager == "portage" {
        if let Ok(content) = fs::read_to_string("/var/lib/portage/world") {
            for line in content.lines() {
                let pkg = line.trim();
                if !pkg.is_empty() && !pkg.starts_with('#') {
                    native_packages.push(pkg.to_string());
                }
            }
        }
    }

    // 2. Gather installed Flatpaks
    let mut flatpak_apps = Vec::new();
    if let Ok(out) = Command::new("flatpak").args(["list", "--app", "--columns=application"]).output() {
        let text = String::from_utf8_lossy(&out.stdout);
        for line in text.lines() {
            let app = line.trim();
            if !app.is_empty() && app.contains('.') {
                flatpak_apps.push(app.to_string());
            }
        }
    }

    // 3. Gather installed Snaps
    let mut snap_apps = Vec::new();
    if let Ok(out) = Command::new("snap").args(["list"]).output() {
        let text = String::from_utf8_lossy(&out.stdout);
        for line in text.lines().skip(1) {
            let parts: Vec<&str> = line.split_whitespace().collect();
            if let Some(name) = parts.first() {
                if *name != "core"
                    && *name != "core18"
                    && *name != "core20"
                    && *name != "core22"
                    && *name != "core24"
                    && *name != "snapd"
                    && *name != "bare"
                {
                    snap_apps.push(name.to_string());
                }
            }
        }
    }

    let total = native_packages.len() + flatpak_apps.len() + snap_apps.len();

    let date_str = chrono_or_date();

    OmniProfile {
        version: "1.0".to_string(),
        export_date: date_str,
        distro: os_info.distro_name,
        native_manager: os_info.native_manager,
        native_packages,
        flatpak_apps,
        snap_apps,
        total_apps: total,
    }
}

pub fn save_profile_file(custom_path: Option<String>) -> Result<String, String> {
    let profile = export_profile();
    let json_text = serde_json::to_string_pretty(&profile).map_err(|e| e.to_string())?;

    let target_path = if let Some(p) = custom_path {
        p
    } else {
        // Try file save dialog with zenity or kdialog
        let zenity_res = Command::new("zenity")
            .args(["--file-selection", "--save", "--confirm-overwrite", "--filename=omnipkg-perfil.json"])
            .output();

        match zenity_res {
            Ok(out) if out.status.success() => {
                String::from_utf8_lossy(&out.stdout).trim().to_string()
            }
            _ => {
                let home = dirs::home_dir().ok_or("No se encontró directorio personal")?;
                home.join("omnipkg-perfil.json").to_string_lossy().to_string()
            }
        }
    };

    fs::write(&target_path, json_text).map_err(|e| e.to_string())?;
    Ok(target_path)
}

pub fn load_profile_file(custom_path: Option<String>) -> Result<OmniProfile, String> {
    let path = if let Some(p) = custom_path {
        p
    } else {
        // Open file dialog with zenity or kdialog
        let zenity_res = Command::new("zenity")
            .args(["--file-selection", "--title=Selecciona un archivo omnipkg-perfil.json", "--file-filter=*.json"])
            .output();

        match zenity_res {
            Ok(out) if out.status.success() => {
                String::from_utf8_lossy(&out.stdout).trim().to_string()
            }
            _ => {
                return Err("Selección de archivo cancelada".to_string());
            }
        }
    };

    let content = fs::read_to_string(&path).map_err(|e| format!("No se pudo leer el archivo: {}", e))?;
    let profile: OmniProfile = serde_json::from_str(&content).map_err(|e| format!("Formato de perfil inválido: {}", e))?;
    Ok(profile)
}

fn chrono_or_date() -> String {
    if let Ok(out) = Command::new("date").arg("+%Y-%m-%d %H:%M").output() {
        String::from_utf8_lossy(&out.stdout).trim().to_string()
    } else {
        "2026-10-30".to_string()
    }
}
