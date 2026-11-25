"""Cross-platform local HTTP loopback host for OpenRecipeBook macOS and Linux bundles."""

from __future__ import annotations

import argparse
import base64
from functools import partial
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import mimetypes
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import threading
from typing import Any
from urllib.parse import unquote, urlparse
import urllib.request
import webbrowser


APP_TITLE: str = "OpenRecipeBook"
USER_AGENT: str = (
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
)
ALLOWED_EXTENSIONS: tuple[str, ...] = (".json", ".zip", ".paprikarecipes", ".txt", ".md", ".jsonld")


def resolve_dist_dir() -> Path:
    """Resolve embedded or workspace Vite dist directory."""
    if getattr(sys, "frozen", False) and hasattr(sys, "_MEIPASS"):
        frozen_dist = Path(getattr(sys, "_MEIPASS")) / "dist"
        if frozen_dist.exists():
            return frozen_dist
    repo_dist = Path(__file__).resolve().parent.parent / "dist"
    if repo_dist.exists():
        return repo_dist
    raise FileNotFoundError("Compiled dist directory not found.")


def ensure_data_dir(override: str | None) -> Path:
    """Ensure local application config directory exists."""
    target = Path(override) if override else Path.home() / ".local" / "share" / APP_TITLE
    target.mkdir(parents=True, exist_ok=True)
    return target


def get_config_path(data_dir: Path) -> Path:
    """Return path to desktop storage configuration JSON."""
    return data_dir / "storage-config.json"


def ensure_recipes_dir(data_dir: Path, storage_override: str | None) -> Path:
    """Resolve and create the active on-disk recipe directory."""
    if storage_override:
        target = Path(storage_override)
        target.mkdir(parents=True, exist_ok=True)
        return target
    cfg_path = get_config_path(data_dir)
    if cfg_path.exists():
        try:
            loaded = json.loads(cfg_path.read_text(encoding="utf-8"))
            raw_path = str(loaded.get("storagePath", "")).strip()
            if raw_path:
                chosen = Path(raw_path)
                chosen.mkdir(parents=True, exist_ok=True)
                return chosen
        except (OSError, ValueError):
            sys.stderr.write("Ignoring unreadable storage-config.json\n")
    default_dir = Path.home() / "Documents" / APP_TITLE / "recipes"
    default_dir.mkdir(parents=True, exist_ok=True)
    return default_dir


def sanitize_filename(raw_name: str) -> str:
    """Strip directory traversal tokens and forbidden path separators."""
    cleaned = raw_name.replace("/", "_").replace("\\", "_").replace("..", "").strip()
    return "" if cleaned in ("", ".") else cleaned


def classify_file(filename: str) -> str:
    """Classify recipe directory entry kind."""
    lower = filename.lower()
    if lower == "library-metadata.json":
        return "metadata"
    if lower.endswith((".recipe.json", ".json", ".jsonld")):
        return "recipe"
    if lower.endswith((".zip", ".paprikarecipes")):
        return "archive"
    if lower.endswith((".txt", ".md")):
        return "text"
    return "other"


def open_folder_in_os(target: Path) -> None:
    """Open recipe folder in the native file manager."""
    if sys.platform == "darwin":
        subprocess.Popen(["open", str(target)])
        return
    if sys.platform.startswith("win"):
        subprocess.Popen(["explorer.exe", str(target)])
        return
    opener = shutil.which("xdg-open")
    if opener:
        subprocess.Popen([opener, str(target)])


def build_storage_info(recipes_dir: Path) -> dict[str, Any]:
    """Enumerate files and metadata inside the active recipe folder."""
    entries: list[dict[str, Any]] = []
    paths = sorted(
        (p for p in recipes_dir.iterdir() if p.is_file()),
        key=lambda p: p.stat().st_mtime,
        reverse=True,
    )
    for item in paths:
        kind = classify_file(item.name)
        record: dict[str, Any] = {
            "name": item.name,
            "path": str(item),
            "sizeBytes": item.stat().st_size,
            "updatedAt": str(item.stat().st_mtime),
            "kind": kind,
        }
        if kind == "recipe" and item.stat().st_size < 2 * 1024 * 1024:
            try:
                parsed = json.loads(item.read_text(encoding="utf-8"))
                if parsed.get("format") == "openrecipebook-recipe" and isinstance(parsed.get("recipe"), dict):
                    rec = parsed["recipe"]
                    if rec.get("id"):
                        record["recipeId"] = str(rec["id"])
                    if rec.get("title"):
                        record["recipeTitle"] = str(rec["title"])
                elif parsed.get("title"):
                    if parsed.get("id"):
                        record["recipeId"] = str(parsed["id"])
                    record["recipeTitle"] = str(parsed["title"])
            except (OSError, ValueError):
                record["readError"] = True
        entries.append(record)
    return {
        "ok": True,
        "platform": "desktop",
        "storagePath": str(recipes_dir),
        "canOpenSystemFolder": True,
        "canChooseFolder": False,
        "files": entries,
    }


def build_native_bridge_script() -> str:
    """Build inline native bridge injected into index.html."""
    return (
        "<script>(function(){"
        "async function apiPost(path,body){const r=await fetch(path,{method:'POST',"
        "headers:{'Content-Type':'application/json'},body:JSON.stringify(body||{})});return await r.json();}"
        "async function apiGet(path){const r=await fetch(path);return await r.json();}"
        "window.nativeApi={"
        "isDesktop:true,isElectron:false,isAndroid:false,"
        "fetchPage:function(url){return apiPost('/api/native/fetch-page',{url:url});},"
        "getStorageInfo:function(){return apiGet('/api/native/storage-info');},"
        "openStorageFolder:function(){return apiPost('/api/native/open-folder',{});},"
        "chooseStorageFolder:function(){return apiPost('/api/native/choose-folder',{});},"
        "writeStorageFile:function(filename,content){return apiPost('/api/native/write-file',{filename:filename,content:content});},"
        "writeStorageFileBase64:function(filename,base64Data){return apiPost('/api/native/write-file-base64',{filename:filename,base64Data:base64Data});},"
        "readStorageFile:function(filename){return apiPost('/api/native/read-file',{filename:filename});},"
        "deleteStorageFile:function(filename){return apiPost('/api/native/delete-file',{filename:filename});},"
        "pickAndAddFiles:function(){return apiPost('/api/native/pick-files',{});},"
        "saveFileDialog:async function(){return null;}"
        "};"
        "})();</script>"
    )


class AppHandler(BaseHTTPRequestHandler):
    """HTTP handler serving Vite assets and /api/native endpoints."""

    def __init__(self, dist_dir: Path, data_dir: Path, storage_override: str | None, *args: Any, **kwargs: Any) -> None:
        self.dist_dir = dist_dir
        self.data_dir = data_dir
        self.storage_override = storage_override
        super().__init__(*args, **kwargs)

    def log_message(self, format: str, *args: Any) -> None:
        """Suppress HTTP access logs in GUI mode."""
        return None

    def _send_bytes(self, status: int, content_type: str, data: bytes) -> None:
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(data)

    def _send_json(self, payload: dict[str, Any]) -> None:
        self._send_bytes(HTTPStatus.OK, "application/json; charset=utf-8", json.dumps(payload).encode("utf-8"))

    def do_GET(self) -> None:
        """Serve /api/native/storage-info or static dist files."""
        req_path = urlparse(self.path).path
        if req_path == "/api/native/storage-info":
            recipes_dir = ensure_recipes_dir(self.data_dir, self.storage_override)
            self._send_json(build_storage_info(recipes_dir))
            return
        rel = unquote(req_path.lstrip("/")) or "index.html"
        target = (self.dist_dir / rel).resolve()
        if not str(target).startswith(str(self.dist_dir.resolve())) or not target.is_file():
            target = self.dist_dir / "index.html"
            rel = "index.html"
        data = target.read_bytes()
        if rel == "index.html":
            html = data.decode("utf-8")
            bridge = build_native_bridge_script()
            idx = html.lower().find("</head>")
            html = f"{html[:idx]}{bridge}{html[idx:]}" if idx >= 0 else f"{bridge}{html}"
            data = html.encode("utf-8")
        mime, _ = mimetypes.guess_type(target.name)
        self._send_bytes(HTTPStatus.OK, mime or "application/octet-stream", data)

    def do_POST(self) -> None:
        """Handle /api/native/* mutation and HTTP fetch requests."""
        req_path = urlparse(self.path).path
        length = int(self.headers.get("Content-Length", "0") or "0")
        raw = self.rfile.read(min(length, 64 * 1024 * 1024)) if length > 0 else b"{}"
        try:
            body: dict[str, Any] = json.loads(raw.decode("utf-8")) if raw.strip() else {}
        except ValueError:
            body = {}
        recipes_dir = ensure_recipes_dir(self.data_dir, self.storage_override)
        self._send_json(handle_native_post(req_path, body, recipes_dir))


def handle_native_post(req_path: str, body: dict[str, Any], recipes_dir: Path) -> dict[str, Any]:
    """Dispatch POST /api/native/* commands against local storage."""
    if req_path == "/api/native/open-folder":
        open_folder_in_os(recipes_dir)
        return {"ok": True, "storagePath": str(recipes_dir), "message": f"Opened {recipes_dir}"}
    if req_path in ("/api/native/choose-folder", "/api/native/pick-files"):
        return {"ok": False, "canceled": True}
    if req_path == "/api/native/write-file":
        safe = sanitize_filename(str(body.get("filename", "")))
        if not safe:
            return {"ok": False, "error": "Invalid filename"}
        target = recipes_dir / safe
        target.write_text(str(body.get("content", "")), encoding="utf-8")
        return {"ok": True, "path": str(target)}
    if req_path == "/api/native/write-file-base64":
        safe = sanitize_filename(str(body.get("filename", "")))
        if not safe:
            return {"ok": False, "error": "Invalid filename"}
        target = recipes_dir / safe
        target.write_bytes(base64.b64decode(str(body.get("base64Data", ""))))
        return {"ok": True, "path": str(target)}
    if req_path == "/api/native/read-file":
        safe = sanitize_filename(str(body.get("filename", "")))
        target = recipes_dir / safe if safe else None
        if not target or not target.is_file():
            return {"ok": False, "error": "File not found"}
        return {"ok": True, "content": target.read_text(encoding="utf-8")}
    if req_path == "/api/native/delete-file":
        safe = sanitize_filename(str(body.get("filename", "")))
        target = recipes_dir / safe if safe else None
        if target and target.is_file():
            target.unlink()
        return {"ok": True}
    if req_path == "/api/native/fetch-page":
        url = str(body.get("url", ""))
        headers = {
            "User-Agent": USER_AGENT,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
        }
        req = urllib.request.Request(url, headers=headers)
        try:
            with urllib.request.urlopen(req, timeout=15) as resp:
                return {"ok": 200 <= resp.status < 300, "status": resp.status, "html": resp.read().decode("utf-8", "replace")}
        except urllib.error.HTTPError as exc:
            err_html = ""
            try:
                err_html = exc.read().decode("utf-8", "replace")
            except Exception:  # noqa: 10
                err_html = ""
            return {"ok": False, "status": exc.code, "html": err_html, "error": f"HTTP {exc.code}: {exc.reason}"}
        except Exception as exc:
            return {"ok": False, "error": str(exc)}
    return {"ok": False, "error": f"Unknown endpoint: {req_path}"}


def run_self_test(base_url: str) -> None:
    """Verify embedded frontend HTML and native storage API over loopback HTTP."""
    with urllib.request.urlopen(base_url, timeout=5) as resp:
        html = resp.read().decode("utf-8")
        if "window.nativeApi" not in html:
            raise RuntimeError("Self-test failed: bridge script missing.")
    with urllib.request.urlopen(f"{base_url}api/native/storage-info", timeout=5) as resp:
        payload = json.loads(resp.read().decode("utf-8"))
        if not payload.get("ok"):
            raise RuntimeError("Self-test failed: storage-info returned error.")
    print(f"SELF_TEST_OK {base_url}", flush=True)


def capture_screenshot(base_url: str, output_png: Path) -> None:
    """Capture headless Chromium/Chrome/Edge screenshot using an isolated user-data-dir."""
    output_png.parent.mkdir(parents=True, exist_ok=True)
    candidates = ["google-chrome", "chromium", "chromium-browser", "microsoft-edge", "msedge"]
    browser = next((shutil.which(name) for name in candidates if shutil.which(name)), None)
    if not browser and sys.platform == "darwin":
        mac_app = Path("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome")
        browser = str(mac_app) if mac_app.is_file() else None
    if not browser:
        raise RuntimeError("No Chromium-family browser found for screenshot capture.")
    with tempfile.TemporaryDirectory() as profile_dir:
        subprocess.run(
            [
                browser,
                "--headless",
                "--disable-gpu",
                f"--user-data-dir={profile_dir}",
                "--window-size=1280,820",
                f"--screenshot={output_png}",
                base_url,
            ],
            check=True,
            timeout=30,
        )


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    """Parse OpenRecipeBook Unix desktop CLI flags."""
    parser = argparse.ArgumentParser(description="OpenRecipeBook Unix desktop host")
    parser.add_argument("--self-test", action="store_true", help="Run loopback verification and exit")
    parser.add_argument("--headless-server", type=int, default=None, help="Run HTTP server without launching a browser")
    parser.add_argument("--screenshot", default=None, help="Capture a screenshot to PNG path and exit")
    parser.add_argument("--data-dir", default=None, help="Override config directory")
    parser.add_argument("--storage-dir", default=None, help="Override recipe storage directory")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    """Start local OpenRecipeBook loopback HTTP server and optional GUI shell."""
    args = parse_args(argv)
    dist_dir = resolve_dist_dir()
    data_dir = ensure_data_dir(args.data_dir)
    ensure_recipes_dir(data_dir, args.storage_dir)

    port = int(args.headless_server) if args.headless_server is not None else 0
    handler_cls = partial(AppHandler, dist_dir, data_dir, args.storage_dir)
    server = ThreadingHTTPServer(("127.0.0.1", port), handler_cls)
    actual_port = server.server_address[1]
    base_url = f"http://127.0.0.1:{actual_port}/"

    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    try:
        if args.self_test:
            run_self_test(base_url)
            return 0
        if args.screenshot:
            capture_screenshot(base_url, Path(args.screenshot))
            return 0
        if args.headless_server is not None:
            print(f"READY {base_url}", flush=True)
            thread.join()
            return 0
        webbrowser.open(base_url)
        print(f"OpenRecipeBook running at {base_url} (Ctrl+C to quit)", flush=True)
        thread.join()
    except KeyboardInterrupt:
        sys.stderr.write("Shutting down OpenRecipeBook host.\n")
    finally:
        server.shutdown()
        server.server_close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
