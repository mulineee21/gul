use std::process::Command;
use crate::models::{SnapshotEntry, SnapshotSupportInfo};

pub fn check_snapshot_support() -> SnapshotSupportInfo {
    let fs_output = Command::new("findmnt")
        .args(["-n", "-o", "FSTYPE", "/"])
        .output();

    let fs_type = if let Ok(out) = fs_output {
        String::from_utf8_lossy(&out.stdout).trim().to_string()
    } else {
        "unknown".to_string()
    };

    let has_snapper = Command::new("which")
        .arg("snapper")
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false);

    let has_timeshift = Command::new("which")
        .arg("timeshift")
        .output()
        .map(|o| o.status.success())
        .unwrap_or(false);

    let (supported, backend) = if has_snapper && fs_type == "btrfs" {
        (true, "snapper".to_string())
    } else if has_timeshift {
        (true, "timeshift".to_string())
    } else if fs_type == "btrfs" {
        (true, "btrfs".to_string())
    } else {
        (false, "none".to_string())
    };

    SnapshotSupportInfo {
        supported,
        backend,
        filesystem: fs_type,
        snapshot_count: 0,
    }
}

pub fn list_snapshots() -> Vec<SnapshotEntry> {
    let support = check_snapshot_support();
    if !support.supported {
        return Vec::new();
    }

    let mut snapshots = Vec::new();

    if support.backend == "snapper" {
        let output = Command::new("pkexec")
            .args(["snapper", "list"])
            .output();

        if let Ok(out) = output {
            let text = String::from_utf8_lossy(&out.stdout);
            for line in text.lines().skip(2) {
                let parts: Vec<&str> = line.split('|').collect();
                if parts.len() >= 6 {
                    let num_str = parts[0].trim();
                    let stype = parts[1].trim();
                    let date_str = parts[3].trim();
                    let desc = parts[5].trim();

                    if let Ok(num) = num_str.parse::<u32>() {
                        snapshots.push(SnapshotEntry {
                            id: format!("snapper:{}", num),
                            num: Some(num),
                            description: if desc.is_empty() { "Instantánea del sistema".to_string() } else { desc.to_string() },
                            date: date_str.to_string(),
                            snapshot_type: stype.to_string(),
                        });
                    }
                }
            }
        }
    } else if support.backend == "timeshift" {
        let output = Command::new("pkexec")
            .args(["timeshift", "--list"])
            .output();

        if let Ok(out) = output {
            let text = String::from_utf8_lossy(&out.stdout);
            for line in text.lines() {
                if line.contains('>') && line.contains('{') {
                    let parts: Vec<&str> = line.split_whitespace().collect();
                    if !parts.is_empty() {
                        snapshots.push(SnapshotEntry {
                            id: format!("timeshift:{}", parts[0]),
                            num: None,
                            description: "Instantánea Timeshift".to_string(),
                            date: parts.get(1).unwrap_or(&"").to_string(),
                            snapshot_type: "timeshift".to_string(),
                        });
                    }
                }
            }
        }
    }

    snapshots.reverse();
    snapshots
}

pub fn create_system_snapshot(description: &str) -> Result<String, String> {
    let support = check_snapshot_support();
    if !support.supported {
        return Err("Tu sistema no tiene soporte activo para instantáneas (Btrfs/Snapper/Timeshift)".to_string());
    }

    let clean_desc = if description.trim().is_empty() {
        "GUL: Punto de restauración del sistema"
    } else {
        description.trim()
    };

    if support.backend == "snapper" {
        let out = Command::new("pkexec")
            .args(["snapper", "create", "-t", "single", "-d", clean_desc, "-c", "timeline"])
            .output()
            .map_err(|e| format!("Fallo al ejecutar snapper: {}", e))?;

        if out.status.success() {
            Ok(format!("Punto de restauración creado con éxito: '{}'", clean_desc))
        } else {
            Err(String::from_utf8_lossy(&out.stderr).to_string())
        }
    } else if support.backend == "timeshift" {
        let out = Command::new("pkexec")
            .args(["timeshift", "--create", "--comments", clean_desc, "--yes"])
            .output()
            .map_err(|e| format!("Fallo al ejecutar timeshift: {}", e))?;

        if out.status.success() {
            Ok(format!("Instantánea Timeshift creada: '{}'", clean_desc))
        } else {
            Err(String::from_utf8_lossy(&out.stderr).to_string())
        }
    } else {
        Err("Gestor de instantáneas no disponible".to_string())
    }
}
