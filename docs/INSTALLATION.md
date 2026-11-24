# Desktop Installation Guide

Install and launch `OpenRecipeBook` on your desktop computer without Node.js, Python, or terminal setup.

---

## Platform Instructions

### Windows

1. Download `OpenRecipeBook-Windows.exe` from [Latest Releases](https://github.com/DontKwo/OpenRecipeBook/releases/latest).
2. Double-click `OpenRecipeBook-Windows.exe` to start OpenRecipeBook.
3. If **Microsoft Defender SmartScreen** shows *"Windows protected your PC"*:
   - Click **More info**.
   - Verify the file originated from `DontKwo/OpenRecipeBook`, then click **Run anyway** at your own discretion.
4. Alternative unblock method: Right-click `OpenRecipeBook-Windows.exe` -> **Properties** -> check **Unblock** under Security -> click **Apply** and **OK** -> launch normally.

---

### macOS

1. Download `OpenRecipeBook-macOS.zip` from [Latest Releases](https://github.com/DontKwo/OpenRecipeBook/releases/latest).
2. Double-click `OpenRecipeBook-macOS.zip` to extract `OpenRecipeBook.app` and move it into **Applications** if desired.
3. On macOS Sonoma and Sequoia, approve an independently distributed app in **System Settings**:
   - Double-click `OpenRecipeBook` once so macOS shows the notice, then click **OK** (or **Done**).
   - Open **System Settings** -> **Privacy & Security** -> scroll to the **Security** section.
   - Next to the OpenRecipeBook notice, click **Open Anyway** and confirm with your password or Touch ID at your own discretion.
4. Developer Terminal Alternative: run `xattr -cr /Applications/OpenRecipeBook.app` and launch normally.

---

### Linux

1. Download `OpenRecipeBook-Linux.tar.gz` from [Latest Releases](https://github.com/DontKwo/OpenRecipeBook/releases/latest).
2. Extract the archive in your file manager (or run `tar -xzf OpenRecipeBook-Linux.tar.gz`).
3. Mark executable (`chmod +x OpenRecipeBook-Linux`) and run `./OpenRecipeBook-Linux` (or double-click in your file manager).

---

## Safety & Authenticity Warning

- **Official `main` Releases Only**: Download `OpenRecipeBook` exclusively from [DontKwo/OpenRecipeBook Releases](https://github.com/DontKwo/OpenRecipeBook/releases/latest).
- **Fork Warning**: Do **not** download installers or executables from forked repositories unless you have verified the source code yourself and confirmed they contain no malware. Only official `main` releases are maintained by the author, and I make no promises.
- **Bypassing Security Prompts**: Because independent open-source executables do not carry paid commercial signing certificates, Windows and macOS will warn that the app is unrecognized or potentially unsafe. Bypassing these prompts is strictly at your own discretion, and the software is provided "AS IS" with zero liability.

---

## Related Documentation

- [Project Overview](../README.md)
- [Android APK Installation Guide](APK_INSTALLATION.md)
- [User Guide](USER_GUIDE.md)
- [Frequently Asked Questions](FAQ.md)
- [Developer Guide](DEVELOPMENT.md)
- [Security Policy](../SECURITY.md)
