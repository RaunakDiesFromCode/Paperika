# Paperika

> Native macOS Pepakura `.pdo` Viewer built with Tauri 2, Rust, React, Three.js, and Tailwind CSS.

Paperika is a polished, native-feeling, offline-first macOS desktop application for opening, inspecting, and viewing Pepakura Designer `.pdo` files. It bridges Windows-centric papercraft authoring with macOS Apple Silicon workstations, featuring synchronous 3D/2D viewport inspection, vector rendering of cutting and folding patterns, and SVG/PDF export.

---

## Features

### 3D Viewport (Three.js & React Three Fiber)
- **Fluid Navigation**: Full Orbit, Pan, and Zoom with momentum damping.
- **View Presets**: One-click alignment to Isometric, Front, Back, Top, Bottom, Left, and Right views.
- **Surface Shading Modes**:
  - `Solid + Edges` (default): Shaded mesh with geometric feature creases.
  - `Solid`: Clean material surface shading.
  - `Wireframe`: Low-level polygon edge inspection.
- **Materials & Textures**: Automatic extraction and rendering of embedded zlib-compressed textures or RGB diffuse colors.
- **Lighting Rig**: Multi-source key, fill (hemisphere), and ambient lighting with adjustable intensity.
- **Inspection Overlays**: Ground grid, coordinate axes, and bounding box wireframe with real-world dimensions (mm).
- **GPU Resource Management**: Automatic geometry and texture disposal prevents GPU leaks when switching models.

### 2D Unfolded Sheets Viewport (Interactive SVG)
- **Multi-Page Support**: Sheet-by-sheet navigation across multi-page patterns.
- **Standard & Custom Formats**: A4, A3, A2, A1, B-series, US Letter, and custom dimensions with print margins.
- **Distinct Line Classification**:
  - **Cut Lines**: Solid dark lines (`#0f172a`).
  - **Mountain Folds**: Distinct red dashed lines (`#dc2626`).
  - **Valley Folds**: Distinct blue dashed lines (`#2563eb`).
  - **Glue Tabs**: Slanted quad and triangle flap polygons with dashed fold boundaries.
  - **Edge IDs**: Numeric labels matching corresponding edges across parts.
- **Pan & Zoom**: Smooth mouse drag and cursor-anchored scroll zoom.
- **Quick Layer Toggles**: Independently show/hide cut lines, mountain folds, valley folds, tabs, labels, and margins.

### Synchronized 3D / 2D Selection
- Selecting an unfolded part on the 2D sheet highlights the corresponding 3D geometry.
- Clicking a face in the 3D viewport selects and highlights the corresponding 2D unfolded part and face.
- Synchronized hover metadata (part ID, face index, sheet placement).

### Export & Output
- **SVG Export**: Export clean vector paths with distinct layer groups (`cut-lines`, `fold-lines`, `glue-tabs`, `edge-labels`) ready for Inkscape, Illustrator, or digital craft cutters (Cricut / Silhouette).
- **PDF Generation**: Native vector PDF export preserving page sizes and margins.
- **macOS Print Dialog**: Direct fit-to-page printing.

---

## Supported PDO Versions

Paperika parses proprietary Pepakura binary and text document formats using a memory-safe, clean-room Rust parser:

| Format Version | Application | Support Status | Notes |
| :--- | :--- | :--- | :--- |
| **PDO v3.6** | Pepakura Designer 4.x, 5.x, 6.x | **Full** | 3D mesh, textures, 2D nets, fold lines, glue tabs, edge numbers |
| **PDO v3.5** | Pepakura Designer 3.x | **Full** | Shifted strings, geometry, fold lines, tabs, textures |
| **PDO v3.4** | Pepakura Designer 2.x | **Full** | V4 header format, unshifted strings, geometry, nets |
| **PDO v2** | Pepakura Designer 1.x (Text) | **Supported** | Solids, vertices, faces, parts, and layout |

### Format Limitations & Nuances
- **Password-Locked Files**: PDO files with viewer texture locks or read-only flags are safely opened in viewer mode.
- **Texture Encodings**: Interleaved RGB Deflate streams are decompressed directly. If a texture is damaged or missing, Paperika falls back to diffuse material colors.
- **Flap Angles**: Quad flaps with crossed angles degenerate to triangle flaps as designed by Pepakura.

---

## Architecture & Technology Stack

- **Runtime**: Tauri 2 (macOS Apple Silicon native binary)
- **Backend**: Rust 1.99+ (safe memory bounds, zero-copy byte slices, `flate2`, `serde`, `image`)
- **Frontend**: React 18, TypeScript (strict mode), Vite, Tailwind CSS 4
- **3D Graphics**: Three.js, `@react-three/fiber`, `@react-three/drei`
- **2D Graphics**: High-performance SVG vector rendering
- **State Management**: Zustand
- **PDF Generation**: `jspdf`

---

## Building from Source

### Prerequisites
1. Xcode Command Line Tools (`xcode-select --install`)
2. Rust stable (`rustup default stable`)
3. Node.js LTS (v20+) & npm

### Development
```bash
# Clone the repository
git clone https://github.com/paperika/paperika.git
cd paperika

# Install dependencies
npm install

# Run development mode
npm run tauri dev
```

### Production Build & Packaging
```bash
# Type check and build frontend
npm run build

# Run unit and integration tests
npm run test
cd src-tauri && cargo test

# Build native macOS application bundle
npx @tauri-apps/cli build
```

Generated application bundles:
- `src-tauri/target/release/bundle/macos/Paperika.app`
- `src-tauri/target/release/bundle/dmg/Paperika_0.1.0_aarch64.dmg`

---

## Attribution & License

Paperika is distributed under the **GNU General Public License v2.0** (GPL-2.0).

Format reverse-engineering insights and data structures are indebted to the pioneering work by **David Pethes** on the [pdo-tools](https://github.com/dpethes/pdo-tools) project.
