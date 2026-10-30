# GUL — Gestor Universal de Linux 🐧

<p align="center">
  <img src="src-tauri/icons/128x128.png" width="96" height="96" alt="GUL Logo" />
</p>

<p align="center">
  <strong>El centro de software y mantenimiento definitivo para cualquier distribución Linux.</strong><br>
  Unifica Pacman, AUR, APT, DNF, Portage (Gentoo), Flatpak, Snap y AppImage en una interfaz moderna, rápida y elegante.
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

## 🌟 ¿Qué es GUL?

**GUL** (*Gestor Universal de Linux*) nace para resolver la fragmentación del ecosistema de software en Linux. En lugar de lidiar con múltiples comandos de terminal o diferentes tiendas de aplicaciones incompatibles, GUL proporciona una experiencia visual única y consistente para buscar, instalar, actualizar, auditar permisos y limpiar programas de cualquier origen.

---

## 🚀 Características Principales

### 1. 🛍️ Tienda Universal Multi-Origen
- **Flathub (Flatpak)**: Explora miles de aplicaciones con fotos en alta definición, reseñas y descripciones.
- **Snap Store (Canonical)**: Soporte completo para paquetes Snap en Ubuntu y cualquier distribución con `snapd`.
- **Repositorios Nativos de tu Distribución**: Detección automática de tu sistema (`/etc/os-release`) para buscar e instalar directamente en:
  - **Pacman** (Arch Linux, CachyOS, Manjaro)
  - **APT** (Ubuntu, Debian, Linux Mint, Pop!_OS)
  - **DNF** (Fedora, RHEL, AlmaLinux, Rocky)
  - **Portage / Emerge** (Gentoo Linux)
- **Arch User Repository (AUR)**: Búsqueda integrada mediante API RPC v5 y helpers (`paru` / `yay`) con recuento de votos y popularidad.

### 2. 🎛️ Selector Inteligente de Formato
- Cuando eliges instalar una aplicación, GUL te permite elegir entre:
  - **Paquete Nativo** (máximo rendimiento y compatibilidad con el sistema).
  - **Snap (Canonical)** (estándar de Ubuntu con confinamiento AppArmor y actualizaciones delta).
  - **Flatpak / Flathub** (aislamiento sandbox seguro).
  - **AppImage** (ejecutable independiente y portable).
- Muestra comparativas de tamaño de descarga, aislamiento y versión antes de instalar.

### 3. 💻 Terminal en Vivo y Progreso en Tiempo Real
- Cada instalación y desinstalación cuenta con un modal interactivo con barra de progreso porcentual y un terminal en streaming con logs coloreados del proceso (`stdout`/`stderr`), permitiendo cancelar la operación en cualquier momento.

### 4. 🛡️ Gestor de Permisos Flatpak (Flatseal Integrado)
- Configura los permisos de seguridad y sandbox de cualquier app Flatpak directamente desde su ficha:
  - Red e Internet
  - Servidores gráficos Wayland y X11
  - Servidor de audio (PulseAudio / PipeWire)
  - Acceso al directorio `/home` o al sistema de archivos completo
  - Acceso a dispositivos de hardware
  - Botón para restaurar permisos predeterminados.

### 5. 🚀 Gestor de Aplicaciones de Inicio (Autostart)
- Controla los programas y scripts que se inician con tu sesión de escritorio según el estándar XDG.
- Activa o desactiva programas con un clic o añade comandos personalizados.

### 6. 💾 Clonar mi Sistema (Exportar e Importar Perfil de Software)
- Genera un archivo `gul-perfil.json` con todos los paquetes nativos y Flatpaks instalados.
- Importa perfiles en otros equipos o tras reinstalar el sistema para restaurar todos tus programas en lote con terminal de seguimiento.

### 7. ⏪ Puntos de Restauración / Snapshots (Btrfs)
- Integración con sistemas de archivos Btrfs mediante `snapper` y `timeshift`.
- Crea instantáneas manuales del sistema o activa la **protección automática previa a cada actualización**.

### 8. 🔍 Detector y Optimizador de Duplicados
- Identifica aplicaciones instaladas simultáneamente en múltiples formatos (ej. VLC nativo y VLC en Flatpak).
- Calcula el ahorro potencial en disco y permite conservar la versión recomendada con 1 solo clic.

### 9. 🧹 Limpiador del Sistema (Cleaner)
- Recupera gigabytes de espacio en disco analizando:
  - Cachés de paquetes (`/var/cache/pacman/pkg`, `/var/cache/apt/archives`, `/var/cache/dnf`).
  - Dependencias huérfanas sin uso (`pacman -Qtdq`, `apt autoremove`, `dnf autoremove`).
  - Runtimes obsoletos de Flatpak (`flatpak uninstall --unused`).

### 10. ⚡ Centro de Actualizaciones Unificado
- Actualiza todos los gestores de paquetes simultáneamente con seguimiento paso a paso y notificaciones nativas de escritorio.

---

## 📦 Instalación

### Opción 1: Archivo Universal .AppImage (Cualquier distribución Linux)
Descarga el archivo `.AppImage` desde los **Releases** de GitHub:
```bash
chmod +x gul_0.1.0_amd64.AppImage
./gul_0.1.0_amd64.AppImage
```

### Opción 2: Arch Linux / CachyOS / Manjaro (AUR)
```bash
paru -S gul-bin
# o con yay:
yay -S gul-bin
```

### Opción 3: Ubuntu / Debian / Linux Mint (.deb)
```bash
sudo dpkg -i gul_0.1.0_amd64.deb
sudo apt-get install -f
```

### Opción 4: Fedora / RHEL (.rpm)
```bash
sudo dnf install ./gul-0.1.0-1.x86_64.rpm
```

---

## 🛠️ Compilación y Desarrollo

### Requisitos previos
- **Node.js** (v18+) y `npm`
- **Rust** y `cargo` (v1.75+)
- Librerías del sistema:
  - **Arch/CachyOS**: `sudo pacman -S webkit2gtk-4.1 base-devel openssl libayatana-appindicator`
  - **Debian/Ubuntu**: `sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget libssl-dev libayatana-appindicator3-dev librsvg2-dev`
  - **Fedora**: `sudo dnf install webkit2gtk4.1-devel openssl-devel libayatana-appindicator-gtk3-devel`

### Pasos para compilar
```bash
# 1. Clonar el repositorio
git clone https://github.com/tu-usuario/gul.git
cd gul

# 2. Instalar dependencias del frontend
npm install

# 3. Iniciar en modo desarrollo
npm run tauri dev

# 4. Compilar binario y paquetes finales de producción
npm run tauri build
```

---

## 📁 Estructura del Proyecto

```text
gul/
├── src/                          # Frontend en React 19 + TypeScript + Tailwind
│   ├── components/               # Vistas (Store, Apps, Duplicates, Cleaner, Snapshots, Autostart...)
│   ├── types.ts                  # Tipos TypeScript compartidos con el backend
│   └── App.tsx                   # Controlador principal y enrutador de vistas
├── src-tauri/                    # Backend en Rust
│   ├── src/
│   │   ├── managers/             # Módulos para Pacman, APT, DNF, Flatpak, Snap, AppImage
│   │   ├── aur.rs                # Conexión con AUR RPC API y helpers paru/yay
│   │   ├── flatpak_permissions.rs# Motor de permisos sandbox (Flatseal)
│   │   ├── snapshots.rs          # Motor de instantáneas Btrfs (Snapper/Timeshift)
│   │   ├── autostart.rs          # Gestor de inicio XDG
│   │   ├── backup_profile.rs     # Exportación e importación de perfiles JSON
│   │   ├── notifications.rs      # Notificaciones y monitor en segundo plano
│   │   └── os_detector.rs        # Detección agnóstica de distribuciones Linux
│   └── tauri.conf.json           # Configuración de Tauri v2
└── .github/workflows/            # CI/CD automatizado para compilar Releases
```

---

## 🌟 Apoya el Proyecto

Si te gusta o te resulta útil **GUL**, ¡apóyalo dándole una **estrella (Star ⭐)** en la parte superior derecha de GitHub! Esto ayuda a que el proyecto gane visibilidad en la comunidad de Linux y atraiga a más desarrolladores y mantenedores.

- 🐛 ¿Encontraste un fallo? Abre un [Issue](https://github.com/mulineee21/gul/issues).
- 💬 ¿Tienes una idea o sugerencia? Participa en las [Discusiones](https://github.com/mulineee21/gul/discussions).
- 🤝 ¿Quieres contribuir código? Lee nuestra guía de [Contribución](CONTRIBUTING.md).

---

## 📄 Licencia

Este proyecto está bajo la Licencia **GNU General Public License v3.0 o posterior (GPL-3.0-or-later)** — consulta el archivo [LICENSE](LICENSE) para más detalles.

```text
GUL (Gestor Universal de Linux)
Copyright (C) 2026 Joel Molina

Este programa es software libre: puedes redistribuirlo y/o modificarlo
bajo los términos de la Licencia Pública General de GNU según es publicada
por la Free Software Foundation, bien de la versión 3 de dicha Licencia
o (a tu elección) cualquier versión posterior.
```
