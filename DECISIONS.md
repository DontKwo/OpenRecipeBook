# Architectural and Design Decisions

This document records technical decisions and architectural choices made during development.

## Decision Log

### D-001: Technology Stack
- Choice: Vite, React 18, TypeScript, Dexie.js (IndexedDB), CSS Modules + CSS Custom Properties, Vitest.
- Context: Section 4 of DESIGN.md recommends Vite + TS + React, Dexie, CSS variables for design tokens.
- Rationale: High performance, zero runtime overhead for styles, clean offline PWA support, fast unit testing without DOM overhead for domain code.

### D-002: Package Identifier and Branding Isolation
- Choice: Isolate all application identifiers, names, and package metadata in `src/config/brand.ts`.
- Context: Section 0 of DESIGN.md requires every user-facing occurrence of the name and package id in one location.
- Rationale: Allows rebranding or configuration updates with minimal edits.

### D-003: Mobile Wrapper: Android Native Container with WebViewAssetLoader
- Choice: Standard Android Gradle container with AndroidX WebViewAssetLoader.
- Context: Section 2 and Section 10 of DESIGN.md require an installable APK for Android distribution.
- Rationale: First-class Android WebView support with secure `https://appassets.androidplatform.net` origin, access to native sharing sheets, camera file picking, and native HTTP capabilities without requiring an external proxy server or complex CLI toolchain.

### D-004: Desktop Wrapper: Electron
- Choice: Electron shell for Windows desktop installer.
- Context: Section 2 and Section 10 of DESIGN.md require a Windows desktop package with native HTTP fetching for website imports.
- Rationale: Direct access to Node.js networking in the main process bypasses CORS restrictions when importing recipes from public websites.

### D-005: Synced Folder Backup Architecture
- Choice: File System Access API (`showDirectoryPicker`) for automated local cloud backups.
- Context: Section 6.8 of DESIGN.md requests zero-login backups to Google Drive, Dropbox, or OneDrive.
- Rationale: Users select their existing local synced cloud folder; the app writes dated `.openrecipebook.zip` archives directly without needing OAuth secrets or backend servers.

### D-006: Cookbook builder architecture
- Choice: Browser print stylesheets with CSS paged media rules (`page-break-after: always; break-after: page;`) paired with self-contained HTML export.
- Context: Section 6.12 of DESIGN.md requires multi-recipe printing, table of contents, and clean page breaks.
- Rationale: Leverages native browser print engines to generate PDFs without heavy third-party canvas or layout dependencies.

### D-007: Reusable weekly menus and plan suggester
- Choice: `SavedMenu` templates with relative 7-day offsets stored in Dexie settings.
- Context: Section 6.9 of DESIGN.md requires reusable meal plans and automated suggestion.
- Rationale: Preserves weekly dish patterns regardless of calendar date, allowing users to apply templates to any week.

### D-008: Interoperable multi-format export
- Choice: Pure TypeScript converters for schema.org/Recipe JSON-LD, Markdown, and Plain Text.
- Context: Section 6.7 of DESIGN.md requires cross-application compatibility with Mealie, Tandoor, and note applications.
- Rationale: Facilitates user data mobility across external tools while retaining scalable servings.

### D-009: Ingredient totals unit family grouping
- Choice: Partition grouped ingredients by line unit family (volume, weight, count) and sum mixed units using base ml and grams with exact rational arithmetic.
- Context: Section 6.14 of DESIGN.md requires summing mixed units such as 1 cup + 8 tbsp into 1 1/2 cups.
- Rationale: Prevents erroneous summation across incompatible unit dimensions while automating common kitchen unit arithmetic.

### D-010: Web share target and file handling integration
- Choice: Register Web Share Target and Chromium File Handling APIs directly in `manifest.webmanifest` and `vite.config.ts`.
- Context: Sections 6.6 and 6.7 of DESIGN.md require receiving shared URLs on Android and opening recipe files on desktop double click.
- Rationale: Enables native OS level integration for installed PWAs without requiring specialized app store distribution.

### D-011: Headless multi-recipe parser fallback
- Choice: Implement regex block splitting fallback in `parseRecipeKeeperHtml` alongside DOMParser.
- Context: Appendix B of DESIGN.md requires parsing multi-recipe HTML archives in both browser and headless environments.
- Rationale: Enables testing and automated verification in Node and CI without browser DOM overhead.
