#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const finalPath = path.join(here, 'analysis-reviews/greek-words-final.json');
const outDir = path.join(root, 'translations/greek-words');
const statsIndexPath = '/Volumes/Dev/Code/skald/docs/content/translation-stats/index.json';

const data = JSON.parse(fs.readFileSync(finalPath, 'utf8'));
const statsIndex = JSON.parse(fs.readFileSync(statsIndexPath, 'utf8'));
const translatorById = new Map(statsIndex.translations.map((entry) => [entry.id, entry]));

if (data.selection.length !== 10) throw new Error(`Expected 10 words, found ${data.selection.length}`);

function h(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function jsonForHtml(value) {
  return JSON.stringify(value).replaceAll('<', '\\u003c');
}

const canonical = 'https://skald.mannamila.com/translations/greek-words/';
const title = 'Ten Greek words translators can’t agree on · Skald';
const description = 'The ten most interesting Greek words in the Odyssey — the ones every translator renders differently — with the actual choices of thirteen English translations, verified line by line.';

function translatorLabel(id) {
  const entry = translatorById.get(id);
  return entry ? `${entry.name} (${entry.year})` : id;
}

function renderingRows(word) {
  return word.renderings.map((r) => {
    const label = translatorLabel(r.translationId);
    if (r.omits) {
      return `<li class="gw-rendering gw-omits"><a href="/translations/analysis/${h(r.translationId)}/">${h(label)}</a><span class="gw-phrase">— ${h(r.note || 'sidesteps the word')}</span></li>`;
    }
    return `<li class="gw-rendering"><a href="/translations/analysis/${h(r.translationId)}/">${h(label)}</a><span class="gw-phrase">“${h(r.phrase)}”</span></li>`;
  }).join('\n     ');
}

function notableOther(word) {
  if (!word.notableOther?.length) return '';
  const items = word.notableOther.map((r) => `<li class="gw-rendering gw-other"><a href="/translations/analysis/${h(r.translationId)}/">${h(translatorLabel(r.translationId))}</a><span class="gw-phrase">“${h(r.phrase)}”</span></li>`).join('\n     ');
  return `<p class="gw-other-label">Beyond English</p><ul class="gw-renderings">${items}</ul>`;
}

function sourceLine(word) {
  const parts = word.sources.map((s) => {
    if (typeof s === 'string') return s;
    return s.loc ? `${s.ref} (${s.loc})` : s.ref;
  });
  return h(parts.join(' · '));
}

function slugFor(word) {
  return (word.anchorSlug || word.translit)
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function wordSection(word) {
  const slug = slugFor(word);
  return `<section class="gw-word" id="${h(slug)}" aria-labelledby="gw-h-${h(slug)}">
   <div class="gw-rank" aria-hidden="true">${word.rank}</div>
   <div class="gw-head">
    <h2 id="gw-h-${h(slug)}" class="greek-term gw-headword" lang="grc">${h(word.headword)}</h2>
    <span class="transliteration">${h(word.translit)}</span>
    <span class="gw-gloss">${h(word.gloss)}</span>
   </div>
   <blockquote class="greek-line gw-line" lang="grc">${h(word.flagship.greekLine)}</blockquote>
   <cite class="gw-cite">Odyssey ${h(word.flagship.location)}</cite>
   <p class="gw-narrative">${h(word.narrative)}</p>
   <p class="gw-renderings-label">How the English translations in Skald render it here</p>
   <ul class="gw-renderings">
     ${renderingRows(word)}
   </ul>
   ${notableOther(word)}
   <p class="gw-sources">Sources: ${sourceLine(word)}</p>
  </section>`;
}

const ldJson = jsonForHtml({
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'Ten Greek words translators can’t agree on',
  description,
  url: canonical,
  mainEntityOfPage: canonical,
  image: 'https://skald.mannamila.com/translations/assets/og.jpg',
  inLanguage: 'en',
  datePublished: '2026-08-31',
  dateModified: '2026-08-31',
  isBasedOn: 'https://skald.mannamila.com/translations/analysis/',
  author: { '@type': 'Organization', name: 'MannaMila', url: 'https://www.mannamila.com/' },
  publisher: { '@type': 'Organization', name: 'MannaMila', url: 'https://www.mannamila.com/' },
});

const storeUtm = 'utm_source=odyssey-translation-atlas&utm_medium=referral&utm_campaign=translations-2026&utm_content=greek-words';
const apple = 'https://apps.apple.com/app/id6790579937?ct=odyssey-translation-atlas--greek-words&mt=8';
const play = `https://play.google.com/store/apps/details?id=com.mannamila.skald&${storeUtm}&referrer=${encodeURIComponent(storeUtm)}`;

const page = `<!doctype html>
<html lang="en">
<head>
 <meta charset="utf-8">
 <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
 <title>${h(title)}</title>
 <meta name="description" content="${h(description)}">
 <link rel="canonical" href="${h(canonical)}">
 <meta name="theme-color" content="#f2e6cf">
 <meta property="og:title" content="${h(title)}">
 <meta property="og:description" content="${h(description)}">
 <meta property="og:type" content="article">
 <meta property="og:url" content="${h(canonical)}">
 <meta property="og:image" content="https://skald.mannamila.com/translations/assets/og.jpg">
 <meta property="og:image:width" content="1200">
 <meta property="og:image:height" content="630">
 <meta property="og:image:alt" content="The Skald Odyssey Translation Atlas arranged on a warm vellum-colored field.">
 <meta name="twitter:card" content="summary_large_image">
 <meta name="twitter:image" content="https://skald.mannamila.com/translations/assets/og.jpg">
 <link rel="stylesheet" href="../analysis/styles.css">
 <script type="application/ld+json">${ldJson}</script>
</head>
<body>
 <a class="skip-link" href="#main-content">Skip to content</a>
 <header class="site-header">
  <div class="bar">
   <a class="brand" href="/">SKALD</a>
   <span class="tag">Ten Greek words</span>
   <span class="spacer"></span>
   <a class="pill" href="/translations/analysis/">All analyses</a>
   <a class="pill" href="/translations/">Translation Atlas</a>
   <a class="pill" href="/translations/guide/">Reader’s guide</a>
  </div>
 </header>
 <main id="main-content">
  <p class="kicker">Where translation stops being transcription</p>
  <h1>Ten Greek words translators can’t agree on.</h1>
  <p class="lede">${h(data.lede)}</p>
  <aside class="method-note"><strong>How this list was made.</strong> ${h(data.method)}</aside>
  ${data.selection.map(wordSection).join('\n')}
  <section class="cta-panel" aria-labelledby="continue-heading">
   <div><h2 id="continue-heading">Read them in place.</h2><p>Skald shows every one of these words in its own line, beside the Greek and all twenty-four translations.</p></div>
   <div class="cta-links">
    <a class="pill" href="/translations/analysis/">Translation analyses</a>
    <a class="pill" href="${h(apple)}" target="_blank" rel="noreferrer">App Store</a>
    <a class="pill" href="${h(play)}" target="_blank" rel="noreferrer">Google Play</a>
   </div>
  </section>
  <script type="application/json" id="greek-words-data">${jsonForHtml(data)}</script>
 </main>
 <footer class="site-footer">
  <div class="footer-inner">
   <p>A <a href="/">Skald</a> research project by <a href="https://www.mannamila.com/">MannaMila</a>.</p>
   <nav class="footer-nav" aria-label="Footer">
    <a href="/translations/">Translation Atlas</a>
    <a href="/mosaic/">Art Atlas</a>
    <a href="/privacy/">Privacy</a>
    <a href="#main-content">Back to top ↑</a>
   </nav>
  </div>
 </footer>
</body>
</html>
`;

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'index.html'), page);
console.log(`Built translations/greek-words/ (${data.selection.length} words, ${data.selection.reduce((n, w) => n + w.renderings.length, 0)} renderings)`);
