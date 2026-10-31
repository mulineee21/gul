use std::process::{Command, Stdio};
use tauri::{AppHandle, Emitter};
use tokio::process::Command as TokioCommand;
use crate::models::{AppInfo, InstallProgressEvent, SourceType, UpdateItem, SystemCleanItem};
use crate::disk_usage::get_app_data_breakdown;
use crate::managers::pacman::parse_size_to_bytes;
use crate::os_detector::detect_os;

pub fn is_available() -> bool {
    crate::os_detector::command_exists("flatpak")
}

pub fn list_installed() -> Vec<AppInfo> {
    let output = match Command::new("flatpak")
        .args([
            "list",
            "--app",
            "--columns=application,name,version,size,origin,description,installation,branch",
        ])
        .output()
    {
        Ok(out) => out,
        Err(_) => return Vec::new(),
    };

    let text = String::from_utf8_lossy(&output.stdout);
    let mut apps = Vec::new();

    for line in text.lines() {
        let cols: Vec<&str> = line.split('\t').collect();
        if cols.len() < 2 {
            continue;
        }

        let app_id = cols[0].trim();
        let name = cols.get(1).map(|s| s.trim()).unwrap_or(app_id);
        let version = cols.get(2).map(|s| s.trim()).unwrap_or("");
        let size_str = cols.get(3).map(|s| s.trim()).unwrap_or("0");
        let _origin = cols.get(4).map(|s| s.trim()).unwrap_or("");
        let desc = cols.get(5).map(|s| s.trim()).unwrap_or("");

        let binary_bytes = parse_size_to_bytes(size_str);
        let canonical = crate::duplicates::normalize_name(app_id);
        let breakdown = get_app_data_breakdown(&canonical, app_id, "flatpak", binary_bytes);
        let total_size = breakdown.binary_bytes + breakdown.data_bytes + breakdown.cache_bytes + breakdown.config_bytes;

        apps.push(AppInfo {
            id: format!("flatpak:{}", app_id),
            name: name.to_string(),
            canonical_name: canonical,
            version: version.to_string(),
            source: SourceType::Flatpak,
            description: desc.to_string(),
            size_bytes: total_size,
            size_breakdown: breakdown,
            icon: None,
            install_date: None,
            is_duplicate: false,
            duplicate_group: None,
            exec_path: Some(format!("flatpak run {}", app_id)),
            is_sandboxed: true,
            has_update: false,
        });
    }

    apps
}

pub fn check_updates() -> Vec<UpdateItem> {
    let output = match Command::new("flatpak")
        .args(["remote-ls", "--updates", "--columns=application,name,version"])
        .output()
    {
        Ok(out) => out,
        Err(_) => return Vec::new(),
    };

    let text = String::from_utf8_lossy(&output.stdout);
    let mut updates = Vec::new();

    for line in text.lines() {
        let cols: Vec<&str> = line.split('\t').collect();
        if cols.is_empty() {
            continue;
        }
        let id = cols[0].trim();
        let name = cols.get(1).map(|s| s.trim()).unwrap_or(id);
        let version = cols.get(2).map(|s| s.trim()).unwrap_or("Nueva versión");

        updates.push(UpdateItem {
            id: format!("flatpak:{}", id),
            name: name.to_string(),
            current_version: "Instalada".to_string(),
            new_version: version.to_string(),
            source: SourceType::Flatpak,
            size_bytes: None,
        });
    }

    updates
}

pub fn scan_cleaner_items() -> Vec<SystemCleanItem> {
    let mut items = Vec::new();

    // 1. Unused flatpak runtimes
    let unused_output = Command::new("flatpak")
        .args(["uninstall", "--unused", "--dry-run"])
        .output();

    if let Ok(out) = unused_output {
        let text = String::from_utf8_lossy(&out.stdout);
        let count = text.lines().filter(|l| l.contains('/')).count();
        if count > 0 {
            items.push(SystemCleanItem {
                id: "clean:flatpak:unused".to_string(),
                title: format!("Obsolete Flatpak runtimes ({} items)", count),
                category: "flatpak_unused".to_string(),
                source: "flatpak".to_string(),
                description: "Unused Flatpak runtimes and libraries no longer needed by any installed application".to_string(),
                size_bytes: (count as u64) * 350 * 1024 * 1024, // Runtimes average ~350MB
                risk_level: "safe".to_string(),
                requires_sudo: false,
                command_preview: "flatpak uninstall --unused -y".to_string(),
            });
        }
    }

    // 2. Flatpak cache in ~/.cache/flatpak
    if let Some(home) = dirs::home_dir() {
        let cache_dir = home.join(".cache/flatpak");
        if cache_dir.exists() {
            let size = crate::disk_usage::get_dir_size(&cache_dir);
            if size > 1024 * 1024 { // > 1MB
                items.push(SystemCleanItem {
                    id: "clean:flatpak:cache".to_string(),
                    title: "Flatpak download cache".to_string(),
                    category: "cache".to_string(),
                    source: "flatpak".to_string(),
                    description: "Temporary metadata and files stored in ~/.cache/flatpak".to_string(),
                    size_bytes: size,
                    risk_level: "safe".to_string(),
                    requires_sudo: false,
                    command_preview: "rm -rf ~/.cache/flatpak/*".to_string(),
                });
            }
        }
    }

    items
}

pub async fn setup_flatpak_engine(app: AppHandle) -> Result<String, String> {
    let os = detect_os();
    let id = "system:setup-flatpak".to_string();

    // 1. Install flatpak binary if not installed
    if !os.has_flatpak {
        let (cmd, args): (&str, Vec<&str>) = match os.native_manager.as_str() {
            "pacman" => ("pkexec", vec!["pacman", "-S", "--noconfirm", "--needed", "flatpak"]),
            "apt" => ("pkexec", vec!["apt-get", "install", "-y", "flatpak"]),
            "dnf" => ("pkexec", vec!["dnf", "install", "-y", "flatpak"]),
            "zypper" => ("pkexec", vec!["zypper", "--non-interactive", "install", "flatpak"]),
            "portage" => ("pkexec", vec!["emerge", "--autounmask-continue", "sys-apps/flatpak"]),
            _ => return Err(format!("Unsupported native package manager for automatic Flatpak installation: {}", os.native_manager)),
        };

        let _ = app.emit(
            "install-progress",
            InstallProgressEvent {
                id: id.clone(),
                status: "starting".to_string(),
                message: format!("Installing Flatpak engine via {}...", os.native_manager.to_uppercase()),
                line: Some(format!(
                    "[GUL] Installing Flatpak package manager: {} {}\n[GUL] Please enter your administrator password if prompted.",
                    cmd,
                    args.join(" ")
                )),
                progress_pct: Some(15.0),
                step: Some("Installing Flatpak package...".to_string()),
                is_stderr: Some(false),
            },
        );

        let mut child = TokioCommand::new(cmd)
            .args(&args)
            .env("LC_ALL", "C.UTF-8")
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .map_err(|e| format!("Failed to start Flatpak installer: {}", e))?;

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
            let err_msg = format!("Failed to install Flatpak package (exit code {:?})", status.code());
            let _ = app.emit(
                "install-progress",
                InstallProgressEvent {
                    id: id.clone(),
                    status: "error".to_string(),
                    message: err_msg.clone(),
                    line: Some(format!("[GUL Error] {}", err_msg)),
                    progress_pct: None,
                    step: Some("Error installing Flatpak".to_string()),
                    is_stderr: Some(true),
                },
            );
            return Err(err_msg);
        }
    }

    // 2. Add Flathub official repository
    let _ = app.emit(
        "install-progress",
        InstallProgressEvent {
            id: id.clone(),
            status: "running".to_string(),
            message: "Configuring official Flathub repository...".to_string(),
            line: Some("[GUL] Adding Flathub remote: flatpak remote-add --if-not-exists flathub https://dl.flathub.org/repo/flathub.flatpakrepo".to_string()),
            progress_pct: Some(75.0),
            step: Some("Adding Flathub repository...".to_string()),
            is_stderr: Some(false),
        },
    );

    let remote_out = TokioCommand::new("flatpak")
        .args([
            "remote-add",
            "--if-not-exists",
            "flathub",
            "https://dl.flathub.org/repo/flathub.flatpakrepo",
        ])
        .output()
        .await;

    let remote_ok = match remote_out {
        Ok(o) if o.status.success() => true,
        _ => {
            // Fallback to user-level remote if system-wide remote requires polkit/root and failed
            TokioCommand::new("flatpak")
                .args([
                    "remote-add",
                    "--user",
                    "--if-not-exists",
                    "flathub",
                    "https://dl.flathub.org/repo/flathub.flatpakrepo",
                ])
                .output()
                .await
                .map(|o| o.status.success())
                .unwrap_or(false)
        }
    };

    if !remote_ok {
        let err_msg = "Failed to add Flathub repository.".to_string();
        let _ = app.emit(
            "install-progress",
            InstallProgressEvent {
                id: id.clone(),
                status: "error".to_string(),
                message: err_msg.clone(),
                line: Some(format!("[GUL Error] {}", err_msg)),
                progress_pct: None,
                step: Some("Error configuring Flathub".to_string()),
                is_stderr: Some(true),
            },
        );
        return Err(err_msg);
    }

    crate::os_detector::invalidate_os_cache();

    let _ = app.emit(
        "install-progress",
        InstallProgressEvent {
            id,
            status: "success".to_string(),
            message: "Flatpak & Flathub installed and configured successfully!".to_string(),
            line: Some("[GUL] Flatpak & Flathub are now ready! You can now install any Flatpak application.".to_string()),
            progress_pct: Some(100.0),
            step: Some("Flatpak setup completed".to_string()),
            is_stderr: Some(false),
        },
    );

    Ok("Flatpak and Flathub configured successfully".to_string())
}

