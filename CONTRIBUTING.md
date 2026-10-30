# Contributing to GUL (Universal Linux Manager) 🐧

Thank you for your interest in contributing to GUL! This is an open-source, community-driven project licensed under the **GNU General Public License v3 or later (GPL-3.0-or-later)**.

---

## 🌟 Ways to Contribute

1. **Star the repository ⭐**: Give GUL a star on GitHub to help more Linux users discover the project.
2. **Report bugs & issues**: Open an [Issue](https://github.com/mulineee21/gul/issues) if you encounter any unexpected behavior on your distribution.
3. **Propose features**: Share ideas or UI enhancements in [Discussions](https://github.com/mulineee21/gul/discussions).
4. **Submit code & PRs**: Submit Pull Requests for new package manager drivers, bug fixes, or performance optimizations.

---

## 🛠️ Local Development Setup

### Prerequisites
- **Node.js** (v18+) and `npm`
- **Rust** & **Cargo** (v1.75+)
- Core development libraries for your distribution:
  - **Arch/CachyOS**: `sudo pacman -S webkit2gtk-4.1 base-devel openssl libayatana-appindicator`
  - **Ubuntu/Debian**: `sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget libssl-dev libayatana-appindicator3-dev librsvg2-dev`
  - **Fedora**: `sudo dnf install webkit2gtk4.1-devel openssl-devel libayatana-appindicator-gtk3-devel`
  - **Gentoo**: `emerge --ask net-libs/webkit-gtk dev-libs/openssl`

### Basic Commands
```bash
# Install frontend dependencies
npm install

# Start local live development server with hot-reloading
npm run tauri dev

# Check Rust backend code
cargo check --manifest-path src-tauri/Cargo.toml

# Build frontend production bundle
npm run build
```

---

## 📜 Pull Request Guidelines
- Verify that both `npm run build` and `cargo check --manifest-path src-tauri/Cargo.toml` succeed with zero errors and zero compiler warnings.
- Write clear, descriptive commit messages (e.g. `feat: add support for Nix packages`, `fix: package size parser`).
- Maintain visual harmony with the Tailwind CSS dark mode design language.
