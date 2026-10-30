export type SourceType =
  | "pacman"
  | "apt"
  | "dnf"
  | "flatpak"
  | "snap"
  | "appimage"
  | "aur"
  | "portage";

export interface SizeBreakdown {
  binary_bytes: number;
  data_bytes: number;
  cache_bytes: number;
  config_bytes: number;
}

export interface AppInfo {
  id: string;
  name: string;
  canonical_name: string;
  version: string;
  source: SourceType;
  description: string;
  size_bytes: number;
  size_breakdown: SizeBreakdown;
  icon?: string;
  install_date?: string;
  is_duplicate: boolean;
  duplicate_group?: string;
  exec_path?: string;
  is_sandboxed: boolean;
  has_update: boolean;
}

export interface DuplicateGroup {
  canonical_name: string;
  display_name: string;
  apps: AppInfo[];
  recommended_id: string;
  reason: string;
  potential_savings_bytes: number;
}

export interface UpdateItem {
  id: string;
  name: string;
  current_version: string;
  new_version: string;
  source: SourceType;
  size_bytes?: number;
}

export interface SystemCleanItem {
  id: string;
  title: string;
  category: string;
  source: string;
  description: string;
  size_bytes: number;
  risk_level: "safe" | "moderate";
  requires_sudo: boolean;
  command_preview: string;
}

export interface CleanResult {
  success: boolean;
  cleaned_bytes: number;
  output_log: string;
  errors: string[];
}

export interface AppImageEntry {
  path: string;
  name: string;
  version?: string;
  size_bytes: number;
  is_integrated: boolean;
  desktop_file_path?: string;
  icon_path?: string;
  has_update_info: boolean;
  last_modified?: string;
}

export interface SystemOverview {
  distro_name: string;
  active_managers: string[];
  total_apps: number;
  duplicates_count: number;
  updates_available: number;
  total_disk_used_bytes: number;
  reclaimable_bytes: number;
}

export interface UpdateProgressEvent {
  manager: string;
  status: "starting" | "running" | "success" | "error";
  message: string;
}

export interface OsInfo {
  distro_name: string;
  distro_id: string;
  distro_family: string;
  native_manager: string;
  has_flatpak: boolean;
  has_flathub: boolean;
  has_snap: boolean;
  architecture: string;
}

export interface CatalogItem {
  id: string;
  name: string;
  canonical_name: string;
  summary: string;
  description: string;
  version: string;
  source: SourceType;
  icon_url?: string;
  developer?: string;
  is_installed: boolean;
  pkg_id: string;
  category?: string;
}

export interface InstallProgressEvent {
  id: string;
  status: "starting" | "installing" | "running" | "success" | "error";
  message: string;
  line?: string;
  progress_pct?: number;
  step?: string;
  is_stderr?: boolean;
}

export interface InstallOption {
  source: SourceType;
  title: string;
  subtitle: string;
  version: string;
  pkg_id: string;
  is_installed: boolean;
  pros: string[];
  badge_label: string;
  download_url?: string;
}

export interface AppReview {
  author: string;
  rating: number; // 1 to 5
  summary: string;
  description: string;
  distro: string;
  date: string;
}

export interface AppRelease {
  version: string;
  date?: string;
  description?: string;
}

export interface AppExtendedDetails {
  id: string;
  name: string;
  summary: string;
  description_html: string;
  developer?: string;
  license?: string;
  homepage_url?: string;
  bugtracker_url?: string;
  donation_url?: string;
  icon_url?: string;
  screenshots: string[];
  rating_score: number;
  total_reviews: number;
  total_installs?: number;
  reviews: AppReview[];
  releases: AppRelease[];
  is_installed: boolean;
}

export interface FlatpakPermissions {
  app_id: string;
  network: boolean;
  x11: boolean;
  wayland: boolean;
  pulseaudio: boolean;
  filesystem_home: boolean;
  filesystem_host: boolean;
  webcam: boolean;
  devices_all: boolean;
  can_edit: boolean;
}

export interface AurPackageItem {
  name: string;
  version: string;
  description: string;
  num_votes: number;
  popularity: number;
  maintainer?: string;
  url?: string;
  is_installed: boolean;
  out_of_date: boolean;
}

export interface AutostartEntry {
  id: string;
  name: string;
  exec: string;
  comment: string;
  icon?: string;
  enabled: boolean;
  file_path: string;
  is_system: boolean;
}

export interface SnapshotSupportInfo {
  supported: boolean;
  backend: string; // "snapper", "timeshift", "btrfs", "none"
  filesystem: string;
  snapshot_count: number;
}

export interface SnapshotEntry {
  id: string;
  num?: number;
  description: string;
  date: string;
  snapshot_type: string; // "pre", "post", "single", "manual"
}

export interface OmniProfile {
  version: string;
  export_date: string;
  distro: string;
  native_manager: string;
  native_packages: string[];
  flatpak_apps: string[];
  snap_apps?: string[];
  total_apps: number;
}
