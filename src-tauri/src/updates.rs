use std::process::Command;
use serde::Serialize;
use tauri::{AppHandle, Emitter};
use crate::models::UpdateItem;
use crate::managers;

#[derive(Debug, Clone, Serialize)]
pub struct UpdateProgressEvent {
    pub manager: String,
    pub status: String, // "starting", "running", "success", "error"
    pub message: String,
}

pub fn check_all_updates() -> Vec<UpdateItem> {
    managers::check_all_updates()
}

pub async fn run_update_manager(app: AppHandle, manager: String) -> Result<(), String> {
    let _ = app.emit("update-progress", UpdateProgressEvent {
        manager: manager.clone(),
        status: "starting".to_string(),
        message: format!("Iniciando actualización de {}...", manager),
    });

    let (cmd, args) = match manager.as_str() {
        "pacman" => ("pkexec", vec!["pacman", "-Syu", "--noconfirm"]),
        "flatpak" => ("flatpak", vec!["update", "-y"]),
        "snap" => ("pkexec", vec!["snap", "refresh"]),
        "apt" => ("pkexec", vec!["sh", "-c", "apt-get update && apt-get dist-upgrade -y"]),
        "dnf" => ("pkexec", vec!["dnf", "upgrade", "-y"]),
        "portage" => ("pkexec", vec!["emerge", "--update", "--deep", "--newuse", "@world"]),
        _ => return Err(format!("Gestor no reconocido: {}", manager)),
    };

    let output = tokio::task::spawn_blocking(move || {
        Command::new(cmd).args(args).output()
    })
    .await
    .map_err(|e| e.to_string())?;

    match output {
        Ok(out) => {
            let stdout = String::from_utf8_lossy(&out.stdout);
            let stderr = String::from_utf8_lossy(&out.stderr);
            if out.status.success() {
                let _ = app.emit("update-progress", UpdateProgressEvent {
                    manager: manager.clone(),
                    status: "success".to_string(),
                    message: format!("Actualizado con éxito.\n{}", stdout),
                });
                Ok(())
            } else {
                let _ = app.emit("update-progress", UpdateProgressEvent {
                    manager: manager.clone(),
                    status: "error".to_string(),
                    message: format!("Error al actualizar {}: {}\n{}", manager, stderr, stdout),
                });
                Err(stderr.to_string())
            }
        }
        Err(e) => {
            let msg = format!("Error al invocar el comando para {}: {}", manager, e);
            let _ = app.emit("update-progress", UpdateProgressEvent {
                manager: manager.clone(),
                status: "error".to_string(),
                message: msg.clone(),
            });
            Err(msg)
        }
    }
}
