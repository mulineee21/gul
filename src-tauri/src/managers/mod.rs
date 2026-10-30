pub mod pacman;
pub mod flatpak;
pub mod snap;
pub mod apt;
pub mod dnf;
pub mod portage;
pub mod appimage;

use crate::models::{AppInfo, UpdateItem, SystemCleanItem};

pub fn get_active_managers() -> Vec<String> {
    let mut managers = Vec::new();
    if pacman::is_available() {
        managers.push("pacman".to_string());
    }
    if flatpak::is_available() {
        managers.push("flatpak".to_string());
    }
    if snap::is_available() {
        managers.push("snap".to_string());
    }
    if apt::is_available() {
        managers.push("apt".to_string());
    }
    if dnf::is_available() {
        managers.push("dnf".to_string());
    }
    if portage::is_available() {
        managers.push("portage".to_string());
    }
    managers.push("appimage".to_string());
    managers
}

pub fn list_all_installed() -> Vec<AppInfo> {
    let mut all = Vec::new();

    if pacman::is_available() {
        all.extend(pacman::list_installed());
    }
    if flatpak::is_available() {
        all.extend(flatpak::list_installed());
    }
    if snap::is_available() {
        all.extend(snap::list_installed());
    }
    if apt::is_available() {
        all.extend(apt::list_installed());
    }
    if dnf::is_available() {
        all.extend(dnf::list_installed());
    }
    if portage::is_available() {
        all.extend(portage::list_installed());
    }

    // AppImages
    let appimages = appimage::scan_appimages(&[]);
    for ai in appimages {
        all.push(appimage::to_app_info(&ai));
    }

    all
}

pub fn check_all_updates() -> Vec<UpdateItem> {
    let mut all = Vec::new();

    if pacman::is_available() {
        all.extend(pacman::check_updates());
    }
    if flatpak::is_available() {
        all.extend(flatpak::check_updates());
    }
    if snap::is_available() {
        all.extend(snap::check_updates());
    }
    if apt::is_available() {
        all.extend(apt::check_updates());
    }
    if dnf::is_available() {
        all.extend(dnf::check_updates());
    }
    if portage::is_available() {
        all.extend(portage::check_updates());
    }

    all
}

pub fn scan_all_cleaner_items() -> Vec<SystemCleanItem> {
    let mut all = Vec::new();

    if pacman::is_available() {
        all.extend(pacman::scan_cleaner_items());
    }
    if flatpak::is_available() {
        all.extend(flatpak::scan_cleaner_items());
    }
    if snap::is_available() {
        all.extend(snap::scan_cleaner_items());
    }
    if apt::is_available() {
        all.extend(apt::scan_cleaner_items());
    }
    if dnf::is_available() {
        all.extend(dnf::scan_cleaner_items());
    }
    if portage::is_available() {
        all.extend(portage::scan_cleaner_items());
    }

    all
}
