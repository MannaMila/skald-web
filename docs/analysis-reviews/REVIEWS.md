# Translation analysis narrative reviews

This directory records the sequential content protocol for the 24 stats-backed translated editions in Skald. The atlas also marks the original Greek record with a truthy `skald` field; it has no translation-stats JSON and is therefore outside this 24-page narrative corpus.

## Recorded roles

| Stage | Role | Model | Review basis | Result |
| --- | --- | --- | --- | --- |
| Draft | Draft author | `gpt-5.6-sol` | Normalized headline statistics, top formulas, within-language distinctiveness where eligible, declared peer groups, and the subject atlas blurb in `source.json` | 24 drafts, all within 120–180 words |
| Review 1 | Numeric/statistical verifier | `gpt-5.6-sol` | Every numeric token and supplied source pointer; statistical wording checked against the source method | 120 claims verified; 24 “leading formula” characterizations rejected and repaired to score-ranked/first-listed wording |
| Review 2 | Clarity and tone reviewer | `gpt-5.6-sol` | Review 1 output plus `source.json`; serious public-facing tone, individual atlas context, no hype or unsupported inference | 24 revised candidates, 120–135 words |

## Arbiter

The primary Codex agent checked the complete draft → review 1 → review 2 trail, re-resolved every final numeric pointer against `source.json`, scanned every final narrative for unrecorded numeric tokens, and accepted all 24 review 2 candidates. Only `final.json` is consumed by the page builder. Intermediate narratives remain here as machine-readable evidence and do not ship as page copy.

## Evidence boundary

- Corpus statistics are surface-form measures, not lemmatized linguistic judgments.
- Formula order follows the source score (count multiplied by n-gram length), not raw count alone.
- Candidate rendering words come from aligned or estimated line windows; they are not word alignments.
- Cross-language style groups are descriptive fallbacks for languages represented by one translated edition.
- No narrative treats corpus size, TTR, sentence splitting, formula recurrence, or candidate stability as a measure of fidelity or literary quality.
