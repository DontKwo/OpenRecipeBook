const http = require('http');
const net = require('net');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

function createWsConnection(wsUrl) {
  return new Promise((resolve, reject) => {
    const url = new URL(wsUrl);
    const port = url.port || 80;
    const key = crypto.randomBytes(16).toString('base64');

    const socket = net.connect(port, url.hostname, () => {
      const headers = [
        `GET ${url.pathname} HTTP/1.1`,
        `Host: ${url.hostname}:${port}`,
        'Upgrade: websocket',
        'Connection: Upgrade',
        `Sec-WebSocket-Key: ${key}`,
        'Sec-WebSocket-Version: 13',
        '\r\n'
      ].join('\r\n');
      socket.write(headers);
    });

    let id = 1;
    const callbacks = new Map();
    let buffer = Buffer.alloc(0);

    socket.on('data', chunk => {
      buffer = Buffer.concat([buffer, chunk]);
      const headerEnd = buffer.indexOf('\r\n\r\n');
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
            const data = JSON.parse(payload.toString('utf8'));
            if (data.id && callbacks.has(data.id)) {
              const cb = callbacks.get(data.id);
              callbacks.delete(data.id);
              if (data.error) cb.reject(new Error(data.error.message));
              else cb.resolve(data.result);
            }
          } catch (e) {
            console.error('Parse error', e);
          }
        }
      }
    });

    socket.on('error', reject);
  });
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

async function evalJs(ws, expression) {
  const res = await ws.send('Runtime.evaluate', {
    expression,
    returnByValue: true
  });
  if (res.exceptionDetails) {
    console.error('Eval error:', res.exceptionDetails);
  }
  return res.result ? res.result.value : undefined;
}

async function capture(ws, filename) {
  if (!fs.existsSync('screenshots')) {
    fs.mkdirSync('screenshots', { recursive: true });
  }
  const shot = await ws.send('Page.captureScreenshot');
  fs.writeFileSync(`screenshots/${filename}`, Buffer.from(shot.data, 'base64'));
  console.log(`Saved screenshots/${filename}`);
}

const VIEWPORTS = [
  { width: 360, height: 740, name: '360x740', mobile: true },
  { width: 390, height: 844, name: '390x844', mobile: true },
  { width: 768, height: 1024, name: '768x1024', mobile: false },
  { width: 1440, height: 900, name: '1440x900', mobile: false }
];

const THEMES = ['light', 'dark'];

async function main() {
  const chromePath = process.env.CHROME_BIN || path.join(process.env['PROGRAMFILES'] || 'C:\\Program Files', 'Google', 'Chrome', 'Application', 'chrome.exe'); // # noqa: 91
  const profileDir = path.resolve(__dirname, '..', 'temp-chrome-profile');
  const chrome = spawn(chromePath, [
    '--headless=new',
    '--disable-gpu',
    '--remote-debugging-port=9222',
    `--user-data-dir=${profileDir}`,
    'about:blank'
  ]);

  await new Promise(r => setTimeout(r, 2000));

  const evidence = {
    run_id: 'openrecipebook-ui-audit-' + Date.now(),
    framework: 'web',
    commit: 'HEAD',
    timestamp: new Date().toISOString(),
    viewports: VIEWPORTS,
    themes: THEMES,
    interactions: []
  };

  try {
    const targets = await fetchJson('http://127.0.0.1:9222/json');
    const target = targets.find(t => t.type === 'page');
    if (!target) throw new Error('No page target found');

    const wsUrl = target.webSocketDebuggerUrl.replace('localhost', '127.0.0.1');
    const ws = await createWsConnection(wsUrl);

    await ws.send('Page.enable');
    await ws.send('Runtime.enable');
    await ws.send('DOM.enable');

    for (const vp of VIEWPORTS) {
      await ws.send('Emulation.setDeviceMetricsOverride', {
        width: vp.width,
        height: vp.height,
        deviceScaleFactor: 1,
        mobile: vp.mobile
      });

      for (const theme of THEMES) {
        console.log(`\n=== Testing ${vp.name} [${theme}] ===`);

        // Navigate clean
        await ws.send('Page.navigate', { url: 'http://localhost:5173/' });
        await new Promise(r => setTimeout(r, 1000));

        // Apply theme
        await evalJs(ws, `(() => {
          document.documentElement.setAttribute('data-theme', '${theme}');
          localStorage.setItem('orb_theme', '${theme}');
        })()`);
        await new Promise(r => setTimeout(r, 200));

        // 1. Library View
        const hasHScrollLib = await evalJs(ws, `document.documentElement.scrollWidth > document.documentElement.clientWidth`);
        await capture(ws, `library_${vp.name}_${theme}.png`);
        evidence.interactions.push({
          screen: 'Library',
          viewport: vp.name,
          theme,
          hasHorizontalScroll: hasHScrollLib,
          screenshot: `library_${vp.name}_${theme}.png`
        });

        // 2. Open First Recipe (Recipe View Top)
        await evalJs(ws, `(() => {
          const cards = Array.from(document.querySelectorAll('[class*="recipeCard"]'));
          if (cards[0]) cards[0].click();
          else {
            const el = Array.from(document.querySelectorAll('div, h3, a')).find(e => e.textContent.includes('Pancake') || e.textContent.includes('Turkey'));
            if (el) el.click();
          }
        })()`);
        await new Promise(r => setTimeout(r, 600));

        const hasHScrollRecipe = await evalJs(ws, `document.documentElement.scrollWidth > document.documentElement.clientWidth`);
        await capture(ws, `recipe_view_top_${vp.name}_${theme}.png`);
        evidence.interactions.push({
          screen: 'Recipe View Top',
          viewport: vp.name,
          theme,
          hasHorizontalScroll: hasHScrollRecipe,
          screenshot: `recipe_view_top_${vp.name}_${theme}.png`
        });

        // 3. Recipe View Bottom (scroll down)
        await evalJs(ws, `window.scrollTo(0, document.body.scrollHeight)`);
        await new Promise(r => setTimeout(r, 400));
        await capture(ws, `recipe_view_bottom_${vp.name}_${theme}.png`);

        // 4. Recipe View Menu Open
        await evalJs(ws, `window.scrollTo(0, 0)`);
        await new Promise(r => setTimeout(r, 200));
        await evalJs(ws, `(() => {
          const btn = document.querySelector('button[aria-label="Recipe actions"]') || Array.from(document.querySelectorAll('button')).find(b => b.innerHTML.includes('circle'));
          if (btn) btn.click();
        })()`);
        await new Promise(r => setTimeout(r, 400));
        await capture(ws, `recipe_view_menu_${vp.name}_${theme}.png`);

        // Close menu / click backdrop
        await evalJs(ws, `(() => {
          const backdrop = document.querySelector('[class*="backdrop"]') || document.body;
          backdrop.click();
        })()`);
        await new Promise(r => setTimeout(r, 200));

        // 5. Cook Mode
        await evalJs(ws, `(() => {
          const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Cook Mode'));
          if (btn) btn.click();
        })()`);
        await new Promise(r => setTimeout(r, 600));

        await capture(ws, `cook_mode_base_${vp.name}_${theme}.png`);

        // 6. Cook Mode Timers Drawer
        await evalJs(ws, `(() => {
          const btn = document.querySelector('button[aria-label="View timers"]') || Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Timers'));
          if (btn) btn.click();
        })()`);
        await new Promise(r => setTimeout(r, 400));
        await capture(ws, `cook_mode_timers_${vp.name}_${theme}.png`);

        // 7. Cook Mode Ingredients Drawer
        await evalJs(ws, `(() => {
          const btn = document.querySelector('button[aria-label="View ingredients"]') || Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Ingredients'));
          if (btn) btn.click();
        })()`);
        await new Promise(r => setTimeout(r, 400));
        await capture(ws, `cook_mode_ingredients_${vp.name}_${theme}.png`);

        // 8. Cook Mode Steps Drawer
        await evalJs(ws, `(() => {
          const btn = document.querySelector('button[aria-label="View steps"]') || Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Steps'));
          if (btn) btn.click();
        })()`);
        await new Promise(r => setTimeout(r, 400));
        await capture(ws, `cook_mode_steps_${vp.name}_${theme}.png`);

        // Exit Cook Mode
        await evalJs(ws, `(() => {
          const btn = document.querySelector('button[aria-label="Exit Cook Mode"]');
          if (btn) btn.click();
        })()`);
        await new Promise(r => setTimeout(r, 400));

        // 9. Editor View (click Edit Recipe)
        await evalJs(ws, `(() => {
          const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Edit'));
          if (btn) btn.click();
        })()`);
        await new Promise(r => setTimeout(r, 600));
        await capture(ws, `editor_${vp.name}_${theme}.png`);
        evidence.interactions.push({
          screen: 'Editor',
          viewport: vp.name,
          theme,
          screenshot: `editor_${vp.name}_${theme}.png`
        });

        // Cancel Editor
        await evalJs(ws, `(() => {
          const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Cancel'));
          if (btn) btn.click();
        })()`);
        await new Promise(r => setTimeout(r, 400));

        // 10. Planner View
        await evalJs(ws, `(() => {
          const tabs = Array.from(document.querySelectorAll('button, a'));
          const plannerTab = tabs.find(t => t.textContent.includes('Planner') || t.textContent.includes('Plan'));
          if (plannerTab) plannerTab.click();
        })()`);
        await new Promise(r => setTimeout(r, 600));
        const hasHScrollPlanner = await evalJs(ws, `document.documentElement.scrollWidth > document.documentElement.clientWidth`);
        await capture(ws, `planner_week_${vp.name}_${theme}.png`);
        evidence.interactions.push({
          screen: 'Meal Planner Week',
          viewport: vp.name,
          theme,
          hasHorizontalScroll: hasHScrollPlanner,
          screenshot: `planner_week_${vp.name}_${theme}.png`
        });

        // 11. Planner Add Meal Dialog
        await evalJs(ws, `(() => {
          const addBtns = Array.from(document.querySelectorAll('button')).filter(b => b.textContent.includes('+ Add') || b.textContent.includes('Add Meal'));
          if (addBtns[0]) addBtns[0].click();
        })()`);
        await new Promise(r => setTimeout(r, 400));
        await capture(ws, `planner_add_meal_${vp.name}_${theme}.png`);

        // Close Add Meal dialog
        await evalJs(ws, `(() => {
          const closeBtn = document.querySelector('button[aria-label="Close dialog"]');
          if (closeBtn) closeBtn.click();
        })()`);
        await new Promise(r => setTimeout(r, 300));

        // 12. Shopping List
        await evalJs(ws, `(() => {
          const tabs = Array.from(document.querySelectorAll('button, a'));
          const shopTab = tabs.find(t => t.textContent.includes('Shopping'));
          if (shopTab) shopTab.click();
        })()`);
        await new Promise(r => setTimeout(r, 600));
        const hasHScrollShop = await evalJs(ws, `document.documentElement.scrollWidth > document.documentElement.clientWidth`);
        await capture(ws, `shopping_${vp.name}_${theme}.png`);
        evidence.interactions.push({
          screen: 'Shopping List',
          viewport: vp.name,
          theme,
          hasHorizontalScroll: hasHScrollShop,
          screenshot: `shopping_${vp.name}_${theme}.png`
        });

        // 13. Ingredient Totals
        await evalJs(ws, `(() => {
          const tabs = Array.from(document.querySelectorAll('button, a'));
          const totTab = tabs.find(t => t.textContent.includes('Totals'));
          if (totTab) totTab.click();
        })()`);
        await new Promise(r => setTimeout(r, 600));

        // Add a recipe in totals
        await evalJs(ws, `(() => {
          const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Add Recipe'));
          if (btn) btn.click();
        })()`);
        await new Promise(r => setTimeout(r, 300));
        await evalJs(ws, `(() => {
          const item = document.querySelector('[class*="item"]');
          if (item) item.click();
        })()`);
        await new Promise(r => setTimeout(r, 400));

        const hasHScrollTotals = await evalJs(ws, `document.documentElement.scrollWidth > document.documentElement.clientWidth`);
        await capture(ws, `totals_${vp.name}_${theme}.png`);
        evidence.interactions.push({
          screen: 'Ingredient Totals',
          viewport: vp.name,
          theme,
          hasHorizontalScroll: hasHScrollTotals,
          screenshot: `totals_${vp.name}_${theme}.png`
        });

        // 14. Settings View
        await evalJs(ws, `(() => {
          const tabs = Array.from(document.querySelectorAll('button, a'));
          const setTab = tabs.find(t => t.textContent.includes('Settings'));
          if (setTab) setTab.click();
        })()`);
        await new Promise(r => setTimeout(r, 600));
        const hasHScrollSettings = await evalJs(ws, `document.documentElement.scrollWidth > document.documentElement.clientWidth`);
        await capture(ws, `settings_${vp.name}_${theme}.png`);
        evidence.interactions.push({
          screen: 'Settings',
          viewport: vp.name,
          theme,
          hasHorizontalScroll: hasHScrollSettings,
          screenshot: `settings_${vp.name}_${theme}.png`
        });
      }
    }

    fs.writeFileSync('ui_evidence.json', JSON.stringify(evidence, null, 2));
    console.log('\nAudit complete! ui_evidence.json populated.');

    ws.close();
  } finally {
    chrome.kill();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
