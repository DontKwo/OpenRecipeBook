# System Architecture

OpenRecipeBook is a local-first personal recipe manager built from a single TypeScript and React codebase targeting Windows, macOS, Linux, and Android.

## Core components

- **Frontend application (`src/`)**: Vite, React 18, TypeScript, CSS Modules with custom properties in [theme.css](../src/styles/theme.css), and Dexie.js IndexedDB caching in [db.ts](../src/data/db.ts).
- **Branding configuration**: App names, package IDs, and repository URLs are centralized in [brand.ts](../src/config/brand.ts).
- **On-disk recipe storage**: Recipes persist as individual `.recipe.json` files alongside `library-metadata.json` via [recipeStorageService.ts](../src/domain/storage/recipeStorageService.ts).
- **Desktop hosts**: Windows compiles a C# loopback host via [build_desktop_exe.cjs](../scripts/build_desktop_exe.cjs); macOS and Linux run a self-contained Python loopback host in [unix_host.py](../scripts/unix_host.py) packaged via [build_desktop_unix.cjs](../scripts/build_desktop_unix.cjs). Both expose identical `/api/native/*` storage and HTTP fetch endpoints.
- **Android container**: Native Android Gradle app loading static assets over `WebViewAssetLoader` and exposing Android filesystem/network APIs in [MainActivity.java](../android/app/src/main/java/org/openrecipebook/app/MainActivity.java).

## Architectural decisions

1. **D-001 Technology stack**: Chose Vite, React 18, TypeScript, Dexie.js, CSS Modules, and Vitest for fast offline startup and DOM-free domain testing.
2. **D-002 Branding isolation**: Centralized display strings and package IDs in [brand.ts](../src/config/brand.ts) so rebranding updates stay localized.
3. **D-003 Android WebView container**: Chose AndroidX `WebViewAssetLoader` for native Share Sheet intake and URL importing inside a signed APK without a proxy server.
4. **D-004 Standalone desktop hosts**: Chose native loopback hosts with `/api/native/*` endpoints so disk persistence stays independent of browser storage and cross-origin recipe imports succeed.
5. **D-005 Cloud folder backups**: Implemented [backupFolder.ts](../src/domain/backup/backupFolder.ts) to write dated `.openrecipebook.zip` archives to any synced directory without OAuth secrets.
6. **D-006 Cookbook printing**: Used CSS paged media stylesheets paired with self-contained HTML export to lean on native browser print engines without heavy PDF libraries.
7. **D-007 Reusable meal menus**: Stored `SavedMenu` templates with relative 7-day offsets in Dexie settings so weekly menus apply cleanly across any week.
8. **D-008 Multi-format exporters**: Implemented pure TypeScript converters for schema.org JSON-LD, Markdown, and plain text to keep user libraries portable.
9. **D-009 Ingredient unit grouping**: Partitioned grouped ingredients by volume, weight, or count families and summed mixed units via exact rational arithmetic in ml and grams.
10. **D-010 Share target and file handlers**: Registered Android Share Sheet intents and `.recipe.json` content handlers in [AndroidManifest.xml](../android/app/src/main/AndroidManifest.xml).
11. **D-011 Headless HTML parser fallback**: Added a regex block-splitting fallback alongside DOM parsing so multi-recipe HTML archives parse cleanly in Node tests.
12. **D-012 On-disk storage**: Chose direct `.recipe.json` files and `library-metadata.json` storage across Desktop and Android for transparent backups and portability.

## Related Documentation

- [Project Overview](../README.md)
- [User Guide](USER_GUIDE.md)
- [File Format Specification](FILE_FORMAT.md)
- [Packaging Guide](PACKAGING.md)
- [Developer Guide](DEVELOPMENT.md)
- [Security Policy](../SECURITY.md)
