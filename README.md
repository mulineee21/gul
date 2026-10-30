# GUL — Universal Linux Manager 🐧

<p align="center">
  <img src="src-tauri/icons/128x128.png" width="96" height="96" alt="GUL Logo" />
</p>

<p align="center">
  <strong>The ultimate universal software center and system maintenance toolkit for any Linux distribution.</strong><br>
  Unifies Pacman, AUR, APT, DNF, Portage (Gentoo), Flatpak, Snap, and AppImage into a modern, blazing-fast, and elegant desktop experience.
</p>

<p align="center">
  <a href="https://github.com/mulineee21/gul/releases/latest"><img src="https://img.shields.io/github/v/release/mulineee21/gul?color=blue&label=version" alt="Latest Release" /></a>
  <a href="https://github.com/mulineee21/gul/stargazers"><img src="https://img.shields.io/github/stars/mulineee21/gul?style=flat&color=yellow" alt="GitHub Stars" /></a>
  <img src="https://img.shields.io/badge/Platform-Linux%20(Arch%20%7C%20Ubuntu%20%7C%20Debian%20%7C%20Fedora%20%7C%20Gentoo)-blue.svg" alt="Linux Support" />
  <img src="https://img.shields.io/badge/Backend-Rust%20%2B%20Tauri%20v2-orange.svg" alt="Tauri v2" />
  <img src="https://img.shields.io/badge/Frontend-React%2019%20%2B%20Tailwind-cyan.svg" alt="React 19" />
  <img src="https://img.shields.io/badge/License-GPL--3.0--or--later-blue.svg" alt="GNU GPL v3+" />
  <a href="https://github.com/mulineee21/gul/issues"><img src="https://img.shields.io/badge/contributions-welcome-brightgreen.svg?style=flat" alt="Contributions Welcome" /></a>
</p>

---

## 🌟 What is GUL?

**GUL** (*Gestor Universal de Linux* / *Universal Linux Manager*) was created to solve software packaging fragmentation across the Linux ecosystem. Instead of juggling disparate CLI package managers, incompatible app stores, or manual configurations, GUL provides a unified, coherent, and intuitive interface to discover, install, update, manage sandbox permissions, and clean packages from any source.

---

## 🚀 Key Features

### 1. 🛍️ Universal Multi-Source Software Store
- **Flathub (Flatpak)**: Browse thousands of verified desktop applications with high-resolution screenshots, community ratings, and rich descriptions.
- **Snap Store (Canonical)**: Full integration for Snap packages on Ubuntu and any Linux distribution running `snapd`.
- **Distribution Native Repositories**: Automatic detection via `/etc/os-release` to search and install directly through:
  - **Pacman** (Arch Linux, CachyOS, Manjaro, EndeavourOS)
  - **APT** (Ubuntu, Debian, Linux Mint, Pop!_OS)
  - **DNF** (Fedora, RHEL, AlmaLinux, Rocky Linux)
  - **Portage / Emerge** (Gentoo Linux)
- **Arch User Repository (AUR)**: Integrated search using RPC API v5 and AUR helpers (`paru` / `yay`) with real-time popularity scores and votes.

### 2. 🎛️ Intelligent Packaging Format Selector
- When choosing to install an application, GUL lets you compare and select:
  - **Native Package**: Maximum performance and tightest OS integration.
  - **Snap (Canonical)**: Ubuntu standard with AppArmor security confinement and delta updates.
  - **Flatpak / Flathub**: Sandboxed isolation that won't touch system libraries.
  - **AppImage**: Standalone, portable executable.
- Compare download size, isolation level, and version before committing to an install.

### 3. 💻 Live Installation Terminal & Progress Bar
- Real-time percentage progress bar paired with a streaming terminal displaying colored output (`stdout` / `stderr`).
- One-click process cancellation at any time with graceful process tree cleanup.

### 4. 🛡️ Flatpak Permissions Manager (Flatseal Inside)
- Fine-tune security and sandbox permissions for any Flatpak app directly from its details view:
  - Network & Internet socket access
  - Wayland and X11 / XWayland display servers
  - Audio playback & recording (PipeWire / PulseAudio)
  - Filesystem access (`~` user home or `/` full system)
  - Hardware devices and webcams
  - One-click button to reset permissions to default.

### 5. 🚀 Startup Applications Manager (Autostart)
- Audit and control applications and background services launched with your desktop session according to the XDG specification.
- Toggle entries on or off with a single click, or easily add custom commands and scripts.

### 6. 💾 System Cloning & Software Profiles (OmniSync)
- Export your entire installed software stack into a portable `gul-profile.json` file.
- Restore or migrate to a new machine or fresh OS installation with batch reinstallation and streaming terminal progress.

### 7. ⏪ System Restore Points & Snapshots (Btrfs)
- Seamless integration with Btrfs filesystems via `snapper` and `timeshift`.
- Create instant copy-on-write snapshots manually or enable **automated pre-update snapshots** to ensure instant rollback if an update ever breaks something.

### 8. 🔍 Duplicate Application Detector
- Automatically flags software installed simultaneously across multiple packaging formats (e.g., native VLC alongside Flatpak VLC).
- Calculates potential disk savings and lets you keep the recommended version with a single click.

### 9. 🧹 System Cleaner & Maintenance
- Reclaim gigabytes of wasted storage by clearing:
  - Package download caches (`/var/cache/pacman/pkg`, `/var/cache/apt/archives`, `/var/cache/dnf`, `/var/cache/distfiles`).
  - Orphaned dependencies left behind after uninstalling software (`pacman -Qtdq`, `apt autoremove`, `dnf autoremove`, `emerge --depclean`).
  - Unused Flatpak runtimes (`flatpak uninstall --unused`).
  - Old disabled Snap revisions.

### 10. ⚡ Unified Update Center
- Upgrade all active package managers concurrently with live streaming logs and native desktop notifications.

---

## 📦 Installation

### Option 1: Universal .AppImage (Any Linux Distribution)
Download the standalone `.AppImage` from [GitHub Releases](https://github.com/mulineee21/gul/releases/latest):
```bash
chmod +x gul_0.1.0_amd64.AppImage
./gul_0.1.0_amd64.AppImage
```

### Option 2: Arch Linux / CachyOS / Manjaro (AUR)
```bash
paru -S gul-bin
# or with yay:
yay -S gul-bin
```

### Option 3: Ubuntu / Debian / Linux Mint (.deb)
```bash
sudo dpkg -i gul_0.1.0_amd64.deb
sudo apt-get install -f
```

### Option 4: Fedora / RHEL / CentOS (.rpm)
```bash
sudo dnf install ./gul-0.1.0-1.x86_64.rpm
```

---

## 🛠️ Building from Source

### Prerequisites
- **Node.js** (v18+) and `npm`
- **Rust** & **Cargo** (v1.75+)
- System libraries:
  - **Arch / CachyOS**: `sudo pacman -S webkit2gtk-4.1 base-devel openssl libayatana-appindicator`
  - **Debian / Ubuntu**: `sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget libssl-dev libayatana-appindicator3-dev librsvg2-dev`
  - **Fedora**: `sudo dnf install webkit2gtk4.1-devel openssl-devel libayatana-appindicator-gtk3-devel`
  - **Gentoo**: `emerge --ask net-libs/webkit-gtk dev-libs/openssl`

### Build Steps
```bash
# 1. Clone the repository
git clone https://github.com/mulineee21/gul.git
cd gul

# 2. Install frontend dependencies
npm install

# 3. Launch in development mode with hot-reloading
npm run tauri dev

# 4. Compile optimized production binaries & packages (.AppImage, .deb, .rpm)
npm run tauri build
```

---

## 📁 Architecture & Project Structure

```text
gul/
├── src/                          # Frontend in React 19 + TypeScript + Tailwind CSS
│   ├── components/               # UI Views (Store, Apps, Duplicates, Cleaner, Snapshots, Autostart...)
│   ├── types.ts                  # Shared TypeScript interfaces matching Rust models
│   ├── utils.ts                  # Byte formatting, source badges, helper utilities
│   └── App.tsx                   # Main state coordinator & view router
├── src-tauri/                    # Backend in Rust (Tauri v2)
│   ├── src/
│   │   ├── managers/             # Drivers for Pacman, APT, DNF, Portage, Flatpak, Snap, AppImage
│   │   ├── aur.rs                # AUR RPC API v5 integration & helper execution
│   │   ├── flatpak_permissions.rs# Sandbox permission inspector & override engine (Flatseal)
│   │   ├── snapshots.rs          # Btrfs snapshot engine (Snapper & Timeshift)
│   │   ├── autostart.rs          # XDG desktop autostart specification manager
│   │   ├── backup_profile.rs     # Software profile JSON import/export
│   │   ├── notifications.rs      # Background update monitor & desktop notifications
│   │   └── os_detector.rs        # Linux distribution detection engine (/etc/os-release)
│   └── tauri.conf.json           # Tauri v2 configuration & bundle specifications
└── .github/workflows/            # Automated CI/CD release builds
```

---

## 🌟 Support the Project

If you find **GUL** useful, please consider giving it a **Star ⭐** on GitHub! It helps the project gain visibility across the open-source community and attracts more contributors and maintainers.

- 🐛 Found a bug? Open an [Issue](https://github.com/mulineee21/gul/issues).
- 💬 Have an idea or question? Join the [Discussions](https://github.com/mulineee21/gul/discussions).
- 🤝 Want to contribute code? Read our [Contributing Guide](CONTRIBUTING.md).

---

## 📄 License

This project is licensed under the **GNU General Public License v3.0 or later (GPL-3.0-or-later)** — see the [LICENSE](LICENSE) file for details.

```text
GUL (Universal Linux Manager)
Copyright (C) 2026 Joel Molina

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.
```
