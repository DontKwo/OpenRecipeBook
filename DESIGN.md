# OpenRecipeBook: a free, installable recipe keeper (Design Guide for Claude Code)

> The app is named **OpenRecipeBook** (chosen by the owner). Keep every user-facing occurrence of the name, the package id, and the repo name in one place (`src/config/brand.ts` plus build config) so a rename is a one-line change. Do not use the name, logo, icons, screenshots, copy, or any other asset of Recipe Keeper or any other commercial app.

## 0. How to use this document

You (Claude Code) are building this app from scratch in an empty GitHub repository. Read the whole document first, then work **phase by phase** (Section 11).

Rules of engagement:

1. Finish and commit each phase before starting the next. Every phase must leave `main` deployable.
2. Where this document states a default, use it. Where something is ambiguous, pick the most reasonable option, write one line in `DECISIONS.md` (what you chose and why), and keep going. Only stop to ask the owner about items in Section 12.
3. Verify current library versions and browser API support (MDN, caniuse) before depending on them. Feature-detect every non-universal browser API and degrade gracefully.
4. Write tests alongside code, especially for the ingredient parser and scaling engine (Section 6.3), which are the heart of the app.
5. Items marked **[ASSUMED]** were not confirmed by the owner. Implement them, but keep them easy to remove or change.

## 1. Product summary

A personal cookbook app that works on **Windows PC and Android**, is **completely free and open source**, and is modeled on the feature set of the commercial app Recipe Keeper: organized recipe library, photos, serving scaling, shopping list, meal planner, import from websites and other apps, sharing, and backup.

The owner's explicit requirements:

- Works on PC and Android.
- Recipes are stored in a **beautiful, easy-to-read format** with **beautiful pictures**.
- **Easily multiply everything** in a recipe (ingredients, and anything derived from them).
- Recipe **files can be shared, downloaded, and uploaded easily**.
- An **Ingredient Totals** tool: pick any number of recipes and get one combined ingredient list with everything summed (for example 1 cup + ⅔ cup + ⅓ cup of flour shows as **2 cups of flour**). This needs a maintained list of common ingredients.
- **Super easy** to make notes, edit recipes, and create new recipes inside the app.
- **One consistent format** for every recipe, however it was created or imported.
- Free. No accounts, no subscriptions, no paywalled features, no recipe cap.
- Distributed from a **GitHub repo**, with download/install links in the README.
- Storage is **local on each device**, plus **optional backup to cloud services that already exist** (Google Drive, Dropbox, OneDrive). No server of our own.

### Non-goals (do not build)

- User accounts, a hosted backend, or real-time multi-device sync.
- Alexa/voice assistant integrations.
- Importing from Instagram or TikTok.
- Social features, public recipe discovery, or a recipe marketplace.
- iOS/macOS-specific work (the PWA will happen to work there, but do not test or optimize for it).
- AI features of any kind (the owner explicitly declined AI import and AI-generated content).
- Any server, proxy, or hosted service that we would have to run or pay for.
- Bundling stock photography or any third-party copyrighted recipe content.

## 2. Decisions made

| Topic | Decision |
|---|---|
| Platform approach | **Installable web app (PWA)**, one codebase. Hosted on GitHub Pages. |
| Storage | Local, on-device (IndexedDB). Works fully offline. |
| Sync | None. Devices are bridged by **export/import files** and optional cloud backup. |
| Cloud backup | **Backup folder.** The user picks a folder that Google Drive, Dropbox, or OneDrive already syncs on their device; the app writes dated backups there automatically (desktop) or sends the backup file through the share sheet (Android). No OAuth and no developer accounts. Signing in to those services from inside the app is a possible future add-on only. |
| Website import | Works inside the Android and Windows apps by fetching pages directly with no browser restrictions. In the plain browser version it falls back to paste-source and a bookmarklet. No proxy server. |
| Distribution | GitHub Pages link (install from browser), plus Android APK and Windows installer attached to GitHub Releases, all linked from the README. |

**Important nuance for the owner's "downloads from the README" requirement:** a PWA alone is installed from a link, not downloaded as a file. To satisfy the README-download requirement, Phase 4 wraps the same web build as an Android APK and a Windows installer and publishes them to Releases (Section 10). Note that each installed wrapper has its **own separate storage**, so the backup/export file is the bridge between them. Make that obvious in the UI and README.

### Owner delegations and assumptions **[ASSUMED]**

The owner said "just copy Recipe Keeper" for every open technical or visual question and declined AI features. In practice that means:

- **Feature parity with Recipe Keeper's capabilities** wherever feasible without a server: meal planner, shopping list, cook mode, print and PDF cookbook, courses/categories/collections, ratings and favorites, import from websites, text, photos, and other apps, sharing, and backup. Everything is in scope, delivered in the phases below.
- **Same workflows and screen structure, original visuals** (see Section 7). Names, logos, colors, icons, and wording are never copied.
- Where Recipe Keeper relies on its own cloud accounts and servers (sync, shared family plans), we substitute the file-based, backup-folder approach above.
- Import sources: Recipe Keeper `.zip`, Paprika `.paprikarecipes`, schema.org JSON-LD files, website link, pasted text or text files, and photo scanning (OCR, last).
- No AI features. Photo scanning uses on-device OCR only.
- License: MIT. English-only UI, but all strings go through an i18n layer.
- Default units: US customary, with a one-tap metric toggle.

## 3. Legal and IP guardrails

- Replicate **functionality and common recipe-app conventions**, not Recipe Keeper's branding, visual identity, icons, wording, or screenshots. Design an original look (Section 7).
- Importing a user's own export from other apps is fine. Do not scrape or republish recipe content; imported recipes are stored only on the user's device and keep a `sourceUrl` credit.
- Fonts and icons must be open-licensed (e.g., SIL OFL fonts, MIT/ISC icon sets). **Self-host** them in the repo so the app works offline. Record licenses in `THIRD_PARTY_LICENSES.md`.

## 4. Architecture and stack

Recommended (replace only with a good reason, and record it in `DECISIONS.md`):

- **Vite + TypeScript + React** (or Svelte if you strongly prefer; do not mix).
- **vite-plugin-pwa** (Workbox) for the service worker and manifest, precaching the app shell so it is fully offline.
- **Dexie** over IndexedDB for data; photos stored as Blobs in a separate table.
- **fflate** (or JSZip) for zip/gzip handling.
- **MiniSearch** (or Fuse.js) for client-side full-text search.
- **CSS variables** for design tokens plus plain CSS modules or Tailwind. No heavy UI kit; the look must be bespoke.
- **Vitest** for unit tests, **Playwright** for end-to-end tests, **axe** for accessibility checks.
- **Tesseract.js** (lazy-loaded, Phase 3) for OCR.

Repository layout:

```
/
  README.md              install links, screenshots, backup guide
  DESIGN.md              this file
  DECISIONS.md           running log of choices you made
  LICENSE
  THIRD_PARTY_LICENSES.md
  src/
    app/                 routing, shell, providers
    data/                Dexie schema, repositories, migrations
    domain/
      recipe/            types, validation
      scaling/           ingredient parser, scaler, formatter, unit conversion
      import/            recipeKeeper, paprika, jsonld, urlFetch, ocr
      export/            ownFormat, jsonld, markdown, pdf
      ingredients/       dictionary, matcher, totals engine (shared by Totals and the shopping list)
      backup/            BackupDestination interface + backup-folder implementation
    features/            library, recipe-view, editor, planner, shopping, cook-mode, settings
    ui/                  design system components, tokens, icons
  tools/bookmarklet/     "Save to OpenRecipeBook" bookmarklet source
  tests/
  .github/workflows/     ci.yml, pages.yml, release.yml
```

Keep `domain/` free of React and DOM dependencies where possible so it is easy to unit test.

## 5. Data model

All records carry `schemaVersion` and use UUIDs. Implement Dexie migrations from day one.

```ts
interface Recipe {
  id: string;
  title: string;
  description?: string;
  sourceUrl?: string;
  sourceName?: string;          // credit, e.g. "Grandma" or a site name
  servings: number;             // base servings, > 0
  servingsLabel?: string;       // "servings", "cookies", "loaves"
  prepMinutes?: number;
  cookMinutes?: number;
  totalMinutes?: number;        // if absent, derived
  ingredientGroups: { heading?: string; items: Ingredient[] }[];
  directionGroups: { heading?: string; steps: Step[] }[];
  notes?: string;               // freeform notes (light Markdown, rendered safely)
  cookLog: { id: string; date: string; note?: string; rating?: number; photoId?: string }[];
  nutrition?: Record<string, string>;
  courses: string[];            // Breakfast, Lunch, Dinner, Dessert, Snack, Drink...
  categories: string[];         // user-defined
  collectionIds: string[];
  tags: string[];
  rating: 0 | 1 | 2 | 3 | 4 | 5;
  favorite: boolean;
  photoIds: string[];           // first is the hero image
  createdAt: string;            // ISO
  updatedAt: string;            // ISO
  schemaVersion: number;
}

interface Ingredient {
  id: string;
  raw: string;                  // text exactly as the user typed or imported it
  quantity?: Quantity;          // parsed; undefined if not parseable
  unit?: string;                // normalized unit key
  name?: string;
  ingredientId?: string;        // key into the ingredient dictionary (built-in or user), when matched
  note?: string;                // "finely chopped", "(14 oz) can"
  scalable: boolean;            // false for "to taste", "as needed"
}
type Quantity = { kind: "single"; value: number } | { kind: "range"; min: number; max: number };

interface Step { id: string; text: string; photoId?: string; timers?: { label: string; seconds: number }[] }

interface Photo { id: string; recipeId: string; hero: Blob; thumb: Blob; width: number; height: number; caption?: string }
interface Collection { id: string; name: string; createdAt: string }
interface MealPlanEntry { id: string; date: string /* yyyy-mm-dd */; slot: string; recipeId?: string; freeText?: string; multiplier: number }
interface ShoppingList { id: string; name: string; items: ShoppingItem[] }
interface ShoppingItem { id: string; text: string; quantity?: Quantity; unit?: string; aisle: string; checked: boolean; recipeId?: string }
interface Combo { id: string; name: string; entries: { recipeId: string; multiplier: number }[]; createdAt: string }   // saved Ingredient Totals selection
interface DictionaryIngredient {
  id: string;                   // stable slug, e.g. "all-purpose-flour"
  name: string;                 // canonical singular display name
  aliases: string[];            // plurals, spellings, abbreviations, other common names
  family?: string;              // e.g. "flour", for optionally grouping variants
  aisle: string;
  unitFamily: "volume" | "weight" | "count";
  gramsPerMl?: number;          // density, only when known from a cited source
  densitySource?: string;
  user?: boolean;               // true for entries the owner created or edited
}
```

Always keep `raw` on ingredients. The original text must never be lost, so the app can fall back to it whenever parsing is uncertain.

## 6. Feature specifications

### 6.1 Library (home screen)

- Grid of **photo cards** (hero thumbnail, title, total time, star rating, favorite heart). Toggle between grid, compact grid, and list. Virtualize the list for 1,000+ recipes.
- **Search** across title, ingredients, tags, notes, and source, with instant results as you type. Desktop shortcut: `/` focuses search.
- **Filters:** course, category, collection, favorites, minimum rating, max total time, has photo. **Sort:** recently added, recently edited, title, rating, total time.
- Left navigation on desktop (Recipes, Meal Plan, Totals, Shopping, Settings); bottom navigation bar on mobile.
- Empty state is friendly and offers: "Add a recipe", "Import a file", "Load sample recipes" (ship 3 to 5 **original** sample recipes with generated placeholder images).

### 6.2 Recipe view (the "beautiful to read" screen, highest design priority)

- Large **hero photo** with a soft gradient overlay and the title; photo gallery with swipe and lightbox if more than one photo.
- Meta strip: prep, cook, total time, servings, rating, favorite, source link.
- **Desktop:** two columns. Ingredients on the left in a sticky panel, directions on the right. **Mobile:** single column with ingredients first (collapsible) and a sticky bottom bar for scale and cook mode.
- Ingredients: tick-off checkboxes, group headings, tabular numerals so quantities align.
- Directions: large step numerals, generous line spacing, 60 to 75 character line length, optional per-step photo.
- Notes section, nutrition (if present), tags and collections as chips.
- Toolbar: Scale, Unit toggle, Cook mode, Add to shopping list, Add to meal plan, Share/Export, Print, Edit, Delete.

### 6.3 Scaling engine (must be excellent)

This is the owner's most specific requirement: **"easily multiply everything."**

**UI**

- A prominent control at the top of the recipe: preset chips **½×, 1×, 2×, 3×** plus a custom multiplier, **and** a servings stepper (changing servings sets the multiplier = target ÷ base). The two stay in sync and show both ("2× · makes 8 servings").
- Scaling is **view state**: it never changes the stored recipe. Offer "Save scaled version as new recipe".
- The scale carries through to: ingredient list, shopping-list additions, meal-plan entries (`multiplier`), cook mode, print/PDF, and (optionally) sharing.
- When the multiplier is above 2 or below 0.5, show a gentle hint that cooking times, pan sizes, and seasoning may not scale linearly.

**Parser** (`domain/scaling/parseIngredient`)

Handle, at minimum:

- Integers, decimals (`1.5`), fractions (`1/2`), mixed numbers (`1 1/2`), and Unicode fractions (`½ ¼ ¾ ⅓ ⅔ ⅛ ⅜ ⅝ ⅞`, including attached forms like `1½`).
- Ranges: `2-3`, `2–3`, `2 to 3`, `1 1/2 - 2`.
- Parenthetical sizes: `1 (14 oz) can tomatoes` scales the count (1), keeps `(14 oz) can` as part of the unit/note, and does **not** scale the 14.
- Spelled-out numbers `one` to `twelve`, `a dozen`, `half`, `a couple of`, and `a`/`an` as 1.
- Quantity not at the start (`Salt, 1 tsp`), and lines with no quantity (`Fresh basil leaves`), which remain unchanged.
- **Non-scalable** phrases: `to taste`, `as needed`, `for garnish`, `for serving`, `pinch`, `dash` (configurable list). Display them unchanged.
- Unit normalization: tsp, tbsp, cup, fl oz, pint, quart, gallon, oz, lb, ml, l, g, kg, plus common spellings and abbreviations (`T`, `tbs`, `Tbsp.`, `teaspoons`). Treat `t`/`T` ambiguity carefully; prefer the raw text when unsure.

If a line cannot be parsed confidently, mark `quantity` undefined and show `raw` unscaled, with a subtle indicator that this line was not scaled. **Never silently produce a wrong number.**

**Formatter** (`domain/scaling/formatQuantity`)

- Display fractions in cooking-friendly form: nearest of 1/8, 1/4, 1/3, 1/2, 2/3, 3/4 within a small tolerance, shown as mixed numbers with Unicode vulgar fractions (`1 ½`). Otherwise a rounded decimal.
- Optional **unit promotion** (toggle in settings, default on): 3 tsp becomes 1 tbsp, 4 tbsp becomes ¼ cup, 16 tbsp becomes 1 cup, 8 fl oz becomes 1 cup, 16 oz becomes 1 lb (for weight units only).
- Metric amounts round sensibly (nearest 5 g above 100 g, nearest 1 g below; nearest 5 ml above 50 ml).
- Ranges scale both ends (`2 to 3` at 2× becomes `4 to 6`).
- Pluralize units correctly (`1 cup`, `2 cups`).

**Unit conversion**

- US ↔ metric for volume↔volume and weight↔weight, plus °F↔°C for temperatures found in step text (tap-to-convert chips).
- Volume↔weight (cups of flour to grams) only via an optional small, clearly-labeled density table; if the ingredient is not in the table, do not convert. Ship the table in Phase 3 or later.

**Test table (minimum; add many more)**

| Input | Multiplier | Expected |
|---|---|---|
| `1 1/2 cups flour` | 2 | `3 cups flour` |
| `½ tsp salt` | 3 | `1 ½ tsp salt` |
| `2-3 cloves garlic` | 2 | `4 to 6 cloves garlic` |
| `1 (14 oz) can tomatoes` | 2 | `2 (14 oz) cans tomatoes` |
| `Salt to taste` | 5 | `Salt to taste` |
| `3 tsp sugar` | 1 | `1 tbsp sugar` (with promotion on) |
| `1 egg` | 0.5 | `½ egg` plus a hint to use a whole egg or beat and halve |
| `250 g butter` | 1.5 | `375 g butter` |

### 6.4 Creating, editing, and notes (must feel effortless)

Principles: minimum friction, nothing ever lost, and every recipe looks the same.

**Create**

- A "+ New recipe" button is always reachable (floating button on mobile, sidebar button and the `N` key on desktop). Only the **title** is required. Everything else is optional and appears as collapsed sections that open when tapped.
- The first screen offers two ways in: **"Type it in"** (the form) and **"Paste it all"** (one big box; paste ingredients and directions together or separately and the app splits them with the same heuristics as the text importer, then shows the result for correction). Shortcuts for "Import a link", "Scan a photo", and "Import a file" sit beside them.
- Sensible defaults: servings 4 (editable), no time fields until added. Suggest a course from title keywords as a chip the user can accept, never automatically.
- Drafts autosave continuously and show a small "Saved" indicator. There is no save button that can be forgotten.

**Edit in place**

- In the recipe view every field is editable directly: tap or click the title, servings, times, an ingredient line, a step, or a note. No separate edit mode is needed (a full Edit screen still exists for bulk changes).
- Ingredient and step lists: Enter adds the next line; a drag handle reorders; swipe (mobile) or a hover icon (desktop) deletes with undo; Tab and Shift+Tab move a line into or out of a group heading.
- Ingredient lines are typed naturally. As the user types, show **chips** under the line (amount, unit, ingredient) and offer dictionary **autocomplete** for ingredient names (Section 6.15). Tapping a chip fixes it. A line that cannot be understood stays as plain text and still works, just unscaled, with a gentle "not scaled" marker.
- Undo and redo (`Ctrl+Z` / `Ctrl+Shift+Z`). Keep the last 10 saved versions of each recipe (store compact diffs) with "Restore previous version".
- "Duplicate" (and "Save as new version"), plus delete with undo and a 30-day trash.

**Notes (one tap to start)**

- Every recipe shows an always-visible **"Add a note"** row at the top of its Notes section. Notes support light formatting (bold, lists, links) through a tiny toolbar or Markdown shortcuts, are stored as Markdown text, and are rendered safely (never as raw HTML).
- **Cook log:** an "I made this" button adds a dated entry with an optional note, star rating, and photo. Newest first. A setting lets the recipe's overall rating follow the latest entry.
- **Step notes:** long-press or click a step to attach a note, shown inline in cook mode.
- Notes are searchable and included in exports and backups. The share dialog has a checkbox to leave notes out.
- Notes never change ingredient quantities or any structured data.

**One consistent format for every recipe (a rule for the whole app)**

- Every recipe, whether typed in, imported from a website, a file, OCR, or another app, renders from the **same structured model and the same layout template** (Section 6.2): title, photo, meta strip, description, ingredients (with optional group headings), directions (numbered, with optional group headings), notes, source/credit, nutrition. Order and styling never vary per recipe. Never render imported HTML; render from fields.
- A single `normalizeRecipe()` function runs on every save and every import. It trims whitespace and collapses blank lines; standardizes unit spellings to the canonical short forms (tsp, tbsp, cup, oz, lb, g, kg, ml, l); formats fractions the same way everywhere; formats times consistently ("1 hr 15 min"); strips typed step numbers such as "1." or "Step 1:" (the app numbers steps); formats temperatures consistently ("350°F"); splits run-on ingredient or direction blobs into separate lines; and removes tracking junk from source URLs.
- The wording is always the author's own: normalization changes formatting only, never the text of the instructions.
- A **"Tidy up"** button on any recipe re-runs normalization and shows a before/after preview the user can accept or reject, so older imports can be cleaned up. Normalization must be **idempotent** (running it twice changes nothing) and covered by many unit tests with messy inputs.

**Mobile ergonomics:** bottom-sheet editors, 44 px touch targets, keep the keyboard open between lines, and `Ctrl/Cmd+Enter` to finish on desktop.

**Full editor screen (for bulk changes)**

- Create/edit all fields in Section 5. Ingredients and steps are added as **plain multi-line text** (one per line) that is parsed live, with grouping via heading lines (e.g., a line ending in a colon). Show the parsed result as a preview so the user can fix mistakes.
- Drag to reorder ingredients, steps, and photos. Undo/redo within the editor session. Autosave drafts so nothing is lost on accidental navigation.
- Course and category pickers with create-on-the-fly; collection membership; star rating; favorite toggle.
- Duplicate recipe. Delete with undo (soft delete for 10 seconds, then an optional trash retained 30 days).

### 6.5 Photos

- Add from files, drag and drop (desktop), or **camera** (Android, via file input with capture).
- Client-side pipeline: auto-rotate from EXIF, crop tool (16:9 hero and square thumbnail), compress to WebP at roughly 1600 px long edge (quality about 0.82) plus a 480 px thumbnail. Keep the owner's original file out of storage to save space.
- Multiple photos per recipe, first is hero, reorder to change. Gallery with lightbox.
- Recipes without photos get a tasteful **generated placeholder** (gradient plus an original line-art SVG per course). Design 8 to 12 original SVG illustrations; no stock art.
- Request persistent storage (`navigator.storage.persist()`) and show storage usage in Settings with a warning if the browser reports low quota.

### 6.6 Import

All importers implement `Importer { canHandle(file|text): boolean; parse(): ParsedRecipe[] }` and feed a **review screen** (list of recipes found, per-recipe warnings, choose which to import, choose how to handle duplicates: skip, replace, keep both).

1. **Own format** (`.recipe.json`, `.openrecipebook.zip`): lossless.
2. **Recipe Keeper `.zip` export** (from the user's own app). The structure is known from third-party converters: a `.zip` containing one `recipes.html` file (tagged with schema.org markup) plus an `images/` folder; a bare `recipes.html` should also be accepted. The owner has no sample file, so follow **Appendix B**: build a tolerant parser, author a synthetic fixture, and mark the importer "beta" until it has been tried on a real export. Map titles, ingredients, directions, notes, courses/categories/collections, ratings, favorites, and photos.
3. **Paprika `.paprikarecipes`**: publicly described as a zip containing gzipped per-recipe files. No sample is available, so implement a tolerant reader from those descriptions, test with a synthetic fixture, and mark it "beta". Support several `.paprikarecipes` files zipped together.
4. **schema.org Recipe JSON-LD** (`.json`, `.jsonld`, or pasted text): handle `@graph`, arrays, `recipeYield` variants, ISO 8601 durations (`PT1H30M`), `recipeInstructions` as text, `HowToStep`, or `HowToSection`, and `image` as string, array, or `ImageObject`. This is also the foundation of URL import.
5. **Website link** (Recipe Keeper's "paste a link, review, save" experience). A page running in a normal browser cannot fetch arbitrary websites (CORS), and the owner does not want to run any server, so the approach differs by build:
   - **(a) Android and Windows apps (the main path):** the wrapper's native HTTP layer fetches the page directly with no CORS restriction (for example Capacitor's native HTTP, Tauri's HTTP plugin, or Electron's main process). Choose a wrapper that provides this and hide it behind a single `fetchPage(url)` function. The app extracts JSON-LD (fallback: microdata, then Open Graph) and downloads the photo into local storage. Optionally add an in-app "browse and import" web view later.
   - In the plain browser build `fetchPage` is unavailable; say so clearly in the UI and offer (b), (c), or "install the app".
   - **(b) Bookmarklet** ("Save to OpenRecipeBook") that reads the JSON-LD from the page the user is viewing and hands it to the app (via URL fragment or `postMessage`). If the photo cannot be fetched, store the remote image URL and offer "cache this photo" later.
   - **(c) Paste page source / paste text**: works fully offline with no proxy.
   - On Android, register a Web **Share Target** so sharing a link from the browser to the installed app opens the import screen.
6. **Photo/screenshot scan (OCR)**, Phase 3: lazy-load Tesseract.js, preprocess the image, split the text into title, ingredients, and directions with heuristics, and always open the editor for correction. Be honest in the UI that results need review.

7. **Paste text or open a text file** (as Recipe Keeper offers): paste a recipe from an email or document, or open a `.txt`/`.md` file, and split it into title, ingredients, and directions with simple heuristics (headings such as "Ingredients" and "Directions", numbered lines, bullet lines). Then open the editor so the user can correct it.

### 6.7 Export and sharing (the "files are easy" requirement)

Our open format, documented in `docs/FILE_FORMAT.md` and versioned:

- **Single recipe:** `<title>.recipe.json` (UTF-8). Fields as in Section 5 plus `{ "format": "openrecipebook-recipe", "version": 1 }`, with photos embedded as base64 WebP.
- **Collection / full library:** `<name>.openrecipebook.zip` with `manifest.json`, `recipes/*.json`, and `photos/*.webp`.
- **Interoperable exports:** schema.org JSON-LD (so other apps like Mealie, Tandoor, and RecipeSage can import), Markdown, plain text, and PDF.

Sharing UX:

- **Share** button uses the Web Share API with files where supported (Android), otherwise downloads the file.
- **Open files directly:** on desktop Chromium use the File Handling API so double-clicking a `.recipe.json` opens it in the app. Also accept drag-and-drop anywhere in the window and a prominent "Import" button.
- **Share by link (optional):** for small recipes without photos, encode the recipe (compressed) into a URL fragment so a link works with no server. Warn the user of length limits.
- **Share scaled?** The share dialog has a checkbox: "Include current scaling".

### 6.8 Backup and optional cloud backup

- **v1:** "Back up everything" produces a `.openrecipebook.zip` the user saves anywhere (including a Drive, Dropbox, or OneDrive folder via the OS save/share sheet). "Restore from backup" with a merge-or-replace choice. Show "last backup" date and a gentle reminder after 14 days.
- **Phase 3, automatic "cloud" backup without logins:** a **Backup folder** setting. The user points the app at a folder that Google Drive, Dropbox, or OneDrive already syncs on their computer (all three create such folders on Windows). The app then writes dated `.openrecipebook.zip` backups there on a schedule (after edits, at most daily) and keeps the last N (default 10). Implement with the File System Access API in Chromium browsers and with native file access in the Windows wrapper; store the folder handle persistently and handle revoked permission by asking the user to re-select the folder. On Android, use the share sheet ("Save to Drive / Dropbox / OneDrive") plus the backup reminder, because folder access is unreliable there. Put it behind a `BackupDestination` interface so signed-in providers could be added later; **do not build OAuth now**.

### 6.9 Meal planner

- Week and month views; slots: Breakfast, Lunch, Dinner, Snack, plus user-defined custom slots.
- Add via a recipe picker or free-text entry. Desktop: drag and drop to move/copy. Mobile: tap to add, long-press to move. Calendar date picker for quick jumps.
- Each entry has its own multiplier (scaling).
- "Add this week's meals to shopping list" in one tap, scaled.
- Phase 3: reusable **Menus** (saved multi-day plans) and a "suggest a plan" button that fills empty slots from favorites and chosen categories.

### 6.10 Shopping list

- Multiple lists (e.g., one per store). Add from a recipe (checkbox per ingredient, scaled), from the meal planner, or by typing.
- Automatic grouping by **aisle**, with user-editable aisles and a built-in keyword dictionary (produce, dairy, meat, pantry, frozen, bakery, etc.). Non-food items allowed.
- Merge duplicates only when name and unit family match (e.g., `1 cup milk` + `2 cups milk` becomes `3 cups milk`); otherwise keep separate lines. Never merge across incompatible units without the user's choice.
- Each item shows which recipe it came from. Check off, clear checked, move between lists, share as text, print.

### 6.11 Cook mode

- Screen wake lock (feature-detected). Large type, high contrast.
- Step-by-step view with swipe or arrow keys; the current step is highlighted; ingredients can be crossed off; the scaled quantities are shown.
- Detect durations in step text ("bake 25 minutes") and offer one-tap **timers** with an audible and vibration/notification alert. Multiple concurrent timers.
- Exit returns to the recipe view at the same scroll position.

### 6.12 Print and PDF cookbook

- A clean `@media print` stylesheet for a single recipe (photo, ingredients, directions, notes; scaled if desired).
- **Cookbook builder:** pick a collection, choose a cover, optionally include a table of contents, and print/save as PDF with page breaks that avoid splitting a recipe awkwardly.

### 6.13 Settings

Theme (system/light/dark and accent choice), default units, unit promotion toggle, non-scalable phrase list, backup folder and backup history, backup and restore, "My ingredients" (user dictionary), totals preferences (merge variants, combine volume and weight, round up for shopping), storage usage, keyboard-shortcut help (desktop), "About" with license and version.

### 6.14 Ingredient Totals (combine several recipes into one list)

The owner's example: recipe 1 needs 1 cup of flour, recipe 2 needs ⅔ cup, recipe 3 needs ⅓ cup. Select all three and the tool says **2 cups flour**, plus the summed totals for every other ingredient.

**Flow**

1. **Entry points:** the "Totals" tab; an "Add to totals" action on any recipe; multi-select in the library; "Use this week's meal plan"; "Select everything in a collection"; reopening a saved **Combo** (a named set of recipes and multipliers, such as "Thanksgiving").
2. **Pick recipes:** searchable, filterable picker with checkboxes. Each picked recipe has its own multiplier (½×, 1×, 2×, custom, or target servings). A tray at the bottom shows the selection and lets recipes be removed.
3. **Result ("You need"):** grouped by aisle. Each row shows the combined total, for example **2 cups all-purpose flour**, and expands to a breakdown ("Pancakes 1 cup · Biscuits ⅔ cup · Cookies ⅓ cup"). A "Why this total?" link shows the exact math. Controls: US/metric toggle, group by aisle or alphabetical, "I already have this" check (dims or hides the row), and an "Also needed (no amount)" section for lines like "salt to taste", de-duplicated.
4. **Actions:** send to a shopping list (choose the list; uses this same engine to merge with items already there), copy or share as text, print, export CSV, save as a Combo.

**Engine** (`domain/ingredients/totals`, pure TypeScript with no DOM, heavily unit-tested)

1. Collect every ingredient line from each selected recipe, scaled by that recipe's multiplier using the scaling engine (Section 6.3).
2. Resolve each line to a dictionary ingredient (Section 6.15). Lines that cannot be matched are grouped by their normalized text and flagged "?" so the user can say "same as…" (this creates a user alias, remembered next time).
3. Group by ingredient. Inside a group, split by **unit family**: volume, weight, and count/other (cloves, cans, pinches).
4. Sum with **exact rational arithmetic** (store quantities as fractions, never floating point), so 1 + ⅔ + ⅓ is exactly 2.
5. If every contribution uses the same unit, sum in that unit and do not convert (so cups stay cups). Otherwise convert to a base unit (ml for volume, g for weight), sum, and format back to the best display unit.
6. Volume and weight for the same ingredient: when the dictionary has a cited density, convert and combine into one total marked with "≈" (a setting turns this off, in which case both amounts are shown, for example "3 cups + 200 g"). With no known density, keep them separate. Never invent a density.
7. Count items: "2 large eggs" + "3 eggs" is **5 eggs**. Differences such as size are kept as a note ("1 large, 1 small onion"). Cans and packages combine only when the sizes match: "1 (14 oz) can" + "2 (14 oz) cans" is "3 (14 oz) cans". Different sizes stay on separate lines.
8. Ranges add both ends ("2 to 3 cloves" + "1 clove" is "3 to 4 cloves").
9. Lines with no amount or non-scalable lines ("to taste", "for garnish") go to "Also needed".
10. Preparation notes ("diced", "softened") do not stop items from combining; show the distinct notes next to the total.
11. Keep a **trace** for every total (which lines contributed and how they were converted) so the "Why this total?" view and the tests can check it.

**Unit constants** (US customary, exact definitions): 1 US fl oz = 29.5735295625 ml; 1 tsp = ⅙ fl oz; 1 tbsp = 3 tsp; 1 cup = 8 fl oz; 1 pint = 2 cups; 1 quart = 2 pints; 1 gallon = 4 quarts; 1 lb = 453.59237 g; 1 oz = 1/16 lb. Provide a setting for metric cups (250 ml) for users outside the US.

**Display rules:** show the largest unit that gives a value of at least 1 (or ¼ for cups), using cooking-friendly fractions (`2 ⅔ cups`). 16 tbsp displays as 1 cup. An optional "round up for shopping" setting rounds up to the next ¼ cup (or comparable step) and shows the exact amount in a smaller line.

**Required tests (minimum):** the flour example (1 cup + ⅔ cup + ⅓ cup is 2 cups); mixed units (1 cup + 8 tbsp is 1 ½ cups); weights (8 oz + 1 lb is 1 ½ lb, or its gram equivalent in metric mode); eggs with different size words; cans of equal and different sizes; ranges; the same ingredient with different prep notes; an ingredient with no amount; an unmatched ingredient; volume plus weight with and without a known density; results unchanged by the order in which recipes are selected; multipliers applied before summing.

### 6.15 Ingredient dictionary and "My ingredients"

The totals tool, the shopping-list aisle grouping, and ingredient autocomplete all rely on a maintained list of common ingredients.

**Built-in dictionary** (`src/data/ingredients.json`, generated and reviewed, not typed from memory)

- Aim for roughly 600 to 1,000 common home-cooking ingredients, each as a `DictionaryIngredient` (Section 5): a stable id, a canonical singular name, aliases (plurals, spelling variants, abbreviations, other common names such as "scallion" and "green onion"), a `family` (for example flour), a default shopping aisle, a unit family, and an optional density.
- **Densities and gram weights must come from a cited, openly usable source** (for example the USDA FoodData Central data, which is public domain; verify its current terms) through a reproducible build script in `tools/build-ingredients/`. Record `densitySource` for each value and list the sources in `THIRD_PARTY_LICENSES.md`. If a value is not available, leave it empty.
- Variants are separate entries ("all-purpose flour", "bread flour", "whole wheat flour") that share a `family`. A totals preference, "treat variants as the same," merges a family into one line; the default keeps them separate because they are not interchangeable in cooking.

**Matching** (`domain/ingredients/matcher`)

1. Normalize: lowercase, strip punctuation and parentheticals, remove the amount and unit, remove preparation and descriptor words (chopped, diced, minced, softened, melted, packed, sifted, divided, room temperature, fresh, large, medium, small, and similar) while keeping them as the line's `note`.
2. Singularize with rules plus an irregular list (tomatoes, potatoes, leaves, loaves).
3. Apply the alias map, then take the longest exact match against dictionary names. Words in a different order can still match.
4. **Fuzzy matches (small typos) are only suggestions** shown for the user to confirm; never merge on a fuzzy match silently.
5. Unmatched lines still work everywhere, as plain text with a "?" marker in totals and a one-tap "same as…" choice that saves an alias.

**My ingredients (user dictionary)**

- Settings has a **My ingredients** screen to add an ingredient (name, aliases, aisle, unit family, optional density), edit or override built-in aisles and aliases, and delete the owner's own entries.
- Aliases learned from "same as…" choices land here. The user dictionary is stored in IndexedDB (`userIngredients`), included in backups and in the full library zip, and can be exported and imported as JSON on its own.
- Editor autocomplete suggests built-in and user ingredients as the user types, which keeps names consistent across recipes.

**Coverage test:** at least 95% of the ingredient lines in the bundled sample recipes (and in the synthetic Recipe Keeper fixture) must match a dictionary entry; list the misses in the test output.

## 7. Visual design system

The app must feel like a well-designed cookbook, not an admin dashboard.

**Mirroring Recipe Keeper (owner's instruction: copy it as closely as possible).** Match its information architecture and workflows: a recipe library you can browse by course, category, and collection; a recipe screen with ingredients and directions plus a scale control; a shopping list grouped by aisle with multiple lists; a weekly and monthly meal-planner calendar with a date picker; an Import/Export area under Settings; photo cards with ratings and favorites. Do **not** copy its colors, logo, icons, typography, illustrations, or wording, and do not make the app look like it was derived from its screenshots. Defaults for the original look: warm cream background, near-black warm text, one terracotta accent, a serif for titles.

- **Tone:** warm, editorial, calm. Generous whitespace, soft shadows, rounded corners (12 to 16 px), photography first.
- **Type:** an open-licensed **serif display** face for titles and headings, and a highly readable **sans** for body and UI (self-hosted, with `font-display: swap` and subsetting). Fluid type scale using `clamp()`. Tabular numerals for quantities.
- **Color tokens:** define `--bg`, `--surface`, `--text`, `--muted`, `--accent`, `--accent-contrast`, `--border`, and semantic colors on `:root`, with a full dark theme via `prefers-color-scheme` and a manual override. Use a warm neutral palette and one confident accent. Meet **WCAG AA** contrast in both themes.
- **Layout:** responsive from 360 px to ultrawide. Max reading width for text. Touch targets at least 44 px. Safe-area padding on mobile.
- **Motion:** subtle (card hover lift, image fade-in, page transitions under 200 ms). Respect `prefers-reduced-motion`.
- **Iconography:** one consistent open-licensed icon set.
- **Loading and empty states:** skeletons, never blank screens. Images lazy-load with blurred low-res placeholders.
- **Accessibility:** full keyboard navigation, visible focus rings, ARIA for custom controls, screen-reader labels on icon buttons, alt text from captions or titles.
- **Desktop touches:** keyboard shortcuts (`N` new recipe, `/` search, `E` edit, `S` scale, `C` cook mode), shown in a help dialog.

Before building screens, create a small **component gallery page** (`/dev/gallery`, excluded from production) so the design can be reviewed and tuned in one place.

## 8. Performance and offline

- App shell precached; the library works fully offline after first load.
- Lazy-load heavy modules (OCR, PDF, import parsers, backup folder code).
- Library handles 2,000 recipes with photos smoothly (virtualized list, thumbnails only in the grid).
- Lighthouse targets on the Pages build: PWA installable, Performance 90+, Accessibility 95+.
- Handle storage errors and quota exceeded with clear, recoverable messages and a prompt to back up.

## 9. Testing and acceptance criteria

Unit tests (Vitest): ingredient parser, scaler, formatter, unit conversion, every importer against fixtures, export-import round trips, shopping-list merging, ingredient totals (including the flour example), dictionary matching, `normalizeRecipe()` idempotence, duration/timer detection.

End-to-end (Playwright): create a recipe with a photo; scale 2× and verify quantities; export and re-import with no data loss (deep-equal); import a Recipe Keeper fixture; add a recipe to the meal plan and the shopping list; select three recipes in Ingredient Totals, check the combined result, and send it to the shopping list; create a recipe with "Paste it all", fix an ingredient, and add a note without opening a separate edit mode; install and run offline.

**The product is acceptable when:**

1. A recipe with a photo looks genuinely beautiful on a 360 px Android phone and a 1440 px desktop, in light and dark themes.
2. One tap scales every ingredient correctly, including fractions, ranges, and parenthetical sizes, with no silent errors.
3. A recipe exported on one device opens on another by file or share with photos intact.
4. A full backup restores a library with no loss.
5. The app works offline after the first load.
6. The README links let a non-technical person install it on Windows and Android in under two minutes.
7. Choosing three recipes that need 1 cup, ⅔ cup, and ⅓ cup of flour shows **2 cups flour** with a breakdown, and every other ingredient is combined correctly or clearly flagged.
8. A new recipe can be created, an ingredient line fixed, and a note added within a minute, with no separate edit mode and no save button.
9. Recipes created by hand, imported from a file, and imported from a website all render in the identical layout with consistent formatting.

## 10. GitHub distribution

- `pages.yml`: build and deploy to **GitHub Pages** on push to `main`. Configure the Vite `base` path for the repo name.
- `ci.yml`: lint, type-check, unit tests, and Playwright on pull requests.
- `release.yml` (on version tags): build the **Android APK** and **Windows installer** from the same web build, and attach both to the GitHub Release with checksums. Each wrapper must provide native (non-browser) HTTP so website import works without a server.
  - Android: wrap with a mainstream, current wrapper (e.g., Capacitor, or Bubblewrap for a Trusted Web Activity). Pick one, record it in `DECISIONS.md`. Signing keys live in GitHub Secrets; document how the owner creates them.
  - Windows: wrap with a current desktop shell (e.g., Tauri or Electron). Note that an unsigned installer shows a Windows SmartScreen warning; document that honestly in the README.
- **README must include:** a short description, screenshots, **Install** section with three links (Open web app / Download Android APK / Download Windows installer), a "Which one should I use?" explanation, how backup/export bridges devices, how website import works in each version, the bookmarklet, the file format link, the license, and contribution notes.
- Android sideloading note in README: the user must allow installing from unknown sources for their browser/file manager.

## 11. Phased roadmap

**Phase 0: Foundation.** Scaffold, tooling, CI, Pages deploy, design tokens, Dexie schema and migrations, component gallery, `README` skeleton. *Exit:* a "hello" PWA is live on the Pages link and installs on Android and desktop.

**Phase 1: Core cookbook (MVP).** Library, recipe view, editor, photos pipeline, **scaling engine with tests**, courses/categories/collections/ratings/favorites, search and filters, light/dark themes, own-format export/import (single and zip), backup/restore, sample recipes, **effortless create/edit/notes (Section 6.4) with `normalizeRecipe()`**, **ingredient dictionary and editor autocomplete (Section 6.15)**. *Exit:* acceptance criteria 1 to 5, 8, and 9 pass.

**Phase 2: Kitchen workflow.** **Ingredient Totals tool and saved Combos (Section 6.14), "My ingredients" screen**, shopping list (using the same totals engine), meal planner, cook mode with timers, print and PDF cookbook, share by link, Recipe Keeper + Paprika + JSON-LD importers with the review screen, paste-text import, website import for the browser build (paste-source and bookmarklet), Share Target.

**Phase 3: Extras.** Backup folder (automatic backups into a Drive/Dropbox/OneDrive-synced folder), OCR scan import, menus and suggested plans, density table for volume↔weight, trash/restore, accessibility audit pass.

**Phase 4: Distribution.** Android APK and Windows installer pipelines, **native website import in those apps (`fetchPage`)**, README download links, performance pass.

At the end of each phase: update the README, tick the acceptance items, and summarize what changed in `DECISIONS.md`.

## 12. Owner decisions (all resolved)

The owner has answered every question that was raised. Do not ask them again.

| Question | Owner's answer | What to build |
|---|---|---|
| Platform | PWA if it can still give README download links | PWA on GitHub Pages, plus APK and Windows installer on Releases (Sections 2 and 10) |
| Storage and sync | Local downloads and optional backup to existing cloud services | File export/import plus the Backup folder feature (Section 6.8) |
| Sample Recipe Keeper export | None available; "find one or define the format yourself" | Own open format (Appendix A) and a tolerant importer built from public descriptions (Appendix B) |
| Website import server or proxy | "Just copy Recipe Keeper" | Native fetch inside the Android and Windows apps; paste-source and bookmarklet in the browser (Section 6.6) |
| Cloud sign-in (OAuth) | "Just copy Recipe Keeper" | Not built; Backup folder instead (Section 6.8) |
| Look and feel | "Just copy Recipe Keeper" | Same structure and workflows, original visuals (Section 7) |
| AI import | No | No AI features at all |
| Later additions | An **Ingredient Totals** tool that sums ingredients across chosen recipes (with a common-ingredients list); super easy notes, editing, and recipe creation; one consistent recipe format; the name "OpenRecipeBook" | Sections 6.4, 6.14, 6.15 and the acceptance criteria in Section 9 |

**Name:** the owner chose **OpenRecipeBook**. Before the first public release, check that the name is not already used by another prominent GitHub project or app-store listing, and tell the owner if it is.

## Appendix A. Our open file format (write this up as `docs/FILE_FORMAT.md`)

Design goals: human-readable, lossless for our own data, easy to convert, safe to open from strangers.

**Single recipe: `<title>.recipe.json`** (UTF-8, pretty-printed)

```json
{
  "format": "openrecipebook-recipe",
  "version": 1,
  "exportedAt": "2026-11-11T20:00:00Z",
  "scale": 1,
  "recipe": {
    "id": "7d1c...uuid",
    "title": "Weeknight Chili",
    "servings": 6,
    "servingsLabel": "servings",
    "prepMinutes": 15,
    "cookMinutes": 45,
    "ingredientGroups": [
      { "items": [ { "id": "i1", "raw": "1 lb ground beef", "scalable": true } ] }
    ],
    "directionGroups": [
      { "steps": [ { "id": "s1", "text": "Brown the beef over medium-high heat." } ] }
    ],
    "courses": ["Dinner"],
    "categories": ["Soups"],
    "tags": [],
    "rating": 4,
    "favorite": true,
    "photoIds": ["p1"],
    "createdAt": "2026-01-02T10:00:00Z",
    "updatedAt": "2026-03-04T09:30:00Z",
    "schemaVersion": 1
  },
  "photos": [
    { "id": "p1", "mime": "image/webp", "width": 1600, "height": 900, "caption": "", "dataBase64": "UklGR..." }
  ]
}
```

Store the parsed ingredient fields (`quantity`, `unit`, `name`, `note`) when present, but `raw` is authoritative: on import, re-parse from `raw` if the parsed fields are missing or the parser version is newer. `scale` is optional and only present when the sender ticked "Include current scaling"; it never changes the stored quantities.

**Library or backup: `<name>.openrecipebook.zip`**

```
manifest.json            { "format": "openrecipebook-library", "version": 1, "exportedAt": "...", "appVersion": "...", "counts": { "recipes": 0, "photos": 0 } }
recipes/<uuid>.json      same shape as a single recipe file, but photos are referenced by id (no base64)
photos/<photoId>.webp
collections.json
mealplan.json            full backups only
shopping-lists.json      full backups only
settings.json            full backups only; never contains tokens or secrets
user-ingredients.json    the owner's own ingredient dictionary (aliases, aisles, densities)
combos.json              saved Ingredient Totals selections (full backups)
```

**Rules**

- `version` is an integer. Readers accept the same major version, ignore unknown fields, and show a friendly message for a newer major version rather than failing silently.
- Treat every imported file as untrusted: render all text as plain text (never as HTML), reject zip entries with `..` or absolute paths, cap the archive at about 200 MB and each photo at about 15 MB, and limit field lengths.
- On export, sanitize file names (strip illegal characters, limit length, avoid collisions with a numeric suffix).
- Interoperability: also offer schema.org JSON-LD, Markdown, plain text, and PDF exports (Section 6.7). Add a conversion test per format.

## Appendix B. Recipe Keeper import notes

**Known (from third-party converters and importers):**

- The export is a single `.zip` containing one `recipes.html` file and an `images/` folder. A bare `recipes.html` is also commonly accepted.
- The HTML is tagged with schema.org markup, so recipes are already structured.
- Recipe Keeper's own menus are described slightly differently by different sources (a Backup/Import/Export area with an "Export recipes to: Recipe Keeper .zip file" choice). Tell users to look for that option and do not rely on exact menu wording in the UI copy.

**Not known:** the exact markup Recipe Keeper uses for courses, categories, collections, rating, favorite, and photo references, and exactly how multiple photos are listed. The owner has no sample, so write the importer to tolerate variation instead of assuming.

**Tolerant parsing approach**

1. Read `recipes.html` with `DOMParser`. Treat each element whose `itemtype` contains `schema.org/Recipe` (either `http` or `https`, any case) as one recipe. If none are found, fall back to repeated sections that each have a heading plus ingredient and direction lists, and show a "low confidence" warning.
2. Map standard `itemprop` values: `name`, `image`, `recipeIngredient` (or `ingredients`), `recipeInstructions`, `prepTime`, `cookTime`, `totalTime` (ISO 8601 or plain text like "30 mins"), `recipeYield`, `recipeCategory`, `recipeCuisine`, `description`, `author`, `aggregateRating` → `ratingValue`, and nested nutrition values.
3. For fields that are not standard schema.org, look for labelled elements (case-insensitive labels or attribute names such as Course, Category, Collection, Favorite, Rating, Notes, Source). Map them to our fields. Rating: accept numbers (clamp to 0 to 5) and star glyph strings by counting filled stars. Favorite: accept yes/true/1/a star glyph.
4. Anything not mapped is **kept, not dropped**: append it under an "Imported details" heading in the recipe notes and list it on the review screen as an "unmapped field" warning.
5. Photos: resolve `image` values relative to the zip root (for example `images/foo.jpg`), URL-decode them, and look them up case-insensitively. Missing photos are a warning, not an error. Send each photo through the normal photo pipeline (Section 6.5).
6. Process large archives in batches (for example 25 recipes at a time) with a progress bar and a cancel button, using streaming unzip so memory stays low.
7. Detect duplicates on re-import with a hash of normalized title plus the first few ingredient lines (or `sourceUrl` when present), and let the user choose skip, replace, or keep both.

**Testing without a real export**

- Write a script (for example `tests/fixtures/build-rk-fixture.ts`) that generates a **synthetic** `recipekeeper-synthetic.zip` following the structure above, in three variants: schema.org only; with extra labelled fields (courses, collections, rating, favorite); and awkward cases (missing images, URL-encoded file names, odd whitespace, numbers spelled as words).
- Label the importer **Beta** in the UI. Add an in-app "Import didn't work?" link that explains how to file an issue with a redacted `recipes.html` attached, so the format can be hardened with real files over time.
- Other open-source projects (for example Tandoor and RecipeSage) have Recipe Keeper importers. You may read their documentation to learn how real exports behave, but their code is under copyleft or restricted licenses, so **do not copy code into this MIT project**; write an original implementation.

**Paprika (`.paprikarecipes`):** publicly described as a zip of gzipped per-recipe entries. Apply the same tolerant approach and Beta label, test with a synthetic fixture, and reuse the review screen.

