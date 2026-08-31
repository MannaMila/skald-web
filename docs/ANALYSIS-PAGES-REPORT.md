# Translation analysis pages report

## Scope and source boundary

- Worktree: `/Volumes/Dev/Code/skald-web`
- Verified branch: `feature/translation-analysis-pages`
- No branch switch, commit, or push was performed.
- The translation-stats index contains 24 translated editions. The atlas contains 25 truthy `skald` records because the original Greek is also marked `skald:"greek"`. The Greek original has no translation-stats JSON, so it was intentionally excluded from the 24 detail pages and did not receive a fabricated deep-analysis link.

## Shipped site files

- `translations/analysis/index.html` — overview, honest method note, and a 24-row linked table with language, tokens, TTR, and first score-ranked formula.
- `translations/analysis/<id>/index.html` — 24 static detail pages. Each includes four headline statistics, an inline SVG comparison with the declared peer group, ten source-ranked formulas with two locations, five Greek surface-form variation cases with transliterations and three referenced line windows, the arbiter-approved sibling narrative, atlas backlink, and the same attributed App Store/Google Play destinations constructed by the atlas.
- `translations/analysis/styles.css` — shared house-palette typography and responsive rules. At 640–760px, the overview table becomes record cards; statistic tiles become two columns; formulas, line-window variants, CTA, and footer stack to one column. No page loads an external JavaScript framework or runtime.
- `translations/index.html` — embedded DATA was edited in place by the dedicated script. Exactly 24 stats-backed translation records now append `{ "host": "Skald deep analysis", "url": "/translations/analysis/<id>/" }`. The modal surfaces that link beside the store pills and excludes it from the free-reading source list.
- `sitemap.xml` — 25 analysis URLs added: one overview and 24 detail routes.

## Build and verification files

- `docs/prepare-analysis-source.mjs` — joins the atlas and read-only stats sources into the bounded narrative evidence file.
- `docs/analysis-reviews/source.json` — normalized evidence for 24 records, including declared same-language or form/style peer groups.
- `docs/arbitrate-analysis-reviews.mjs` — validates the sequential record, re-resolves final source pointers, scans numeric tokens, and emits only the arbiter result.
- `docs/build-analysis-pages.mjs` — deterministic static page builder.
- `docs/add-analysis-links.mjs` — idempotent, 233-record-preserving embedded-DATA editor.
- `docs/verify-analysis.mjs` — verifies page existence, atlas parsing/link targets, final claim parity, formula rows, rendering-case counts, sitemap entries, canonical/OG tags, and outbound links.
- `docs/analysis-reviews/draft.json`, `review1.json`, `review2.json`, `final.json`, and `REVIEWS.md` — retained protocol record.

## Narrative protocol summary

1. Draft author — `gpt-5.6-sol`: 24 narratives, 162–168 words, using only normalized stats, peer data, and subject atlas blurbs.
2. Review 1 numeric/statistical verifier — `gpt-5.6-sol`: 120 claims verified; 24 claims rejected because “leading formula” overstated a score-ranked position as a raw-count lead. Every occurrence was repaired to first-listed/score-ranked wording.
3. Review 2 clarity and tone — `gpt-5.6-sol`: 24 serious, non-hype candidates, 120–135 words, with all numeric tokens still source-recorded.
4. Arbiter — primary Codex agent: all 24 review-2 candidates accepted after pointer resolution and numeric-token rescanning. Only `final.json` is consumed by the page builder; intermediate copy does not ship.

The complete role/basis record is in `docs/analysis-reviews/REVIEWS.md`.

## Method and presentation checks

- Headline values come directly from each `<id>.json` file; TTR and sentence figures retain the raw source values in machine-readable attributes while displaying rounded values for readers.
- Formula order follows the source method's count-times-n-gram-length score; each of the 240 displayed rows matches its source count and order.
- The five cases per translation are selected from substantive Greek surface forms and show actual corpus line windows with stable `book.line` locators. The page explicitly states that candidate context words are heuristic and are not word alignments.
- Same-language comparisons are used where multiple Skald editions share a language. Single-edition languages use a declared form/style group, with an explicit cross-language comparability caveat.
- All 25 pages include canonical, Open Graph, Twitter card, and Article JSON-LD metadata using `translations/assets/og.jpg`.
- The in-app browser bridge and its Computer Use fallback could not attach to a local browser window in this run, so responsive QA is code- and structure-verified rather than screenshot-backed. The static verifier and responsive CSS checks are complete.

## Verifier output

```text
PASS docs/verify-analysis.mjs
Atlas DATA: 233 records parsed; 24 translated Skald editions linked; Greek original excluded by corpus boundary.
Pages: 25/25 exist (1 overview + 24 detail).
Claims: 96 headline values and 96 narrative numeric claims match final.json and source stats.
Content: 240 formula rows source-matched; 120 rendering-variation cases present.
Sitemap: 25/25 analysis URLs present; OG/canonical/store/atlas links verified.
```
