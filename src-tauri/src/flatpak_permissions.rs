use std::process::Command;
use crate::models::FlatpakPermissions;

pub fn get_flatpak_permissions(app_id: &str) -> FlatpakPermissions {
    let clean_id = app_id.trim_start_matches("flatpak:");

    let output = Command::new("flatpak")
        .args(["info", "--show-permissions", clean_id])
        .output();

    let mut perms = FlatpakPermissions {
        app_id: clean_id.to_string(),
        network: false,
        x11: false,
        wayland: false,
        pulseaudio: false,
        filesystem_home: false,
        filesystem_host: false,
        webcam: false,
        devices_all: false,
        can_edit: true,
    };

    if let Ok(out) = output {
        let text = String::from_utf8_lossy(&out.stdout).to_lowercase();
        for line in text.lines() {
            let l = line.trim();
            if l.starts_with("shared=") {
                perms.network = l.contains("network");
            } else if l.starts_with("sockets=") {
                if l.contains("x11") { perms.x11 = true; }
                if l.contains("wayland") { perms.wayland = true; }
                if l.contains("pulseaudio") { perms.pulseaudio = true; }
            } else if l.starts_with("filesystems=") {
                if l.contains("home") { perms.filesystem_home = true; }
                if l.contains("host") { perms.filesystem_host = true; }
            } else if l.starts_with("devices=") {
                if l.contains("all") { perms.devices_all = true; }
                if l.contains("webcam") || l.contains("all") { perms.webcam = true; }
            }
        }
    }

    // Also check overrides directly if info didn't show anything
    let override_out = Command::new("flatpak")
        .args(["override", "--user", "--show", clean_id])
        .output();

    if let Ok(out) = override_out {
        let text = String::from_utf8_lossy(&out.stdout).to_lowercase();
        for line in text.lines() {
            let l = line.trim();
            if l.contains("shared=network") { perms.network = true; }
            if l.contains("sockets=x11") { perms.x11 = true; }
            if l.contains("sockets=wayland") { perms.wayland = true; }
            if l.contains("sockets=pulseaudio") { perms.pulseaudio = true; }
            if l.contains("filesystems=home") { perms.filesystem_home = true; }
            if l.contains("filesystems=host") { perms.filesystem_host = true; }
            if l.contains("devices=all") { perms.devices_all = true; }
        }
    }

    perms
}

pub fn set_flatpak_permission(app_id: &str, key: &str, enabled: bool) -> Result<(), String> {
    let clean_id = app_id.trim_start_matches("flatpak:");

    let arg = match key {
        "network" => if enabled { "--share=network" } else { "--unshare=network" },
        "x11" => if enabled { "--socket=x11" } else { "--nosocket=x11" },
        "wayland" => if enabled { "--socket=wayland" } else { "--nosocket=wayland" },
        "pulseaudio" => if enabled { "--socket=pulseaudio" } else { "--nosocket=pulseaudio" },
        "filesystem_home" => if enabled { "--filesystem=home" } else { "--nofilesystem=home" },
        "filesystem_host" => if enabled { "--filesystem=host" } else { "--nofilesystem=host" },
        "devices_all" => if enabled { "--device=all" } else { "--nodevice=all" },
        _ => return Err(format!("Permiso desconocido: {}", key)),
    };

    let out = Command::new("flatpak")
        .args(["override", "--user", arg, clean_id])
        .output()
        .map_err(|e| format!("Error ejecutando flatpak override: {}", e))?;

    if out.status.success() {
        Ok(())
    } else {
        Err(String::from_utf8_lossy(&out.stderr).to_string())
    }
}

pub fn reset_flatpak_permissions(app_id: &str) -> Result<(), String> {
    let clean_id = app_id.trim_start_matches("flatpak:");
    let out = Command::new("flatpak")
        .args(["override", "--user", "--reset", clean_id])
        .output()
        .map_err(|e| e.to_string())?;

    if out.status.success() {
        Ok(())
    } else {
        Err(String::from_utf8_lossy(&out.stderr).to_string())
    }
}
