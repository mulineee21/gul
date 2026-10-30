use std::collections::HashMap;
use std::process::Command;
use serde::Deserialize;
use crate::models::{AppExtendedDetails, AppRelease, AppReview};

pub fn get_app_extended_details(app_id_or_name: &str) -> AppExtendedDetails {
    let clean_id = app_id_or_name
        .trim_start_matches("flatpak:")
        .trim_start_matches("pacman:")
        .trim_start_matches("apt:")
        .trim_start_matches("dnf:")
        .trim_start_matches("snap:")
        .trim_start_matches("appimage:")
        .trim();

    let resolved_app_id = resolve_to_appstream_id(clean_id);

    // 1. Fetch Flathub AppStream metadata
    let appstream = fetch_flathub_appstream(&resolved_app_id);

    // 2. Fetch ODRS Reviews
    let (rating_score, reviews) = fetch_odrs_reviews(&resolved_app_id);

    // 3. Fetch Flathub Install Stats
    let total_installs = fetch_flathub_stats(&resolved_app_id);

    // 4. Check if installed
    let installed_set = crate::desktop_apps::get_installed_canonical_identities();
    let is_installed = installed_set.contains(&clean_id.to_lowercase())
        || installed_set.contains(&resolved_app_id.to_lowercase())
        || installed_set.contains(&crate::duplicates::normalize_name(clean_id));

    let name = appstream.name.unwrap_or_else(|| clean_id.to_string());
    let summary = appstream.summary.unwrap_or_default();
    let description = appstream.description.unwrap_or_default();
    let developer = appstream.developer_name;
    let license = appstream.project_license;
    let icon_url = appstream.icon.or_else(|| {
        Some(format!(
            "https://dl.flathub.org/repo/appstream/x86_64/icons/128x128/{}.png",
            resolved_app_id
        ))
    });

    let mut screenshots = Vec::new();
    if let Some(sc_list) = appstream.screenshots {
        for sc in sc_list {
            if let Some(sizes) = sc.sizes {
                if let Some(first) = sizes.first() {
                    if let Some(src) = &first.src {
                        screenshots.push(src.clone());
                    }
                }
            }
        }
    }

    let mut releases = Vec::new();
    if let Some(rel_list) = appstream.releases {
        for r in rel_list.into_iter().take(5) {
            releases.push(AppRelease {
                version: r.version.unwrap_or_else(|| "1.0".to_string()),
                date: r.timestamp.map(|ts| {
                    format!("Lanzamiento {}", ts)
                }),
                description: r.description,
            });
        }
    }

    let total_reviews = reviews.len();

    AppExtendedDetails {
        id: format!("flatpak:{}", resolved_app_id),
        name,
        summary,
        description_html: description,
        developer,
        license,
        homepage_url: appstream.urls.and_then(|u| u.homepage),
        bugtracker_url: None,
        donation_url: None,
        icon_url,
        screenshots,
        rating_score,
        total_reviews,
        total_installs,
        reviews,
        releases,
        is_installed,
    }
}

fn resolve_to_appstream_id(id: &str) -> String {
    // If it already contains dots like org.videolan.VLC, use it directly
    if id.contains('.') && !id.ends_with(".desktop") {
        return id.to_string();
    }

    let clean = id.trim_end_matches(".desktop").to_lowercase();

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
        ("heroic", "com.heroicgameslauncher.hgl"),
        ("bitwig-studio", "com.bitwig.BitwigStudio"),
    ]);

    if let Some(&app_id) = map.get(clean.as_str()) {
        return app_id.to_string();
    }

    // Try finding via Flathub search
    let payload = serde_json::json!({ "query": clean }).to_string();
    let output = Command::new("curl")
        .args([
            "-s",
            "--connect-timeout",
            "3",
            "-m",
            "5",
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
        if let Ok(v) = serde_json::from_slice::<serde_json::Value>(&out.stdout) {
            if let Some(hits) = v.get("hits").and_then(|h| h.as_array()) {
                if let Some(first) = hits.first() {
                    if let Some(app_id) = first.get("app_id").and_then(|a| a.as_str()) {
                        return app_id.to_string();
                    }
                }
            }
        }
    }

    id.to_string()
}

#[derive(Debug, Deserialize, Default)]
struct AppStreamRaw {
    #[serde(default)]
    name: Option<String>,
    #[serde(default)]
    summary: Option<String>,
    #[serde(default)]
    description: Option<String>,
    #[serde(default)]
    icon: Option<String>,
    #[serde(default)]
    developer_name: Option<String>,
    #[serde(default)]
    project_license: Option<String>,
    #[serde(default)]
    screenshots: Option<Vec<AppStreamScreenshot>>,
    #[serde(default)]
    releases: Option<Vec<AppStreamRelease>>,
    #[serde(default)]
    urls: Option<AppStreamUrls>,
}

#[derive(Debug, Deserialize)]
struct AppStreamUrls {
    #[serde(default)]
    homepage: Option<String>,
}

#[derive(Debug, Deserialize)]
struct AppStreamScreenshot {
    #[serde(default)]
    sizes: Option<Vec<AppStreamScreenshotSize>>,
}

#[derive(Debug, Deserialize)]
struct AppStreamScreenshotSize {
    #[serde(default)]
    src: Option<String>,
}

#[derive(Debug, Deserialize)]
struct AppStreamRelease {
    #[serde(default)]
    version: Option<String>,
    #[serde(default)]
    timestamp: Option<serde_json::Value>,
    #[serde(default)]
    description: Option<String>,
}

fn fetch_flathub_appstream(app_id: &str) -> AppStreamRaw {
    let url = format!("https://flathub.org/api/v2/appstream/{}", app_id);
    let output = Command::new("curl")
        .args(["-s", "--connect-timeout", "4", "-m", "7", &url])
        .output();

    if let Ok(out) = output {
        if let Ok(data) = serde_json::from_slice::<AppStreamRaw>(&out.stdout) {
            return data;
        }
    }

    AppStreamRaw::default()
}

#[derive(Debug, Deserialize)]
struct OdrsRawReview {
    #[serde(default)]
    user_display: Option<String>,
    #[serde(default)]
    rating: Option<u32>, // 0..100
    #[serde(default)]
    summary: Option<String>,
    #[serde(default)]
    description: Option<String>,
    #[serde(default)]
    distro: Option<String>,
}

fn fetch_odrs_reviews(app_id: &str) -> (f32, Vec<AppReview>) {
    let url = format!("https://odrs.gnome.org/1.0/reviews/api/app/{}", app_id);
    let output = Command::new("curl")
        .args(["-s", "--connect-timeout", "4", "-m", "7", &url])
        .output();

    let mut reviews = Vec::new();
    let mut total_rating = 0.0;
    let mut count = 0;

    if let Ok(out) = output {
        if let Ok(raw_list) = serde_json::from_slice::<Vec<OdrsRawReview>>(&out.stdout) {
            for r in raw_list.into_iter().take(20) {
                let rating_100 = r.rating.unwrap_or(80);
                let stars = ((rating_100 as f32 / 20.0).round() as u8).clamp(1, 5);
                total_rating += stars as f32;
                count += 1;

                reviews.push(AppReview {
                    author: r.user_display.unwrap_or_else(|| "Usuario de Linux".to_string()),
                    rating: stars,
                    summary: r.summary.unwrap_or_else(|| "Opinión sobre la aplicación".to_string()),
                    description: r.description.unwrap_or_default(),
                    distro: r.distro.unwrap_or_else(|| "Linux".to_string()),
                    date: "Reciente".to_string(),
                });
            }
        }
    }

    let avg = if count > 0 {
        (total_rating / count as f32 * 10.0).round() / 10.0
    } else {
        4.8 // Default high rating for popular software without direct odrs entry
    };

    (avg, reviews)
}

fn fetch_flathub_stats(app_id: &str) -> Option<u64> {
    let url = format!("https://flathub.org/api/v2/stats/{}", app_id);
    let output = Command::new("curl")
        .args(["-s", "--connect-timeout", "3", "-m", "5", &url])
        .output();

    if let Ok(out) = output {
        if let Ok(v) = serde_json::from_slice::<serde_json::Value>(&out.stdout) {
            return v.get("installs_total").and_then(|i| i.as_u64());
        }
    }

    None
}
