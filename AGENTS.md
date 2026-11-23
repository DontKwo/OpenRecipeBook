# AI Agent Operational Reference

Operational context and invariants for agents working in `OpenRecipeBook`.

## Architecture

- **Frontend Stack (`src/`)**: Vite, React 18, TypeScript, CSS Modules with CSS custom properties (`src/styles/theme.css`), and Dexie.js IndexedDB cache (`src/data/db.ts`).
- **Branding Isolation (`src/config/brand.ts`)**: All user-facing app names, package IDs, and repository links live in [brand.ts](src/config/brand.ts).
- **On-Disk Recipe Storage (`src/domain/storage/recipeStorageService.ts`)**: Recipes persist as `.recipe.json` files alongside `library-metadata.json` in the local recipe directory (`Documents/OpenRecipeBook/recipes` on Desktop; app external `recipes/` folder on Android).
- **Desktop Packaging (`scripts/build_desktop_exe.cjs`, `scripts/build_desktop_unix.cjs`)**: Packages `dist/` into standalone Windows `.exe` (`DesktopHost` C# loopback server with `--self-test`), macOS `.app` zip (`OpenRecipeBook-macOS.zip`), and Linux bundle (`OpenRecipeBook-Linux.tar.gz`) with `/api/native/*` filesystem and HTTP fetch endpoints.
- **Android Wrapper (`android/`)**: Native Gradle app using `WebViewAssetLoader` (`https://appassets.androidplatform.net`) and `JavascriptInterface` in [MainActivity.java](android/app/src/main/java/org/openrecipebook/app/MainActivity.java).

## Verification Commands

- Unit tests: `npm test` (Vitest suite in `tests/`)
- Production bundle: `npm run build`
- Desktop executables & self-tests:
  - Windows: `npm run build:desktop` then `.\build\OpenRecipeBook-Windows.exe --self-test` and `node scripts/verify_desktop_exe.cjs`
  - macOS/Linux: `node scripts/build_desktop_unix.cjs --self-test`
- Strict lint & link check:
  - `claudemd_linter.py . --level strict --full`
  - `link_checker.py .`

## Coding & Documentation Rules

- Keep all TypeScript functions explicitly typed with parameter and return annotations.
- Never place unlinked backticked `.md` paths in Markdown prose; link directly using relative Markdown paths.
- Keep `README.md` user-focused (`<= 120` lines), free of checksums, CI details, or build/test commands, and maintain `## Related Documentation` footers on every file under [docs/](docs/USER_GUIDE.md).
- Avoid hardcoded drive letters, user home paths, personal names, placeholder tokens, and AI writing cliches.
