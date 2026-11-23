# Frequently Asked Questions

Answers to common questions about installing, backing up, and using OpenRecipeBook.

## Where are my recipes stored?

- **Windows Desktop**: Inside `Documents/OpenRecipeBook/recipes` by default (you can inspect or pick another folder from **Storage** or **Settings**).
- **macOS & Linux Desktop**: Inside `~/Documents/OpenRecipeBook/recipes` by default.
- **Android**: Inside the app's external `recipes` directory, viewable and exportable via **Storage** inside the app.

## Why does Windows SmartScreen, macOS Gatekeeper, or Android Play Protect warn me?

OpenRecipeBook is published independently without paid commercial code-signing certificates or app store subscriptions. Follow [Desktop Installation Guide](INSTALLATION.md) or [Android APK Installation Guide](APK_INSTALLATION.md) to review the steps, and always download exclusively from [Official Releases](https://github.com/DontKwo/OpenRecipeBook/releases/latest).

## How do I move recipes between my computer and phone?

Two options work offline:
1. Export a full `.openrecipebook.zip` backup in **Settings** and import it on your other device.
2. Copy `.recipe.json` files directly from your Desktop `recipes` folder and import them via Android **Storage** -> **Add Files**.

## Does OpenRecipeBook need an account or internet connection?

No account or cloud server is required. Everything works offline once installed. Internet access is only used when you explicitly paste a webpage URL into the recipe importer.

## Related Documentation

- [Project Overview](../README.md)
- [User Guide](USER_GUIDE.md)
- [Desktop Installation Guide](INSTALLATION.md)
- [Android APK Installation Guide](APK_INSTALLATION.md)
- [File Format Specification](FILE_FORMAT.md)
- [Security Policy](../SECURITY.md)
