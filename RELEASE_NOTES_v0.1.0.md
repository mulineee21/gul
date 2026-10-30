# 🐧 GUL v0.1.0 — Gestor Universal de Linux (Lanzamiento Inicial)

¡Bienvenido a la primera versión pública oficial de **GUL (Gestor Universal de Linux)**!
GUL centraliza y unifica la gestión de software de todos los ecosistemas de Linux en una sola herramienta gráfica moderna, rápida y elegante desarrollada en **Rust + Tauri v2 + React 19 + Tailwind CSS**.

---

## 🚀 Capacidades y Novedades Principales

### 🛍️ 1. Tienda Universal Multi-Origen
- **Flathub (Flatpak)**: Explora miles de aplicaciones con capturas de pantalla, descripciones y opiniones.
- **Snap Store (Canonical)**: Soporte completo para paquetes Snap en Ubuntu y cualquier distribución con `snapd`.
- **Repositorios Nativos de tu Distribución**: Detección automática de tu sistema (`/etc/os-release`) para buscar e instalar directamente en:
  - **Pacman** (Arch Linux, CachyOS, Manjaro, EndeavourOS)
  - **APT** (Ubuntu, Debian, Linux Mint, Pop!_OS)
  - **DNF** (Fedora, RHEL, AlmaLinux, Rocky)
  - **Portage** (Gentoo Linux con `emerge`)
- **Arch User Repository (AUR)**: Búsqueda integrada mediante API RPC v5 y helpers (`paru` / `yay`) con recuento de votos y popularidad.

### 🎛️ 2. Selector Inteligente de Formato
- Cuando eliges instalar una aplicación, GUL te permite elegir entre:
  - **Paquete Nativo** (máximo rendimiento y compatibilidad con el sistema).
  - **Snap** (confinamiento AppArmor y actualizaciones automáticas).
  - **Flatpak / Flathub** (aislamiento sandbox seguro).
  - **AppImage** (ejecutable independiente y portable).
- Muestra comparativas de tamaño de descarga, aislamiento y versión antes de instalar.

### 💻 3. Terminal en Vivo y Progreso en Streaming
- Cada instalación y desinstalación cuenta con un modal interactivo con barra de progreso porcentual y un terminal en streaming con logs coloreados del proceso (`stdout`/`stderr`), permitiendo cancelar la operación en cualquier momento.

### 🛡️ 4. Gestor de Permisos Flatpak (Flatseal Integrado)
- Configura los permisos de seguridad y sandbox de cualquier app Flatpak directamente desde su ficha:
  - Red e Internet
  - Servidores gráficos Wayland y X11
  - Servidor de audio (PulseAudio / PipeWire)
  - Acceso a `/home` o al sistema de archivos completo
  - Acceso a dispositivos de hardware
  - Botón para restaurar permisos predeterminados.

### 🚀 5. Gestor de Aplicaciones de Inicio (Autostart)
- Controla los programas y scripts que se inician con tu sesión de escritorio según el estándar XDG (`~/.config/autostart` y `/etc/xdg/autostart`).
- Activa o desactiva programas con un clic o añade comandos personalizados.

### 💾 6. Clonar mi Sistema (Exportar e Importar Perfil de Software)
- Genera un archivo `gul-perfil.json` con todos los paquetes nativos, Flatpaks y Snaps instalados.
- Importa perfiles en otros equipos o tras reinstalar el sistema para restaurar todos tus programas en lote con terminal de seguimiento.

### ⏪ 7. Puntos de Restauración / Snapshots (Btrfs)
- Integración con sistemas de archivos Btrfs mediante `snapper` y `timeshift`.
- Crea instantáneas manuales del sistema o activa la **protección automática previa a cada actualización**.

### 🔍 8. Detector y Optimizador de Duplicados
- Identifica aplicaciones instaladas simultáneamente en múltiples formatos (ej. VLC nativo y VLC en Flatpak).
- Calcula el ahorro potencial en disco y permite conservar la versión recomendada con 1 solo clic.

### 🧹 9. Limpiador del Sistema (Cleaner)
- Recupera gigabytes de espacio en disco analizando:
  - Cachés de paquetes (`/var/cache/pacman/pkg`, `/var/cache/apt/archives`, `/var/cache/dnf`, `/var/cache/distfiles`).
  - Dependencias huérfanas sin uso (`pacman -Qtdq`, `apt autoremove`, `dnf autoremove`, `emerge --depclean`).
  - Runtimes obsoletos de Flatpak (`flatpak uninstall --unused`).
  - Revisiones inactivas de Snap.

### ⚡ 10. Centro de Actualizaciones Unificado
- Actualiza todos los gestores de paquetes simultáneamente con seguimiento paso a paso y notificaciones nativas de escritorio.

---

## 📦 Instrucciones de Instalación por Distribución

### 🌟 Universal (Cualquier distribución Linux)
Descarga el archivo `.AppImage`:
```bash
chmod +x gul_0.1.0_amd64.AppImage
./gul_0.1.0_amd64.AppImage
```

### 🟠 Ubuntu / Debian / Linux Mint / Pop!_OS (.deb)
```bash
sudo dpkg -i gul_0.1.0_amd64.deb
sudo apt-get install -f
```

### 🔵 Fedora / RHEL / openSUSE (.rpm)
```bash
sudo dnf install ./gul-0.1.0-1.x86_64.rpm
```

### 🏹 Arch Linux / CachyOS / Manjaro (AUR)
```bash
paru -S gul-bin
# o con yay:
yay -S gul-bin
```

---

**Licencia**: GNU General Public License v3.0 or later (GPL-3.0-or-later)  
**Autor**: Joel Molina (@mulineee21)
