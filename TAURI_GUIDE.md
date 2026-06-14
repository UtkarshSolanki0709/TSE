# Repackaging TSE as Desktop Software

We will use **Tauri** to turn this project into a native Windows executable.

## Why Tauri?
- **Small size**: Executables are ~10MB compared to Electron's 100MB+.
- **Security**: Uses system webview.
- **Fast**: Rust backend.

## Step 1: Install Prerequisites
1. Install [Rust](https://rustup.rs/).
2. Install [Microsoft Visual Studio C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/).

## Step 2: Initialize Tauri
Run the following in the project root:
```powershell
# Create src-tauri
npm install @tauri-apps/cli
npx tauri init
```

## Step 3: Configure `tauri.conf.json`
Update `src-tauri/tauri.conf.json`:
- `build.devPath`: `http://localhost:5173` (your Vite dev server)
- `build.distDir`: `../frontend/dist`
- `build.beforeDevCommand`: `npm run dev --prefix frontend`
- `build.beforeBuildCommand`: `npm run build --prefix frontend`

## Step 4: Running the App
```powershell
# Dev mode
npm run tauri dev

# Build for Windows (.exe / .msi)
npm run tauri build
```

## Step 5: Integrating the Backend
Since the backend is an Express server, you have two options for the desktop app:
1. **Bundled Sidecar**: Package the Node.js backend as a binary inside Tauri.
2. **Web-Only**: Keep the backend on your server and point the desktop app to it.

For a true "software" experience, I recommend the **Sidecar** approach or porting the backend logic to Rust (which Tauri makes easy).
