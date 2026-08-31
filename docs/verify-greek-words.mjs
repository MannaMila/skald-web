#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const contentRoot = '/Volumes/Dev/Code/skald/core/src/main/assets/content/odyssey';
const pagePath = path.join(root, 'translations/greek-words/index.html');
const finalPath = path.join(here, 'analysis-reviews/greek-words-final.json');

const html = fs.readFileSync(pagePath, 'utf8');
const data = JSON.parse(fs.readFileSync(finalPath, 'utf8'));

const embeddedMatch = html.match(/<script type="application\/json" id="greek-words-data">([\s\S]*?)<\/script>/);
assert.ok(embeddedMatch, 'embedded data present');
assert.deepEqual(JSON.parse(embeddedMatch[1]), data, 'embedded data matches arbitered final.json');

const families = fs.readdirSync(contentRoot).filter((name) => name.startsWith('odyssey-'));
const familyByBook = new Map();
for (const family of families) {
  const greek = JSON.parse(fs.readFileSync(path.join(contentRoot, family, 'greek.json'), 'utf8'));
  familyByBook.set(Number(greek.book), { family, greekLines: new Map(greek.lines.map((l) => [Number(l.n), l.t])) });
}

const accentFold = (value) => value.normalize('NFD').toLowerCase().replaceAll('̀', '́').replaceAll('ς', 'σ').normalize('NFC');
const norm = (value) => value.normalize('NFC').replace(/\s+/g, ' ');

assert.equal(data.selection.length, 10, 'exactly ten words');
let renderingsChecked = 0;
let omissions = 0;

for (const word of data.selection) {
  const [bookRaw, lineRaw] = String(word.flagship.location).split('.');
  const book = Number(bookRaw);
  const line = Number(lineRaw);
  const entry = familyByBook.get(book);
  assert.ok(entry, `${word.headword}: book ${book} exists`);
  const greekLine = entry.greekLines.get(line);
  assert.ok(greekLine, `${word.headword}: Greek line ${word.flagship.location} exists`);
  assert.equal(norm(word.flagship.greekLine), norm(greekLine), `${word.headword}: quoted Greek line matches the corpus text verbatim`);
  const surface = word.flagship.surfaceForm;
  assert.ok(surface, `${word.headword}: flagship surfaceForm recorded`);
  assert.ok(accentFold(greekLine).includes(accentFold(surface)), `${word.headword}: flagship line contains its surface form`);
  const stripMarks = (value) => value.normalize('NFD').toLowerCase().replace(/\p{M}/gu, '').replaceAll('ς', 'σ');
  const headTokens = word.headword.split(/\s+/);
  const surfaceTokens = surface.split(/\s+/);
  assert.equal(surfaceTokens.length, headTokens.length, `${word.headword}: surface form token count matches headword`);
  headTokens.forEach((headToken, index) => {
    const a = stripMarks(headToken);
    const b = stripMarks(surfaceTokens[index]);
    let common = 0;
    while (common < a.length && common < b.length && a[common] === b[common]) common += 1;
    assert.ok(common >= 4, `${word.headword}: surface token ${surfaceTokens[index]} shares a stem with ${headToken}`);
  });

  for (const rendering of [...word.renderings, ...(word.notableOther ?? [])]) {
    const translationFile = rendering.translationId === 'murray' ? 'loeb.json' : `translation-${rendering.translationId}.json`;
    const translationPath = path.join(contentRoot, entry.family, translationFile);
    assert.ok(fs.existsSync(translationPath), `${word.headword}: translation ${rendering.translationId} exists`);
    if (rendering.omits) {
      omissions += 1;
      continue;
    }
    const translation = JSON.parse(fs.readFileSync(translationPath, 'utf8'));
    const chunks = translation.chunks.filter((chunk) => chunk.start <= line && line <= chunk.end);
    assert.ok(chunks.length > 0, `${word.headword}/${rendering.translationId}: a chunk covers line ${line}`);
    const textKey = ['en', 'text'].find((key) => chunks[0][key] != null) ?? 'en';
    const chunkText = norm(chunks.map((chunk) => String(chunk[textKey] ?? '')).join(' '));
    const window = norm(rendering.window ?? rendering.phrase);
    const phrase = norm(rendering.phrase);
    assert.ok(chunkText.toLowerCase().includes(window.toLowerCase()), `${word.headword}/${rendering.translationId}: window is verbatim in the chunk`);
    assert.ok(window.toLowerCase().includes(phrase.toLowerCase()), `${word.headword}/${rendering.translationId}: phrase is verbatim in the window`);
    assert.ok(html.includes(`href="/translations/analysis/${rendering.translationId}/"`), `${word.headword}/${rendering.translationId}: links to its analysis page`);
    renderingsChecked += 1;
  }
}

for (const jargon of ['>tokens<', 'type-token', 'modal candidate', 'n-gram', 'TTR']) {
  assert.ok(!html.includes(jargon), `no user-facing jargon (${jargon})`);
}

const sitemapPath = path.join(root, 'sitemap.xml');
const sitemap = fs.readFileSync(sitemapPath, 'utf8');
assert.ok(sitemap.includes('https://skald.mannamila.com/translations/greek-words/'), 'sitemap lists the page');

const analysisIndex = fs.readFileSync(path.join(root, 'translations/analysis/index.html'), 'utf8');
assert.ok(analysisIndex.includes('/translations/greek-words/'), 'analysis index links to the page');

console.log('PASS docs/verify-greek-words.mjs');
console.log(`Verified: 10 words, ${renderingsChecked} verbatim renderings, ${omissions} recorded omissions, Greek lines exact.`);
