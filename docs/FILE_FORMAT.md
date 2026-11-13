# OpenRecipeBook file format specification

This specification defines the open, versioned file formats used by OpenRecipeBook for single-recipe sharing and full library backups.

## Goals

1. Human readable and clean JSON structure.
2. Lossless export and import for all recipe data and metadata.
3. Safe against path traversal and malformed inputs.
4. Independent of proprietary servers or cloud providers.

## Single recipe file (`.recipe.json`)

A single recipe export uses the `.recipe.json` extension. The contents are formatted UTF-8 JSON.

```json
{
  "format": "openrecipebook-recipe",
  "version": 1,
  "exportedAt": "2026-11-12T00:00:00.000Z",
  "scale": 1,
  "recipe": {
    "id": "recipe-uuid",
    "title": "Recipe Title",
    "description": "Optional description text",
    "sourceUrl": "https://example.com/recipe",
    "sourceName": "Source or Author Credit",
    "servings": 4,
    "servingsLabel": "servings",
    "prepMinutes": 15,
    "cookMinutes": 30,
    "totalMinutes": 45,
    "ingredientGroups": [
      {
        "heading": "Main",
        "items": [
          {
            "id": "ing-1",
            "raw": "2 cups all-purpose flour",
            "scalable": true
          }
        ]
      }
    ],
    "directionGroups": [
      {
        "heading": "Preparation",
        "steps": [
          {
            "id": "step-1",
            "text": "Whisk dry ingredients together."
          }
        ]
      }
    ],
    "notes": "Optional cook notes",
    "cookLog": [
      {
        "id": "log-1",
        "date": "2026-11-12T00:00:00.000Z",
        "note": "Great results.",
        "rating": 5
      }
    ],
    "courses": ["Dinner"],
    "categories": ["Entrees"],
    "collectionIds": [],
    "tags": ["favorite"],
    "rating": 5,
    "favorite": true,
    "photoIds": ["photo-1"],
    "createdAt": "2026-11-12T00:00:00.000Z",
    "updatedAt": "2026-11-12T00:00:00.000Z",
    "schemaVersion": 1
  },
  "photos": [
    {
      "id": "photo-1",
      "mime": "image/webp",
      "width": 1600,
      "height": 900,
      "caption": "Finished dish",
      "dataBase64": "..."
    }
  ]
}
```

### Fields

- `format`: Must equal `"openrecipebook-recipe"`.
- `version`: Integer version number (current version is `1`).
- `exportedAt`: ISO 8601 UTC timestamp.
- `scale`: Optional multiplier indicating active serving scaling at export time.
- `recipe`: Full recipe data object matching the application schema.
- `photos`: Embedded image records with base64 data strings.

## Full library archive (`.openrecipebook.zip`)

A full library or collection export is a standard zip archive containing:

- `manifest.json`: Archive metadata and item counts.
- `recipes/<id>.json`: One JSON file per recipe.
- `photos/<id>.webp`: Binary photo blobs referenced by recipe records.
- `collections.json`: User collections.
- `mealplan.json`: Meal planner calendar entries.
- `shopping-lists.json`: Shopping lists and items.
- `user-ingredients.json`: Custom user dictionary ingredients and aliases.
- `combos.json`: Saved multi-recipe Ingredient Totals selections.

### Manifest schema

```json
{
  "format": "openrecipebook-library",
  "version": 1,
  "exportedAt": "2026-11-12T00:00:00.000Z",
  "appVersion": "0.1.0",
  "counts": {
    "recipes": 24,
    "photos": 18
  }
}
```

## Security requirements

1. Zip readers must reject entry paths containing `..` or absolute path markers.
2. Text fields are sanitized and rendered as plain text. Raw HTML is forbidden.
3. Photo entries are bounded in dimension and file size to prevent memory exhaustion.
