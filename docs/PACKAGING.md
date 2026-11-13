# Packaging and Distribution Guide

OpenRecipeBook is designed to run in three deployment environments without changing application logic:

1. **Progressive Web App (PWA):** Runs in any modern browser, fully functional offline with client-side IndexedDB storage.
2. **Windows Desktop Application:** Electron shell providing unconstrained HTTP access to bypass browser CORS restrictions when importing recipe URLs.
3. **Android Mobile Application:** Capacitor wrapper providing native system sharing integration and file associations.

---

## 1. Web Progressive Web App (PWA)

### Build Commands

```bash
# Install dependencies
npm install

# Build production bundle with service worker precaching
npm run build

# Preview production build locally
npm run preview
```

### Installation

- **Desktop (Chrome/Edge):** Click the "Install OpenRecipeBook" icon in the browser address bar.
- **Android (Chrome):** Tap menu (three dots) -> "Add to Home screen" or "Install app".
- **iOS (Safari):** Tap Share button -> "Add to Home Screen".

---

## 2. Windows Desktop Application

The desktop application wraps the production web build with Electron to provide a native desktop window and a CORS-free HTTP fetcher in `electron/main.cjs`.

### Build Structure

The portable Windows release bundles:
- `dist/`: Production Vite web build.
- `electron/main.cjs`: Electron main process with native HTTP proxy.
- `electron/preload.cjs`: Preload script exposing `window.nativeApi.fetchPage()`.
- `package.json`: Main entry pointer and metadata.

### Packaging Portable Archive

```powershell
# 1. Build web application
npm run build

# 2. Assemble staging folder
New-Item -ItemType Directory -Force -Path build/windows
Copy-Item -Recurse -Force dist build/windows/dist
Copy-Item -Recurse -Force electron build/windows/electron
Copy-Item package.json build/windows/package.json

# 3. Create zip archive
Compress-Archive -Path build/windows/* -DestinationPath build/OpenRecipeBook-Windows-Portable.zip -Force
```

---

## 3. Android Mobile Application

The Android project is housed under `android/` and uses standard Android Gradle with AndroidX WebKit Asset Loader to run OpenRecipeBook in a native app container with offline storage and native HTTP URL fetching.

### Prerequisites

- Android Studio or Android SDK Command-line Tools (Platform 34).
- Java Development Kit (JDK) 17+.
- Node.js 18+.

### Build Steps

```bash
# 1. Build production web assets
npm run build

# 2. Sync web assets into Android project
mkdir -p android/app/src/main/assets
cp -r dist/* android/app/src/main/assets/

# 3. Build via Gradle
cd android
gradle assembleRelease
```

The compiled APK is output to:
`android/app/build/outputs/apk/release/app-release.apk`
(Packaged as `OpenRecipeBook-Android.apk` in GitHub Releases).

### Android Integrations

- **Web Share Target:** Configured in `vite.config.ts` and manifest to receive recipe URLs shared from mobile browsers (Chrome, Firefox, Samsung Internet).
- **File Association:** Registers handlers for `.recipe.json`, `.openrecipebook.zip`, and `.paprikarecipes` files to open directly into OpenRecipeBook.

---

## 4. GitHub Releases Workflow

Automated releases trigger when a version tag matching `v*` is pushed to GitHub:

```bash
git tag v0.1.0
git push origin v0.1.0
```

The GitHub Actions workflow (`.github/workflows/release.yml`) executes:
1. Runs full Vitest unit test suite across all modules.
2. Builds production web bundle with Vite and TypeScript compiler.
3. Packages the portable Windows application archive (`OpenRecipeBook-Windows-Portable.zip`).
4. Calculates SHA-256 checksums and writes `SHA256SUMS.txt`.
5. Publishes release assets and release notes to the GitHub repository Releases page.
