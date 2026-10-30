# OmniPkg — Gestor Unificado de Aplicaciones para Linux 🐧

**OmniPkg** es un gestor gráfico unificado y moderno para el usuario final de Linux, desarrollado con **Rust + Tauri v2** y una interfaz moderna en **React + Tailwind CSS**. Centraliza y unifica la gestión de todos los ecosistemas de empaquetado del sistema en una sola herramienta visual, rápida y elegante.

---

## 🚀 Capacidades y Funcionalidades Principales

1. **🌐 Tienda Universal & Conexión con Flathub (Flatpak) y Repositorios Nativos**:
   - **Catálogo de Flathub**: Conexión con la API pública de Flathub para explorar aplicaciones populares, destacadas y buscar por palabras clave o categorías (Audio/Video, Gráficos, Desarrollo, Juegos, etc.).
   - **Detección Automática del Sistema Operativo**: Lee e interpreta `/etc/os-release` (`ID`, `ID_LIKE`, `PRETTY_NAME`, arquitectura) para saber exactamente qué distribución estás utilizando (Arch/CachyOS/Manjaro, Ubuntu/Debian/Mint, Fedora/RHEL, openSUSE).
   - **Repositorios Públicos de la Distribución**: Busca e instala directamente paquetes de los repositorios oficiales nativos de tu distribución (`pacman -Ss`, `apt-cache search`, `dnf search`).
   - **Instalación en 1 clic**: Ejecuta la instalación correspondiente (`flatpak install -y flathub <app>` o mediante `pkexec` para el gestor nativo) con seguimiento de progreso en vivo.

2. **📦 Vista Unificada con Buscador Global**:
   - Lista todas las aplicaciones instaladas en el sistema independientemente del origen (**Pacman**, **APT**, **DNF**, **Flatpak**, **Snap** y **AppImage**).
   - Filtros por origen, ordenación por tamaño o nombre, e indicador de aislamiento (**Sandbox contenedor vs Nativo en host**).

3. **🔍 Detección Inteligente de Duplicados & Recomendador**:
   - Detecta automáticamente programas instalados en múltiples formatos al mismo tiempo (ejemplo: *Firefox* en Pacman/APT y en Flatpak).
   - Algoritmo de normalización canónica e inspección de especificaciones.
   - Evalúa versión, consumo de disco y rendimiento para recomendar cuál conservar y cuál eliminar con 1 solo clic.

4. **⚡ Botón "Actualizar Todo" Concurrente**:
   - Sincroniza y actualiza todos los gestores activos simultáneamente.
   - Panel de ejecución con terminal de registros (*streaming logs*) y estados en tiempo real mediante eventos reactivos de Tauri.

5. **🧩 Gestor Completo de AppImages**:
   - Escanea directorios de usuario (`~/Applications`, `~/Descargas`, `~/.local/bin`, etc.) y rutas personalizadas.
   - **Integración XDG instantánea**: genera archivos `.desktop` estándar en `~/.local/share/applications/` y asigna permisos de ejecución (`chmod +x`).
   - Permite lanzar, desintegrar o eliminar archivos AppImage sin salir de la app.

6. **🧹 Limpieza de Mantenimiento del Sistema (Cleaner)**:
   - Detecta y calcula el espacio ocupado por:
     - Cachés de paquetes descargados (`/var/cache/pacman/pkg`, `/var/cache/apt/archives`, `/var/cache/dnf`).
     - Dependencias huérfanas sin uso (`pacman -Qtdq`, `apt autoremove`).
     - Runtimes Flatpak obsoletos (`flatpak uninstall --unused`).
     - Revisiones antiguas desactivadas de Snap.
   - Muestra el total de espacio recuperable (ej. **4.7 GB**) y permite limpiarlo con un solo clic con previsualización del comando exacto.

7. **📊 Desglose Exhaustivo de Espacio en Disco**:
   - Modal detallado por aplicación que desglosa:
     - **Binario / Paquete base**
     - **Datos de usuario** (`~/.local/share`, `~/.var/app/<id>/data`, `~/snap/<app>`)
     - **Archivos de configuración** (`~/.config`, `~/.var/app/<id>/config`)
     - **Caché acumulada** (`~/.cache`, `~/.var/app/<id>/cache`)
   - Botón directo para abrir la carpeta de datos en el gestor de archivos (`xdg-open`) o limpiar la caché acumulada de la app individual.

---

## 🛠️ Estructura del Código

```text
omnipkg/
├── src-tauri/                 # Backend nativo en Rust
│   ├── src/
│   │   ├── lib.rs            # Registro de comandos y ciclo de vida Tauri
│   │   ├── models.rs         # Modelos de datos (AppInfo, OsInfo, CatalogItem...)
│   │   ├── os_detector.rs    # Detección de distribución, familia y gestores
│   │   ├── catalog.rs        # Conexión a Flathub API y repositorios de la distro
│   │   ├── disk_usage.rs     # Cálculo recursivo de espacio, XDG y sandbox
│   │   ├── duplicates.rs     # Motor de normalización y recomendación
│   │   ├── cleaner.rs        # Escaneo y ejecución de limpiezas de huérfanos/caché
│   │   ├── updates.rs        # Coordinador concurrente de actualizaciones
│   │   ├── commands.rs       # Invocaciones IPC expuestas al frontend
│   │   └── managers/         # Adaptadores para cada gestor de Linux
│   │       ├── pacman.rs     # Arch Linux / Manjaro / CachyOS / EndeavourOS
│   │       ├── flatpak.rs    # Flatpak y Flathub
│   │       ├── snap.rs       # Canonical Snapd
│   │       ├── apt.rs        # Debian / Ubuntu / Linux Mint
│   │       ├── dnf.rs        # Fedora / RHEL
│   │       └── appimage.rs   # Detección, permisos e integración XDG .desktop
│   └── Cargo.toml
├── src/                       # Frontend React + TypeScript + Tailwind
│   ├── components/
│   │   ├── Sidebar.tsx       # Navegación y estado del SO / gestores
│   │   ├── Header.tsx        # Cabecera con botón hero y recarga
│   │   ├── StoreView.tsx     # Tienda Flathub + Repositorios de la distro
│   │   ├── AppsView.tsx      # Vista unificada, buscador instantáneo y filtros
│   │   ├── AppDetailModal.tsx# Desglose visual en barra y acciones por app
│   │   ├── DuplicatesView.tsx# Comparativa lado a lado y 1-clic resolver
│   │   ├── UpdatesView.tsx   # Actualizaciones concurrentes y consola en vivo
│   │   ├── AppImagesView.tsx # Gestor e integrador de AppImages
│   │   └── CleanerView.tsx   # Analizador y liberador de gigabytes en disco
│   ├── types.ts
│   ├── utils.ts
│   └── App.tsx
└── package.json
```

---

## 🖥️ Ejecución y Desarrollo

### Modo Desarrollo
```bash
cd /home/joelmolina/.gemini/antigravity/scratch/omnipkg
npm run tauri dev
```

### Compilar Ejecutable Binario
```bash
npm run tauri build
# O en modo debug para pruebas inmediatas:
cargo build --manifest-path src-tauri/Cargo.toml
```
El ejecutable binario queda generado en `src-tauri/target/debug/omnipkg` o `src-tauri/target/release/omnipkg`.
