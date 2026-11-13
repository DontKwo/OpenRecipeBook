# OpenRecipeBook

OpenRecipeBook is a free, open-source personal cookbook application for Windows PC and Android. It provides a local-first recipe keeper modeled on commercial cookbook apps, without subscriptions, accounts, or paywalls.

## Install and Download

Choose the version that fits your workflow:

| Platform | Download / Link | Notes |
|---|---|---|
| **Android** | [Download Android APK](https://github.com/DontKwo/OpenRecipeBook/releases/latest/download/OpenRecipeBook-Android.apk) | Standalone native Android application (.apk). Direct install with offline storage, camera support, and native URL import. |
| **Windows PC** | [Download Windows Package](https://github.com/DontKwo/OpenRecipeBook/releases/latest/download/OpenRecipeBook-Windows-Portable.zip) | Native desktop app with unconstrained HTTP for direct website recipe importing. |
| **Web App (PWA)** | [Open Web App](https://dontkwo.github.io/OpenRecipeBook/) | Instant access in any modern browser. Supports offline use and browser installation. |

### Which Version Should You Use?

- **Android App:** Download the `.apk` file directly to your Android device and tap to install. Operates fully offline, uses native file and photo picking, and allows sharing recipe links from your browser straight into OpenRecipeBook.
- **Windows Desktop:** Best for importing recipes directly from URLs without browser CORS restrictions. Available as a portable zip from [GitHub Releases](https://github.com/DontKwo/OpenRecipeBook/releases). Unsigned releases may show a standard Windows SmartScreen prompt on first run; click "More info" then "Run anyway".
- **Web App (PWA):** Best for instant access in any browser without downloading files. Runs offline after initial visit. On Android or desktop Chromium, tap "Install" in your browser address bar or menu.
- **Bridging Devices:** Each device maintains its own local IndexedDB storage. Use the built-in full backup export (`.openrecipebook.zip`) or single recipe export (`.recipe.json`) to transfer recipes between PC and Android.

## Key Features

- **Instant Scaling Engine:** Fast multipliers (0.5x, 1x, 2x, 3x, and custom) for ingredient quantities with fraction formatting, unit promotion (3 tsp -> 1 tbsp), and yield stepping.
- **Ingredient Totals Tool:** Pick multiple recipes to compute combined ingredient requirements with exact rational arithmetic (e.g. 1 cup + 2/3 cup + 1/3 cup flour sums to 2 cups flour).
- **Meal Planner:** Weekly calendar planner with Breakfast, Lunch, Dinner, and Snack slots. Add meals to your shopping list with a single click.
- **Aisle-Grouped Shopping List:** Organize ingredients automatically by grocery aisle, tick off items in the store, and copy formatted lists to your clipboard.
- **Interactive Cook Mode:** Full-screen step-by-step reading view with screen wake lock and one-tap concurrent cooking timers.
- **Universal Importer:** Import from Recipe Keeper zip archives, Paprika exports, schema.org JSON-LD, plain text, and web pages.
- **Local-First Storage:** User data stays strictly on device with optional folder backups for Google Drive, Dropbox, or OneDrive.

## "Save Recipe" Bookmarklet

To capture recipes while browsing on desktop browsers without installing extra software:

1. Create a new browser bookmark named `Save to OpenRecipeBook`.
2. Paste this code into the URL field:
   ```javascript
   javascript:(function(){var s=document.querySelectorAll('script[type="application/ld+json"]');var r=null;for(var i=0;i<s.length;i++){try{var p=JSON.parse(s[i].textContent||"");var c=function(n){if(!n||typeof n!=="object")return;var t=n["@type"];if(t==="Recipe"||(Array.isArray(t)&&t.includes("Recipe"))){r=n;}if(Array.isArray(n["@graph"])){n["@graph"].forEach(c);}};c(p);if(r)break;}catch(e){}}if(!r){alert("No recipe data found on this page.");return;}window.open("https://dontkwo.github.io/OpenRecipeBook/#import="+encodeURIComponent(JSON.stringify(r)),"_blank");})();
   ```
3. Click the bookmark on any recipe page to send it straight to your OpenRecipeBook review screen.

## Development Setup

Prerequisites: Node.js 18+ and npm.

```bash
# Install dependencies
npm install

# Start local development server
npm run dev

# Run Vitest unit test suite
npm test

# Build production bundle
npm run build
```

## Documentation

- [DESIGN.md](DESIGN.md): Full architectural specification, requirements, and design notes.
- [PROGRESS.md](PROGRESS.md): Live implementation tracker, handoff state, and technical notes.
- [DECISIONS.md](DECISIONS.md): Architectural decision records.
- [THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md): Third-party open source licenses and USDA FoodData Central data citations.

## License

OpenRecipeBook is open-source software licensed under the [MIT License](LICENSE).
