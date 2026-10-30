use std::process::Command;
use crate::models::{CleanResult, SystemCleanItem};
use crate::managers;

pub fn scan_items() -> Vec<SystemCleanItem> {
    managers::scan_all_cleaner_items()
}

pub fn execute_clean(item_ids: &[String]) -> CleanResult {
    let mut total_cleaned: u64 = 0;
    let mut logs = Vec::new();
    let mut errors = Vec::new();

    let all_items = scan_items();

    for id in item_ids {
        if let Some(item) = all_items.iter().find(|i| &i.id == id) {
            logs.push(format!("Iniciando limpieza: {}", item.title));

            match id.as_str() {
                "clean:pacman:cache" => {
                    // Try paccache first, or pacman -Sc
                    let res = Command::new("paccache")
                        .args(["-rk1"])
                        .output()
                        .or_else(|_| {
                            Command::new("pkexec")
                                .args(["pacman", "-Sc", "--noconfirm"])
                                .output()
                        });

                    match res {
                        Ok(out) => {
                            let text = String::from_utf8_lossy(&out.stdout);
                            logs.push(format!("Pacman cache: {}", text));
                            total_cleaned += item.size_bytes;
                        }
                        Err(e) => errors.push(format!("Error limpiando caché de pacman: {}", e)),
                    }
                }
                "clean:pacman:orphans" => {
                    let orphans_out = Command::new("pacman").args(["-Qtdq"]).output();
                    if let Ok(out) = orphans_out {
                        let text = String::from_utf8_lossy(&out.stdout);
                        let pkgs: Vec<&str> = text.lines().map(|l| l.trim()).filter(|l| !l.is_empty()).collect();
                        if !pkgs.is_empty() {
                            let mut cmd = Command::new("pkexec");
                            cmd.arg("pacman").arg("-Rns").arg("--noconfirm");
                            for p in pkgs {
                                cmd.arg(p);
                            }
                            match cmd.output() {
                                Ok(o) => {
                                    logs.push(String::from_utf8_lossy(&o.stdout).to_string());
                                    total_cleaned += item.size_bytes;
                                }
                                Err(e) => errors.push(format!("Error eliminando huérfanos de pacman: {}", e)),
                            }
                        }
                    }
                }
                "clean:flatpak:unused" => {
                    let res = Command::new("flatpak")
                        .args(["uninstall", "--unused", "-y"])
                        .output();

                    match res {
                        Ok(out) => {
                            logs.push(String::from_utf8_lossy(&out.stdout).to_string());
                            total_cleaned += item.size_bytes;
                        }
                        Err(e) => errors.push(format!("Error limpiando runtimes Flatpak: {}", e)),
                    }
                }
                "clean:flatpak:cache" => {
                    if let Some(home) = dirs::home_dir() {
                        let cache_path = home.join(".cache/flatpak");
                        if cache_path.exists() {
                            let _ = std::fs::remove_dir_all(&cache_path);
                            logs.push("Caché de Flatpak eliminada".to_string());
                            total_cleaned += item.size_bytes;
                        }
                    }
                }
                "clean:apt:cache" => {
                    let res = Command::new("pkexec").args(["apt-get", "clean"]).output();
                    if let Ok(o) = res {
                        logs.push(String::from_utf8_lossy(&o.stdout).to_string());
                        total_cleaned += item.size_bytes;
                    }
                }
                "clean:apt:orphans" => {
                    let res = Command::new("pkexec").args(["apt-get", "autoremove", "-y"]).output();
                    if let Ok(o) = res {
                        logs.push(String::from_utf8_lossy(&o.stdout).to_string());
                        total_cleaned += item.size_bytes;
                    }
                }
                _ => {
                    logs.push(format!("Limpieza personalizada para {}", id));
                }
            }
        }
    }

    CleanResult {
        success: errors.is_empty(),
        cleaned_bytes: total_cleaned,
        output_log: logs.join("\n"),
        errors,
    }
}
