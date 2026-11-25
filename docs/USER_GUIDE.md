# User Guide

Learn how to organize recipes, plan meals, scale ingredients, and move your cookbook across devices with OpenRecipeBook.

## Getting Started

1. Install OpenRecipeBook using the [Desktop Installation Guide](INSTALLATION.md) (Windows, macOS, Linux) or the [Android APK Installation Guide](APK_INSTALLATION.md).
2. Open the app to browse preloaded starter recipes or add your own with **+ New Recipe**.
3. Open **Settings** or **Storage** to inspect or change where your `.recipe.json` files live on disk.

## Managing Recipes

- **Create & Edit**: Click **+ New Recipe** to enter titles, servings, prep/cook times, categorized ingredient groups, step-by-step directions, photos, tags, and ratings.
- **Scale Servings**: Use quick multipliers (`0.5x`, `1x`, `2x`, `3x`) or custom yields. Ingredient quantities update automatically with clean kitchen fractions.
- **Interactive Cook Mode**: Open any recipe and launch **Cook Mode** for large typography, screen wake-lock support, checked ingredients, and concurrent countdown timers.

## Importing & Exporting Recipes

- **Web URLs**: Paste any recipe webpage URL into the importer to extract structured recipe data automatically. If a site requires a subscription or blocks automated requests, paste copied recipe text directly into the fallback box. On Android, use your browser's **Share** menu and pick **OpenRecipeBook**.
- **Archives & Text**: Import `.recipe.json`, `.openrecipebook.zip` backups, Recipe Keeper zip archives, `.paprikarecipes` exports, JSON-LD files, or plain text.
- **Full Library Backups**: Export a `.openrecipebook.zip` archive from **Settings** or pick a local cloud-synced backup folder for one-click snapshots.

## Migrating from Paprika and Recipe Keeper

1. **From Paprika (Desktop or Mobile)**:
   - In Paprika, open **File** -> **Export** (or **Settings** -> **Export Recipes**) and choose **Paprika Recipe Format (`.paprikarecipes`)**.
   - In OpenRecipeBook, open **Settings** -> **Data Backup & Import** -> click **Import Paprika / Recipe Keeper / File** (or drag the `.paprikarecipes` file anywhere onto the window) and confirm your imported recipes.
2. **From Recipe Keeper (Desktop or Mobile)**:
   - In Recipe Keeper, open **Export** -> select **HTML (`.zip`)** so all recipe photos and text are exported together.
   - In OpenRecipeBook, open **Settings** -> **Data Backup & Import** -> click **Import Paprika / Recipe Keeper / File**, pick your Recipe Keeper `.zip`, and review the imported recipes and attached photos.

## Syncing Across Devices

- Open **Settings** -> **Recipe Storage Location** -> click **Sync Across Devices** inside the app for step-by-step Windows, macOS/Linux, and Android instructions using Syncthing, cloud-synced folders, or portable `.openrecipebook.zip` backups.

## Meal Planner, Ingredient Totals & Shopping List

- **Meal Planner**: Switch between Week and Month views, drag recipes from the Recipe Tray into Breakfast, Lunch, Dinner, or Snack slots, or generate a plan automatically.
- **Ingredient Totals**: Select multiple recipes to combine shared ingredients (such as summing `1 cup` + `8 tbsp` flour into `1 1/2 cups` flour) before batch cooking or shopping.
- **Shopping List**: Send planned meals or selected recipes straight to your Shopping List, sorted by grocery aisle with interactive checkboxes and clipboard export.

## Related Documentation

- [Project Overview](../README.md)
- [Desktop Installation Guide](INSTALLATION.md)
- [Android APK Installation Guide](APK_INSTALLATION.md)
- [Frequently Asked Questions](FAQ.md)
- [File Format Specification](FILE_FORMAT.md)
- [Developer Guide](DEVELOPMENT.md)
- [Security Policy](../SECURITY.md)
