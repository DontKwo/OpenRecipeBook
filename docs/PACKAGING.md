# Packaging and Distribution Guide

OpenRecipeBook runs in two native deployment environments without changing application logic:

1. **Windows Desktop Application (`.exe`):** Standalone Windows executable (`OpenRecipeBook-Windows.exe`) storing recipe files directly on disk (`Documents\OpenRecipeBook\recipes`) with unconstrained HTTP access for importing recipe URLs.
2. **Android Mobile Application (`.apk`):** Native Android container (`OpenRecipeBook-Android.apk`) using WebViewAssetLoader, on-disk app storage (`Android/data/org.openrecipebook.app/files/recipes`), native sharing integration, and file picking.

---

## 1. Windows Desktop Executable

The Windows build embeds the compiled Vite production bundle (`dist/`) into a standalone executable (`build/OpenRecipeBook.exe` and `build/OpenRecipeBook-Windows.exe`) using `scripts/build_desktop_exe.cjs`.

### Build Commands

```powershell
# Install dependencies
npm install

# Build production assets and standalone Windows .exe
npm run build:desktop
```

The output executable is created at `build/OpenRecipeBook.exe` and `build/OpenRecipeBook-Windows.exe`.

### Native Desktop Storage

- Default storage folder: `Documents\OpenRecipeBook\recipes`
- Users can view the folder path, open it in Windows Explorer, choose a custom folder, view all stored `.recipe.json` files, and add recipe files from inside the app (`Storage` button in the library or Settings).

---

## 2. Android Mobile Application

The Android project is housed under `android/` and uses standard Android Gradle with AndroidX WebKit Asset Loader to run OpenRecipeBook in a native app container with offline disk storage and native HTTP URL fetching.

### Prerequisites

- Android Studio or Android SDK Command-line Tools (Platform 34).
- Java Development Kit (JDK) 17+.
- Node.js 18+.

### Build Steps

```bash
# 1. Build production assets
npm run build

# 2. Sync assets into Android project
mkdir -p android/app/src/main/assets
cp -r dist/* android/app/src/main/assets/

# 3. Build via Gradle
cd android
gradle assembleRelease
```

The compiled APK is output to:
`android/app/build/outputs/apk/release/app-release.apk`
(Packaged as `OpenRecipeBook-Android.apk` in GitHub Releases).

### Android Storage & Integrations

- **On-Disk Recipe Folder:** `Android/data/org.openrecipebook.app/files/recipes` (accessible via the Storage button in the Library and Settings screens to browse files and add new `.recipe.json`, `.zip`, `.paprikarecipes`, or `.txt` files).
- **Share Sheet Target:** Receives recipe URLs shared from mobile browsers straight into OpenRecipeBook.
- **File Association:** Registers handlers for `.recipe.json` files to open directly into OpenRecipeBook.

---

## 3. GitHub Releases Workflow

Automated releases trigger when pushing to `main` or pushing a version tag matching `v*`:

```bash
git tag v0.2.0
git push origin v0.2.0
```

The GitHub Actions workflow (`.github/workflows/release.yml`) executes:
1. Runs full Vitest unit test suite across all modules.
2. Builds production bundle with Vite and TypeScript compiler.
3. Compiles standalone Windows desktop executable (`OpenRecipeBook-Windows.exe`).
4. Compiles and signs `OpenRecipeBook-Android.apk`.
5. Calculates SHA-256 checksums (`SHA256SUMS.txt`) and publishes release assets to GitHub Releases.
