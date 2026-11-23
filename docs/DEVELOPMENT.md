# Developer Guide

Build, test, lint, and package OpenRecipeBook from source across Windows, macOS, Linux, and Android.

## Prerequisites

- **Node.js 20+** and `npm`
- **Python 3.12+** and [`uv`](UV_INSTALLATION.md) (for macOS/Linux PyInstaller bundles and running repository lint checks)
- **JDK 17+** and **Gradle 8.6+** (for building the Android APK)

---

### Windows

```powershell
npm ci
npm test
npm run build:desktop
.\build\OpenRecipeBook-Windows.exe --self-test
node scripts/verify_desktop_exe.cjs
```

---

### macOS

```bash
npm ci
npm test
npm run build
pip install pyinstaller pillow
node scripts/build_desktop_unix.cjs --platform macos --self-test
```

---

### Linux

```bash
npm ci
npm test
npm run build
pip install pyinstaller pillow
node scripts/build_desktop_unix.cjs --platform linux --self-test
```

---

## Android APK Build

```bash
npm run build
mkdir -p android/app/src/main/assets
cp -r dist/* android/app/src/main/assets/
cd android
gradle assembleRelease
```

Signed release builds read `ANDROID_KEYSTORE_PATH`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, and `ANDROID_KEY_PASSWORD`. Never commit `.jks` files or keystore credentials.

## Verification & Linting

Run unit tests, strict workspace linting, and markdown link validation before submitting a pull request:

```bash
npm test
uv run --no-project python ../ai-dev-tools/scripts/claudemd_linter.py . --level strict --full
uv run --no-project python ../ai-dev-tools/scripts/link_checker.py .
```

## Related Documentation

- [Project Overview](../README.md)
- [Desktop Installation Guide](INSTALLATION.md)
- [Android APK Installation Guide](APK_INSTALLATION.md)
- [System Architecture](ARCHITECTURE.md)
- [Packaging Guide](PACKAGING.md)
- [File Format Specification](FILE_FORMAT.md)
- [AI Agent Reference](../AGENTS.md)
- [Security Policy](../SECURITY.md)
