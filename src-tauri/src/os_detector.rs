use std::collections::HashMap;
use std::fs;
use std::path::Path;
use std::process::Command;
use std::sync::LazyLock;
use std::time::{Duration, Instant};
use crate::models::OsInfo;

static OS_INFO_CACHE: LazyLock<std::sync::Mutex<Option<(Instant, OsInfo)>>> =
    LazyLock::new(|| std::sync::Mutex::new(None));

pub fn invalidate_os_cache() {
    if let Ok(mut guard) = OS_INFO_CACHE.lock() {
        *guard = None;
    }
}

pub fn detect_os() -> OsInfo {
    if let Ok(guard) = OS_INFO_CACHE.lock() {
        if let Some((ts, info)) = &*guard {
            if ts.elapsed() < Duration::from_secs(30) {
                return info.clone();
            }
        }
    }

    let os_data = read_os_release();

    let id = os_data.get("ID").cloned().unwrap_or_else(|| "linux".to_string()).to_lowercase();
    let id_like = os_data.get("ID_LIKE").cloned().unwrap_or_default().to_lowercase();
    let pretty_name = os_data.get("PRETTY_NAME").cloned()
        .or_else(|| os_data.get("NAME").cloned())
        .unwrap_or_else(|| "Linux".to_string());

    let family = if id == "arch"
        || id == "cachyos"
        || id == "manjaro"
        || id == "endeavouros"
        || id == "garuda"
        || id == "artix"
        || id_like.contains("arch")
    {
        "arch".to_string()
    } else if id == "debian"
        || id == "ubuntu"
        || id == "linuxmint"
        || id == "pop"
        || id == "elementary"
        || id == "zorin"
        || id == "kali"
        || id == "neon"
        || id_like.contains("debian")
        || id_like.contains("ubuntu")
    {
        "debian".to_string()
    } else if id == "fedora"
        || id == "rhel"
        || id == "centos"
        || id == "almalinux"
        || id == "rocky"
        || id == "nobara"
        || id_like.contains("fedora")
        || id_like.contains("rhel")
    {
        "fedora".to_string()
    } else if id.contains("suse") || id_like.contains("suse") {
        "suse".to_string()
    } else if id == "gentoo" || id_like.contains("gentoo") {
        "gentoo".to_string()
    } else {
        // Fallback by binary detection
        if command_exists("pacman") {
            "arch".to_string()
        } else if command_exists("apt") || command_exists("apt-get") {
            "debian".to_string()
        } else if command_exists("dnf") {
            "fedora".to_string()
        } else if command_exists("zypper") {
            "suse".to_string()
        } else if command_exists("emerge") {
            "gentoo".to_string()
        } else {
            "generic".to_string()
        }
    };

    let native_manager = match family.as_str() {
        "arch" if command_exists("pacman") => "pacman",
        "debian" if command_exists("apt") || command_exists("apt-get") => "apt",
        "fedora" if command_exists("dnf") => "dnf",
        "suse" if command_exists("zypper") => "zypper",
        "gentoo" if command_exists("emerge") => "portage",
        _ => {
            if command_exists("pacman") {
                "pacman"
            } else if command_exists("apt") {
                "apt"
            } else if command_exists("dnf") {
                "dnf"
            } else if command_exists("emerge") {
                "portage"
            } else if command_exists("zypper") {
                "zypper"
            } else {
                "unknown"
            }
        }
    }.to_string();

    let has_flatpak = command_exists("flatpak");
    let has_flathub = if has_flatpak {
        check_flathub_remote()
    } else {
        false
    };
    let has_snap = command_exists("snap");
    let architecture = std::env::consts::ARCH.to_string();

    let info = OsInfo {
        distro_name: pretty_name,
        distro_id: id,
        distro_family: family,
        native_manager,
        has_flatpak,
        has_flathub,
        has_snap,
        architecture,
    };

    if let Ok(mut guard) = OS_INFO_CACHE.lock() {
        *guard = Some((Instant::now(), info.clone()));
    }

    info
}

pub fn command_exists(cmd: &str) -> bool {
    if let Ok(path_var) = std::env::var("PATH") {
        for dir in path_var.split(':') {
            if dir.is_empty() || dir.contains("/.mount_") {
                continue;
            }
            let full = Path::new(dir).join(cmd);
            if full.is_file() {
                return true;
            }
        }
    }
    for std_dir in ["/usr/bin", "/bin", "/usr/local/bin", "/sbin", "/usr/sbin"] {
        if Path::new(std_dir).join(cmd).is_file() {
            return true;
        }
    }
    false
}

fn check_flathub_remote() -> bool {
    Command::new("flatpak")
        .arg("remotes")
        .output()
        .map(|o| {
            let out = String::from_utf8_lossy(&o.stdout).to_lowercase();
            out.contains("flathub")
        })
        .unwrap_or(false)
}

fn read_os_release() -> HashMap<String, String> {
    let mut map = HashMap::new();
    let paths = ["/etc/os-release", "/usr/lib/os-release"];

    for p in paths {
        if Path::new(p).exists() {
            if let Ok(content) = fs::read_to_string(p) {
                for line in content.lines() {
                    let line = line.trim();
                    if line.is_empty() || line.starts_with('#') {
                        continue;
                    }
                    if let Some((k, v)) = line.split_once('=') {
                        let key = k.trim().to_string();
                        let val = v.trim().trim_matches('"').trim_matches('\'').to_string();
                        map.insert(key, val);
                    }
                }
                return map;
            }
        }
    }

    map
}
