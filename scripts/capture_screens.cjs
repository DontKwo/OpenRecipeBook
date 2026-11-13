const http = require('http');
const net = require('net');
const crypto = require('crypto');
const fs = require('fs');
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

async function capture(ws, filename) {
  const shot = await ws.send('Page.captureScreenshot');
  fs.writeFileSync(`screenshots/${filename}`, Buffer.from(shot.data, 'base64'));
  console.log(`Saved screenshots/${filename}`);
}

async function main() {
  const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
    '--headless=new',
    '--disable-gpu',
    '--remote-debugging-port=9222',
    '--user-data-dir=c:\\Users\\Josh\\projects\\OpenRecipeBook\\temp-chrome-profile',
    'about:blank'
  ]);

  await new Promise(r => setTimeout(r, 2000));

  try {
    const targets = await fetchJson('http://127.0.0.1:9222/json');
    const target = targets.find(t => t.type === 'page');
    if (!target) throw new Error('No page target found');

    const wsUrl = target.webSocketDebuggerUrl.replace('localhost', '127.0.0.1');
    const ws = await createWsConnection(wsUrl);

    await ws.send('Page.enable');
    await ws.send('Runtime.enable');

    // MOBILE (375x812)
    await ws.send('Emulation.setDeviceMetricsOverride', {
      width: 375,
      height: 812,
      deviceScaleFactor: 1,
      mobile: true
    });

    await ws.send('Page.navigate', { url: 'http://localhost:5173/' });
    await new Promise(r => setTimeout(r, 1200));

    // Click recipe card directly to open Recipe View on mobile
    await ws.send('Runtime.evaluate', {
      expression: `(() => {
        const cards = Array.from(document.querySelectorAll('div')).filter(d => d.textContent.includes('Classic Buttermilk Pancakes'));
        const card = cards.reverse().find(c => c.style.borderRadius || c.parentElement?.style?.display === 'grid');
        if (card) { card.click(); return true; }
        return false;
      })()`,
      returnByValue: true
    });
    await new Promise(r => setTimeout(r, 800));
    await capture(ws, '13_mobile_recipe_view_actual.png');

    // Click Unit Converter button on recipe view
    await ws.send('Runtime.evaluate', {
      expression: `(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const btn = btns.find(b => b.textContent.includes('Unit Converter'));
        if (btn) { btn.click(); return true; }
        return false;
      })()`,
      returnByValue: true
    });
    await new Promise(r => setTimeout(r, 500));
    await capture(ws, '14_mobile_recipe_view_unit_converter.png');

    // Click Cook Mode
    await ws.send('Runtime.evaluate', {
      expression: `(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const btn = btns.find(b => b.textContent.includes('Cook Mode'));
        if (btn) { btn.click(); return true; }
        return false;
      })()`,
      returnByValue: true
    });
    await new Promise(r => setTimeout(r, 500));
    await capture(ws, '15_mobile_cook_mode.png');

    ws.close();
  } finally {
    chrome.kill();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
