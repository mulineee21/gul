#!/usr/bin/env bash
set -euo pipefail

VERSION="v0.1.1"
APPIMAGE_URL="https://github.com/mulineee21/gul/releases/download/${VERSION}/gul_0.1.1_amd64.AppImage"
ICON_URL="https://raw.githubusercontent.com/mulineee21/gul/main/src-tauri/icons/128x128.png"

BIN_DIR="${HOME}/.local/bin"
APPS_DIR="${HOME}/.local/share/applications"
ICON_DIR="${HOME}/.local/share/icons/hicolor/128x128/apps"

echo "🚀 Descargando e instalando GUL (${VERSION})..."
mkdir -p "${BIN_DIR}" "${APPS_DIR}" "${ICON_DIR}"

curl -fL# "${APPIMAGE_URL}" -o "${BIN_DIR}/gul.AppImage"
chmod +x "${BIN_DIR}/gul.AppImage"

curl -fsSL "${ICON_URL}" -o "${ICON_DIR}/gul.png"

cat <<EOF > "${APPS_DIR}/gul.desktop"
[Desktop Entry]
Name=GUL
GenericName=Gestor Universal de Linux
Comment=Tienda y gestor universal de paquetes para Linux
Exec=${BIN_DIR}/gul.AppImage
Icon=gul
Terminal=false
Type=Application
Categories=System;PackageManager;Utility;
StartupWMClass=gul
Keywords=linux;store;pacman;flatpak;flathub;aur;snap;appimage;gul;
EOF

chmod +x "${APPS_DIR}/gul.desktop"
update-desktop-database "${APPS_DIR}" 2>/dev/null || true
gtk-update-icon-cache -f -t "${HOME}/.local/share/icons/hicolor" 2>/dev/null || true

echo "✅ GUL se ha añadido a tu cajón de aplicaciones. Abriendo GUL..."
nohup "${BIN_DIR}/gul.AppImage" >/dev/null 2>&1 &
