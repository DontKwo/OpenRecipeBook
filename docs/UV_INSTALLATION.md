# Developer uv Installation Guide

`uv` is only needed by developers and CI workflows running repository lint checks (`ai-dev-tools`). Regular users should download the prebuilt desktop executable or Android APK from [Latest Releases](https://github.com/DontKwo/OpenRecipeBook/releases/latest).

## Windows

Choose the PowerShell standalone installer or winget:

```powershell
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
winget install --id=astral-sh.uv -e
```

## macOS

Choose the standalone installer or Homebrew:

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
brew install uv
```

## Linux

Use the official standalone installer (`curl` or `wget`):

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

Confirm installation with `uv --version`.

## Related Documentation

- [Project Overview](../README.md)
- [Developer Guide](DEVELOPMENT.md)
- [Desktop Installation Guide](INSTALLATION.md)
- [Security Policy](../SECURITY.md)
