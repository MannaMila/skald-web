#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const analysisRoot = path.join(root, 'translations/analysis');
const statsRoot = '/Volumes/Dev/Code/skald/docs/content/translation-stats';
const statsIndex = JSON.parse(fs.readFileSync(path.join(statsRoot, 'index.json'), 'utf8'));
const finalReview = JSON.parse(fs.readFileSync(path.join(here, 'analysis-reviews/final.json'), 'utf8'));
const atlasPath = path.join(root, 'translations/index.html');
const sitemapPath = path.join(root, 'sitemap.xml');
const deepAnalysisHost = 'Skald deep analysis';

function locateData(html) {
  const marker = 'const DATA=';
  const markerStart = html.indexOf(marker);
  assert.notEqual(markerStart, -1, 'Atlas DATA marker is present');
  const jsonStart = markerStart + marker.length;
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
    else if (char === '}' && --depth === 0) return { jsonStart, jsonEnd: index + 1 };
  }
  throw new Error('Atlas DATA object did not terminate');
}

function extractClaimData(html, id) {
  const match = html.match(/<script type="application\/json" id="analysis-claim-data">(.*?)<\/script>/s);
  assert.ok(match, `${id}: embedded claim JSON exists`);
  return JSON.parse(match[1]);
}

function countMatches(value, pattern) {
  return [...value.matchAll(pattern)].length;
}

const atlasHtml = fs.readFileSync(atlasPath, 'utf8');
const atlasRange = locateData(atlasHtml);
const atlas = JSON.parse(atlasHtml.slice(atlasRange.jsonStart, atlasRange.jsonEnd));
assert.equal(atlas.translations.length, 233, 'Atlas record count remains 233');
assert.equal(statsIndex.translations.length, 24, 'Stats index contains 24 translations');
assert.equal(finalReview.records.length, 24, 'Final review contains 24 records');

const truthySkald = atlas.translations.filter((record) => record.skald);
const skaldOriginals = truthySkald.filter((record) => record.original);
const skaldTranslations = truthySkald.filter((record) => !record.original);
assert.equal(truthySkald.length, 25, 'Atlas has 24 translations plus the Greek original marked for Skald');
assert.equal(skaldOriginals.length, 1, 'Atlas has one truthy-skald original');
assert.equal(skaldTranslations.length, 24, 'Atlas has 24 truthy-skald translated editions');

const expectedIds = statsIndex.translations.map((entry) => entry.id);
assert.deepEqual(finalReview.records.map((record) => record.id), expectedIds, 'Final review order matches stats index');

const pagePaths = [path.join(analysisRoot, 'index.html')];
for (const id of expectedIds) pagePaths.push(path.join(analysisRoot, id, 'index.html'));
for (const pagePath of pagePaths) assert.ok(fs.existsSync(pagePath), `Page exists: ${path.relative(root, pagePath)}`);
assert.equal(pagePaths.length, 25, 'Overview plus 24 detail pages exist');

const overviewHtml = fs.readFileSync(path.join(analysisRoot, 'index.html'), 'utf8');
assert.equal(countMatches(overviewHtml, /<tr data-analysis-id="[^"]+">/g), 24, 'Overview table has 24 records');
assert.ok(overviewHtml.includes('https://skald.mannamila.com/translations/assets/og.jpg'), 'Overview uses the atlas OG image');

const finalById = new Map(finalReview.records.map((record) => [record.id, record]));
const atlasBySkaldId = new Map(skaldTranslations.map((record) => [record.skald, record]));
let headlineClaimsChecked = 0;
let narrativeClaimsChecked = 0;
let formulasChecked = 0;
let variationCasesChecked = 0;

for (const entry of statsIndex.translations) {
  const stats = JSON.parse(fs.readFileSync(path.join(statsRoot, entry.output), 'utf8'));
  const atlasRecord = atlasBySkaldId.get(entry.id);
  const finalRecord = finalById.get(entry.id);
  assert.ok(atlasRecord, `${entry.id}: atlas record exists`);
  assert.ok(finalRecord, `${entry.id}: final review record exists`);

  const expectedUrl = `/translations/analysis/${entry.id}/`;
  const deepLinks = (atlasRecord.links || []).filter((link) => link.host === deepAnalysisHost);
  assert.deepEqual(deepLinks, [{ host: deepAnalysisHost, url: expectedUrl }], `${entry.id}: one exact atlas analysis link`);
  assert.ok(fs.existsSync(path.join(root, expectedUrl, 'index.html')), `${entry.id}: atlas analysis target exists`);

  const detailPath = path.join(analysisRoot, entry.id, 'index.html');
  const html = fs.readFileSync(detailPath, 'utf8');
  const embedded = extractClaimData(html, entry.id);
  assert.deepEqual(embedded.headline, finalRecord.headline, `${entry.id}: shipped claim JSON matches final headline`);
  assert.deepEqual(embedded.numericClaims, finalRecord.numericClaims, `${entry.id}: shipped claim JSON matches all final numeric claims`);
  narrativeClaimsChecked += finalRecord.numericClaims.length;

  const expectedHeadline = {
    tokens: stats.basics.tokens,
    uniqueForms: stats.basics.uniqueForms,
    typeTokenRatio: stats.basics.typeTokenRatio,
    meanSentenceLength: stats.basics.meanSentenceLength,
  };
  assert.deepEqual(finalRecord.headline, expectedHeadline, `${entry.id}: final headline matches source stats`);
  assert.ok(html.includes(`data-claim-tokens="${expectedHeadline.tokens}"`), `${entry.id}: visible tokens claim matches`);
  assert.ok(html.includes(`data-claim-unique-forms="${expectedHeadline.uniqueForms}"`), `${entry.id}: visible unique-forms claim matches`);
  assert.ok(html.includes(`data-claim-ttr="${expectedHeadline.typeTokenRatio}"`), `${entry.id}: visible TTR claim matches`);
  assert.ok(html.includes(`data-claim-mean-sentence="${expectedHeadline.meanSentenceLength}"`), `${entry.id}: visible sentence claim matches`);
  headlineClaimsChecked += 4;

  const formulaCounts = [...html.matchAll(/class="formula-item" data-formula-count="(\d+)"/g)].map((match) => Number(match[1]));
  assert.deepEqual(formulaCounts, stats.formulas.slice(0, 10).map((formula) => formula.count), `${entry.id}: top 10 formula counts match source order`);
  formulasChecked += formulaCounts.length;

  const cases = countMatches(html, /data-variation-case="[^"]+"/g);
  assert.ok(cases >= 4 && cases <= 6, `${entry.id}: has 4-6 rendering-variation cases`);
  assert.equal(countMatches(html, /class="transliteration"/g), cases, `${entry.id}: every variation case has a transliteration`);
  assert.equal(countMatches(html, /class="greek-line"/g), cases * 3, `${entry.id}: every variant quotes its Greek line`);
  const accentFold = (value) => value.normalize('NFD').toLowerCase().replaceAll('̀', '́').replaceAll('ς', 'σ').normalize('NFC');
  for (const card of html.match(/<article class="variation-card"[\s\S]*?<\/article>/g) || []) {
    const surface = card.match(/class="greek-term" lang="grc">([^<]+)</)[1];
    for (const [, line] of card.matchAll(/class="greek-line" lang="grc">([^<]+)</g)) {
      assert.ok(accentFold(line).includes(accentFold(surface)), `${entry.id}: quoted Greek line contains ${surface} exactly`);
    }
  }
  for (const jargon of ['>tokens<', '>unique forms<', '>type-token ratio<', '>TTR<', 'class="stability">stability']) {
    assert.ok(!html.includes(jargon), `${entry.id}: no user-facing jargon (${jargon})`);
  }
  variationCasesChecked += cases;

  assert.ok(html.includes(`https://skald.mannamila.com/translations/analysis/${entry.id}/`), `${entry.id}: canonical URL is present`);
  assert.ok(html.includes('https://skald.mannamila.com/translations/assets/og.jpg'), `${entry.id}: atlas OG image is present`);
  assert.ok(html.includes(`/translations/#${atlasRecord.id}`), `${entry.id}: atlas backlink is present`);
  assert.ok(html.includes('https://apps.apple.com/app/id6790579937'), `${entry.id}: App Store link is present`);
  assert.ok(html.includes('https://play.google.com/store/apps/details?id=com.mannamila.skald'), `${entry.id}: Google Play link is present`);
}

for (const original of skaldOriginals) {
  assert.ok(!(original.links || []).some((link) => link.host === deepAnalysisHost), 'Greek original has no fabricated translation analysis');
}

const sitemap = fs.readFileSync(sitemapPath, 'utf8');
const expectedSitemapUrls = [
  'https://skald.mannamila.com/translations/analysis/',
  ...expectedIds.map((id) => `https://skald.mannamila.com/translations/analysis/${id}/`),
];
for (const url of expectedSitemapUrls) assert.ok(sitemap.includes(`<loc>${url}</loc>`), `Sitemap includes ${url}`);
assert.equal(expectedSitemapUrls.length, 25, 'Sitemap expectation contains 25 analysis URLs');

console.log('PASS docs/verify-analysis.mjs');
console.log('Atlas DATA: 233 records parsed; 24 translated Skald editions linked; Greek original excluded by corpus boundary.');
console.log('Pages: 25/25 exist (1 overview + 24 detail).');
console.log(`Claims: ${headlineClaimsChecked} headline values and ${narrativeClaimsChecked} narrative numeric claims match final.json and source stats.`);
console.log(`Content: ${formulasChecked} formula rows source-matched; ${variationCasesChecked} rendering-variation cases present.`);
console.log('Sitemap: 25/25 analysis URLs present; OG/canonical/store/atlas links verified.');
