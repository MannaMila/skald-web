#!/usr/bin/env node

// Surgical atlas edit (NEVER regenerate from the workbook): adds a
// 'Skald translator biography' link to each of the 24 Skald translation records,
// pointing at the portrait gallery's deep link. Mirrors add-analysis-links.mjs.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const atlasPath = path.join(root, 'translations/index.html');
const statsIndexPath = '/Volumes/Dev/Code/skald/docs/content/translation-stats/index.json';
const marker = 'const DATA=';
const host = 'Skald translator biography';

function locateData(html) {
  const markerStart = html.indexOf(marker);
  if (markerStart < 0) throw new Error('Atlas DATA marker not found');
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
    else if (char === '}') {
      depth -= 1;
      if (depth === 0) return { jsonStart, jsonEnd: index + 1 };
    }
  }
  throw new Error('Atlas DATA object did not terminate');
}

const html = fs.readFileSync(atlasPath, 'utf8');
const { jsonStart, jsonEnd } = locateData(html);
const data = JSON.parse(html.slice(jsonStart, jsonEnd));
const statsIndex = JSON.parse(fs.readFileSync(statsIndexPath, 'utf8'));

if (data.translations.length !== 233) throw new Error(`Expected 233 atlas records, found ${data.translations.length}`);
if (statsIndex.translations.length !== 24) throw new Error(`Expected 24 translator records, found ${statsIndex.translations.length}`);

const bySkaldId = new Map(
  data.translations.filter((record) => record.skald).map((record) => [record.skald, record]),
);
let added = 0;
let alreadyPresent = 0;
for (const entry of statsIndex.translations) {
  const record = bySkaldId.get(entry.id);
  if (!record) throw new Error(`No atlas record has skald=${entry.id}`);
  const expectedUrl = `/translators/#${entry.id}`;
  record.links ||= [];
  const existing = record.links.find((link) => link.host === host);
  if (existing) {
    if (existing.url !== expectedUrl) {
      throw new Error(`${record.id} has ${host} URL ${existing.url}; expected ${expectedUrl}`);
    }
    alreadyPresent += 1;
  } else {
    record.links.push({ host, url: expectedUrl });
    added += 1;
  }
}

const original = data.translations.find((record) => record.original && record.skald);
if (original && (original.links || []).some((link) => link.host === host)) {
  throw new Error('Greek original unexpectedly has a translator-biography link');
}

const rewritten = `${html.slice(0, jsonStart)}${JSON.stringify(data)}${html.slice(jsonEnd)}`;
const checkRange = locateData(rewritten);
const reparsed = JSON.parse(rewritten.slice(checkRange.jsonStart, checkRange.jsonEnd));
if (reparsed.translations.length !== 233) throw new Error('Record count changed after serialization');
const linked = reparsed.translations.filter(
  (record) => (record.links || []).some((link) => link.host === host),
).length;
if (linked !== 24) throw new Error(`Expected 24 biography-linked records, found ${linked}`);

fs.writeFileSync(atlasPath, rewritten);
console.log(`Biography links: ${added} added, ${alreadyPresent} already present; 24 verified.`);
