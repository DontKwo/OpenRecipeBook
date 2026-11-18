const http = require("http");
const net = require("net");
const crypto = require("crypto");
const fs = require("fs");
const os = require("os");
const path = require("path");
const assert = require("assert");
const { spawn } = require("child_process");

function createWsConnection(wsUrl) {
  return new Promise((resolve, reject) => {
    const url = new URL(wsUrl);
    const port = url.port || 80;
    const key = crypto.randomBytes(16).toString("base64");

    const socket = net.connect(port, url.hostname, () => {
      const headers = [
        `GET ${url.pathname} HTTP/1.1`,
        `Host: ${url.hostname}:${port}`,
        "Upgrade: websocket",
        "Connection: Upgrade",
        `Sec-WebSocket-Key: ${key}`,
        "Sec-WebSocket-Version: 13",
        "\r\n"
      ].join("\r\n");
      socket.write(headers);
    });

    let id = 1;
    const callbacks = new Map();
    let buffer = Buffer.alloc(0);

    socket.on("data", (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);
      const headerEnd = buffer.indexOf("\r\n\r\n");
      if (headerEnd !== -1 && !socket.handshakeComplete) {
        socket.handshakeComplete = true;
        buffer = buffer.slice(headerEnd + 4);
        resolve({
          send: (method, params = {}) => {
            return new Promise((res, rej) => {
              const msgId = id++;
              callbacks.set(msgId, { resolve: res, reject: rej });
              const json = JSON.stringify({ id: msgId, method, params });
              const payload = Buffer.from(json);
              const mask = crypto.randomBytes(4);
              let frame;
              if (payload.length < 126) {
                frame = Buffer.alloc(2 + 4 + payload.length);
                frame[0] = 0x81;
                frame[1] = 0x80 | payload.length;
                mask.copy(frame, 2);
                for (let i = 0; i < payload.length; i++) {
                  frame[6 + i] = payload[i] ^ mask[i % 4];
                }
              } else if (payload.length < 65536) {
                frame = Buffer.alloc(4 + 4 + payload.length);
                frame[0] = 0x81;
                frame[1] = 0x80 | 126;
                frame.writeUInt16BE(payload.length, 2);
                mask.copy(frame, 4);
                for (let i = 0; i < payload.length; i++) {
                  frame[8 + i] = payload[i] ^ mask[i % 4];
                }
              } else {
                frame = Buffer.alloc(10 + 4 + payload.length);
                frame[0] = 0x81;
                frame[1] = 0x80 | 127;
                frame.writeBigUInt64BE(BigInt(payload.length), 2);
                mask.copy(frame, 10);
                for (let i = 0; i < payload.length; i++) {
                  frame[14 + i] = payload[i] ^ mask[i % 4];
                }
              }
              socket.write(frame);
            });
          },
          close: () => socket.destroy()
        });
      }

      if (!socket.handshakeComplete) return;

      while (buffer.length >= 2) {
        const firstByte = buffer[0];
        const opcode = firstByte & 0x0f;
        const secondByte = buffer[1];
        let payloadLen = secondByte & 0x7f;
        let offset = 2;

        if (payloadLen === 126) {
          if (buffer.length < 4) break;
          payloadLen = buffer.readUInt16BE(2);
          offset = 4;
        } else if (payloadLen === 127) {
          if (buffer.length < 10) break;
          payloadLen = Number(buffer.readBigUInt64BE(2));
          offset = 10;
        }

        if (buffer.length < offset + payloadLen) break;

        const payload = buffer.slice(offset, offset + payloadLen);
        buffer = buffer.slice(offset + payloadLen);

        if (opcode === 1) {
          try {
            const data = JSON.parse(payload.toString("utf8"));
            if (data.id && callbacks.has(data.id)) {
              const cb = callbacks.get(data.id);
              callbacks.delete(data.id);
              if (data.error) cb.reject(new Error(data.error.message));
              else cb.resolve(data.result);
            }
          } catch (e) {
            console.error("Parse error", e);
          }
        }
      }
    });

    socket.on("error", reject);
  });
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http
      .get(url, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => resolve(JSON.parse(data)));
      })
      .on("error", reject);
  });
}

async function evalJs(ws, expression) {
  const res = await ws.send("Runtime.evaluate", {
    expression,
    returnByValue: true,
    awaitPromise: true
  });
  if (res.exceptionDetails) {
    console.error("Eval error:", res.exceptionDetails);
  }
  return res.result ? res.result.value : undefined;
}

async function capture(ws, filename) {
  if (!fs.existsSync("screenshots")) {
    fs.mkdirSync("screenshots", { recursive: true });
  }
  const shot = await ws.send("Page.captureScreenshot");
  fs.writeFileSync(`screenshots/${filename}`, Buffer.from(shot.data, "base64"));
  console.log(`Saved screenshots/${filename}`);
}

function findBrowserExecutable() {
  const candidates = [
    process.env.CHROME_BIN,
    path.join(process.env.PROGRAMFILES || "C:\\Program Files", "Google", "Chrome", "Application", "chrome.exe"), // # noqa: 91
    path.join(process.env["PROGRAMFILES(X86)"] || "C:\\Program Files (x86)", "Microsoft", "Edge", "Application", "msedge.exe"), // # noqa: 91
    path.join(process.env.PROGRAMFILES || "C:\\Program Files", "Microsoft", "Edge", "Application", "msedge.exe") // # noqa: 91
  ].filter(Boolean);
  for (const c of candidates) {
    if (fs.existsSync(c)) return c;
  }
  throw new Error("Could not find Chrome or Edge binary for headless screenshot audit.");
}

async function startDesktopHostServer() {
  const exePath = path.resolve(__dirname, "..", "build", "OpenRecipeBook.exe");
  if (!fs.existsSync(exePath)) {
    throw new Error(`Missing ${exePath}. Run npm run build:desktop first.`);
  }
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "orb-ui-audit-"));
  const dataDir = path.join(tempRoot, "host-config");
  const storageDir = path.join(tempRoot, "recipes");

  const proc = spawn(
    exePath,
    ["--headless-server", "0", `--data-dir=${dataDir}`, `--storage-dir=${storageDir}`],
    { stdio: ["ignore", "pipe", "pipe"] }
  );

  const baseUrl = await new Promise((resolve, reject) => {
    let stdout = "";
    const timer = setTimeout(() => reject(new Error("Timed out starting OpenRecipeBook.exe")), 10000);
    proc.stdout.on("data", (chunk) => {
      stdout += chunk.toString("utf8");
      const match = /READY\s+(http:\/\/127\.0\.0\.1:\d+\/)/.exec(stdout);
      if (match) {
        clearTimeout(timer);
        resolve(match[1]);
      }
    });
    proc.on("exit", (code) => {
      clearTimeout(timer);
      reject(new Error(`OpenRecipeBook.exe exited early (${code})`));
    });
  });

  return { proc, baseUrl, tempRoot, storageDir };
}

async function checkHorizontalOverflow(ws, vpWidth) {
  return evalJs(
    ws,
    `(() => {
      const docOverflow = document.documentElement.scrollWidth > document.documentElement.clientWidth;
      const main = document.querySelector('main');
      const mainOverflow = main ? main.scrollWidth > main.clientWidth + 1 : false;
      const isInsideHorizontalScroller = (el) => {
        let p = el.parentElement;
        while (p && p !== main && p !== document.body) {
          const ox = getComputedStyle(p).overflowX;
          if (ox === 'auto' || ox === 'scroll') return true;
          p = p.parentElement;
        }
        return false;
      };
      const clipped = [];
      for (const el of document.querySelectorAll('main input, main button, main select')) {
        if (isInsideHorizontalScroller(el)) continue;
        const r = el.getBoundingClientRect();
        if (r.width > 0 && r.height > 0 && r.right > ${vpWidth} + 2) {
          clipped.push(el.tagName + ':' + (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 30) + ' right=' + Math.round(r.right));
        }
      }
      return {
        hasOverflow: docOverflow || mainOverflow || clipped.length > 0,
        docOverflow,
        mainOverflow,
        clipped
      };
    })()`
  );
}

const VIEWPORTS = [
  { width: 360, height: 740, name: "360x740", mobile: true },
  { width: 390, height: 844, name: "390x844", mobile: true },
  { width: 768, height: 1024, name: "768x1024", mobile: false },
  { width: 1440, height: 900, name: "1440x900", mobile: false }
];

const THEMES = ["light", "dark"];

async function main() {
  const host = await startDesktopHostServer();
  const browserPath = findBrowserExecutable();
  const profileDir = path.join(host.tempRoot, "browser-profile");
  const browser = spawn(browserPath, [
    "--headless=new",
    "--disable-gpu",
    "--remote-debugging-port=9222",
    `--user-data-dir=${profileDir}`,
    "about:blank"
  ]);

  await new Promise((r) => setTimeout(r, 2000));

  const evidence = {
    run_id: "openrecipebook-ui-audit-" + Date.now(),
    framework: "desktop-exe",
    commit: "HEAD",
    timestamp: new Date().toISOString(),
    viewports: VIEWPORTS,
    themes: THEMES,
    interactions: []
  };

  try {
    const targets = await fetchJson("http://127.0.0.1:9222/json");
    const target = targets.find((t) => t.type === "page");
    if (!target) throw new Error("No page target found");

    const wsUrl = target.webSocketDebuggerUrl.replace("localhost", "127.0.0.1");
    const ws = await createWsConnection(wsUrl);

    await ws.send("Page.enable");
    await ws.send("Runtime.enable");
    await ws.send("DOM.enable");

    for (const vp of VIEWPORTS) {
      await ws.send("Emulation.setDeviceMetricsOverride", {
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: 1,
        mobile: vp.mobile
      });

      for (const theme of THEMES) {
        console.log(`\n=== Testing ${vp.name} [${theme}] ===`);

        await ws.send("Page.navigate", { url: host.baseUrl });
        await new Promise((r) => setTimeout(r, 1200));

        await evalJs(
          ws,
          `(() => {
            document.documentElement.setAttribute('data-theme', '${theme}');
            localStorage.setItem('orb_theme', '${theme}');
          })()`
        );
        await new Promise((r) => setTimeout(r, 200));

        // 1. Library View + Search Box Accessibility Check
        const searchMetrics = await evalJs(
          ws,
          `(() => {
            const input = document.querySelector('input[aria-label="Search recipes"]');
            if (!input) return null;
            const r = input.getBoundingClientRect();
            return { width: Math.round(r.width), height: Math.round(r.height), left: Math.round(r.left), top: Math.round(r.top), right: Math.round(r.right) };
          })()`
        );
        assert.ok(searchMetrics, `Search input missing at ${vp.name} ${theme}`);
        assert.ok(searchMetrics.width >= 200, `Search input compressed (${searchMetrics.width}px) at ${vp.name}`);
        assert.ok(searchMetrics.height >= 36, `Search input too short (${searchMetrics.height}px) at ${vp.name}`);

        const clickX = Math.round(searchMetrics.left + 20);
        const clickY = Math.round(searchMetrics.top + searchMetrics.height / 2);

        // Test clicking and typing into search box
        await ws.send("Input.dispatchMouseEvent", {
          type: "mousePressed",
          x: clickX,
          y: clickY,
          button: "left",
          clickCount: 1
        });
        await ws.send("Input.dispatchMouseEvent", {
          type: "mouseReleased",
          x: clickX,
          y: clickY,
          button: "left",
          clickCount: 1
        });
        await ws.send("Input.insertText", { text: "BBQ" });
        await new Promise((r) => setTimeout(r, 250));
        const filteredTitles = await evalJs(
          ws,
          `Array.from(document.querySelectorAll('main h3')).map(h => h.textContent)`
        );
        assert.ok(
          filteredTitles.some((t) => t.includes("BBQ")),
          `Expected search to filter BBQ recipe at ${vp.name}`
        );
        await evalJs(
          ws,
          `(() => {
            const clearBtn = document.querySelector('button[aria-label="Clear search"]');
            if (clearBtn) clearBtn.click();
          })()`
        );
        await new Promise((r) => setTimeout(r, 200));

        const libOverflow = await checkHorizontalOverflow(ws, vp.width);
        await capture(ws, `library_${vp.name}_${theme}.png`);
        evidence.interactions.push({
          screen: "Library",
          viewport: vp.name,
          theme,
          hasHorizontalScroll: libOverflow.hasOverflow,
          overflowDetails: libOverflow,
          searchMetrics,
          screenshot: `library_${vp.name}_${theme}.png`
        });

        // 2. Storage Modal + Folder Creation Flow (on 360x740 & 1440x900 light)
        if ((vp.width === 360 || vp.width === 1440) && theme === "light") {
          await evalJs(
            ws,
            `(() => {
              const btn = document.querySelector('button[aria-label="Recipe storage folder"]');
              if (btn) btn.click();
            })()`
          );
          await new Promise((r) => setTimeout(r, 400));
          const storagePathShown = await evalJs(
            ws,
            `document.querySelector('[data-testid="storage-path-value"]')?.textContent || ''`
          );
          assert.ok(storagePathShown.includes(host.storageDir), "Storage modal must display actual storage folder path");
          await capture(ws, `storage_modal_${vp.name}_${theme}.png`);
          await evalJs(
            ws,
            `document.querySelector('button[aria-label="Close dialog"]')?.click()`
          );
          await new Promise((r) => setTimeout(r, 250));

          // Folder creation -> auto-open -> search/select recipe modal
          await evalJs(
            ws,
            `(() => {
              const chip = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Folder');
              if (chip) chip.click();
            })()`
          );
          await new Promise((r) => setTimeout(r, 300));
          await evalJs(
            ws,
            `(() => {
              const inp = document.querySelector('input[placeholder="New folder name..."]');
              if (inp) {
                const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
                setter.call(inp, 'Weeknight');
                inp.dispatchEvent(new Event('input', { bubbles: true }));
              }
            })()`
          );
          await new Promise((r) => setTimeout(r, 150));
          await evalJs(
            ws,
            `(() => {
              const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Create');
              if (btn) btn.click();
            })()`
          );
          await new Promise((r) => setTimeout(r, 400));
          const addRecipesSearchVisible = await evalJs(
            ws,
            `Boolean(document.querySelector('input[aria-label="Search recipes to add to folder"]'))`
          );
          assert.ok(addRecipesSearchVisible, "Creating a folder must open the recipe search & selection modal");
          await capture(ws, `folder_add_recipes_${vp.name}_${theme}.png`);
          await evalJs(ws, `document.querySelector('button[aria-label="Close dialog"]')?.click()`);
          await new Promise((r) => setTimeout(r, 200));
          await evalJs(
            ws,
            `(() => {
              const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'All Recipes');
              if (btn) btn.click();
            })()`
          );
          await new Promise((r) => setTimeout(r, 200));
        }

        // 3. Open First Recipe (Recipe View)
        await evalJs(
          ws,
          `(() => {
            const h3 = document.querySelector('main h3');
            if (h3) h3.click();
          })()`
        );
        await new Promise((r) => setTimeout(r, 500));

        const recipeOverflow = await checkHorizontalOverflow(ws, vp.width);
        await capture(ws, `recipe_view_top_${vp.name}_${theme}.png`);
        evidence.interactions.push({
          screen: "Recipe View Top",
          viewport: vp.name,
          theme,
          hasHorizontalScroll: recipeOverflow.hasOverflow,
          overflowDetails: recipeOverflow,
          screenshot: `recipe_view_top_${vp.name}_${theme}.png`
        });

        // 4. Planner View
        await evalJs(
          ws,
          `(() => {
            const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Plan'));
            if (btn) btn.click();
          })()`
        );
        await new Promise((r) => setTimeout(r, 500));
        const plannerOverflow = await checkHorizontalOverflow(ws, vp.width);
        await capture(ws, `planner_week_${vp.name}_${theme}.png`);
        evidence.interactions.push({
          screen: "Meal Planner Week",
          viewport: vp.name,
          theme,
          hasHorizontalScroll: plannerOverflow.hasOverflow,
          overflowDetails: plannerOverflow,
          screenshot: `planner_week_${vp.name}_${theme}.png`
        });

        // 5. Shopping List
        await evalJs(
          ws,
          `(() => {
            const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Shopping'));
            if (btn) btn.click();
          })()`
        );
        await new Promise((r) => setTimeout(r, 500));
        const shopOverflow = await checkHorizontalOverflow(ws, vp.width);
        await capture(ws, `shopping_${vp.name}_${theme}.png`);
        evidence.interactions.push({
          screen: "Shopping List",
          viewport: vp.name,
          theme,
          hasHorizontalScroll: shopOverflow.hasOverflow,
          overflowDetails: shopOverflow,
          screenshot: `shopping_${vp.name}_${theme}.png`
        });

        // 6. Ingredient Totals (with picker open)
        await evalJs(
          ws,
          `(() => {
            const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Totals'));
            if (btn) btn.click();
          })()`
        );
        await new Promise((r) => setTimeout(r, 500));
        await evalJs(
          ws,
          `(() => {
            const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Add Recipe'));
            if (btn) btn.click();
          })()`
        );
        await new Promise((r) => setTimeout(r, 300));
        const totalsOverflow = await checkHorizontalOverflow(ws, vp.width);
        await capture(ws, `totals_${vp.name}_${theme}.png`);
        evidence.interactions.push({
          screen: "Ingredient Totals",
          viewport: vp.name,
          theme,
          hasHorizontalScroll: totalsOverflow.hasOverflow,
          overflowDetails: totalsOverflow,
          screenshot: `totals_${vp.name}_${theme}.png`
        });

        // 7. Settings View
        await evalJs(
          ws,
          `(() => {
            const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Settings'));
            if (btn) btn.click();
          })()`
        );
        await new Promise((r) => setTimeout(r, 500));
        const settingsOverflow = await checkHorizontalOverflow(ws, vp.width);
        await capture(ws, `settings_${vp.name}_${theme}.png`);
        evidence.interactions.push({
          screen: "Settings",
          viewport: vp.name,
          theme,
          hasHorizontalScroll: settingsOverflow.hasOverflow,
          overflowDetails: settingsOverflow,
          screenshot: `settings_${vp.name}_${theme}.png`
        });
      }
    }

    fs.writeFileSync("ui_evidence.json", JSON.stringify(evidence, null, 2));
    console.log("\nAudit complete! ui_evidence.json populated.");

    const failedOverflow = evidence.interactions.filter((i) => i.hasHorizontalScroll);
    if (failedOverflow.length > 0) {
      console.error("Horizontal overflow detected:", JSON.stringify(failedOverflow, null, 2));
      process.exitCode = 1;
    }

    ws.close();
  } finally {
    browser.kill();
    host.proc.kill();
    try {
      fs.rmSync(host.tempRoot, { recursive: true, force: true });
    } catch {
      // Ignore cleanup lock
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
