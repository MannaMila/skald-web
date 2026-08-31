#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const statsRoot = '/Volumes/Dev/Code/skald/docs/content/translation-stats';
const atlasPath = path.join(root, 'translations/index.html');
const outputPath = path.join(here, 'analysis-reviews/source.json');

function extractAtlasData(html) {
  const marker = 'const DATA=';
  const start = html.indexOf(marker);
  if (start < 0) throw new Error('Atlas DATA marker not found');
  let depth = 0;
  let inString = false;
  let escaped = false;
  const jsonStart = start + marker.length;
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
    else if (char === '}') {
      depth -= 1;
      if (depth === 0) return JSON.parse(html.slice(jsonStart, index + 1));
    }
  }
  throw new Error('Atlas DATA object did not terminate');
}

const atlas = extractAtlasData(fs.readFileSync(atlasPath, 'utf8'));
const statsIndex = JSON.parse(fs.readFileSync(path.join(statsRoot, 'index.json'), 'utf8'));
const atlasBySkaldId = new Map(
  atlas.translations.filter((record) => record.skald).map((record) => [record.skald, record]),
);

const records = statsIndex.translations.map((entry) => {
  const statsPath = path.join(statsRoot, entry.output);
  const stats = JSON.parse(fs.readFileSync(statsPath, 'utf8'));
  const atlasRecord = atlasBySkaldId.get(entry.id);
  if (!atlasRecord) throw new Error(`No atlas record has skald=${entry.id}`);
  return { entry, stats, atlasRecord, statsPath };
});

function styleGroup(record) {
  const meter = `${record.atlasRecord.meter || ''} ${record.atlasRecord.form || ''}`.toLowerCase();
  if (meter.includes('hexameter')) return 'hexameter verse';
  if (record.entry.form === 'prose') return 'historical prose';
  if (/rhy|couplet|stanza/.test(meter)) return 'rhymed or stanzaic verse';
  return 'unrhymed or accentual verse';
}

for (const record of records) record.styleGroup = styleGroup(record);

function peersFor(record) {
  const languagePeers = records.filter(
    (candidate) => candidate.entry.language === record.entry.language && candidate.entry.id !== record.entry.id,
  );
  if (languagePeers.length) {
    return { basis: `other ${record.entry.languageName} translations`, records: languagePeers };
  }
  return {
    basis: `other ${record.styleGroup} translations`,
    records: records.filter(
      (candidate) => candidate.styleGroup === record.styleGroup && candidate.entry.id !== record.entry.id,
    ),
  };
}

const source = {
  schemaVersion: 1,
  generatedFrom: {
    atlas: 'translations/index.html embedded DATA',
    statsIndex: '/Volumes/Dev/Code/skald/docs/content/translation-stats/index.json',
    perTranslation: '/Volumes/Dev/Code/skald/docs/content/translation-stats/<id>.json',
  },
  constraints: {
    narrativeWords: [120, 180],
    allowedEvidence: [
      'headline corpus statistics',
      'top recurring formulas',
      'within-language distinctiveness lists when eligible',
      'atlas blurbs and bibliographic fields',
    ],
    forbidden: 'Do not infer literary quality, fidelity, intention, or reader response from these statistics.',
  },
  records: records.map((record) => {
    const peers = peersFor(record);
    return {
      id: record.entry.id,
      atlasId: record.atlasRecord.id,
      name: record.entry.name,
      translator: record.entry.translator,
      year: record.entry.year,
      language: record.entry.language,
      languageName: record.entry.languageName,
      form: record.entry.form,
      styleGroup: record.styleGroup,
      atlas: {
        who: record.atlasRecord.who,
        year: record.atlasRecord.year,
        publication: record.atlasRecord.pub,
        language: record.atlasRecord.lang,
        form: record.atlasRecord.form,
        meter: record.atlasRecord.meter,
        blurb: record.atlasRecord.blurb,
      },
      headline: {
        tokens: record.stats.basics.tokens,
        uniqueForms: record.stats.basics.uniqueForms,
        typeTokenRatio: record.stats.basics.typeTokenRatio,
        meanSentenceLength: record.stats.basics.meanSentenceLength,
      },
      topFormulas: record.stats.formulas.slice(0, 10).map(({ phrase, count, locations }) => ({
        phrase,
        count,
        locations: locations.slice(0, 2),
      })),
      distinctiveness: record.stats.withinLanguageDistinctiveness.eligible
        ? record.stats.withinLanguageDistinctiveness.tokens.slice(0, 12)
        : [],
      comparisonBasis: peers.basis,
      peers: peers.records.map((peer) => ({
        id: peer.entry.id,
        name: peer.entry.name,
        translator: peer.entry.translator,
        year: peer.entry.year,
        languageName: peer.entry.languageName,
        form: peer.entry.form,
        styleGroup: peer.styleGroup,
        headline: {
          tokens: peer.stats.basics.tokens,
          uniqueForms: peer.stats.basics.uniqueForms,
          typeTokenRatio: peer.stats.basics.typeTokenRatio,
          meanSentenceLength: peer.stats.basics.meanSentenceLength,
        },
        topFormula: {
          phrase: peer.stats.formulas[0].phrase,
          count: peer.stats.formulas[0].count,
        },
        atlasBlurb: peer.atlasRecord.blurb,
      })),
    };
  }),
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(source, null, 2)}\n`);
console.log(`Wrote ${source.records.length} narrative source records to ${path.relative(root, outputPath)}`);
