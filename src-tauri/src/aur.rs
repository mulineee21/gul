use std::process::Command;
use serde::Deserialize;
use tauri::AppHandle;
use crate::models::AurPackageItem;

#[derive(Debug, Deserialize, Default)]
struct AurRpcResponse {
    #[serde(default)]
    results: Vec<AurRpcHit>,
}

#[derive(Debug, Deserialize, Default)]
struct AurRpcHit {
    #[serde(default, rename = "Name")]
    name: Option<String>,
    #[serde(default, rename = "Version")]
    version: Option<String>,
    #[serde(default, rename = "Description")]
    description: Option<String>,
    #[serde(default, rename = "NumVotes")]
    num_votes: Option<u32>,
    #[serde(default, rename = "Popularity")]
    popularity: Option<f32>,
    #[serde(default, rename = "Maintainer")]
    maintainer: Option<String>,
    #[serde(default, rename = "URL")]
    url: Option<String>,
    #[serde(default, rename = "OutOfDate")]
    out_of_date: Option<u64>,
}

pub fn search_aur(query: &str) -> Vec<AurPackageItem> {
    if query.trim().is_empty() {
        return Vec::new();
    }

    let url = format!("https://aur.archlinux.org/rpc/v5/search/{}", query.trim());
    let output = Command::new("curl")
        .args(["-s", "--max-time", "6", &url])
        .output();

    let installed_identities = crate::desktop_apps::get_installed_canonical_identities();

    if let Ok(out) = output {
        if out.status.success() {
            if let Ok(resp) = serde_json::from_slice::<AurRpcResponse>(&out.stdout) {
                let mut hits: Vec<AurPackageItem> = resp
                    .results
                    .into_iter()
                    .filter_map(|h| {
                        let name = h.name?;
                        let is_installed = installed_identities.contains(&name.to_lowercase());
                        Some(AurPackageItem {
                            name,
                            version: h.version.unwrap_or_else(|| "latest".to_string()),
                            description: h.description.unwrap_or_default(),
                            num_votes: h.num_votes.unwrap_or(0),
                            popularity: h.popularity.unwrap_or(0.0),
                            maintainer: h.maintainer,
                            url: h.url,
                            is_installed,
                            out_of_date: h.out_of_date.is_some() && h.out_of_date.unwrap() > 0,
                        })
                    })
                    .collect();

                // Sort by popularity descending
                hits.sort_by(|a, b| b.popularity.partial_cmp(&a.popularity).unwrap_or(std::cmp::Ordering::Equal));
                hits.truncate(40);
                return hits;
            }
        }
    }

    // Fallback to paru/yay CLI if curl failed
    let helper = if crate::os_detector::command_exists("paru") {
        "paru"
    } else if crate::os_detector::command_exists("yay") {
        "yay"
    } else {
        return Vec::new();
    };

    let cli_out = Command::new(helper)
        .args(["-Ssa", query])
        .output();

    if let Ok(out) = cli_out {
        let text = String::from_utf8_lossy(&out.stdout);
        let mut items = Vec::new();
        let lines: Vec<&str> = text.lines().collect();
        let mut i = 0;
        while i < lines.len() && items.len() < 30 {
            let line = lines[i].trim();
            if line.starts_with("aur/") {
                let parts: Vec<&str> = line.split_whitespace().collect();
                if parts.len() >= 2 {
                    let name = parts[0].trim_start_matches("aur/").to_string();
                    let version = parts[1].to_string();
                    let mut desc = String::new();
                    if i + 1 < lines.len() && lines[i + 1].starts_with("    ") {
                        desc = lines[i + 1].trim().to_string();
                        i += 2;
                    } else {
                        i += 1;
                    }

                    let is_installed = installed_identities.contains(&name.to_lowercase());
                    items.push(AurPackageItem {
                        name,
                        version,
                        description: desc,
                        num_votes: 1,
                        popularity: 1.0,
                        maintainer: None,
                        url: None,
                        is_installed,
                        out_of_date: false,
                    });
                    continue;
                }
            }
            i += 1;
        }
        return items;
    }

    Vec::new()
}

pub fn get_aur_helper() -> Option<&'static str> {
    if crate::os_detector::command_exists("paru") {
        Some("paru")
    } else if crate::os_detector::command_exists("yay") {
        Some("yay")
    } else {
        None
    }
}

pub async fn install_aur_package(
    app: AppHandle,
    pkg_name: String,
) -> Result<String, String> {
    let _helper = get_aur_helper().ok_or_else(|| {
        "Neither 'paru' nor 'yay' was found on your system to build AUR packages".to_string()
    })?;

    crate::catalog::run_install_package(
        app,
        format!("aur:{}", pkg_name),
        "aur".to_string(),
        pkg_name,
    )
    .await
}
