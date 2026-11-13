# OpenRecipeBook Implementation Progress

Updated: 2026-11-12

This document tracks development progress, technical learnings, and next steps across sessions.

## Current State

- Phase Status:
  - **Phase 0 (Foundation):** Complete.
  - **Phase 1 (Core Cookbook MVP):** Complete.
  - **Phase 2 (Kitchen Workflow):** Complete.
  - **Phase 3 (Extras):** Complete.
  - **Phase 4 (Distribution):** Complete.
- Stack: Vite 5 + React 18 + TypeScript (strict mode), Dexie 4 (IndexedDB), CSS variables for design system tokens, MiniSearch for full-text search, fflate for zip/gzip compression, Vitest for unit testing.
- Test Status: 129 unit tests passing across 25 test suites (`tests/*.test.ts`).
- Production Build: Passing (`npm run build`), generating service worker precache and PWA manifests.
- Lint Status: Clean (`claudemd_linter.py . --level strict`).

## Roadmap Checklist

### Phase 0: Foundation (COMPLETED)
- [x] Initialize project with Vite, React, TypeScript, Vitest.
- [x] Configure TypeScript strict mode and path aliases.
- [x] Create design token system in CSS variables (`src/styles/theme.css`) with light and dark themes.
- [x] Implement Dexie database schema and migration infrastructure (`src/data/db.ts`).
- [x] Create brand configuration (`src/config/brand.ts`).
- [x] Set up app layout shell with desktop navigation and mobile layouts (`src/app/App.tsx`).
- [x] Set up Component Gallery page (`src/features/gallery/ComponentGallery.tsx`) for token and UI review.
- [x] Configure PWA manifest and service worker precaching (`vite.config.ts`).
- [x] Configure GitHub Actions CI (`.github/workflows/ci.yml`) and Pages deployment (`.github/workflows/pages.yml`).
- [x] Document third-party licenses and data sources (`THIRD_PARTY_LICENSES.md`).

### Phase 1: Core Cookbook MVP (COMPLETED)
- [x] Domain models and validation for Recipe, Ingredient, Step, Photo, Collection (`src/domain/recipe/types.ts`).
- [x] Pure TypeScript scaling engine with exact rational arithmetic, unit promotion, mixed numbers, ranges, and parenthetical size handling (`src/domain/scaling/`).
- [x] Recipe normalization engine `normalizeRecipe()` with idempotent cleaning and URL tracking parameter stripping (`src/domain/recipe/normalize.ts`).
- [x] Built-in common ingredient dictionary with USDA citations (`src/data/defaultIngredients.ts`) and intelligent matcher (`src/domain/ingredients/matcher.ts`).
- [x] MiniSearch client-side full-text search with live queries, filters (course, rating, favorites), and sorting (`src/domain/recipe/search.ts`).
- [x] Photo processing pipeline with WebP/JPEG compression and course placeholder SVG generation (`src/domain/photos/photoService.ts`, `src/domain/recipe/placeholders.ts`).
- [x] Recipe Library view with instant search ('/' shortcut), course chips, favorites toggle, and empty state options (`src/features/library/RecipeLibrary.tsx`).
- [x] Recipe View with sticky desktop two-column layout, hero banner, meta strip, synced multiplier chips and servings stepper, tick-off checkboxes, unit promotion toggle, and cook's notes (`src/features/recipe-view/RecipeView.tsx`).
- [x] Effortless In-Place Editing on Recipe View (Section 6.4 & Acceptance Criterion 8):
  - Direct click-to-edit for title and description with auto-save on blur or Enter.
  - Direct click-to-edit for servings, servings label, and prep/cook minutes in the meta strip.
  - In-place ingredient line editing with real-time parsed preview chips (quantity, unit, name, unscaled flag) and dictionary autocomplete dropdown.
  - Enter key in ingredient editor saves line and automatically inserts new line below with focus.
  - Hover actions on ingredients and directions (edit pencil, delete trash icon).
  - Floating 8-second undo snackbar on ingredient and step deletions.
  - In-place step direction editing with Enter key inserting the next step below.
  - Step notes attachment with inline display in Cook Mode and step drawer.
  - One-tap cook's notes with markdown formatting shortcuts (bold, italic, list) and zero save buttons.
  - Version history recording in Dexie v2 `recipeVersions` table (retaining last 10 snapshots) with "History" button and one-click restore modal.
  - Brief "Saved" pill indicator that flashes on change.
- [x] Recipe Editor with title-only fast creation, multi-line text input, "Paste it all" automatic parser, ratings, course selections, collection tags, dictionary ingredient autocomplete suggestions, and live parsed breakdown preview (`src/features/editor/RecipeEditor.tsx`).
- [x] Settings screen with light/dark/system theme toggle, full backup export/import, storage quota indicator, and keyboard shortcuts (`src/features/settings/SettingsView.tsx`).
- [x] Open format single recipe export/import (`.recipe.json`), full library backup/restore (`.openrecipebook.zip`), and interoperable exports (`.jsonld`, `.md`, `.txt`) with optional scaling integration (`src/domain/export/ownFormat.ts`, `interopExport.ts`).
- [x] Four original sample recipes with 100% dictionary ingredient match coverage (`src/data/sampleRecipes.ts`).

### Phase 2: Kitchen Workflow (COMPLETED)
- [x] Ingredient Totals engine with exact rational arithmetic, mixed-unit volume/weight conversions, and recipe contribution traces (`src/domain/ingredients/totals.ts`).
- [x] Ingredient Totals UI screen with multi-recipe selection, per-recipe multipliers, aisle grouping, and expandable traces (`src/features/totals/IngredientTotalsView.tsx`).
- [x] Saved Combos system for Ingredient Totals: name and save multi-recipe selections, apply saved Combos, and delete (`src/features/totals/IngredientTotalsView.tsx`).
- [x] Shopping list engine and UI (`src/domain/shopping/shoppingService.ts`, `src/features/shopping/ShoppingListView.tsx`):
  - Multi-list support (per-store).
  - Add ingredients from recipes or meal plan.
  - Custom aisle ordering and walk layout per store (`aisleOrder` & `customAisles`).
  - Search/filter input for list items.
  - In-place item editing (click edit icon or double click text).
  - Per-aisle batch toggle (Check All / Uncheck All).
  - Tick off items, clear checked, and copy formatted list text.
- [x] Meal planner feature (`src/domain/planner/calendarGrid.ts`, `src/domain/planner/plannerService.ts`, `src/features/planner/MealPlannerView.tsx`):
  - Week and Month calendar grid views (35/42-day Monday-first grids).
  - Slots: Breakfast, Lunch, Dinner, Snack, plus user-defined custom slots (e.g. Dessert, Pre-workout, Supper).
  - Visual slot badges using design token color CSS variables.
  - Desktop drag-and-drop: drag recipes from side Recipe Tray onto day slots; drag meals between days and slots.
  - Quick Date Picker calendar jump control.
  - Recipe picker with scaling multipliers and free-text custom dish entries.
  - One-tap "Add Week to Shopping List" scaled integration.
  - Reusable Menus (`SavedMenu`): save 7-day patterns as reusable templates and apply to any week.
  - Automated Plan Suggester: fills empty slots using favorites and course-matched recipes.
- [x] Cook mode feature (`src/features/cook-mode/CookModeView.tsx`):
  - Screen wake lock (`navigator.wakeLock.request('screen')`).
  - High-contrast, large-typography step-by-step view with keyboard/touch navigation.
  - Step Overview drawer with numbered list, step completion checkboxes, and jump-to-step links.
  - Top percentage progress bar.
  - Custom / ad-hoc countdown timer modal (`+ Timer`) with custom labels and preset minute chips.
  - Duration detection in step text with one-tap concurrent timers and audible Web Audio alert.
- [x] External importers (`src/domain/import/`):
  - Recipe Keeper `.zip` importer with tolerant schema.org HTML reader, multi-file unpacking, photo linking, and ingredient/step subheading parsing (`recipeKeeper.ts`).
  - Paprika `.paprikarecipes` importer with gunzip and JSON conversion (`paprika.ts`).
  - Schema.org Recipe JSON-LD parser supporting `@graph` arrays and ISO 8601 durations (`jsonld.ts`).
  - Plain text recipe parser (`textRecipeParser.ts`) with smart heuristics for separating ingredients, directions, sub-headings, and timings.
  - "Save Recipe" browser bookmarklet (`tools/bookmarklet/saveToOpenRecipeBook.js`).
  - Hash import listener (`#import=`) in `App.tsx` for immediate bookmarklet handoff.
  - Import Review Modal (`src/features/import/ImportReviewModal.tsx`) with duplicate handling (skip, replace, keep both).
- [x] Clean print stylesheet media query in `src/styles/theme.css`.
- [x] Cookbook Builder modal (`src/features/cookbook/CookbookBuilderModal.tsx`) with cover page, table of contents, collection filters, standalone HTML export, and page-break print formatting.
- [x] US/Metric unit converter (`src/domain/scaling/unitConverter.ts`) with volume, weight, and temperature conversion chips.
- [x] Recipe View enhancements: "I made this" Cook Log history modal, "Tidy up" idempotent normalization preview modal, and share link generator.

### Phase 3: Extras (COMPLETED)
- [x] Automatic Synced Backup Folder (`src/domain/backup/backupFolder.ts`, `src/features/settings/SettingsView.tsx`, `src/app/App.tsx`):
  - File System Access API integration with persistent directory handle stored in IndexedDB.
  - Dated archive generation (`openrecipebook-backup-YYYY-MM-DD-HHmmss.zip`).
  - Rotation pruning keeping the 10 most recent backups automatically.
  - Background auto-backup trigger on startup when interval exceeds 20 hours.
  - Settings UI for linking local Google Drive, Dropbox, or OneDrive folders with status feedback and manual backup trigger.
- [x] Collections management system (`src/features/collections/CollectionsSidebar.tsx`, `RecipeLibrary.tsx`, `RecipeEditor.tsx`, `App.tsx`):
  - Responsive collections sidebar with All Recipes, Favorites, and custom collections list.
  - Collection creation, rename, and deletion modals with recipe count badges.
  - Active collection filtering chip with one-click clear button.
  - Batch assignment of recipes to collections from library floating action bar.
  - Multi-collection tagging in Recipe Editor.
  - Default collections seeded on initial run: "Quick & Easy", "Comfort Food", "Holiday & Entertaining".
  - Cascading deletion: deleting a collection cleans references from recipe `collectionIds`.
- [x] Photo processing pipeline and lightbox modal (`src/domain/photos/photoService.ts`, `src/features/photos/PhotoLightboxModal.tsx`):
  - Centered 16:9 hero cropping and 1:1 square thumbnail generation.
  - Canvas-based image resizing and JPEG compression with 0.85 quality.
  - Dexie `photos` table integration for binary storage.
  - Full-screen lightbox with arrow keys and escape navigation, "Make Hero", and photo deletion.
  - Direct file upload button and horizontal thumbnail strip in Recipe View.
- [x] USDA Nutrition Calculator (`src/domain/nutrition/nutritionCalculator.ts`, `src/features/nutrition/NutritionFactsCard.tsx`):
  - FoodData Central nutrient profiles per 100g for 60+ ingredients (calories, protein, fat, carbs, fiber, sugar, sodium).
  - Piece weights and density-based volume-to-grams conversions.
  - Scaled per-serving and whole-batch estimations.
  - Badged with "Estimated" label and USDA FoodData Central disclaimer.
  - Itemized ingredient contribution breakdown table.
- [x] Multi-select batch operations in Recipe Library (`src/features/library/RecipeLibrary.tsx`):
  - Checkbox selection mode across Grid, Compact, and List views.
  - Floating batch action bar: Select All, Deselect All, Send to Totals, Add Tag, Assign Collection, Export ZIP, Trash.
  - Dedicated batch export engine (`exportRecipesBatchZip`) producing valid OpenRecipeBook archive zips.
- [x] Backup folder service via File System Access API (`src/domain/backup/backupFolder.ts`).
- [x] Density lookup table (`src/domain/scaling/density.ts`) for volume and weight conversions.
- [x] "My ingredients" user dictionary manager in Settings (`src/features/settings/UserIngredientsModal.tsx`):
  - Add custom ingredients with aliases, aisles, and densities.
  - Delete custom ingredients.
  - Export and import custom ingredients as JSON.
- [x] Soft-delete Trash with 30-day retention and restore functionality:
  - Recipes marked with `deletedAt`.
  - Restore deleted recipes.
  - Delete permanently.
  - Empty trash.
  - Automatic background purge past 30 days.
- [x] OCR text heuristic splitting pipeline (`src/domain/import/ocr.ts`).
- [x] Library view modes (`src/features/library/RecipeLibrary.tsx`):
  - Standard responsive grid with card previews.
  - Dense grid with compact cards.
  - Linear list view with key metadata badges.
- [x] Filter drawer in library (`src/features/library/RecipeLibrary.tsx`):
  - Minimum star rating filter.
  - Maximum total cooking time filter.
  - Has photo toggle.
  - One-click filter reset.
- [x] Accent color customization (`src/styles/theme.css`, `src/features/settings/SettingsView.tsx`):
  - Terracotta, Sage, Slate, Berry, and Ochre themes.
  - Persisted in Dexie settings table.
- [x] Global drag and drop file import (`src/app/App.tsx`):
  - Accepts OpenRecipeBook backups, Recipe Keeper exports, and Paprika archives.
  - Direct import review modal.
- [x] Recipe safety and duplication workflows (`src/features/recipe-view/RecipeView.tsx`):
  - Non-linear scaling alerts for scaling factors > 2 or < 0.5.
  - Save scaled recipe as a new independent recipe.
  - Duplicate recipe action for recipe versioning.
- [x] Web App Manifest integrations and quick create workflows:
  - Registered Web Share Target in `vite.config.ts` for receiving shared recipe URLs on Android.
  - Registered File Handling API (`file_handlers`) and `launchQueue` consumer for opening recipe files directly from the OS.
  - Direct creation shortcuts in `RecipeEditor.tsx`: "Type it in", "Paste it all", "Import link", "Scan photo", and "Text file".
  - Source URL and Credit metadata inputs and persistence.
- [x] Complete Ingredient Totals engine verification (`src/domain/ingredients/totals.ts`, `tests/totals.test.ts`):
  - Range summation across both ends (e.g. 2-3 cloves + 1 clove is 3 to 4 cloves garlic).
  - Volume and weight combination with cited ingredient density when configured (`combineVolumeAndWeight`).
  - Isolated cans and packages of different sizes onto separate lines.
  - Extracted preparation and descriptor words into ingredient notes.
  - Explicitly flagged unmatched ingredients (`isMatched: false`).

### Phase 4: Distribution (COMPLETED)
- [x] Android wrapper packaging configuration (`capacitor.config.ts`).
- [x] Windows desktop Electron wrapper with native CORS-free HTTP fetching (`electron/main.cjs`, `electron/preload.cjs`, `src/domain/import/nativeFetch.ts`).
- [x] GitHub Releases automated packaging workflow (`.github/workflows/release.yml`) building portable Windows desktop release and SHA-256 checksums on `v*` tags.
- [x] Packaging and Distribution documentation guide (`docs/PACKAGING.md`).
- [x] README documentation updated with download table, install links, architecture guide, and bookmarklet instructions.
- [x] Open file format specification documented (`docs/FILE_FORMAT.md`).
- [x] Synthetic Recipe Keeper multi-recipe fixtures and 100% dictionary match coverage tests (`tests/fixtures/syntheticRecipeKeeper.ts`, `tests/samples.test.ts`).

## Session Learnings & Technical Notes

1. Node version in this environment is `v18.12.0`.
   - `workbox-build@7.4.x` pulls in `lru-cache@11`, which requires Node >= 20.0.0 due to `diagnostics_channel.tracingChannel`.
   - `package.json` overrides `workbox-build` to `7.0.0` and pins `vite-plugin-pwa` to `0.19.8`. This builds cleanly on Node 18 and generates offline service workers without issues.
2. Web and Native Import Strategy:
   - Browsers block direct `fetch()` to arbitrary external recipe URLs due to CORS.
   - The desktop Electron wrapper exposes `nativeApi.fetchPage()` in the main process using Node's native HTTP stack, bypassing CORS without a proxy server.
   - The web build provides the "Save to OpenRecipeBook" bookmarklet and direct paste source so browser users can capture recipes with zero server dependencies.
3. Scaling and Totals Arithmetic:
   - Exact rational numbers (`createRational`) prevent floating-point drift (1 cup + 2/3 cup + 1/3 cup sums to exactly 2 cups).
   - Ingredients marked non-scalable ("to taste", "as needed") are segregated into the "Also Needed" section to prevent silent arithmetic errors.
   - Mixed-unit sums (such as 1 cup + 8 tbsp, or 8 oz + 1 lb) convert to base metric (ml/g) and promote back to the largest appropriate kitchen display unit.
4. USDA Nutrition Engine:
   - Accurate density calculations (`gramsPerMl`) allow volumetric measurements (cups, tablespoons, teaspoons) to be converted to gram weights for nutritional evaluation.
   - Standard piece weights from USDA reference tables enable piece count items (eggs, garlic cloves, onions, potatoes) to be converted accurately.
   - Badging estimates as "Estimated" and providing itemized breakdowns ensures users can verify ingredient contributions.
5. Calendar Grid Calculation:
   - A 35 or 42 day Monday-first grid ensures height stability across all months without layout shifts.
   - Slot colors use semantic theme CSS variables (`--warning` for Breakfast, `--success` for Lunch, `--accent` for Dinner, `--muted` for Snacks and custom slots).
6. Multi-Select Batch Operations:
   - Floating pill action bar provides quick access to batch export, tagging, collection assignment, trash, and totals without cluttering card layouts.
   - Batch archives export as compliant `.openrecipebook.zip` packages.
7. Store-Specific Aisle Walk Layout:
   - Shopping lists can store custom aisle sequences (`aisleOrder`) and user-added custom aisles (`customAisles`).
   - Group sorting with `sortAisleGroups()` respects the physical floor layout of the store so shoppers walk aisles in order.
8. Cook Mode Architecture:
   - Combines screen wake-lock, step drawer overview with completion checkboxes, and ad-hoc multi-timer countdowns.
   - Web Audio synthesizer beeps upon countdown completion without external audio assets.
9. Collections Many-to-Many Architecture:
   - Dexie indexed `*collectionIds` array on recipes allows efficient multi-collection lookups without join tables.
   - Cascading cleanup on collection deletion ensures orphaned collection IDs do not remain on recipes.
10. Automatic Backup Folder & Rotation:
    - Uses Chromium's File System Access API with persistent directory handle serialization in IndexedDB.
    - Automatic dated backup filename generation (`openrecipebook-backup-YYYY-MM-DD-HHmmss.zip`) with chronological pruning retaining the 10 most recent backups.
    - Zero server requirement: points directly to cloud-synced desktop folders (Google Drive, Dropbox, OneDrive).
11. Desktop Meal Planner Drag-and-Drop:
    - HTML5 Drag and Drop events (`dragstart`, `dragover`, `dragleave`, `drop`) enable intuitive recipe scheduling directly from a collapsable Recipe Tray.
    - Existing meals can be moved between days and meal slots on both week and month calendar views.
12. Effortless In-Place Editing & Version History Architecture:
    - Inline editing on RecipeView allows immediate editing of title, description, servings, times, ingredient lines, steps, and notes without entering the full editor modal.
    - Continuous auto-saving on Enter, Shift+Enter, or blur with zero save buttons that can be forgotten.
    - Dexie v2 schema upgrade adds `recipeVersions` table to track the last 10 snapshots per recipe with instant one-click rollback.
    - Deletion operations support an 8-second floating undo snackbar.

## Handoff & Next Steps

All phases (0 through 4) specified in `DESIGN.md` are 100% implemented, verified with 129 unit tests across 25 test suites, clean under strict linter, and compile to a clean production PWA build. Next steps include testing packaging pipelines on GitHub Actions by tagging a release (`git tag v0.1.0`), and testing on physical Android and Windows devices.
