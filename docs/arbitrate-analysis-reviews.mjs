#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const reviewRoot = path.join(here, 'analysis-reviews');
const source = JSON.parse(fs.readFileSync(path.join(reviewRoot, 'source.json'), 'utf8'));
const draft = JSON.parse(fs.readFileSync(path.join(reviewRoot, 'draft.json'), 'utf8'));
const review1 = JSON.parse(fs.readFileSync(path.join(reviewRoot, 'review1.json'), 'utf8'));
const review2 = JSON.parse(fs.readFileSync(path.join(reviewRoot, 'review2.json'), 'utf8'));

const stages = [
  [draft, 'draft-author'],
  [review1, 'review1-numeric-verifier'],
  [review2, 'review2-clarity-tone'],
];
for (const [stage, role] of stages) {
  if (stage.role !== role) throw new Error(`Expected role ${role}, found ${stage.role}`);
  if (stage.model !== 'gpt-5.6-sol') throw new Error(`${role} did not record gpt-5.6-sol`);
  if (stage.records.length !== 24) throw new Error(`${role} does not contain 24 records`);
}

const sourceById = new Map(source.records.map((record) => [record.id, record]));
const review1ById = new Map(review1.records.map((record) => [record.id, record]));
const review2ById = new Map(review2.records.map((record) => [record.id, record]));

function resolvePointer(root, pointer) {
  return pointer.split('/').slice(1).reduce((value, component) => value?.[component], root);
}

function numericTokens(value) {
  return [...value.matchAll(/(?<![\p{L}\p{N}])\d+(?:[.,]\d+)*(?![\p{L}\p{N}])/gu)]
    .map((match) => match[0].replaceAll(',', ''));
}

const finalRecords = source.records.map((sourceRecord, index) => {
  const accuracy = review1ById.get(sourceRecord.id);
  const clarity = review2ById.get(sourceRecord.id);
  if (!accuracy || !clarity) throw new Error(`Review trail incomplete for ${sourceRecord.id}`);
  if (clarity.atlasId !== sourceRecord.atlasId) throw new Error(`Atlas ID drift for ${sourceRecord.id}`);
  const wordCount = clarity.revisedNarrative.trim().split(/\s+/).length;
  if (wordCount !== clarity.wordCount || wordCount < 120 || wordCount > 180) {
    throw new Error(`Invalid final word count for ${sourceRecord.id}`);
  }
  for (const claim of clarity.numericClaims) {
    const resolved = resolvePointer(source, claim.source);
    if (resolved !== claim.value) {
      throw new Error(`${sourceRecord.id}: ${claim.source} resolved to ${resolved}, not ${claim.value}`);
    }
  }
  const claimTokens = new Set(clarity.numericClaims.map((claim) => String(claim.value)));
  for (const token of numericTokens(clarity.revisedNarrative)) {
    if (!claimTokens.has(token)) throw new Error(`${sourceRecord.id}: unrecorded numeric token ${token}`);
  }
  return {
    id: sourceRecord.id,
    atlasId: sourceRecord.atlasId,
    narrative: clarity.revisedNarrative,
    wordCount,
    headline: { ...sourceRecord.headline },
    numericClaims: clarity.numericClaims,
    arbiterDecision: 'accept-review2',
    reviewTrail: {
      sourceIndex: index,
      draftWordCount: draft.records[index].wordCount,
      review1Verdict: accuracy.verdict,
      review2Verdict: clarity.verdict,
      review1IssuesResolved: accuracy.issues.length,
      review2IssuesResolved: clarity.issues.length,
    },
  };
});

const final = {
  schemaVersion: 1,
  role: 'arbiter',
  basis: [
    'docs/analysis-reviews/source.json',
    'docs/analysis-reviews/draft.json',
    'docs/analysis-reviews/review1.json',
    'docs/analysis-reviews/review2.json',
  ],
  decision: 'Ship only the review2 narratives accepted here; draft and intermediate review prose remain audit records.',
  records: finalRecords,
  summary: {
    accepted: 24,
    amended: 0,
    rejected: 0,
    wordRange: [Math.min(...finalRecords.map((record) => record.wordCount)), Math.max(...finalRecords.map((record) => record.wordCount))],
    numericClaims: finalRecords.reduce((sum, record) => sum + record.numericClaims.length, 0),
  },
};

fs.writeFileSync(path.join(reviewRoot, 'final.json'), `${JSON.stringify(final, null, 2)}\n`);

const reviewsMarkdown = `# Translation analysis narrative reviews

This directory records the sequential content protocol for the 24 stats-backed translated editions in Skald. The atlas also marks the original Greek record with a truthy \`skald\` field; it has no translation-stats JSON and is therefore outside this 24-page narrative corpus.

## Recorded roles

| Stage | Role | Model | Review basis | Result |
| --- | --- | --- | --- | --- |
| Draft | Draft author | \`gpt-5.6-sol\` | Normalized headline statistics, top formulas, within-language distinctiveness where eligible, declared peer groups, and the subject atlas blurb in \`source.json\` | 24 drafts, all within 120–180 words |
| Review 1 | Numeric/statistical verifier | \`gpt-5.6-sol\` | Every numeric token and supplied source pointer; statistical wording checked against the source method | 120 claims verified; 24 “leading formula” characterizations rejected and repaired to score-ranked/first-listed wording |
| Review 2 | Clarity and tone reviewer | \`gpt-5.6-sol\` | Review 1 output plus \`source.json\`; serious public-facing tone, individual atlas context, no hype or unsupported inference | 24 revised candidates, 120–135 words |

## Arbiter

The primary Codex agent checked the complete draft → review 1 → review 2 trail, re-resolved every final numeric pointer against \`source.json\`, scanned every final narrative for unrecorded numeric tokens, and accepted all 24 review 2 candidates. Only \`final.json\` is consumed by the page builder. Intermediate narratives remain here as machine-readable evidence and do not ship as page copy.

## Evidence boundary

- Corpus statistics are surface-form measures, not lemmatized linguistic judgments.
- Formula order follows the source score (count multiplied by n-gram length), not raw count alone.
- Candidate rendering words come from aligned or estimated line windows; they are not word alignments.
- Cross-language style groups are descriptive fallbacks for languages represented by one translated edition.
- No narrative treats corpus size, TTR, sentence splitting, formula recurrence, or candidate stability as a measure of fidelity or literary quality.
`;

fs.writeFileSync(path.join(reviewRoot, 'REVIEWS.md'), reviewsMarkdown);
console.log(`Arbiter accepted ${final.summary.accepted} narratives; word range ${final.summary.wordRange.join('–')}; numeric claims ${final.summary.numericClaims}.`);
