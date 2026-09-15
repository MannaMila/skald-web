// Scoped landing check for the four native screenshots and social metadata.
// Serves <root>, loads / at desktop + mobile, forces lazy images to load, and
// asserts each rendered box matches the image's natural aspect ratio with no
// crop or tint. Captures #translations and #journey (not covered by
// /tmp/verify-skald-landing.mjs) plus element screenshots of each figure.
// Usage: node shots-check.mjs <root> <outDir>
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createServer} from 'node:http';
import {readFile, writeFile, mkdir, mkdtemp} from 'node:fs/promises';
import {join, extname} from 'node:path';
import {tmpdir} from 'node:os';

const [root, outDir] = process.argv.slice(2);
assert.ok(root && outDir, 'usage: node shots-check.mjs <root> <outDir>');
await mkdir(outDir, {recursive: true});

const web = JSON.parse(await readFile('/Volumes/Dev/Code/skald-store-copy-20260913/docs/marketing/store-web-2026-09-13/candidate-native-web.json', 'utf8'));
const expected = {
  'reader-art.webp': {natural: [1320, 2868], alt: web.hero_alt},
  'greek-split.webp': {natural: [2752, 2064], alt: web.greek_alt},
  'nostos-route.webp': {natural: [1920, 1080], alt: web.map_alt},
  'museum-guide.webp': {natural: [2752, 2064], alt: web.art_alt},
};
const OG = 'https://skald.mannamila.com/assets/skald-odyssey-og-070.jpg?v=070-native-20260915';

const types = {'.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg'};
const server = createServer(async (req, res) => {
  try {
    const p = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const body = await readFile(join(root, p.endsWith('/') ? p + 'index.html' : p));
    res.setHeader('content-type', types[extname(p)] || 'text/html');
    res.end(body);
  } catch {
    res.statusCode = 404;
    res.end('not found');
  }
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const site = `http://127.0.0.1:${server.address().port}`;
const probe = createServer();
await new Promise(r => probe.listen(0, '127.0.0.1', r));
const port = probe.address().port;
await new Promise(r => probe.close(r));
const profile = await mkdtemp(join(tmpdir(), 'skald-shots-'));
const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
  '--headless=new', '--disable-background-networking', '--disable-extensions', '--no-first-run',
  '--no-default-browser-check', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank',
], {stdio: 'ignore'});
const delay = ms => new Promise(r => setTimeout(r, ms));

let ws;
const report = {url: site, viewports: []};
try {
  for (let i = 0; i < 100; i++) {
    try { await fetch(`http://127.0.0.1:${port}/json/version`); break; } catch { await delay(100); }
  }
  const target = await (await fetch(`http://127.0.0.1:${port}/json/new?about%3Ablank`, {method: 'PUT'})).json();
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise(r => ws.addEventListener('open', r, {once: true}));
  let id = 0;
  const pending = new Map();
  const exceptions = [];
  const failed = [];
  ws.onmessage = e => {
    const d = JSON.parse(e.data);
    if (d.id) {
      const p = pending.get(d.id);
      pending.delete(d.id);
      d.error ? p.reject(Error(d.error.message)) : p.resolve(d.result);
    } else if (d.method === 'Runtime.exceptionThrown') exceptions.push(d.params.exceptionDetails.text);
    else if (d.method === 'Network.responseReceived' && d.params.response.url.startsWith(site) && d.params.response.status >= 400 && !d.params.response.url.endsWith('/favicon.ico')) failed.push(d.params.response.url);
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const n = ++id;
    pending.set(n, {resolve, reject});
    ws.send(JSON.stringify({id: n, method, params}));
  });
  const ev = async expression =>
    (await send('Runtime.evaluate', {expression, returnByValue: true, awaitPromise: true})).result.value;
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Network.enable');

  for (const [width, height, mobile] of [[1440, 1000, false], [390, 844, true]]) {
    await send('Emulation.setDeviceMetricsOverride', {width, height, deviceScaleFactor: 1, mobile});
    await send('Page.navigate', {url: `${site}/`});
    for (let i = 0; i < 100; i++) {
      if (await ev('document.readyState === "complete"')) break;
      await delay(100);
    }
    await ev('document.fonts.ready.then(() => true)');
    await ev(`Promise.all([...document.images].map(i => { i.loading = 'eager'; return i.decode().catch(() => null); })).then(() => true)`);
    await ev(`document.querySelectorAll('.reveal').forEach(n => n.classList.add('is-visible')); true`);
    await delay(800);

    const state = JSON.parse(await ev(`JSON.stringify({
      scrollWidth: document.documentElement.scrollWidth,
      preview: document.querySelector('.release-preview')?.textContent,
      meta: Object.fromEntries([...document.querySelectorAll('meta[property^="og:image"], meta[name^="twitter:image"]')].map(m => [m.getAttribute('property') || m.getAttribute('name'), m.content])),
      stylesheet: document.querySelector('link[rel=stylesheet][href*="styles.css"]').getAttribute('href'),
      shots: [...document.querySelectorAll('figure.native-shot')].map(f => {
        const img = f.querySelector('img');
        const cs = getComputedStyle(img);
        // Layout (untransformed) content box: the figures are rotated, so
        // getBoundingClientRect would inflate both sides.
        const r = img.getBoundingClientRect();
        const pw = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight);
        const ph = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom);
        const cw = parseFloat(cs.width) - (cs.boxSizing === 'border-box' ? pw + parseFloat(cs.borderLeftWidth) + parseFloat(cs.borderRightWidth) : 0);
        const ch = parseFloat(cs.height) - (cs.boxSizing === 'border-box' ? ph + parseFloat(cs.borderTopWidth) + parseFloat(cs.borderBottomWidth) : 0);
        return {
          section: f.closest('section').id || 'hero',
          src: img.getAttribute('src'),
          attr: [+img.getAttribute('width'), +img.getAttribute('height')],
          natural: [img.naturalWidth, img.naturalHeight],
          box: [+cw.toFixed(2), +ch.toFixed(2)],
          aspectRatio: cs.aspectRatio, objectFit: cs.objectFit, filter: cs.filter,
          alt: img.alt,
          caption: f.querySelector('figcaption')?.textContent,
          inViewportWidth: r.left >= -20 && r.right <= innerWidth + 20,
        };
      }),
    })`));

    assert.ok(state.scrollWidth <= width, `horizontal overflow at ${width}`);
    assert.equal(state.preview, 'A look at our next app update. The expanded library described here is coming in version 0.7.0; the stores currently offer an earlier version.');
    assert.equal(state.stylesheet, './styles.css?v=20260913-native');
    assert.equal(state.meta['og:image'], OG);
    assert.equal(state.meta['twitter:image'], OG);
    assert.equal(state.meta['og:image:alt'], web.greek_alt);
    assert.equal(state.meta['twitter:image:alt'], web.greek_alt);
    assert.equal(state.meta['og:image:width'], '1200');
    assert.equal(state.meta['og:image:height'], '630');
    assert.equal(state.shots.length, 4);
    for (const s of state.shots) {
      const name = s.src.split('/').pop().split('?')[0];
      const exp = expected[name];
      assert.ok(exp, `unexpected native shot ${s.src}`);
      assert.ok(s.src.endsWith('?v=070-native-20260913'), `${name} cache key`);
      assert.deepEqual(s.natural, exp.natural, `${name} natural size`);
      assert.deepEqual(s.attr, exp.natural, `${name} width/height attributes`);
      assert.equal(s.alt, exp.alt, `${name} alt`);
      const rendered = s.box[0] / s.box[1];
      const natural = s.natural[0] / s.natural[1];
      assert.ok(Math.abs(rendered - natural) / natural < 0.005, `${name} rendered ${rendered} vs natural ${natural} at ${width}`);
      assert.equal(s.filter, 'none', `${name} filter`);
      assert.ok(s.inViewportWidth, `${name} escapes viewport at ${width}`);
    }
    assert.equal(state.shots.find(s => s.src.includes('museum-guide')).caption, web.art_caption);

    for (const section of ['translations', 'journey', 'art']) {
      await ev(`document.getElementById('${section}').scrollIntoView({block: 'start'})`);
      await delay(700);
      const shot = await send('Page.captureScreenshot', {format: 'png'});
      await writeFile(join(outDir, `${width}-${section}.png`), Buffer.from(shot.data, 'base64'));
    }
    await ev('scrollTo(0, 0)');
    await delay(500);
    const hero = await send('Page.captureScreenshot', {format: 'png'});
    await writeFile(join(outDir, `${width}-hero.png`), Buffer.from(hero.data, 'base64'));
    report.viewports.push({width, height, mobile, ...state});
  }
  assert.deepEqual(exceptions, []);
  assert.deepEqual(failed, []);
  await writeFile(join(outDir, 'shots-check.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report.viewports.map(v => ({width: v.width, shots: v.shots.map(s => ({section: s.section, box: s.box, aspectRatio: s.aspectRatio, objectFit: s.objectFit, filter: s.filter}))})), null, 1));
} finally {
  ws?.close();
  chrome.kill('SIGTERM');
  server.close();
}
