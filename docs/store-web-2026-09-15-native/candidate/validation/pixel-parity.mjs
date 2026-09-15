// Draws each candidate webp and its source capture PNG (with browser EXIF
// orientation applied) onto canvases in headless Chrome and compares pixels.
// Confirms orientation, dimensions, and that the only difference is lossy encoding.
// Usage: node pixel-parity.mjs <out.json>
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createServer} from 'node:http';
import {readFile, writeFile, mkdtemp} from 'node:fs/promises';
import {join, dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {fileURLToPath} from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const out = process.argv[2];
const candidate = join(here, '..', 'deploy', 'assets');
const captures = '/Volumes/Dev/Code/skald-store-copy-20260913/docs/store/releases/0.7.0/captures';
const pairs = [
  ['reader-art.webp', 'ios-phone/01-reader.png'],
  ['greek-split.webp', 'ios-ipad/03-parallel.png'],
  ['museum-guide.webp', 'ios-ipad/07-art.png'],
  ['nostos-route.webp', 'android-tablet/08-voyage-map.png'],
];

const server = createServer(async (req, res) => {
  try {
    const p = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (p === '/') {
      res.setHeader('content-type', 'text/html');
      return res.end('<!doctype html><title>parity</title>');
    }
    const [kind, ...rest] = p.slice(1).split('/');
    const file = kind === 'candidate' ? join(candidate, rest.join('/')) : join(captures, rest.join('/'));
    res.setHeader('content-type', file.endsWith('.png') ? 'image/png' : 'image/webp');
    res.end(await readFile(file));
  } catch {
    res.statusCode = 404;
    res.end();
  }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const site = `http://127.0.0.1:${server.address().port}`;
const probe = createServer();
await new Promise(r => probe.listen(0, '127.0.0.1', r));
const port = probe.address().port;
await new Promise(r => probe.close(r));
const profile = await mkdtemp(join(tmpdir(), 'skald-parity-'));
const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
  '--headless=new', '--disable-background-networking', '--no-first-run', '--force-color-profile=srgb',
  `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank',
], {stdio: 'ignore'});
const delay = ms => new Promise(r => setTimeout(r, ms));

let ws;
try {
  for (let i = 0; i < 100; i++) {
    try { await fetch(`http://127.0.0.1:${port}/json/version`); break; } catch { await delay(100); }
  }
  const target = await (await fetch(`http://127.0.0.1:${port}/json/new?about%3Ablank`, {method: 'PUT'})).json();
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise(r => ws.addEventListener('open', r, {once: true}));
  let id = 0;
  const pending = new Map();
  ws.onmessage = e => {
    const d = JSON.parse(e.data);
    if (!d.id) return;
    const p = pending.get(d.id);
    pending.delete(d.id);
    d.error ? p.reject(Error(d.error.message)) : p.resolve(d.result);
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const n = ++id;
    pending.set(n, {resolve, reject});
    ws.send(JSON.stringify({id: n, method, params}));
  });
  await send('Page.enable');
  await send('Page.navigate', {url: `${site}/`});
  await delay(500);

  const results = [];
  for (const [webp, png] of pairs) {
    const expression = `(async () => {
      const load = src => new Promise((ok, fail) => { const i = new Image(); i.onload = () => ok(i); i.onerror = fail; i.src = src; });
      const [a, b] = await Promise.all([load('/candidate/${webp}'), load('/capture/${png}')]);
      const w = b.naturalWidth, h = b.naturalHeight;
      const draw = img => { const c = new OffscreenCanvas(w, h); const x = c.getContext('2d'); x.drawImage(img, 0, 0, w, h); return x.getImageData(0, 0, w, h).data; };
      const da = draw(a), db = draw(b);
      let sum = 0, big = 0; const n = w * h;
      for (let i = 0; i < da.length; i += 4) {
        const d = (Math.abs(da[i] - db[i]) + Math.abs(da[i + 1] - db[i + 1]) + Math.abs(da[i + 2] - db[i + 2])) / 3;
        sum += d; if (d > 48) big++;
      }
      return JSON.stringify({webpNatural: [a.naturalWidth, a.naturalHeight], pngDisplayed: [w, h], meanAbsDiff: +(sum / n).toFixed(3), pctPixelsOver48: +(100 * big / n).toFixed(4)});
    })()`;
    const r = await send('Runtime.evaluate', {expression, awaitPromise: true, returnByValue: true});
    const v = JSON.parse(r.result.value);
    results.push({webp, png, ...v});
    assert.deepEqual(v.webpNatural, v.pngDisplayed, `${webp} dimensions/orientation`);
    assert.ok(v.meanAbsDiff < 3, `${webp} mean diff too high: ${v.meanAbsDiff}`);
  }
  await writeFile(out, JSON.stringify(results, null, 2) + '\n');
  console.log(JSON.stringify(results, null, 2));
} finally {
  ws?.close();
  chrome.kill('SIGTERM');
  server.close();
}
