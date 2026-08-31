#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const statsRoot = '/Volumes/Dev/Code/skald/docs/content/translation-stats';
const analysisRoot = path.join(root, 'translations/analysis');
const sourcePath = path.join(here, 'analysis-reviews/source.json');
const finalPath = path.join(here, 'analysis-reviews/final.json');
const statsIndexPath = path.join(statsRoot, 'index.json');
const atlasPath = path.join(root, 'translations/index.html');

const source = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
const finalReview = JSON.parse(fs.readFileSync(finalPath, 'utf8'));
const statsIndex = JSON.parse(fs.readFileSync(statsIndexPath, 'utf8'));

function extractAtlasData(html) {
  const marker = 'const DATA=';
  const start = html.indexOf(marker);
  if (start < 0) throw new Error('Atlas DATA marker not found');
  const jsonStart = start + marker.length;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = jsonStart; index < html.length; index += 1) {
    const char = html[index];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') inString = true;
    else if (char === '{') depth += 1;
    else if (char === '}' && --depth === 0) return JSON.parse(html.slice(jsonStart, index + 1));
  }
  throw new Error('Atlas DATA object did not terminate');
}

const atlas = extractAtlasData(fs.readFileSync(atlasPath, 'utf8'));
const atlasBySkaldId = new Map(
  atlas.translations.filter((record) => record.skald).map((record) => [record.skald, record]),
);
const sourceById = new Map(source.records.map((record) => [record.id, record]));
const finalById = new Map(finalReview.records.map((record) => [record.id, record]));

if (statsIndex.translations.length !== 24) throw new Error('Expected 24 translation statistics records');
if (finalReview.records.length !== 24) throw new Error('Expected 24 final narrative records');

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

function formatInteger(value) {
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function formatTtr(value) {
  return Number(value).toFixed(4);
}

function formatMean(value) {
  return Number(value).toFixed(2);
}

function median(values) {
  const ordered = [...values].sort((a, b) => a - b);
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2 ? ordered[middle] : (ordered[middle - 1] + ordered[middle]) / 2;
}

function transliterateGreek(value) {
  const map = {
    α: 'a', β: 'b', γ: 'g', δ: 'd', ε: 'e', ζ: 'z', η: 'ē', θ: 'th', ι: 'i',
    κ: 'k', λ: 'l', μ: 'm', ν: 'n', ξ: 'x', ο: 'o', π: 'p', ρ: 'r', σ: 's',
    ς: 's', τ: 't', υ: 'y', φ: 'ph', χ: 'ch', ψ: 'ps', ω: 'ō',
  };
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .split('')
    .map((char) => map[char] ?? char)
    .join('')
    .normalize('NFC');
}

const preferredTerms = new Set([
  'διοσ', 'πεπνυμενοσ', 'φιλοσ', 'τοξον', 'συβωτησ', 'αμυμονοσ', 'ενοσιχθων',
  'αιγιοχοιο', 'πολυμηχαν', 'αεθλον', 'κυδαλιμοιο', 'νεκυων', 'ταλασιφρονοσ',
  'ανακτι', 'αργειφοντησ', 'ιπποτα', 'μεγαλητορα', 'πυκινον', 'φαρμακον',
]);

function jaccardDistance(left, right) {
  const a = new Set(left);
  const b = new Set(right);
  const union = new Set([...a, ...b]);
  if (!union.size) return 0;
  let overlap = 0;
  for (const item of a) if (b.has(item)) overlap += 1;
  return 1 - overlap / union.size;
}

function chooseVariants(term) {
  const unique = [];
  const seenText = new Set();
  const seenLocation = new Set();
  for (const occurrence of term.occurrences) {
    const text = String(occurrence.text || '').replace(/\s+/g, ' ').trim();
    if (!text || text.length < 12 || seenText.has(text) || seenLocation.has(occurrence.location)) continue;
    seenText.add(text);
    seenLocation.add(occurrence.location);
    unique.push({ ...occurrence, text });
  }
  if (unique.length < 3) return [];
  unique.sort((a, b) => Number(b.sliced) - Number(a.sliced)
    || b.candidates.length - a.candidates.length
    || a.location.localeCompare(b.location));
  const modal = unique.find((item) => item.candidates.includes(term.modalCandidate));
  const chosen = [modal || unique[0]];
  while (chosen.length < 3) {
    const candidate = unique
      .filter((item) => !chosen.includes(item))
      .map((item) => ({
        item,
        distance: Math.min(...chosen.map((prior) => jaccardDistance(item.candidates, prior.candidates))),
      }))
      .sort((a, b) => b.distance - a.distance
        || Number(b.item.sliced) - Number(a.item.sliced)
        || b.item.candidates.length - a.item.candidates.length
        || a.item.location.localeCompare(b.item.location))[0]?.item;
    if (!candidate) break;
    chosen.push(candidate);
  }
  return chosen;
}

function chooseVariationCases(stats) {
  const score = (term) => {
    const preferred = preferredTerms.has(term.greek.folded) ? 5 : 0;
    const aligned = term.alignedOccurrences ? 1.5 : 0;
    const breadth = Math.min(term.distinctCandidateSets.length, 40) / 20;
    return preferred + aligned + Math.log1p(term.occurrenceCount) * (1 - term.stability) + breadth;
  };
  const eligible = stats.renderingVariation.terms
    .filter((term) => term.greek.folded.length >= 4)
    .filter((term) => term.occurrenceCount >= 4 && term.occurrenceCount <= 500)
    .map((term) => ({ term, variants: chooseVariants(term) }))
    .filter(({ variants }) => variants.length >= 3)
    .sort((a, b) => score(b.term) - score(a.term)
      || a.term.greek.folded.localeCompare(b.term.greek.folded));
  const preferred = eligible.filter(({ term }) => preferredTerms.has(term.greek.folded));
  const selected = [...preferred.slice(0, 5)];
  for (const candidate of eligible) {
    if (selected.length >= 5) break;
    if (!selected.includes(candidate)) selected.push(candidate);
  }
  if (selected.length < 4) throw new Error(`Only ${selected.length} variation cases available for ${stats.translation.id}`);
  return selected;
}

function comparisonSvg(record) {
  const metrics = [
    ['tokens', 'Tokens', formatInteger],
    ['uniqueForms', 'Unique forms', formatInteger],
    ['typeTokenRatio', 'Type-token ratio', formatTtr],
    ['meanSentenceLength', 'Mean sentence length', formatMean],
  ];
  const rows = metrics.map(([key, label, formatter], index) => {
    const current = record.headline[key];
    const peerMedian = median(record.peers.map((peer) => peer.headline[key]));
    const scale = Math.max(current, peerMedian) || 1;
    const currentWidth = Math.round((current / scale) * 370);
    const peerWidth = Math.round((peerMedian / scale) * 370);
    const y = 58 + index * 48;
    return `<text x="0" y="${y + 7}" fill="#2a2118" font-size="13">${h(label)}</text>
      <rect x="150" y="${y - 8}" width="${currentWidth}" height="12" rx="2" fill="#9e5725"/>
      <rect x="150" y="${y + 8}" width="${peerWidth}" height="8" rx="2" fill="#c69260"/>
      <text x="535" y="${y + 2}" fill="#2a2118" font-size="12">${h(formatter(current))}</text>
      <text x="535" y="${y + 17}" fill="#6f6150" font-size="10">median ${h(formatter(peerMedian))}</text>`;
  }).join('\n');
  return `<div class="viz-card">
   <svg viewBox="0 0 700 250" role="img" aria-labelledby="viz-title viz-desc">
    <title id="viz-title">${h(record.name)} compared with ${h(record.comparisonBasis)}</title>
    <desc id="viz-desc">Copper bars show this translation; pale bars show the peer median for four surface-form metrics.</desc>
    <rect x="0" y="0" width="12" height="12" rx="2" fill="#9e5725"/><text x="19" y="10" fill="#2a2118" font-size="11">${h(record.name)}</text>
    <rect x="150" y="0" width="12" height="8" rx="2" fill="#c69260"/><text x="169" y="9" fill="#6f6150" font-size="11">Peer median</text>
    ${rows}
   </svg>
   <p class="viz-note">Comparison basis: ${h(record.comparisonBasis)} (${record.peers.length} peers). Each metric has its own scale. Cross-language style-group values are descriptive only.</p>
  </div>`;
}

function header(tag, overview = false) {
  return `<a class="skip-link" href="#main-content">Skip to content</a>
 <header class="site-header">
  <div class="bar">
   <a class="brand" href="/">SKALD</a>
   <span class="tag">${h(tag)}</span>
   <span class="spacer"></span>
   ${overview ? '' : '<a class="pill" href="/translations/analysis/">All analyses</a>'}
   <a class="pill" href="/translations/">Translation Atlas</a>
   <a class="pill" href="/translations/guide/">Reader’s guide</a>
  </div>
 </header>`;
}

function footer() {
  return `<footer class="site-footer">
  <div class="footer-inner">
   <p>A <a href="/">Skald</a> research project by <a href="https://www.mannamila.com/">MannaMila</a>.</p>
   <nav class="footer-nav" aria-label="Footer">
    <a href="/translations/">Translation Atlas</a>
    <a href="/mosaic/">Art Atlas</a>
    <a href="/privacy/">Privacy</a>
    <a href="#main-content">Back to top ↑</a>
   </nav>
  </div>
 </footer>`;
}

function ldJson({ title, description, url }) {
  return jsonForHtml({
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description,
    url,
    mainEntityOfPage: url,
    image: 'https://skald.mannamila.com/translations/assets/og.jpg',
    inLanguage: 'en',
    datePublished: '2026-08-30',
    dateModified: '2026-08-30',
    isBasedOn: 'https://skald.mannamila.com/translations/',
    author: { '@type': 'Organization', name: 'MannaMila', url: 'https://www.mannamila.com/' },
    publisher: { '@type': 'Organization', name: 'MannaMila', url: 'https://www.mannamila.com/' },
  });
}

function documentHead({ title, description, canonical, stylesheet }) {
  return `<!doctype html>
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
 <link rel="stylesheet" href="${h(stylesheet)}">
 <script type="application/ld+json">${ldJson({ title, description, url: canonical })}</script>
</head>`;
}

function buildOverview(records) {
  const title = 'Deep analysis of 24 Odyssey translations · Skald';
  const description = 'Surface-form corpus statistics, recurring formulas, and line-aligned rendering variation for the 24 historical Odyssey translations in Skald.';
  const rows = records.map(({ entry, stats, atlasRecord }) => `<tr data-analysis-id="${h(entry.id)}">
    <td><a class="translation-link" href="./${h(entry.id)}/">${h(entry.translator)}</a></td>
    <td>${h(atlasRecord.year)}</td>
    <td>${h(atlasRecord.lang)}</td>
    <td data-tokens="${stats.basics.tokens}">${formatInteger(stats.basics.tokens)}</td>
    <td data-ttr="${stats.basics.typeTokenRatio}">${formatTtr(stats.basics.typeTokenRatio)}</td>
    <td>“${h(stats.formulas[0].phrase)}” (${formatInteger(stats.formulas[0].count)}×)</td>
   </tr>`).join('\n');
  return `${documentHead({
    title,
    description,
    canonical: 'https://skald.mannamila.com/translations/analysis/',
    stylesheet: './styles.css',
  })}
<body>
 ${header('Translation analysis', true)}
 <main id="main-content">
  <p class="kicker">The Odyssey, measured without mistaking measurement for judgment</p>
  <h1>Twenty-four translations, seen from the surface.</h1>
  <p class="lede">This analysis counts the visible forms in every bundled translation and looks for recurring three-to-six-word formulas. It also places the same Greek surface forms beside aligned or estimated line windows, making changes in the surrounding wording visible without pretending that an automated window is a word-for-word alignment.</p>
  <aside class="method-note"><strong>Method boundary.</strong> Tokens are Unicode letter-and-mark runs, lowercased without stemming or lemmatization. TTR is unique surface forms divided by tokens; sentence length uses a punctuation split. “Formula” means a recurring chunk-local n-gram, not necessarily an oral formula. Rendering candidates are context words, not asserted translations. Cross-language totals are descriptive because tokenization and inflection differ.</aside>
  <section class="section-block" aria-labelledby="translations-heading">
   <p class="section-label">The corpus</p>
   <h2 id="translations-heading">All 24 Skald translations</h2>
   <div class="table-wrap">
    <table>
     <thead><tr><th>Translation</th><th>Year</th><th>Language</th><th>Tokens</th><th>TTR</th><th>Top ranked formula</th></tr></thead>
     <tbody>${rows}</tbody>
    </table>
   </div>
  </section>
 </main>
 ${footer()}
</body>
</html>
`;
}

function buildDetail({ entry, stats, atlasRecord, sourceRecord, finalRecord }) {
  const canonical = `https://skald.mannamila.com/translations/analysis/${entry.id}/`;
  const title = `${entry.translator}: Odyssey translation analysis · Skald`;
  const description = `Corpus statistics, recurring formulas, Greek rendering variation, and a peer comparison for ${entry.translator}’s Odyssey.`;
  const formulaItems = stats.formulas.slice(0, 10).map((formula) => `<li class="formula-item" data-formula-count="${formula.count}">
    <span class="formula-phrase">“${h(formula.phrase)}”</span>
    <span class="formula-meta">${formatInteger(formula.count)} occurrences · Od. ${h(formula.locations.slice(0, 2).join(' and '))}</span>
   </li>`).join('\n');
  const variationCases = chooseVariationCases(stats);
  const variationItems = variationCases.map(({ term, variants }) => `<article class="variation-card" data-variation-case="${h(term.greek.folded)}" data-stability="${term.stability}">
    <div class="term-heading">
     <h3 class="greek-term" lang="grc">${h(term.greek.surface)}</h3>
     <span class="transliteration">${h(transliterateGreek(term.greek.surface))}</span>
     <span class="stability">stability ${(term.stability * 100).toFixed(1)}%</span>
    </div>
    <ul class="variants">
     ${variants.map((variant) => `<li class="variant"><blockquote lang="${h(entry.language)}">${h(variant.text)}</blockquote><cite>Od. ${h(variant.location)} · candidate context: ${h(variant.candidates.slice(0, 4).join(', ') || 'none after stoplist')}</cite></li>`).join('\n     ')}
    </ul>
   </article>`).join('\n');
  const claimData = {
    id: entry.id,
    atlasId: atlasRecord.id,
    headline: finalRecord.headline,
    numericClaims: finalRecord.numericClaims,
  };
  const storeContent = atlasRecord.id;
  const storeUtm = `utm_source=odyssey-translation-atlas&utm_medium=referral&utm_campaign=translations-2026&utm_content=${encodeURIComponent(storeContent)}`;
  const apple = `https://apps.apple.com/app/id6790579937?ct=${encodeURIComponent(`odyssey-translation-atlas--${storeContent}`)}&mt=8`;
  const play = `https://play.google.com/store/apps/details?id=com.mannamila.skald&${storeUtm}&referrer=${encodeURIComponent(storeUtm)}`;
  return `${documentHead({ title, description, canonical, stylesheet: '../styles.css' })}
<body>
 ${header(`${entry.name} · ${entry.year}`)}
 <main id="main-content">
  <p class="kicker">${h(atlasRecord.lang)} · ${h(atlasRecord.form)}${atlasRecord.meter ? ` · ${h(atlasRecord.meter)}` : ''}</p>
  <h1>${h(entry.translator)}</h1>
  <p class="lede">A surface-form portrait of this <em>Odyssey</em>: corpus scale, recurring wording, line-window variation around Greek forms, and a comparison with ${h(sourceRecord.comparisonBasis)}.</p>
  <p class="meta-line">Atlas edition year: ${h(atlasRecord.year)} · Statistics corpus year: ${h(entry.year)} · All 24 books</p>
  <div class="stats-grid" aria-label="Headline corpus statistics">
   <div class="stat"><strong data-claim-tokens="${stats.basics.tokens}">${formatInteger(stats.basics.tokens)}</strong><span>tokens</span></div>
   <div class="stat"><strong data-claim-unique-forms="${stats.basics.uniqueForms}">${formatInteger(stats.basics.uniqueForms)}</strong><span>unique forms</span></div>
   <div class="stat"><strong data-claim-ttr="${stats.basics.typeTokenRatio}">${formatTtr(stats.basics.typeTokenRatio)}</strong><span>type-token ratio</span></div>
   <div class="stat"><strong data-claim-mean-sentence="${stats.basics.meanSentenceLength}">${formatMean(stats.basics.meanSentenceLength)}</strong><span>mean sentence length</span></div>
  </div>
  ${comparisonSvg(sourceRecord)}
  <aside class="method-note"><strong>Read the bars cautiously.</strong> These are surface-form statistics. A higher TTR can reflect morphology, orthography, or corpus conventions as well as vocabulary; the sentence figure comes from a simple punctuation split. The chart describes this corpus and its declared peers, not translation quality.</aside>

  <section class="section-block" aria-labelledby="formulas-heading">
   <p class="section-label">Repeated wording</p>
   <h2 id="formulas-heading">The translator’s formulas</h2>
   <p>The ten highest-ranked chunk-local three-to-six-word n-grams, ordered by the source method’s count-times-length score. Overlapping phrases can describe the same recurring line.</p>
   <ol class="formula-list">${formulaItems}</ol>
  </section>

  <section class="section-block" aria-labelledby="variation-heading">
   <p class="section-label">Line-window evidence</p>
   <h2 id="variation-heading">One Greek word, many choices</h2>
   <p>Each card follows one Greek surface form into three visibly different passages in this translation. Exact sidecars are used where available; otherwise the source uses a proportional line window. The quoted text is real corpus text, but the candidate context words are heuristic—not word alignments or claims that one listed word translates the Greek.</p>
   <div class="variation-grid">${variationItems}</div>
   <aside class="method-note"><strong>Stability is narrow by design.</strong> It is the share of Greek occurrences whose line window contains the modal candidate context token. It does not measure semantic consistency, freedom, fidelity, or quality.</aside>
  </section>

  <section class="section-block" aria-labelledby="siblings-heading">
   <p class="section-label">Statistical comparison</p>
   <h2 id="siblings-heading">Against its siblings</h2>
   <p class="narrative" data-final-narrative>${h(finalRecord.narrative)}</p>
  </section>

  <section class="cta-panel" aria-labelledby="continue-heading">
   <div><h2 id="continue-heading">Keep the edition in context.</h2><p>Open its full atlas record, or read it beside the Greek and the other bundled translations in Skald.</p></div>
   <div class="cta-links">
    <a class="pill" href="/translations/#${h(atlasRecord.id)}">Atlas record</a>
    <a class="pill" href="${h(apple)}" target="_blank" rel="noreferrer">App Store</a>
    <a class="pill" href="${h(play)}" target="_blank" rel="noreferrer">Google Play</a>
   </div>
  </section>
  <script type="application/json" id="analysis-claim-data">${jsonForHtml(claimData)}</script>
 </main>
 ${footer()}
</body>
</html>
`;
}

const records = statsIndex.translations.map((entry) => {
  const stats = JSON.parse(fs.readFileSync(path.join(statsRoot, entry.output), 'utf8'));
  const atlasRecord = atlasBySkaldId.get(entry.id);
  const sourceRecord = sourceById.get(entry.id);
  const finalRecord = finalById.get(entry.id);
  if (!atlasRecord || !sourceRecord || !finalRecord) throw new Error(`Incomplete joined record for ${entry.id}`);
  return { entry, stats, atlasRecord, sourceRecord, finalRecord };
});

fs.mkdirSync(analysisRoot, { recursive: true });
fs.writeFileSync(path.join(analysisRoot, 'index.html'), buildOverview(records));
for (const record of records) {
  const outputDir = path.join(analysisRoot, record.entry.id);
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(path.join(outputDir, 'index.html'), buildDetail(record));
}
console.log(`Built overview and ${records.length} detail pages in ${path.relative(root, analysisRoot)}`);
