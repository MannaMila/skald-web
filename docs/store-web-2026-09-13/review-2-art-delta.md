# Independent reader review — art-count delta

Reviewer role: reader usefulness, clarity, art relevance, and provenance  
Reviewer/model: reviewer 2, gpt-5.6-sol/high  
Reviewed source: Skald `6d846a8d46b1467ad68c353c5e489245155465c2`  
Scope: art-count supplement and art-count-only candidate deltas  
Production changes: none

## Decision

**Approve after two small wording corrections.** The revised 252 total is useful and supported, and the candidates correctly retain 230 as the museum-gallery subset. Make these exact changes before the delta becomes production copy:

1. In the website Open Graph description, change “252 artworks and objects and references to 54 journal articles” to “252 artworks and objects, and references to 54 journal articles.” The existing double “and” is awkward.
2. In the website art paragraph, change “Another 22 historical illustrations appear alongside the reading” to “Another 22 historical works appear alongside the reading.” The 22 chapter-only identities include paintings and engravings as well as works made as illustrations, so “works” is the accurate umbrella term.

With those changes, approve the store and website deltas. No further count or scope changes are needed. Leave `resolved-captions.json` unchanged: its 230 figure is explicitly attached to screenshots of the 230-item museum gallery, and “from 48 museums and collections” correctly describes that subset.

## Candidate hashes

- `art-count-supplement.md`: `866d3a64f2bf304bfbc87c1b405232e40c1057e15c9c87c45f57eb2951f6f73f`
- `candidate-art-delta-store.json`: `54867097241e011066895107a8aff0ada6db0d47b1ed613afbd04da58fd87252`
- `candidate-art-delta-index.html`: `75718a506ddd2aae503541d18b36db5210b247fb17636d77460d838517bb812a`
- Baseline `resolved-store.json`: `307b37f2aa25c6ee415f283fe716f91628d6516aaed3f69bb17373734add95e7`
- Baseline `resolved-index.html`: `69ebb57b8f69ddf227e46d154e56646cd845ec3241a051a45f7df228a2fc29db`

## Independent verification

- `node tools/content-ingest/check-art-duplicates.mjs --json` returned `artworkCount: 252`, no errors, and one documented canonical-identity resolution.
- The reviewed identity ledger pins `historical_art_total: 252`, `museum_catalog: 230`, and `chapter_only: 22` at `tools/content-ingest/artifact-identity-merges.json:144-148`.
- The 230 catalog entries are flattened into the global museum-artifacts gallery by `MuseumArtifactsPanel`.
- The book masters feed `imagePlates` into `ReaderUiState`, which makes the chapter-only works part of the reading surface rather than unused assets.
- An independent join of the museum artifact IDs against all live `image_plates` yields 22 distinct chapter-only assets. Their records name historical creators or sources and mark them public domain. The set includes paintings and engravings, which is why “historical works” is preferable to “historical illustrations.”

## Reader-facing count semantics

- **252 historical artworks and objects** is the defensible whole-library count.
- **230 works and objects from 48 museums and collections** is the global museum-gallery subset.
- **22 other historical works** appear only through chapter reading plates. They carry source and rights information but no museum-gallery identity.
- The full inline layer has 263 placements; repeated uses and alternate assets mean placements must not be presented as distinct works.

The store delta states the complete total and gives the subset in the long description. The website proof strip gives the complete total, while the art section explains the 230 + 22 split. That is clear enough for a reader and avoids making the gallery screenshot look inconsistent with the whole-library count.
