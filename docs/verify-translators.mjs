#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const biosRoot = '/Volumes/Dev/Code/skald-ux/docs/content/translator-bios';

const html = fs.readFileSync(path.join(root, 'translators/index.html'), 'utf8');
const dataMatch = html.match(/<script type="application\/json" id="translators-data">([\s\S]*?)<\/script>/);
assert.ok(dataMatch, 'embedded data present');
const { translators } = JSON.parse(dataMatch[1]);
assert.equal(translators.length, 24, 'exactly 24 translators');

let excerptsChecked = 0;
let withPortrait = 0;
for (const t of translators) {
  const bio = JSON.parse(fs.readFileSync(path.join(biosRoot, `${t.id}.json`), 'utf8'));
  const corpusText = JSON.stringify(bio);
  for (const excerpt of [t.identity, t.homerPath, t.reception, ...t.facts].filter(Boolean)) {
    assert.ok(corpusText.includes(JSON.stringify(excerpt).slice(1, -1)), `${t.id}: excerpt is verbatim from the reviewed corpus: ${excerpt.slice(0, 60)}`);
    excerptsChecked += 1;
  }
  for (const image of t.image) {
    assert.ok(fs.existsSync(path.join(root, 'translators', image)), `${t.id}: portrait file exists (${image})`);
    withPortrait += t.image.indexOf(image) === 0 ? 1 : 0;
  }
  if (t.image.length) {
    assert.ok(t.attribution, `${t.id}: portrait has attribution`);
    assert.ok(t.pdBasis, `${t.id}: portrait has a recorded PD basis`);
  }
  assert.ok(fs.existsSync(path.join(root, 'translations/analysis', t.id, 'index.html')), `${t.id}: analysis target exists`);
  const analysisHtml = fs.readFileSync(path.join(root, 'translations/analysis', t.id, 'index.html'), 'utf8');
  assert.ok(analysisHtml.includes(`href="/translators/#${t.id}"`), `${t.id}: analysis page links back to the biography`);
}
assert.ok(['tchernichovsky', 'lagerlof'].every((id) => translators.find((t) => t.id === id).image.length === 0),
  'US-PD-flagged portraits are not shipped');

const atlasHtml = fs.readFileSync(path.join(root, 'translations/index.html'), 'utf8');
assert.equal((atlasHtml.match(/Skald translator biography/g) || []).length >= 24, true, 'atlas records carry biography links');
assert.ok(atlasHtml.includes('Translator biography</a>'), 'atlas modal renders the biography pill');

assert.ok(html.includes('G-K0V3J9TLBF'), 'GA tag present');
for (const event of ['translator_open', 'translator_analysis_click', 'translator_atlas_click', 'store_click']) {
  assert.ok(html.includes(event), `GA event wired: ${event}`);
}

const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
assert.ok(sitemap.includes('https://skald.mannamila.com/translators/'), 'sitemap lists the page');

console.log('PASS docs/verify-translators.mjs');
console.log(`Verified: 24 translators, ${withPortrait} portraits (files+attribution+PD basis), ${excerptsChecked} verbatim corpus excerpts, bidirectional links, GA events.`);
