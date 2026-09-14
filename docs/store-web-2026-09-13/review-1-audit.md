# Review 1 — textual accuracy, source anchors, philology, and claims

- Reviewer role: mandatory content reviewer 1
- Model: `gpt-5.6-sol/high`
- Reviewed revision: `6d846a8d46b1467ad68c353c5e489245155465c2`
- Reviewed scope: bundled Odyssey runtime corpus, the code paths that expose it to readers, and the quantitative/behavioral claims proposed in `brief.md`
- Production content changes: none
- Status: **REVISE** — candidate copy reviewed in full; approval requires the bounded corrections below

## Decision

Use concrete, bounded counts: **24 translation editions in 11 modern languages, plus the original Ancient Greek; 3,288 passage-anchored notes; 230 museum artworks and objects from 48 museums and collections; 54 distinct journal articles represented at 68 passage anchors.**

Do not use “world's largest,” “the most complete,” “exhaustive,” “every reading is different,” “new notes every time,” or any equivalent comparative or universal promise. The repository proves the contents of this bundle, not its rank against every competing edition or a guarantee about every future reading session.

## Runtime census and defensible wording

### Translations and languages

- `content/odyssey/translations.json` has 24 manifest entries. Each entry's named file exists and has non-empty chunks in all 24 book families: 576/576 edition-book payloads are present.
- The 24 entries use 11 distinct modern-language codes: English, Spanish, French, German, Italian, Russian, Danish, Dutch, Modern Greek, Swedish, and Hebrew.
- The Homeric Greek in each family's `greek.json` is a separate original-text mode (`grc`), not a translation entry. Therefore:
  - approve: “24 translations in 11 languages, with the original Ancient Greek alongside”;
  - approve: “24 translation editions across 11 modern languages, plus Ancient Greek”;
  - reject: “24 languages”;
  - avoid the ambiguous “12 languages” unless it explicitly says “11 translation languages plus Ancient Greek.”
- “Editions” is precise marketing shorthand for selectable translated witnesses, though some files use later transcriptions or reprints rather than first-edition diplomatic texts. “Translation editions” is safest.
- Avoid a blanket “all public-domain translations” claim. The current U.S. rights ledger records owner risk acceptance rather than a public-domain finding for the Tchernichovsky Hebrew text (`docs/legal/release-rights.json`, around the `OWNER RISK ACCEPTANCE` record). A neutral “historical translations” claim is supported.

Evidence: `core/src/main/assets/content/unlock-stats.json:37-40`; `core/src/main/assets/content/odyssey/translations.json`; all 24 family translation assets; `core/src/commonMain/kotlin/com/skald/core/model/Domain.kt:458-507`.

### Notes / Scholia

- There are 3,288 `notes[]` rows across the 24 runtime `scholia.json` catalogs and 3,288 distinct note IDs. This agrees with the generated runtime stat.
- Scope matters: 2,678 notes are universal; 610 are restricted to one or more translations. Those scoped rows contain 899 edition-scope memberships. For any single reading source, the eligible authored pool is 2,678–2,873 notes before passage resolution, density, art-spacing, consumed-state, and marketplace selection.
- Duplicate definitions matter:
  - 3,288 distinct IDs;
  - 3,286 distinct `(title, payload, translation scope)` tuples, because two article records are intentionally repeated at different passage anchors;
  - 3,273 distinct payload JSON values. Seven repeated-payload groups account for 15 rows beyond one representative, including shared fleet/voyage/intervention payloads and repeated article payloads.
- Consequently, approve “3,288 passage notes,” “more than 3,000 notes,” or “thousands of notes beside the poem.” Reject “3,288 unique insights,” “3,288 discoveries,” or any claim that equates record IDs with wholly independent scholarly conclusions.
- “Scholia” is historically apt for marginal explanatory notes on an ancient text, but it is specialist vocabulary. Store copy should pair it with plain language on first use, e.g. “scholia—short notes beside the passage.” Do not imply these are a direct edition of the ancient Homeric scholia; they are Skald's modern, source-backed annotations.

Kind census: 1,380 wordplay; 475 craft; 408 trivia; 262 concept; 183 lab; 128 formula; 127 translator; 68 citation; 66 compare; 57 realia; 47 voyage; 45 intervention; 42 fleet.

Evidence: `core/src/main/assets/content/unlock-stats.json:15-25`; the 24 runtime `scholia.json` catalogs; translation-scope semantics in `core/src/commonMain/kotlin/com/skald/core/model/Scholia.kt:45-62`; runtime filtering in `feature/reader/src/commonMain/kotlin/com/skald/feature/reader/ScholiaSelection.kt`.

### Journal articles and sources

- The runtime contains 68 `citation` notes, but these represent **54 distinct DOI-identified journal articles** in 35 journal titles. Ten articles are anchored beside more than one passage, producing the difference between 54 articles and 68 placements.
- At the article level, 42 distinct articles have a licensed full-text URL and `readInApp=true`; 12 are citation-only. At the placement level, the corresponding counts are 56 and 12.
- Approve “54 journal articles connected to 68 passages” or “54 cited journal articles, placed beside the passages they illuminate.” “68 journal articles” is false; 68 is the count of passage placements.
- Across all scholia there are 7,960 `sources[]` occurrences and 206 distinct literal `ref` strings, but neither is defensible as a count of “scholarly references.” References repeat heavily, spelling/title variants are not canonically merged, and the set mixes primary texts, lexica, modern scholarship, museums, and internal computed corpora. Use qualitative wording such as “source notes throughout” unless a normalized bibliography is produced.
- The citation generator emits only reviewed Tier A/A-pd records and gives each note a DOI source. This supports “cited” and “source-backed”; it does not support “peer reviewed” for every one of the other 3,220 notes without a separate source-by-source classification.

Evidence: the 24 runtime `scholia.json` catalogs; `tools/scholarship/generate-citation-scholia.mjs:1-7,28-32,142-198`; `docs/content/scholarship/odyssey-oa-articles-2021-2026.json`.

### Artworks, objects, and collections

- The reader's `museum_artifacts` gallery contains 230 distinct object IDs and 230 distinct thumbnail assets, grouped under 48 distinct collection records. Every gallery object has a thumbnail; 228/230 carry one or more Odyssey book references and 103/230 carry a line-level `scene_refs` record.
- The 48 group labels include museums, galleries, national libraries, palaces, and named collections. “48 museums and collections” is accurate. “48 museums” is the internal stats label but is slightly less precise for public copy.
- “230 museum artworks and objects” or “230 works and artifacts from 48 museums and collections” is accurate. “230 paintings” and “230 artifacts” are both too narrow.
- There are also 263 inline plate placements across the 24 books, using 171 distinct plate assets. These are placements, not 263 unique artworks. Some repeat across books and 102 distinct assets overlap the museum gallery. Do not add 230 gallery entries to 263 inline placements and present the sum as unique art.
- If copy needs a single art number, use the gallery's 230. If it describes reading behavior, say that art is woven beside related passages; avoid “every artwork is matched to an exact line,” since only 103 gallery records carry explicit line-level scene references and two gallery objects lack book references.

Evidence: `core/src/main/assets/content/unlock-stats.json:27-35`; `core/src/main/assets/content/odyssey/panels.json` (`museum_artifacts` payload); all 24 `master.json` files' `image_plates` arrays.

## Re-reading and “fresh notes” behavior

The implementation supports discovery over repeated reading, but not an unconditional novelty promise.

- Opened notes are recorded as consumed per translation/reading source. A note opened in Butler can still appear in Murray; within the same edition it is retained as a visited note rather than competing as a live unvisited mark.
- The placement market uses a work/family/day seed and local impression/open/dwell signals. A new day or changed signals can choose different winners among competing notes. Within one day with unchanged inputs, selection is deterministic.
- Session-only shown-state prevents flicker during the current family session; it resets when the work/family session changes. Merely reopening a book does not guarantee a different note.
- Translation-scoped notes can newly enter the pool when the reader switches editions, but only 610 of 3,288 records are scoped, and the count varies substantially by edition.

Approve wording such as “return in another translation and different notes can come forward,” “there is more to notice on a reread,” or “opened notes make room for other notes in that edition.” Reject “every reread reveals new notes,” “a fresh margin every time,” and “the app never repeats a note.”

Evidence: per-edition consumption in `core/src/commonMain/kotlin/com/skald/core/prefs/ScholiaSeenStore.kt:15-37`; session reset and consumed-state loading in `feature/reader/src/commonMain/kotlin/com/skald/feature/reader/ReaderScholiaController.kt:114-125,174-216`; daily deterministic seed in `feature/reader/src/commonMain/kotlin/com/skald/feature/reader/ScholiaMarketplace.kt:38-63`.

## Claims that fail this review

Reject unless independently substantiated outside this repository:

- “the world's largest Odyssey reader/library/collection”;
- “the most complete Odyssey edition” or “every translation”;
- “the definitive” or “exhaustive” guide to Homer, ancient life, reception, art, or scholarship;
- “3,288 unique insights”;
- “68 journal articles” when referring to distinct works;
- “263 artworks” when referring to distinct inline images;
- “278/493 artworks” obtained by adding gallery entries and inline placements;
- “fresh/new notes every time you read”;
- “all translations are public domain” as a blanket territorial claim;
- “every note is peer reviewed” or “every artwork is tied to an exact Homeric line.”

## Reproducible audit method

The counts above came from the bundled assets actually loaded by `JsonContentRepository`, not from marketing documents alone. The audit parsed:

1. `content/odyssey/families.json` and every manifest-named translation file in every family;
2. every family `scholia.json`, counting IDs, payload signatures, translation scopes, kinds, DOI identities, journals, and read-in-app status;
3. `content/odyssey/panels.json` for gallery groups/objects and every family `master.json` for inline plate placements/assets;
4. reader selection, persistence, and translation-scope code to qualify behavior claims.

No production content was edited.

## Exact candidate review

Reviewed artifacts and SHA-256 at the time of decision:

| Artifact | SHA-256 |
|---|---|
| `candidate-store.json` | `1a263818ec896ee6cd3753172cee9d8dad61c7bf9812c11b46144143e8ceb633` |
| `candidate-index.html` | `66f0a71be610df9100965ea9059078134cd4751aa101e3a2f14da4f0e8104249` |
| `candidate-captions.json` | `8169389b57439446cba84c6e320bc088c8c42a0992d969a7384f62faf6de9d89` |
| `brief.md` | `d51987a585c188f6f98ca1c6e1318e50574f576200e9615983638cb152caf131` |

The overall copy is accurate, restrained, and source-aware. It correctly calls 3,288 items “reading notes,” distinguishes 54 articles from their repeated passage placements, keeps full-text reading online, uses “can surface” rather than guaranteeing novelty on every reread, separates 11 translation languages from Ancient Greek, and avoids unsupported largest/complete/exhaustive claims.

The following corrections are required before approval:

1. **Broaden the holding-institution label.** Replace “48 museum collections” with “48 museums and collections” in the store description, both website occurrences, and all five repeated museum-panel captions (eight occurrences total). The 48 runtime groups include museums and galleries, but also the Bibliothèque nationale de France, Palazzo Salviati, Royal Palace Amsterdam, and the Banca d'Italia collection. “Museums and collections” is exact without forcing all holdings into a museum category.
2. **Do not call the entire mixed gallery only “artworks.”** The store promotional text and the website Open Graph description each use bare “230 artworks.” The counted catalog also includes archaeological and decorative objects. Use “230 artworks and objects,” “230 artworks and artifacts,” or the compact “230 museum works.” The already-used “artworks and artifacts” is acceptable elsewhere.
3. **Name the outbound article action correctly.** Replace “citation and publisher link” with “citation and DOI link” in the store description and website notes section. The card displays publisher metadata, but its universal outbound control is `Open DOI`, constructed as `https://doi.org/<doi>`; it has no separate publisher URL field.
4. **Qualify incomplete artist/date metadata.** The store description and website art section say works open with “their artist, date, collection and source details.” Of 230 objects, 28 have no `artist` value and one has no `date`; all 230 have title, collection, credit, and source URL. Use a universally true construction such as “with title, collection, credit and source details,” or “with artist or maker and date where known, plus collection and source details.”

These are wording corrections only. I found no required change to the remaining store fields, release notes, screenshot captions, website feature descriptions, retained product-updates promises, availability copy, audience statement, pricing model, offline behavior, saved-place behavior, translation list, Greek/lexicon claim, map/fleet claim, or qualified rereading claim.

The retained website statements were also checked against the currently published Skald homepage and its product-updates and app-privacy notices on 2026-09-13. Those pages support the four-country/platform availability, at-most-monthly updates, unsubscribe option, separation of the mailing list from the app, local saved reading state, no app account, and no displayed ads. The candidate's earlier-version preview disclosure was checked against `brief.md` and the unreleased 0.7.0 repository state. Store state and release timing remain release-owner gates rather than content-review findings.

## Machine-readable count evidence

Run:

```text
node docs/marketing/store-web-2026-09-13/count-audit.mjs
```

The script parses the same runtime manifests/catalogs described above and emits the translation completeness, note/scoping/duplicate, article, gallery, inline-plate, and metadata-completeness counts as JSON. It does not write production content.

Final decision on the hashed candidate set: **REVISE**. Apply the four bounded corrections, recompute the three candidate hashes, and return the resolved bytes for final approval/arbitration.
