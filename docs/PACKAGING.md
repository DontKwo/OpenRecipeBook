# Packaging and Distribution Guide

OpenRecipeBook builds native desktop packages for Windows, macOS, and Linux, plus an installable Android APK, from the single Vite + React + TypeScript bundle.

## Supported Targets

| Platform | Output Artifact | Builder Script |
| :--- | :--- | :--- |
| Windows | `build/OpenRecipeBook-Windows.exe` | [Desktop Windows Builder](../scripts/build_desktop_exe.cjs) |
| macOS | `build/OpenRecipeBook-macOS.zip` | [Desktop Unix Builder](../scripts/build_desktop_unix.cjs) |
| Linux | `build/OpenRecipeBook-Linux.tar.gz` | [Desktop Unix Builder](../scripts/build_desktop_unix.cjs) |
| Android | `build/OpenRecipeBook-Android.apk` | Gradle (`android/`) |

## Desktop Storage Location

- **Windows**: `Documents/OpenRecipeBook/recipes` inside your user profile by default, configurable inside Settings.
- **macOS & Linux**: `~/Documents/OpenRecipeBook/recipes` by default, configurable inside Settings.

## Android Storage & Integrations

- **On-Disk Recipe Folder**: App external storage `recipes` directory, accessible through the in-app Storage dialog.
- **Share Sheet Target**: Accepts shared recipe URLs from mobile browsers directly into OpenRecipeBook.
- **File Association**: Registers `.recipe.json` content handlers so shared files open inside OpenRecipeBook.

## Related Documentation

- [Project Overview](../README.md)
- [Desktop Installation Guide](INSTALLATION.md)
- [Android APK Installation Guide](APK_INSTALLATION.md)
- [Developer Guide](DEVELOPMENT.md)
- [System Architecture](ARCHITECTURE.md)
- [Security Policy](../SECURITY.md)
