# Review 1 supplement — 252-work historical-art census

- Reviewer: mandatory content reviewer 1
- Model: `gpt-5.6-sol/high`
- Source revision: `6d846a8d46b1467ad68c353c5e489245155465c2`
- Parent review retained unchanged: `review-1-audit.md`, SHA-256 `79ae6a163591d8a1cba00dcea427cb10b87eb9862e933daf6ca97e2b28c04b0c`
- Decision: **252 is the defensible app-wide historical-art identity count; 230 is the museum-gallery subset.**

## Finding

The release has **252 distinct live, non-AI historical-art identities**:

- **230** museum-gallery objects, with 230 distinct artifact IDs and thumbnails, grouped under **48 museums and collections**;
- **22** additional chapter-only historical plates, deduplicated by asset because they have no museum-artifact ID.

The 22 chapter-only identities are not hidden build inputs. They are referenced by 54 `image_plates` records across 23 books. All 22 have a bundled image, source-and-rights sidecar, dimensions, title/caption, and source link. Repeated uses of Athena, Penelope, Morning, and other designs account for the difference between 22 identities and 54 placements.

The complete inline layer has 263 plate placements. After applying the production identity rule—gallery artifact ID wins over repeated or alternate reader assets, and chapter-only work is keyed by asset—those placements represent 167 canonical identities. The other gallery objects remain available through the app's global museum-artifacts panel. The union is 252.

This count excludes generated Sketch images, location photographs, alternate reader crops/assets belonging to an existing museum identity, retired records, and unreferenced files. It should be described as a count of distinct historical works/design identities, not raw files, thumbnails, or placements.

## Why all 252 are app content

The two exposure paths are separate:

1. `core/src/main/assets/content/odyssey/panels.json` contains the 230-object `museum_artifacts` payload. `MuseumArtifactsPanel` flattens that global payload into the browsable cross-museum gallery.
2. Each book's `master.json` supplies `image_plates`; `ReaderStateBuilder` copies those plates into `ReaderUiState`, `rememberStoryArtLayout` resolves them against the active reading source, and the reader renders them inline or as tappable plate markers opening `PolaroidPopover`. This path exposes the 22 chapter-only identities as well as the gallery identities selected for inline use.

The relevant implementation evidence is:

- `feature/reader/src/commonMain/kotlin/com/skald/feature/reader/ReaderStateBuilder.kt:54-69`;
- `feature/reader/src/commonMain/kotlin/com/skald/feature/reader/SplitReader.kt:234-294`;
- `feature/reader/src/commonMain/kotlin/com/skald/feature/reader/ReaderScreen.kt:1125-1144`;
- `feature/reader/src/commonMain/kotlin/com/skald/feature/reader/sidecar/books/odyssey/MuseumArtifactsPanel.kt:67-99`.

“All 252 are in the app” therefore means they are bundled and reachable through the full app library. It does not mean all 252 appear in the 230-item museum gallery, and access to chapter plates in the 21 paid books follows the normal book-unlock boundary.

## Authoritative count sources

The most direct executable source is `tools/content-ingest/check-art-duplicates.mjs`. It loads the actual merged `panels.json` museum payload and all 24 runtime `master.json` files, then calls `liveArtIdentityRecords`. That function gives catalog records priority over repeated reader placements and keys chapter-only work by asset (`art-duplicate-gate.mjs:651-730`). On this revision:

```text
node tools/content-ingest/check-art-duplicates.mjs --json
```

returns `artworkCount: 252` with no errors. The reviewed identity ledger independently pins:

```json
{
  "historical_art_total": 252,
  "museum_catalog": 230,
  "chapter_only": 22
}
```

at `tools/content-ingest/artifact-identity-merges.json:144-148`. The September art-expansion arbitration records the same resolved split at `docs/content/art-expansion-2026-09/CONTENT-REVIEW.md:234,249`.

`./gradlew validateContent :checkArtDuplicates` completed successfully on this checkout. The standalone duplicate scan also returned 252 identities and zero errors.

Snapshot hashes:

| Source | SHA-256 |
|---|---|
| `artifact-identity-merges.json` | `e052f656ce23ed3343b98665060b276cdeef4a5c551be9ed2b3b814e47f6b805` |
| `panels.json` | `f6498449031ebc783a11a7ca46d11a690a7f0c1f5b017a941a1d0d8cec911511` |
| `check-art-duplicates.mjs` | `c8603e5f851e46edf8a528b77ce3e9748ee75c442a4ba922b87de1e655a1662d` |
| `art-duplicate-gate.mjs` | `8a61c87bddf9a6df8d03a735f3c3f0de353e19f4d3688f1d79fa14f9c301ec92` |

The live Art Atlas at `https://skald.mannamila.com/mosaic/` was fetched on 2026-09-13. Its embedded catalog has 252 rows, 252 distinct IDs, and group counts summing to 252. This agrees with the current runtime graph.

## Pipeline caveat

The count authority is current, but two older ad-package scripts in this checkout are stale:

- `tools/ad-assets/generate_mosaic.py` still expects 178 museum items + 22 chapter-only = 200 across 49 museum groups;
- `tools/ad-assets/finalize_ad_package.py` pins the same old 200-item identity set.

`museum-art-pipeline.mjs mosaic` runs the current 252-item duplicate gate and then invokes the stale generator, so the checked-in post-commit mosaic workflow cannot currently regenerate the 252-item live atlas without updating and reviewing those constants/identity hash. This does not weaken the runtime count, because the gate and ledger derive 252 from the actual app graph, and the deployed atlas independently contains 252. It is a reproducibility defect in the marketing-art pipeline and should be fixed separately.

## Marketing recommendation

The existing **“230 artworks and artifacts from 48 museums and collections” remains true as a named museum-gallery subset**. Keep it for screenshots or sections explicitly depicting the in-app museum gallery.

Do not label 230 as the total art in the whole library. In particular, a proof strip whose accessible label calls its entries “Library totals” should either:

- use **“252 historical artworks and objects”**, with nearby copy giving the split “230 from 48 museums and collections, plus 22 chapter-only plates”; or
- keep **230** but label the row explicitly **“museum-gallery works from 48 museums and collections.”**

For the main store description, the most complete and transparent formulation is:

> 252 historical artworks and objects, including 230 from 48 museums and collections

For tight release-note or promotional fields, **“252 historical works”** is supportable. Avoid “252 museum works” or “252 works from 48 collections,” because the 22 chapter-only plates carry source provenance but no museum-gallery record.

This supplement does not alter the already approved review or candidate copy. The arbiter should decide whether to retain the conservative 230-item gallery claim or adopt the more complete 252-item count with the scope made explicit.
