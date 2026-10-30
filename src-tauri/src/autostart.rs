use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use crate::models::AutostartEntry;

pub fn list_autostart_entries() -> Vec<AutostartEntry> {
    let mut entries_map: HashMap<String, AutostartEntry> = HashMap::new();

    let mut dirs_to_scan = Vec::new();

    // 1. System autostart (/etc/xdg/autostart)
    let sys_dir = PathBuf::from("/etc/xdg/autostart");
    if sys_dir.exists() {
        dirs_to_scan.push((sys_dir, true));
    }

    // 2. User autostart (~/.config/autostart) - scanned second so it can override system
    if let Some(home) = dirs::home_dir() {
        let user_dir = home.join(".config/autostart");
        if user_dir.exists() {
            dirs_to_scan.push((user_dir, false));
        }
    }

    for (dir, is_system) in dirs_to_scan {
        if let Ok(read_dir) = fs::read_dir(&dir) {
            for entry in read_dir.flatten() {
                let path = entry.path();
                if path.extension().and_then(|e| e.to_str()) == Some("desktop") {
                    if let Some(parsed) = parse_autostart_desktop(&path, is_system) {
                        entries_map.insert(parsed.id.clone(), parsed);
                    }
                }
            }
        }
    }

    let mut list: Vec<AutostartEntry> = entries_map.into_values().collect();
    list.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    list
}

fn parse_autostart_desktop(path: &Path, is_system: bool) -> Option<AutostartEntry> {
    let content = fs::read_to_string(path).ok()?;
    let id = path.file_name()?.to_string_lossy().to_string();

    let mut name = String::new();
    let mut exec = String::new();
    let mut comment = String::new();
    let mut icon = None;
    let mut is_hidden = false;
    let mut autostart_enabled = true;

    for line in content.lines() {
        let trimmed = line.trim();
        if trimmed.starts_with("Name=") && name.is_empty() {
            name = trimmed.trim_start_matches("Name=").to_string();
        } else if trimmed.starts_with("Exec=") && exec.is_empty() {
            exec = trimmed.trim_start_matches("Exec=").to_string();
        } else if trimmed.starts_with("Comment=") && comment.is_empty() {
            comment = trimmed.trim_start_matches("Comment=").to_string();
        } else if trimmed.starts_with("Icon=") && icon.is_none() {
            icon = Some(trimmed.trim_start_matches("Icon=").to_string());
        } else if trimmed.starts_with("Hidden=") {
            let val = trimmed.trim_start_matches("Hidden=").to_lowercase();
            is_hidden = val == "true";
        } else if trimmed.starts_with("X-GNOME-Autostart-enabled=") {
            let val = trimmed.trim_start_matches("X-GNOME-Autostart-enabled=").to_lowercase();
            autostart_enabled = val != "false";
        }
    }

    if name.is_empty() {
        name = id.trim_end_matches(".desktop").replace(['-', '_'], " ");
    }

    let enabled = !is_hidden && autostart_enabled;

    Some(AutostartEntry {
        id,
        name,
        exec,
        comment,
        icon,
        enabled,
        file_path: path.to_string_lossy().to_string(),
        is_system,
    })
}

pub fn toggle_autostart(id: &str, enable: bool) -> Result<(), String> {
    let home = dirs::home_dir().ok_or("No se encontró el directorio de usuario")?;
    let user_autostart_dir = home.join(".config/autostart");
    if !user_autostart_dir.exists() {
        fs::create_dir_all(&user_autostart_dir).map_err(|e| e.to_string())?;
    }

    let user_path = user_autostart_dir.join(id);

    if user_path.exists() {
        // Read, modify flags, and write back
        let content = fs::read_to_string(&user_path).map_err(|e| e.to_string())?;
        let mut lines = Vec::new();
        let mut found_hidden = false;
        let mut found_enabled = false;

        for line in content.lines() {
            if line.starts_with("Hidden=") {
                lines.push(format!("Hidden={}", if enable { "false" } else { "true" }));
                found_hidden = true;
            } else if line.starts_with("X-GNOME-Autostart-enabled=") {
                lines.push(format!("X-GNOME-Autostart-enabled={}", if enable { "true" } else { "false" }));
                found_enabled = true;
            } else {
                lines.push(line.to_string());
            }
        }

        if !found_hidden {
            lines.push(format!("Hidden={}", if enable { "false" } else { "true" }));
        }
        if !found_enabled {
            lines.push(format!("X-GNOME-Autostart-enabled={}", if enable { "true" } else { "false" }));
        }

        fs::write(&user_path, lines.join("\n")).map_err(|e| e.to_string())?;
    } else {
        // Look in /etc/xdg/autostart
        let sys_path = PathBuf::from("/etc/xdg/autostart").join(id);
        if sys_path.exists() {
            let mut content = fs::read_to_string(&sys_path).unwrap_or_default();
            content.push_str(&format!("\nHidden={}\nX-GNOME-Autostart-enabled={}\n", if enable { "false" } else { "true" }, if enable { "true" } else { "false" }));
            fs::write(&user_path, content).map_err(|e| e.to_string())?;
        }
    }

    Ok(())
}

pub fn add_custom_autostart(name: &str, exec: &str, comment: &str) -> Result<(), String> {
    let home = dirs::home_dir().ok_or("No se encontró el directorio de usuario")?;
    let user_autostart_dir = home.join(".config/autostart");
    if !user_autostart_dir.exists() {
        fs::create_dir_all(&user_autostart_dir).map_err(|e| e.to_string())?;
    }

    let file_name = format!("{}.desktop", name.to_lowercase().replace(' ', "-"));
    let target_path = user_autostart_dir.join(file_name);

    let content = format!(
        "[Desktop Entry]\nType=Application\nName={}\nExec={}\nComment={}\nHidden=false\nX-GNOME-Autostart-enabled=true\nTerminal=false\n",
        name, exec, comment
    );

    fs::write(target_path, content).map_err(|e| e.to_string())?;
    Ok(())
}
