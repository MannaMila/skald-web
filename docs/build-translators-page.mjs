#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
// Corpus lives on the content branch until the big content PR merges; repoint to the
// main checkout (/Volumes/Dev/Code/skald) afterwards.
const biosRoot = '/Volumes/Dev/Code/skald-ux/docs/content/translator-bios';
const statsIndexPath = '/Volumes/Dev/Code/skald/docs/content/translation-stats/index.json';
const outDir = path.join(root, 'translators');

const statsIndex = JSON.parse(fs.readFileSync(statsIndexPath, 'utf8'));
const order = statsIndex.translations.map((entry) => entry.id);
const entryById = new Map(statsIndex.translations.map((entry) => [entry.id, entry]));

const PORTRAIT_BLOCKED = new Set(['tchernichovsky', 'lagerlof']); // US-PD flags unresolved

function firstSentence(text) {
  if (!text) return '';
  const match = String(text).match(/^.*?[.!?](?=\s|$)/s);
  return (match ? match[0] : String(text)).trim();
}

const translators = order.map((id) => {
  const bio = JSON.parse(fs.readFileSync(path.join(biosRoot, `${id}.json`), 'utf8'));
  const portrait = bio.portrait || {};
  const hasImage = portrait.status === 'found' && !PORTRAIT_BLOCKED.has(id)
    && fs.existsSync(path.join(outDir, 'assets', `${id === 'butcher-lang' ? 'butcher-lang-0' : id}.jpg`));
  const facts = (bio.facts || []).filter((fact) => fact.certainty === 'attested').slice(0, 3)
    .map((fact) => fact.text);
  const attributionOf = (p) => [p.creator, p.imageDate, p.sourceCollection].filter(Boolean).join(' · ');
  const attribution = portrait.status !== 'found' ? null
    : Array.isArray(portrait.portraits)
      ? portrait.portraits.map((p) => `${p.subject}: ${attributionOf(p)}`).join(' — ')
      : attributionOf(portrait);
  const pdBasis = Array.isArray(portrait.portraits)
    ? portrait.portraits.map((p) => p.pdBasis).filter(Boolean).join(' — ')
    : portrait.pdBasis || null;
  return {
    id,
    name: bio.name,
    lived: bio.lived,
    nationality: bio.nationality,
    language: entryById.get(id).language ?? entryById.get(id).lang ?? '',
    year: entryById.get(id).year,
    identity: firstSentence(Array.isArray(bio.otherWork) ? bio.otherWork[0] : bio.otherWork),
    homerPath: firstSentence(bio.homerPath),
    reception: firstSentence(bio.reception),
    facts,
    image: hasImage ? (id === 'butcher-lang' ? ['assets/butcher-lang-0.jpg', 'assets/butcher-lang-1.jpg'] : [`assets/${id}.jpg`]) : [],
    attribution,
    pdBasis,
    analysisUrl: `/translations/analysis/${id}/`,
    atlasId: null,
  };
});

// Atlas ids for the record links.
const atlasHtml = fs.readFileSync(path.join(root, 'translations/index.html'), 'utf8');
const marker = 'const DATA=';
const start = atlasHtml.indexOf(marker) + marker.length;
let depth = 0; let inString = false; let escaped = false; let end = -1;
for (let index = start; index < atlasHtml.length; index += 1) {
  const char = atlasHtml[index];
  if (inString) { if (escaped) escaped = false; else if (char === '\\') escaped = true; else if (char === '"') inString = false; continue; }
  if (char === '"') inString = true;
  else if (char === '{') depth += 1;
  else if (char === '}' && --depth === 0) { end = index + 1; break; }
}
const atlas = JSON.parse(atlasHtml.slice(start, end));
for (const record of atlas.translations) {
  if (record.skald && entryById.has(record.skald)) {
    translators.find((t) => t.id === record.skald).atlasId = record.id;
  }
}
for (const t of translators) {
  if (!t.atlasId) throw new Error(`No atlas record for ${t.id}`);
  if (!t.name || !t.lived) throw new Error(`Bio for ${t.id} missing name/lived`);
}

function h(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}
const jsonForHtml = (value) => JSON.stringify(value).replaceAll('<', '\\u003c');

const canonical = 'https://skald.mannamila.com/translators/';
const title = 'The Translators · Skald';
const description = 'Portrait gallery of the twenty-four Odyssey translators in Skald — lives, paths to Homer, and how each translation came to be, with public-domain portraits.';
const storeUtm = 'utm_source=odyssey-translators&utm_medium=referral&utm_campaign=translations-2026';
const apple = 'https://apps.apple.com/app/id6790579937?ct=odyssey-translators&mt=8';
const play = `https://play.google.com/store/apps/details?id=com.mannamila.skald&${storeUtm}&referrer=${encodeURIComponent(storeUtm)}`;

const withImages = translators.filter((t) => t.image.length).length;

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
 <meta property="og:type" content="website">
 <meta property="og:url" content="${h(canonical)}">
 <meta property="og:image" content="https://skald.mannamila.com/translations/assets/og.jpg">
 <meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
 <meta property="og:image:alt" content="The Skald Odyssey Translation Atlas arranged on a warm vellum-colored field.">
 <meta name="twitter:card" content="summary_large_image">
 <meta name="twitter:image" content="https://skald.mannamila.com/translations/assets/og.jpg">
 <link rel="stylesheet" href="../translations/analysis/styles.css">
 <script type="application/ld+json">${jsonForHtml({
    '@context': 'https://schema.org', '@type': 'CollectionPage',
    headline: 'The Translators', description, url: canonical, mainEntityOfPage: canonical,
    inLanguage: 'en', datePublished: '2026-09-01', dateModified: '2026-09-01',
    isBasedOn: 'https://skald.mannamila.com/translations/',
    author: { '@type': 'Organization', name: 'MannaMila', url: 'https://www.mannamila.com/' },
    publisher: { '@type': 'Organization', name: 'MannaMila', url: 'https://www.mannamila.com/' },
  })}</script>
 <style>
  .tr-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:22px 18px;margin-top:28px}
  .tr-card{border:none;background:none;padding:0;text-align:left;cursor:pointer;font:inherit;color:inherit}
  .tr-card:focus-visible{outline:3px solid var(--copper-pale);outline-offset:4px}
  .tr-frame{position:relative;aspect-ratio:3/4;overflow:hidden;border:1px solid rgba(158,87,37,.35);background:rgba(242,230,207,.5);box-shadow:0 1px 0 rgba(42,33,24,.12)}
  .tr-frame img{width:100%;height:100%;object-fit:cover;object-position:top;filter:sepia(.18) contrast(1.02);transition:transform .35s ease}
  .tr-card:hover .tr-frame img{transform:scale(1.035)}
  .tr-plaque{display:flex;align-items:center;justify-content:center;width:100%;height:100%;font:600 44px/1 var(--serif);color:var(--copper-dark);letter-spacing:.04em}
  .tr-plaque span{border:1px solid var(--copper-pale);padding:18px 22px}
  .tr-name{margin:10px 0 0;font:600 15px/1.3 var(--serif);color:var(--ink)}
  .tr-meta{margin:2px 0 0;color:var(--ink-soft);font-size:11.5px}
  .tr-modal[hidden]{display:none}
  .tr-modal{position:fixed;inset:0;z-index:60;display:flex;align-items:center;justify-content:center;padding:20px}
  .tr-scrim{position:absolute;inset:0;background:rgba(42,33,24,.55)}
  .tr-dialog{position:relative;max-width:680px;width:100%;max-height:86vh;overflow:auto;background:var(--vellum,#f2e6cf);border:1px solid rgba(158,87,37,.4);padding:26px 28px;box-shadow:0 18px 60px rgba(42,33,24,.35)}
  .tr-dialog .greek-term{font-size:26px}
  .tr-close{position:absolute;top:10px;right:12px;border:none;background:none;font-size:22px;color:var(--ink-soft);cursor:pointer;padding:6px}
  .tr-portrait{float:right;width:38%;max-width:220px;margin:0 0 12px 16px;border:1px solid rgba(158,87,37,.35)}
  .tr-portrait img{width:100%;display:block;filter:sepia(.14)}
  .tr-portrait figcaption{padding:5px 7px;color:var(--ink-soft);font-size:10px;line-height:1.45}
  .tr-fact{margin:10px 0 0;padding-left:14px;border-left:2px solid var(--copper-pale);font-size:13.5px;line-height:1.55}
  .tr-links{display:flex;gap:10px;flex-wrap:wrap;margin-top:18px}
  .tr-life{color:var(--ink-soft);font-size:13px;margin:2px 0 12px}
  @media (max-width:560px){.tr-portrait{float:none;width:100%;max-width:none;margin:0 0 14px}}
 </style>
</head>
<body>
 <a class="skip-link" href="#main-content">Skip to content</a>
 <header class="site-header">
  <div class="bar">
   <a class="brand" href="/">SKALD</a>
   <span class="tag">The Translators</span>
   <span class="spacer"></span>
   <a class="pill" href="${h(apple)}" target="_blank" rel="noreferrer" data-store="appstore">App Store</a>
   <a class="pill" href="${h(play)}" target="_blank" rel="noreferrer" data-store="play">Google Play</a>
   <a class="pill" href="/translations/">Translation Atlas</a>
  </div>
 </header>
 <main id="main-content">
  <p class="kicker">Twenty-four translations, one poem</p>
  <h1>The Translators.</h1>
  <p class="lede">Behind each Odyssey in Skald is a translator — or, in two cases, a collaboration. Open a card to meet them, see how they came to Homer, and learn what their version brings to the poem. Nineteen of the twenty-four cards show portraits with a recorded public-domain basis; five use plaques: three because no locatable public-domain portrait was found, and two because U.S. public-domain status remains unconfirmed.</p>
  <div class="tr-grid" id="tr-grid"></div>
  <section class="cta-panel" aria-labelledby="continue-heading" style="margin-top:44px">
   <div><h2 id="continue-heading">Read them side by side.</h2><p>Skald lets you read all twenty-four translations beside the Greek, with the voyage map, the fleet, a glossary, and museum art along the way.</p></div>
   <div class="cta-links">
    <a class="pill" href="${h(apple)}" target="_blank" rel="noreferrer" data-store="appstore">App Store</a>
    <a class="pill" href="${h(play)}" target="_blank" rel="noreferrer" data-store="play">Google Play</a>
    <a class="pill" href="/translations/analysis/">Deep analyses</a>
   </div>
  </section>
  <aside class="method-note" style="margin-top:26px"><strong>Sources and rights.</strong> Biographical highlights are drawn from Skald's reviewed translator research. For every portrait shown, the card records its source or collection, creator and date when known, and the stated rights basis. Nineteen portraits are shown; three translators have no locatable public-domain portrait, and two additional portraits are withheld pending confirmation of U.S. public-domain status. These five cards use plaques.</aside>
 </main>
 <div class="tr-modal" id="tr-modal" hidden>
  <div class="tr-scrim" data-close></div>
  <div class="tr-dialog" role="dialog" aria-modal="true" aria-labelledby="tr-modal-name">
   <button class="tr-close" data-close aria-label="Close">✕</button>
   <div id="tr-modal-body"></div>
  </div>
 </div>
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
 <script type="application/json" id="translators-data">${jsonForHtml({ translators })}</script>
 <script>
 const GA_ID="G-K0V3J9TLBF";
 window.dataLayer=window.dataLayer||[];
 function gtag(){dataLayer.push(arguments)}
 /* Analytics: same consent-mode pattern as the atlases. */
 if(navigator.globalPrivacyControl||(navigator.doNotTrack==="1")){
  gtag('consent','default',{analytics_storage:'denied',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
 }else{
  gtag('consent','default',{analytics_storage:'granted',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
 }
 gtag('js',new Date());
 gtag('config',GA_ID,{page_title:'Skald Translators',cookie_prefix:'skm'});
 function track(name,params){if(GA_ID)gtag('event',name,params)}
 const DATA=JSON.parse(document.getElementById('translators-data').textContent);
 const esc=s=>String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
 const grid=document.getElementById('tr-grid');
 const initials=n=>n.split(/\\s+/).filter(Boolean).map(w=>w[0]).slice(0,3).join('');
 grid.innerHTML=DATA.translators.map(t=>\`<button class="tr-card" data-id="\${esc(t.id)}" aria-haspopup="dialog">
  <div class="tr-frame">\${t.image.length?\`<img loading="lazy" src="\${esc(t.image[0])}" alt="Portrait of \${esc(t.name)}">\`:\`<div class="tr-plaque" role="img" aria-label="No portrait available for \${esc(t.name)}"><span>\${esc(initials(t.name))}</span></div>\`}</div>
  <p class="tr-name">\${esc(t.name)}</p>
  <p class="tr-meta">\${esc(t.lived)} · \${esc(t.language)} · \${esc(t.year)}</p>
 </button>\`).join('');
 const modal=document.getElementById('tr-modal');
 const body=document.getElementById('tr-modal-body');
 let lastFocus=null;
 function openModal(t){
  lastFocus=document.activeElement;
  body.innerHTML=\`<h2 class="greek-term" id="tr-modal-name">\${esc(t.name)}</h2>
   <p class="tr-life">\${esc(t.lived)}\${t.nationality?\` · \${esc(t.nationality)}\`:''}</p>
   \${t.image.length?\`<figure class="tr-portrait"><img src="\${esc(t.image[0])}" alt="Portrait of \${esc(t.name)}">\${t.attribution?\`<figcaption>\${esc(t.attribution)}\${t.pdBasis?\` — \${esc(t.pdBasis)}\`:''}</figcaption>\`:''}</figure>\`:''}
   \${t.identity?\`<p style="font-size:14px;line-height:1.6">\${esc(t.identity)}</p>\`:''}
   \${t.homerPath?\`<p style="font-size:13.5px;line-height:1.6;margin-top:10px">\${esc(t.homerPath)}</p>\`:''}
   \${t.facts.map(f=>\`<p class="tr-fact">\${esc(f)}</p>\`).join('')}
   \${t.reception?\`<p style="font-size:13.5px;line-height:1.6;margin-top:12px;color:var(--ink-soft)">\${esc(t.reception)}</p>\`:''}
   <div class="tr-links">
    <a class="pill" href="\${esc(t.analysisUrl)}" data-track="translator_analysis_click">Deep analysis</a>
    <a class="pill" href="/translations/#\${esc(t.atlasId)}" data-track="translator_atlas_click">Atlas record</a>
   </div>\`;
  modal.hidden=false;
  document.body.style.overflow='hidden';
  modal.querySelector('.tr-close').focus();
  track('translator_open',{translator:t.id});
  body.querySelectorAll('[data-track]').forEach(a=>a.addEventListener('click',()=>track(a.dataset.track,{translator:t.id})));
 }
 function closeModal(){modal.hidden=true;document.body.style.overflow='';if(lastFocus)lastFocus.focus()}
 grid.addEventListener('click',e=>{const c=e.target.closest('.tr-card');if(!c)return;const t=DATA.translators.find(x=>x.id===c.dataset.id);if(t)openModal(t)});
 modal.addEventListener('click',e=>{if(e.target.closest('[data-close]'))closeModal()});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!modal.hidden)closeModal()});
 document.querySelectorAll('[data-store]').forEach(a=>a.addEventListener('click',()=>track('store_click',{store:a.dataset.store,placement:'translators'})));
 if(location.hash){const t=DATA.translators.find(x=>x.id===location.hash.slice(1));if(t)openModal(t)}
 </script>
</body>
</html>
`;

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'index.html'), page);
console.log(`Built translators/ (${translators.length} translators, ${withImages} with portraits)`);
