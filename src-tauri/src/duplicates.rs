use std::collections::HashMap;
use crate::models::{AppInfo, DuplicateGroup, SourceType};

pub fn normalize_name(raw: &str) -> String {
    let mut s = raw.to_lowercase().trim().to_string();

    // Remove file extensions
    if let Some(stripped) = s.strip_suffix(".appimage") {
        s = stripped.to_string();
    }

    // If reverse-DNS format (e.g. "org.darktable.Darktable", "com.spotify.Client")
    if s.contains('.') {
        let parts: Vec<&str> = s.split('.').collect();
        if parts.len() >= 2 {
            let last = parts[parts.len() - 1];
            let prev = parts[parts.len() - 2];
            // If author and app have the same name (e.g. org.darktable.darktable, org.blender.blender)
            if last == prev {
                s = last.to_string();
            } else if last == "client" || last == "desktop" || last == "app" || last == "gui" || last == "studio" {
                s = prev.to_string();
            } else {
                s = last.to_string();
            }
        }
    }

    // Strip common reverse-DNS prefixes (Flatpak, DBus names)
    let prefixes = [
        "org.mozilla.",
        "org.videolan.",
        "com.discordapp.",
        "com.valvesoftware.",
        "com.spotify.",
        "com.visualstudio.",
        "org.telegram.",
        "org.gimp.",
        "org.inkscape.",
        "org.blender.",
        "org.kde.",
        "org.gnome.",
        "com.obsproject.",
        "com.google.chrome.",
        "com.brave.browser.",
        "org.libretro.",
        "org.freecadweb.",
        "md.obsidian.",
        "io.github.",
        "org.",
        "com.",
        "net.",
        "io.",
    ];

    for prefix in &prefixes {
        if s.starts_with(prefix) {
            s = s[prefix.len()..].to_string();
            break;
        }
    }

    // Replace dots, underscores with dashes
    s = s.replace(['.', '_', ' '], "-");

    // Clean up duplicated words like "darktable-darktable"
    let parts: Vec<&str> = s.split('-').collect();
    if parts.len() == 2 && parts[0] == parts[1] {
        s = parts[0].to_string();
    }

    // Strip common packaging suffixes
    let suffixes = [
        "-bin",
        "-git",
        "-desktop",
        "-electron",
        "-app",
        "-stable",
        "-community",
        "-browser",
        "-client",
        "-studio",
    ];

    for suffix in &suffixes {
        if s.ends_with(suffix) && s.len() > suffix.len() + 2 {
            s = s[..s.len() - suffix.len()].to_string();
            break;
        }
    }

    s.trim_matches('-').to_string()
}

pub fn analyze_duplicates(mut apps: Vec<AppInfo>) -> (Vec<AppInfo>, Vec<DuplicateGroup>) {
    let mut groups_map: HashMap<String, Vec<usize>> = HashMap::new();

    for (idx, app) in apps.iter().enumerate() {
        if !app.canonical_name.is_empty() && app.canonical_name.len() > 1 {
            groups_map
                .entry(app.canonical_name.clone())
                .or_default()
                .push(idx);
        }
    }

    let mut duplicate_groups = Vec::new();

    for (canonical, indices) in groups_map {
        if indices.len() > 1 {
            // Check if there are different sources or different IDs
            let mut unique_sources = std::collections::HashSet::new();
            for &idx in &indices {
                unique_sources.insert(apps[idx].source.as_str());
            }

            // Mark apps as duplicate
            for &idx in &indices {
                apps[idx].is_duplicate = true;
                apps[idx].duplicate_group = Some(canonical.clone());
            }

            let group_apps: Vec<AppInfo> = indices.iter().map(|&idx| apps[idx].clone()).collect();
            let (recommended_id, reason, savings) = evaluate_recommendation(&group_apps);

            let display_name = group_apps
                .iter()
                .find(|a| a.source == SourceType::Pacman || a.source == SourceType::Apt || a.source == SourceType::Flatpak)
                .map(|a| a.name.clone())
                .unwrap_or_else(|| canonical.clone());

            duplicate_groups.push(DuplicateGroup {
                canonical_name: canonical,
                display_name,
                apps: group_apps,
                recommended_id,
                reason,
                potential_savings_bytes: savings,
            });
        }
    }

    // Sort groups with biggest potential space savings first
    duplicate_groups.sort_by(|a, b| b.potential_savings_bytes.cmp(&a.potential_savings_bytes));

    (apps, duplicate_groups)
}

fn evaluate_recommendation(apps: &[AppInfo]) -> (String, String, u64) {
    if apps.is_empty() {
        return (String::new(), String::new(), 0);
    }

    // Heuristics:
    // 1. Native packages (Pacman, APT, DNF) generally have the best performance, lowest disk overhead and best hardware/theme integration.
    // 2. However, if Flatpak is significantly newer or if native version is ancient, Flatpak is preferred.
    // 3. AppImage is great for portability, but less integrated.

    let native_opt = apps.iter().find(|a| {
        a.source == SourceType::Pacman || a.source == SourceType::Apt || a.source == SourceType::Dnf
    });

    let flatpak_opt = apps.iter().find(|a| a.source == SourceType::Flatpak);
    let appimage_opt = apps.iter().find(|a| a.source == SourceType::AppImage);
    let snap_opt = apps.iter().find(|a| a.source == SourceType::Snap);

    let total_bytes: u64 = apps.iter().map(|a| a.size_bytes).sum();

    if let (Some(native), Some(flatpak)) = (native_opt, flatpak_opt) {
        // Compare sizes
        let flatpak_size = flatpak.size_bytes;
        let native_size = native.size_bytes;

        // If native is smaller or equal, recommend native for speed and low disk footprint
        if native_size <= flatpak_size || (native_size as f64) < (flatpak_size as f64 * 1.5) {
            let savings = total_bytes.saturating_sub(native_size);
            let reason = format!(
                "Recomendado Nativo ({:?}): Mayor rendimiento y arranque inmediato con integración directa del sistema. Ahorras espacio eliminando runtimes redundantes de Flatpak.",
                native.source
            );
            return (native.id.clone(), reason, savings);
        } else {
            let savings = total_bytes.saturating_sub(flatpak_size);
            let reason = "Recomendado Flatpak: Contenedor aislado con permisos seguros y dependencias autónomas actualizadas.".to_string();
            return (flatpak.id.clone(), reason, savings);
        }
    }

    if let (Some(native), Some(_ai)) = (native_opt, appimage_opt) {
        let savings = total_bytes.saturating_sub(native.size_bytes);
        return (
            native.id.clone(),
            format!(
                "Recomendado paquete nativo del sistema ({:?}): Se actualiza automáticamente junto al resto del sistema operativo y no requiere gestión manual del archivo .AppImage.",
                native.source
            ),
            savings,
        );
    }

    if let (Some(flatpak), Some(_snap)) = (flatpak_opt, snap_opt) {
        let savings = total_bytes.saturating_sub(flatpak.size_bytes);
        return (
            flatpak.id.clone(),
            "Recomendado Flatpak: Mejor integración con el escritorio Linux estándar y menor tiempo de inicio que Snap.".to_string(),
            savings,
        );
    }

    // Default: recommend the first app
    let first = &apps[0];
    let savings = total_bytes.saturating_sub(first.size_bytes);
    (
        first.id.clone(),
        format!("Recomendado conservar versión principal de {}", first.source.as_str()),
        savings,
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_normalize_darktable() {
        assert_eq!(normalize_name("org.darktable.Darktable"), "darktable");
        assert_eq!(normalize_name("Darktable"), "darktable");
        assert_eq!(normalize_name("darktable-darktable"), "darktable");
    }

    #[test]
    fn test_normalize_vlc() {
        assert_eq!(normalize_name("org.videolan.VLC"), "vlc");
        assert_eq!(normalize_name("vlc"), "vlc");
    }

    #[test]
    fn test_normalize_blender() {
        assert_eq!(normalize_name("org.blender.Blender"), "blender");
    }
}
