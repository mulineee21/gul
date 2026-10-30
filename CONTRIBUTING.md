# Contribuir a GUL (Gestor Universal de Linux) 🐧

¡Muchas gracias por tu interés en contribuir a GUL! Este es un proyecto de código abierto impulsado por la comunidad y bajo licencia **GNU GPL v3 o posterior**.

---

## 🌟 Formas de Contribuir

1. **Dar una estrella (Star ⭐)** al repositorio para ayudar a que más usuarios conozcan el proyecto.
2. **Reportar errores o problemas**: Abre un [Issue](https://github.com/mulineee21/gul/issues) si encuentras un fallo en tu distribución.
3. **Proponer mejoras**: Sugiere nuevas funciones o mejoras de experiencia de usuario en las [Discusiones](https://github.com/mulineee21/gul/discussions).
4. **Enviar código o traducciones**: Crea un Pull Request con correcciones, soporte para nuevas herramientas o mejoras de diseño.

---

## 🛠️ Entorno de Desarrollo Local

### Requisitos previos
- **Node.js** (v18+)
- **Rust** y **Cargo** (v1.75+)
- Librerías base de tu distribución (`webkit2gtk-4.1`, `base-devel`, `libayatana-appindicator`)

### Comandos básicos
```bash
# Instalar dependencias del frontend
npm install

# Iniciar servidor de desarrollo en vivo con recarga automática
npm run tauri dev

# Comprobar código de Rust
cargo check --manifest-path src-tauri/Cargo.toml

# Compilar frontend
npm run build
```

---

## 📜 Directrices para Pull Requests
- Asegúrate de que `npm run build` y `cargo check` pasen con 0 errores y sin advertencias.
- Escribe mensajes de commit claros y descriptivos (ej. `feat: add support for Nix packages`, `fix: package size parser`).
- Mantén la coherencia visual con la paleta de colores oscuros de Tailwind CSS.
