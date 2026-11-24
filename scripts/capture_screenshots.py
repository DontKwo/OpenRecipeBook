"""Capture current desktop and mobile UI screenshots for OpenRecipeBook."""

from __future__ import annotations

import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import sys
import threading
from typing import Any

from playwright.sync_api import Page, sync_playwright

REPO_DIR = Path(__file__).resolve().parent.parent


class QuietStaticHandler(SimpleHTTPRequestHandler):
    """Static file handler that suppresses per-request console logs."""

    def log_message(self, format: str, *args: Any) -> None:
        return


def _launch_browser(pw: Any) -> Any:
    try:
        return pw.chromium.launch(headless=True)
    except Exception:  # noqa: 10
        return pw.chromium.launch(channel="msedge", headless=True)


def _wait_for_images(page: Page) -> None:
    page.wait_for_selector("main h3", timeout=20000)
    page.wait_for_function(
        "() => Array.from(document.querySelectorAll('main img')).every(img => img.complete)",
        timeout=15000,
    )
    page.wait_for_timeout(800)


def capture_screenshots(out_dir: Path, dist_dir: Path) -> None:
    """Serve the built OpenRecipeBook bundle and capture desktop and mobile PNGs."""
    dist_resolved = dist_dir.expanduser().resolve()
    if not (dist_resolved / "index.html").is_file():
        raise FileNotFoundError(f"Built web bundle not found at {dist_resolved}; run npm run build first.")

    out_resolved = out_dir.expanduser().resolve()
    out_resolved.mkdir(parents=True, exist_ok=True)

    handler_cls = partial(QuietStaticHandler, directory=str(dist_resolved))
    server = ThreadingHTTPServer(("127.0.0.1", 0), handler_cls)
    port = int(server.server_address[1])
    thread = threading.Thread(target=server.serve_forever, daemon=True)
    thread.start()
    url = f"http://127.0.0.1:{port}/"

    try:
        with sync_playwright() as pw:
            browser = _launch_browser(pw)
            desktop_ctx = browser.new_context(viewport={"width": 1440, "height": 900}, device_scale_factor=1)
            page = desktop_ctx.new_page()
            page.goto(url, wait_until="networkidle")
            _wait_for_images(page)
            page.screenshot(path=str(out_resolved / "01_main.png"), full_page=False)

            page.locator("nav[aria-label='Main Navigation'] button", has_text="Meal Plan").click()
            page.wait_for_timeout(800)
            page.screenshot(path=str(out_resolved / "02_meal_planner.png"), full_page=False)
            desktop_ctx.close()

            mobile_ctx = browser.new_context(viewport={"width": 390, "height": 844}, is_mobile=True, device_scale_factor=2)
            mobile_page = mobile_ctx.new_page()
            mobile_page.goto(url, wait_until="networkidle")
            _wait_for_images(mobile_page)
            mobile_page.screenshot(path=str(out_resolved / "03_mobile.png"), full_page=False)
            mobile_ctx.close()
            browser.close()
    finally:
        server.shutdown()
        server.server_close()


def main() -> int:
    parser = argparse.ArgumentParser(description="Capture OpenRecipeBook UI screenshots.")
    parser.add_argument("--out-dir", type=Path, default=REPO_DIR / "assets" / "screenshots")
    parser.add_argument("--dist-dir", type=Path, default=REPO_DIR / "dist")
    args = parser.parse_args()
    capture_screenshots(args.out_dir, args.dist_dir)
    sys.stdout.write(f"Saved screenshots into {args.out_dir}\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
