use std::collections::HashMap;
use std::process::{Command, Stdio};
use std::sync::LazyLock;
use serde::Deserialize;
use tauri::{AppHandle, Emitter};
use tokio::io::AsyncReadExt;
use tokio::process::Command as TokioCommand;
use tokio::sync::Mutex;
use crate::models::{CatalogItem, InstallProgressEvent, SourceType};
use crate::os_detector::detect_os;

static ACTIVE_INSTALL_PIDS: LazyLock<Mutex<HashMap<String, u32>>> =
    LazyLock::new(|| Mutex::new(HashMap::new()));

#[derive(Debug, Deserialize, Default)]
struct FlathubResponse {
    #[serde(default)]
    hits: Vec<FlathubHit>,
}

#[derive(Debug, Deserialize, Default)]
struct FlathubHit {
    #[serde(default)]
    name: Option<String>,
    #[serde(default)]
    app_id: Option<String>,
    #[serde(default)]
    summary: Option<String>,
    #[serde(default)]
    description: Option<String>,
    #[serde(default)]
    icon: Option<String>,
    #[serde(default)]
    developer_name: Option<String>,
    #[serde(default)]
    main_categories: Option<serde_json::Value>,
    #[serde(default)]
    runtime: Option<String>,
}

pub fn get_flathub_popular() -> Vec<CatalogItem> {
    let installed_identities = crate::desktop_apps::get_installed_canonical_identities();

    // 1. Try querying Flathub popular collection via curl
    let output = Command::new("curl")
        .args([
            "-s",
            "--connect-timeout",
            "4",
            "-m",
            "8",
            "https://flathub.org/api/v2/collection/popular",
        ])
        .output();

    if let Ok(out) = output {
        if out.status.success() {
            if let Ok(resp) = serde_json::from_slice::<FlathubResponse>(&out.stdout) {
                if !resp.hits.is_empty() {
                    return resp
                        .hits
                        .into_iter()
                        .filter_map(|hit| convert_flathub_hit(hit, &installed_identities))
                        .collect();
                }
            }
        }
    }

    // 2. Fallback: query flatpak search for broad popular apps
    search_flathub_cli("")
}

pub fn search_flathub(query: &str) -> Vec<CatalogItem> {
    let installed_identities = crate::desktop_apps::get_installed_canonical_identities();

    if query.trim().is_empty() {
        return get_flathub_popular();
    }

    let payload = serde_json::json!({ "query": query }).to_string();

    let output = Command::new("curl")
        .args([
            "-s",
            "--connect-timeout",
            "4",
            "-m",
            "8",
            "-X",
            "POST",
            "https://flathub.org/api/v2/search",
            "-H",
            "Content-Type: application/json",
            "-d",
            &payload,
        ])
        .output();

    if let Ok(out) = output {
        if out.status.success() {
            if let Ok(resp) = serde_json::from_slice::<FlathubResponse>(&out.stdout) {
                if !resp.hits.is_empty() {
                    return resp
                        .hits
                        .into_iter()
                        .filter_map(|hit| convert_flathub_hit(hit, &installed_identities))
                        .collect();
                }
            }
        }
    }

    // Fallback to local flatpak CLI
    search_flathub_cli(query)
}

fn convert_flathub_hit(hit: FlathubHit, installed_identities: &std::collections::HashSet<String>) -> Option<CatalogItem> {
    let app_id = hit.app_id?;
    let name = hit.name.unwrap_or_else(|| app_id.clone());
    let canonical = crate::duplicates::normalize_name(&app_id);
    let is_installed = installed_identities.contains(&app_id.to_lowercase())
        || installed_identities.contains(&canonical.to_lowercase())
        || installed_identities.contains(&name.to_lowercase());

    let icon_url = hit.icon.or_else(|| {
        Some(format!(
            "https://dl.flathub.org/repo/appstream/x86_64/icons/128x128/{}.png",
            app_id
        ))
    });

    let category = match hit.main_categories {
        Some(serde_json::Value::String(s)) => Some(s),
        Some(serde_json::Value::Array(arr)) => arr.first().and_then(|v| v.as_str()).map(|s| s.to_string()),
        _ => None,
    };

    Some(CatalogItem {
        id: format!("flatpak:{}", app_id),
        name,
        canonical_name: canonical,
        summary: hit.summary.unwrap_or_default(),
        description: hit.description.unwrap_or_default(),
        version: hit.runtime.unwrap_or_else(|| "stable".to_string()),
        source: SourceType::Flatpak,
        icon_url,
        developer: hit.developer_name,
        is_installed,
        pkg_id: app_id,
        category,
    })
}

fn search_flathub_cli(query: &str) -> Vec<CatalogItem> {
    let output = match Command::new("flatpak")
        .args([
            "search",
            "--columns=application,name,description,version,remotes",
            if query.is_empty() { "browser" } else { query },
        ])
        .output()
    {
        Ok(out) => out,
        Err(_) => return Vec::new(),
    };

    let text = String::from_utf8_lossy(&output.stdout);
    let installed_identities = crate::desktop_apps::get_installed_canonical_identities();
    let mut items = Vec::new();

    for line in text.lines().take(25) {
        let cols: Vec<&str> = line.split('\t').collect();
        if cols.len() < 3 {
            continue;
        }

        let app_id = cols[0].trim();
        let name = cols[1].trim();
        let desc = cols[2].trim();
        let version = cols.get(3).map(|s| s.trim()).unwrap_or("stable");

        if app_id.is_empty() {
            continue;
        }

        let canonical = crate::duplicates::normalize_name(app_id);
        let is_installed = installed_identities.contains(&app_id.to_lowercase())
            || installed_identities.contains(&canonical.to_lowercase())
            || installed_identities.contains(&name.to_lowercase());

        items.push(CatalogItem {
            id: format!("flatpak:{}", app_id),
            name: name.to_string(),
            canonical_name: canonical,
            summary: desc.to_string(),
            description: desc.to_string(),
            version: version.to_string(),
            source: SourceType::Flatpak,
            icon_url: Some(format!(
                "https://dl.flathub.org/repo/appstream/x86_64/icons/128x128/{}.png",
                app_id
            )),
            developer: Some("Flathub".to_string()),
            is_installed,
            pkg_id: app_id.to_string(),
            category: Some("Aplicación".to_string()),
        });
    }

    items
}

pub fn search_native_repo(query: &str, native_manager: &str) -> Vec<CatalogItem> {
    if query.trim().is_empty() {
        return Vec::new();
    }

    match native_manager {
        "pacman" => search_pacman_repo(query),
        "apt" => search_apt_repo(query),
        "dnf" => search_dnf_repo(query),
        _ => Vec::new(),
    }
}

fn search_pacman_repo(query: &str) -> Vec<CatalogItem> {
    let output = match Command::new("pacman")
        .env("LC_ALL", "C")
        .args(["-Ss", query])
        .output()
    {
        Ok(out) => out,
        Err(_) => return Vec::new(),
    };

    let text = String::from_utf8_lossy(&output.stdout);
    let installed_identities = crate::desktop_apps::get_installed_canonical_identities();
    let mut items = Vec::new();

    let lines: Vec<&str> = text.lines().collect();
    let mut i = 0;

    while i < lines.len() && items.len() < 30 {
        let header = lines[i].trim();
        if header.is_empty() {
            i += 1;
            continue;
        }

        let mut desc = String::new();
        if i + 1 < lines.len() && lines[i + 1].starts_with("    ") {
            desc = lines[i + 1].trim().to_string();
            i += 2;
        } else {
            i += 1;
        }

        // header format: "repo/pkgname version [installed...]"
        let parts: Vec<&str> = header.split_whitespace().collect();
        if parts.is_empty() {
            continue;
        }

        let repo_and_name = parts[0];
        let (repo, pkg_name) = match repo_and_name.split_once('/') {
            Some((r, p)) => (r, p),
            None => ("extra", repo_and_name),
        };

        let version = parts.get(1).unwrap_or(&"").to_string();
        let canonical = crate::duplicates::normalize_name(pkg_name);
        let is_installed = header.contains("[installed")
            || installed_identities.contains(&pkg_name.to_lowercase())
            || installed_identities.contains(&canonical.to_lowercase());

        items.push(CatalogItem {
            id: format!("pacman:{}", pkg_name),
            name: pkg_name.to_string(),
            canonical_name: canonical,
            summary: desc.clone(),
            description: desc,
            version,
            source: SourceType::Pacman,
            icon_url: None,
            developer: Some(format!("Repositorio Pacman ({})", repo)),
            is_installed,
            pkg_id: pkg_name.to_string(),
            category: Some("Paquete Nativo".to_string()),
        });
    }

    items
}

fn search_apt_repo(query: &str) -> Vec<CatalogItem> {
    let output = match Command::new("apt-cache")
        .args(["search", query])
        .output()
    {
        Ok(out) => out,
        Err(_) => return Vec::new(),
    };

    let text = String::from_utf8_lossy(&output.stdout);
    let installed_identities = crate::desktop_apps::get_installed_canonical_identities();
    let mut items = Vec::new();

    for line in text.lines().take(30) {
        if let Some((pkg, desc)) = line.split_once(" - ") {
            let pkg_name = pkg.trim();
            let summary = desc.trim().to_string();
            let canonical = crate::duplicates::normalize_name(pkg_name);

            let is_installed = installed_identities.contains(&pkg_name.to_lowercase())
                || installed_identities.contains(&canonical.to_lowercase());

            items.push(CatalogItem {
                id: format!("apt:{}", pkg_name),
                name: pkg_name.to_string(),
                canonical_name: canonical,
                summary: summary.clone(),
                description: summary,
                version: "repo".to_string(),
                source: SourceType::Apt,
                icon_url: None,
                developer: Some("Repositorio APT".to_string()),
                is_installed,
                pkg_id: pkg_name.to_string(),
                category: Some("Paquete Nativo".to_string()),
            });
        }
    }

    items
}

fn search_dnf_repo(query: &str) -> Vec<CatalogItem> {
    let output = match Command::new("dnf")
        .args(["search", "-q", query])
        .output()
    {
        Ok(out) => out,
        Err(_) => return Vec::new(),
    };

    let text = String::from_utf8_lossy(&output.stdout);
    let installed_identities = crate::desktop_apps::get_installed_canonical_identities();
    let mut items = Vec::new();

    for line in text.lines().take(30) {
        if line.starts_with('=') {
            continue;
        }
        if let Some((pkg_arch, desc)) = line.split_once(" : ") {
            let pkg_name = pkg_arch.split('.').next().unwrap_or(pkg_arch).trim();
            let summary = desc.trim().to_string();
            let canonical = crate::duplicates::normalize_name(pkg_name);

            let is_installed = installed_identities.contains(&pkg_name.to_lowercase())
                || installed_identities.contains(&canonical.to_lowercase());

            items.push(CatalogItem {
                id: format!("dnf:{}", pkg_name),
                name: pkg_name.to_string(),
                canonical_name: canonical,
                summary: summary.clone(),
                description: summary,
                version: "repo".to_string(),
                source: SourceType::Dnf,
                icon_url: None,
                developer: Some("Repositorio DNF / RPM".to_string()),
                is_installed,
                pkg_id: pkg_name.to_string(),
                category: Some("Paquete Nativo".to_string()),
            });
        }
    }

    items
}

pub fn search_all_catalog(query: &str, filter_source: Option<&str>) -> Vec<CatalogItem> {
    let os_info = detect_os();
    let filter = filter_source.unwrap_or("all");

    let mut results = Vec::new();

    // 1. Search Flathub if enabled/filtered
    if filter == "all" || filter == "flatpak" {
        if query.trim().is_empty() {
            results.extend(get_flathub_popular());
        } else {
            results.extend(search_flathub(query));
        }
    }

    // 2. Search native distribution repository if enabled/filtered
    if (filter == "all" || filter == "native") && !query.trim().is_empty() {
        let native_results = search_native_repo(query, &os_info.native_manager);
        results.extend(native_results);
    }

    // Sort: exact matches first, then installed status, then name
    let q_lower = query.to_lowercase().trim().to_string();
    if !q_lower.is_empty() {
        results.sort_by(|a, b| {
            let a_exact = a.name.to_lowercase() == q_lower || a.pkg_id.to_lowercase() == q_lower;
            let b_exact = b.name.to_lowercase() == q_lower || b.pkg_id.to_lowercase() == q_lower;
            if a_exact && !b_exact {
                return std::cmp::Ordering::Less;
            }
            if !a_exact && b_exact {
                return std::cmp::Ordering::Greater;
            }
            a.name.to_lowercase().cmp(&b.name.to_lowercase())
        });
    }

    results
}

pub fn parse_line_progress(line: &str) -> (Option<f32>, Option<String>) {
    let lower = line.to_lowercase();

    // 1. Check for percentage in the line, e.g. "45%", "45.2%"
    let mut detected_pct = None;
    if let Some(pct_idx) = line.find('%') {
        let before = &line[..pct_idx];
        let num_str: String = before
            .chars()
            .rev()
            .take_while(|c| c.is_ascii_digit() || *c == '.')
            .collect::<String>()
            .chars()
            .rev()
            .collect();
        if let Ok(val) = num_str.parse::<f32>() {
            if val <= 100.0 {
                detected_pct = Some(val);
            }
        }
    }

    // 2. Check for fraction (x/y) or [x/y], e.g. "(1/4)" or "[2/5]"
    if detected_pct.is_none() {
        if let Some(open) = line.find('(').or_else(|| line.find('[')) {
            if let Some(close) = line[open..].find(')').or_else(|| line[open..].find(']')) {
                let inner = &line[open + 1..open + close];
                let parts: Vec<&str> = inner.split('/').collect();
                if parts.len() == 2 {
                    if let (Ok(cur), Ok(total)) = (
                        parts[0].trim().parse::<f32>(),
                        parts[1].trim().parse::<f32>(),
                    ) {
                        if total > 0.0 && cur <= total {
                            detected_pct = Some((cur / total) * 100.0);
                        }
                    }
                }
            }
        }
    }

    // 3. Detect step description from keywords
    let step = if lower.contains("resolv") || lower.contains("dependenc") {
        Some("Resolviendo dependencias...".to_string())
    } else if lower.contains("download") || lower.contains("descargando") || lower.contains("get:") {
        Some("Descargando paquetes...".to_string())
    } else if lower.contains("integrity") || lower.contains("claves") || lower.contains("key") {
        Some("Verificando integridad y firmas...".to_string())
    } else if lower.contains("install") || lower.contains("instalando") || lower.contains("unpack") {
        Some("Instalando en el sistema...".to_string())
    } else if lower.contains("hook") || lower.contains("configur") || lower.contains("setting up") {
        Some("Configurando paquetes y accesos...".to_string())
    } else if lower.contains("looking for matches") {
        Some("Buscando en Flathub...".to_string())
    } else {
        None
    };

    (detected_pct, step)
}

pub async fn stream_process_output<R: tokio::io::AsyncRead + Unpin>(
    mut reader: R,
    app: AppHandle,
    id: String,
    is_stderr: bool,
) {
    let mut buf = [0u8; 1024];
    let mut current_line = String::new();

    while let Ok(n) = reader.read(&mut buf).await {
        if n == 0 {
            break;
        }
        let chunk = String::from_utf8_lossy(&buf[..n]);
        for ch in chunk.chars() {
            if ch == '\n' || ch == '\r' {
                let trimmed = current_line.trim();
                if !trimmed.is_empty() {
                    let (pct, step) = parse_line_progress(trimmed);
                    let _ = app.emit(
                        "install-progress",
                        InstallProgressEvent {
                            id: id.clone(),
                            status: "running".to_string(),
                            message: trimmed.to_string(),
                            line: Some(trimmed.to_string()),
                            progress_pct: pct,
                            step,
                            is_stderr: Some(is_stderr),
                        },
                    );
                }
                current_line.clear();
            } else {
                current_line.push(ch);
            }
        }
    }

    let trimmed = current_line.trim();
    if !trimmed.is_empty() {
        let (pct, step) = parse_line_progress(trimmed);
        let _ = app.emit(
            "install-progress",
            InstallProgressEvent {
                id: id.clone(),
                status: "running".to_string(),
                message: trimmed.to_string(),
                line: Some(trimmed.to_string()),
                progress_pct: pct,
                step,
                is_stderr: Some(is_stderr),
            },
        );
    }
}

pub async fn cancel_install(id: &str) -> Result<(), String> {
    let mut pids = ACTIVE_INSTALL_PIDS.lock().await;
    if let Some(pid) = pids.remove(id) {
        let _ = std::process::Command::new("kill")
            .args(["-TERM", &pid.to_string()])
            .output();
        return Ok(());
    }
    Err("No hay ningún proceso activo para cancelar con ese ID".to_string())
}

pub async fn run_install_package(
    app: AppHandle,
    id: String,
    source: String,
    pkg_id: String,
) -> Result<String, String> {
    let (cmd, args): (String, Vec<String>) = match source.as_str() {
        "flatpak" => (
            "flatpak".to_string(),
            vec![
                "install".to_string(),
                "-y".to_string(),
                "--noninteractive".to_string(),
                "flathub".to_string(),
                pkg_id.clone(),
            ],
        ),
        "pacman" => (
            "pkexec".to_string(),
            vec![
                "pacman".to_string(),
                "-S".to_string(),
                "--noconfirm".to_string(),
                "--needed".to_string(),
                pkg_id.clone(),
            ],
        ),
        "apt" => (
            "pkexec".to_string(),
            vec![
                "apt-get".to_string(),
                "install".to_string(),
                "-y".to_string(),
                pkg_id.clone(),
            ],
        ),
        "dnf" => (
            "pkexec".to_string(),
            vec![
                "dnf".to_string(),
                "install".to_string(),
                "-y".to_string(),
                pkg_id.clone(),
            ],
        ),
        "snap" => (
            "pkexec".to_string(),
            vec!["snap".to_string(), "install".to_string(), pkg_id.clone()],
        ),
        _ => return Err(format!("Gestor de instalación no soportado: {}", source)),
    };

    let _ = app.emit(
        "install-progress",
        InstallProgressEvent {
            id: id.clone(),
            status: "starting".to_string(),
            message: format!("Iniciando comando de instalación para {}...", pkg_id),
            line: Some(format!(
                "[OmniPkg] Ejecutando: {} {}\n[OmniPkg] Si el sistema te solicita la contraseña de administrador, ingrésala en la ventana emergente.",
                cmd,
                args.join(" ")
            )),
            progress_pct: Some(5.0),
            step: Some("Autenticando con el sistema...".to_string()),
            is_stderr: Some(false),
        },
    );

    let mut child = TokioCommand::new(&cmd)
        .args(&args)
        .env("LC_ALL", "C.UTF-8")
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .map_err(|e| {
            let err = format!("Error al iniciar proceso de instalación: {}", e);
            let _ = app.emit(
                "install-progress",
                InstallProgressEvent {
                    id: id.clone(),
                    status: "error".to_string(),
                    message: err.clone(),
                    line: Some(format!("[OmniPkg Error] {}", err)),
                    progress_pct: None,
                    step: Some("Error al iniciar".to_string()),
                    is_stderr: Some(true),
                },
            );
            err
        })?;

    // Record PID for potential cancellation
    if let Some(pid) = child.id() {
        let mut pids = ACTIVE_INSTALL_PIDS.lock().await;
        pids.insert(id.clone(), pid);
    }

    let stdout = child.stdout.take();
    let stderr = child.stderr.take();

    let app_out = app.clone();
    let id_out = id.clone();
    let stdout_handle = tokio::spawn(async move {
        if let Some(out) = stdout {
            stream_process_output(out, app_out, id_out, false).await;
        }
    });

    let app_err = app.clone();
    let id_err = id.clone();
    let stderr_handle = tokio::spawn(async move {
        if let Some(err) = stderr {
            stream_process_output(err, app_err, id_err, true).await;
        }
    });

    let _ = tokio::join!(stdout_handle, stderr_handle);
    let status = child.wait().await.map_err(|e| e.to_string())?;

    // Remove PID
    {
        let mut pids = ACTIVE_INSTALL_PIDS.lock().await;
        pids.remove(&id);
    }

    if status.success() {
        let _ = app.emit(
            "install-progress",
            InstallProgressEvent {
                id: id.clone(),
                status: "success".to_string(),
                message: format!("¡{} instalado correctamente!", pkg_id),
                line: Some(format!(
                    "[OmniPkg] ¡Instalación de {} finalizada con éxito!",
                    pkg_id
                )),
                progress_pct: Some(100.0),
                step: Some("Instalación completada".to_string()),
                is_stderr: Some(false),
            },
        );
        Ok(format!("Instalación de {} completada con éxito", pkg_id))
    } else {
        let code = status.code().unwrap_or(-1);
        let err_msg = format!("El instalador finalizó con código de error {}", code);
        let _ = app.emit(
            "install-progress",
            InstallProgressEvent {
                id: id.clone(),
                status: "error".to_string(),
                message: err_msg.clone(),
                line: Some(format!("[OmniPkg Error] {}", err_msg)),
                progress_pct: None,
                step: Some("Error en la instalación".to_string()),
                is_stderr: Some(true),
            },
        );
        Err(err_msg)
    }
}


