use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum SourceType {
    Pacman,
    Apt,
    Dnf,
    Flatpak,
    Snap,
    AppImage,
    Aur,
}

impl SourceType {
    pub fn as_str(&self) -> &'static str {
        match self {
            SourceType::Pacman => "pacman",
            SourceType::Apt => "apt",
            SourceType::Dnf => "dnf",
            SourceType::Flatpak => "flatpak",
            SourceType::Snap => "snap",
            SourceType::AppImage => "appimage",
            SourceType::Aur => "aur",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct SizeBreakdown {
    pub binary_bytes: u64,
    pub data_bytes: u64,
    pub cache_bytes: u64,
    pub config_bytes: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppInfo {
    pub id: String,
    pub name: String,
    pub canonical_name: String,
    pub version: String,
    pub source: SourceType,
    pub description: String,
    pub size_bytes: u64,
    pub size_breakdown: SizeBreakdown,
    pub icon: Option<String>,
    pub install_date: Option<String>,
    pub is_duplicate: bool,
    pub duplicate_group: Option<String>,
    pub exec_path: Option<String>,
    pub is_sandboxed: bool,
    pub has_update: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DuplicateGroup {
    pub canonical_name: String,
    pub display_name: String,
    pub apps: Vec<AppInfo>,
    pub recommended_id: String,
    pub reason: String,
    pub potential_savings_bytes: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateItem {
    pub id: String,
    pub name: String,
    pub current_version: String,
    pub new_version: String,
    pub source: SourceType,
    pub size_bytes: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemCleanItem {
    pub id: String,
    pub title: String,
    pub category: String, // "cache", "orphans", "flatpak_unused", "app_cache"
    pub source: String,   // "pacman", "apt", "flatpak", "snap", "system"
    pub description: String,
    pub size_bytes: u64,
    pub risk_level: String, // "safe", "moderate"
    pub requires_sudo: bool,
    pub command_preview: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CleanResult {
    pub success: bool,
    pub cleaned_bytes: u64,
    pub output_log: String,
    pub errors: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppImageEntry {
    pub path: String,
    pub name: String,
    pub version: Option<String>,
    pub size_bytes: u64,
    pub is_integrated: bool,
    pub desktop_file_path: Option<String>,
    pub icon_path: Option<String>,
    pub has_update_info: bool,
    pub last_modified: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemOverview {
    pub distro_name: String,
    pub active_managers: Vec<String>,
    pub total_apps: usize,
    pub duplicates_count: usize,
    pub updates_available: usize,
    pub total_disk_used_bytes: u64,
    pub reclaimable_bytes: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OsInfo {
    pub distro_name: String,
    pub distro_id: String,
    pub distro_family: String,
    pub native_manager: String,
    pub has_flatpak: bool,
    pub has_flathub: bool,
    pub has_snap: bool,
    pub architecture: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CatalogItem {
    pub id: String,
    pub name: String,
    pub canonical_name: String,
    pub summary: String,
    pub description: String,
    pub version: String,
    pub source: SourceType,
    pub icon_url: Option<String>,
    pub developer: Option<String>,
    pub is_installed: bool,
    pub pkg_id: String,
    pub category: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InstallProgressEvent {
    pub id: String,
    pub status: String, // "starting", "installing", "running", "success", "error"
    pub message: String,
    #[serde(default)]
    pub line: Option<String>,
    #[serde(default)]
    pub progress_pct: Option<f32>,
    #[serde(default)]
    pub step: Option<String>,
    #[serde(default)]
    pub is_stderr: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InstallOption {
    pub source: SourceType,
    pub title: String,
    pub subtitle: String,
    pub version: String,
    pub pkg_id: String,
    pub is_installed: bool,
    pub pros: Vec<String>,
    pub badge_label: String,
    pub download_url: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppReview {
    pub author: String,
    pub rating: u8, // 1 to 5
    pub summary: String,
    pub description: String,
    pub distro: String,
    pub date: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppRelease {
    pub version: String,
    pub date: Option<String>,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppExtendedDetails {
    pub id: String,
    pub name: String,
    pub summary: String,
    pub description_html: String,
    pub developer: Option<String>,
    pub license: Option<String>,
    pub homepage_url: Option<String>,
    pub bugtracker_url: Option<String>,
    pub donation_url: Option<String>,
    pub icon_url: Option<String>,
    pub screenshots: Vec<String>,
    pub rating_score: f32,
    pub total_reviews: usize,
    pub total_installs: Option<u64>,
    pub reviews: Vec<AppReview>,
    pub releases: Vec<AppRelease>,
    pub is_installed: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct FlatpakPermissions {
    pub app_id: String,
    pub network: bool,
    pub x11: bool,
    pub wayland: bool,
    pub pulseaudio: bool,
    pub filesystem_home: bool,
    pub filesystem_host: bool,
    pub webcam: bool,
    pub devices_all: bool,
    pub can_edit: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AurPackageItem {
    pub name: String,
    pub version: String,
    pub description: String,
    pub num_votes: u32,
    pub popularity: f32,
    pub maintainer: Option<String>,
    pub url: Option<String>,
    pub is_installed: bool,
    pub out_of_date: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AutostartEntry {
    pub id: String,
    pub name: String,
    pub exec: String,
    pub comment: String,
    pub icon: Option<String>,
    pub enabled: bool,
    pub file_path: String,
    pub is_system: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SnapshotSupportInfo {
    pub supported: bool,
    pub backend: String, // "snapper", "btrfs", "none"
    pub filesystem: String,
    pub snapshot_count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SnapshotEntry {
    pub id: String,
    pub num: Option<u32>,
    pub description: String,
    pub date: String,
    pub snapshot_type: String, // "pre", "post", "single", "manual"
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OmniProfile {
    pub version: String,
    pub export_date: String,
    pub distro: String,
    pub native_manager: String,
    pub native_packages: Vec<String>,
    pub flatpak_apps: Vec<String>,
    pub total_apps: usize,
}
