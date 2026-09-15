# Review 1: native screenshot corrections and website refresh

- Reviewer: independent content reviewer 1 (accuracy, source anchors, claims)
- Model: `claude-opus-5`
- Date: 2026-09-15
- Independence: I didn't read reviewer 2's new report or any other reviewer's conclusions. I made no edits to candidates, production files, or memory.

## Decisions

| Scope | Decision |
|---|---|
| A: website native screens + social preview (`web-candidate/`) | **APPROVED** |
| B: 4 corrected iPad App Store panels (`ipad-candidate/`) | **APPROVED** |

**No corrections required. I changed no words.**

## Scope A: key results

- **Checksums and file parity.** `MANIFEST.sha256` and `INPUTS.sha256` verify, and `deploy/` is identical to `source/skald/`.
  - `index.html` `2d52ae4d…be2b`, `styles.css` `d6c5c79d…74b4`
  - `reader-art` `10088bdc…`, `greek-split` `cf2b6955…`, `museum-guide` `fcf9da94…`, `nostos-route` `2a3114e2…`, OG `4600afb1…`
- **Diff scope.** The only changes are the OG/Twitter image URL and alt, the stylesheet key, the class hooks, the 4 image src/size/alt values, and one art caption. Body copy is unchanged.
  - The 0.7.0 upcoming notice remains verbatim.
  - No EU or other availability claims were added.
- **Sources.** Mappings match `candidate-native-web.json`.
  - iOS capture hashes match `capture-provenance.json` (main `6d846a8d`).
  - The voyage-map hash `fdce123c` matches `CAPTURES.md`, where it's recorded as a website-only capture.
- **Orientation.** The iPad PNGs have a 2064×2752 header plus an EXIF Orientation=8 chunk. The new tablet webps are upright 2752×2064 and show the whole capture: nothing cropped, no invented UI.
  - Their hashes differ from the old `native-web-preview` encodes, which were made from the raw buffer. The arbiter should bind the new hashes.
- **Greek image.** It shows Ἑλληνικά mode with Butler (1900) EN beside the Greek of Od. 1.1–24, so the alt text is accurate.
- **Hero image.** It shows Butler's Book I opening with a margin reading note and art, so the alt text is accurate.
- **Lastman image.**
  - The capture shows *Odysseus and Minerva*, Pieter Lastman, 1625, with the Rembrandthuis · Amsterdam collection action and a passage note.
  - App data records NK 1830 (RCE), on long-term loan to Museum Het Rembrandthuis, public-domain Commons source.
  - The alt text and caption ("Open an artwork alongside the poem.") are accurate and name no museum or on-view status.
- **Map.** It shows Book I (Ithaca "You are here") and the map isn't covered. The alt text is accurate.
- **Social card.**
  - It's 1200×630. The text is exactly "Skald: Odyssey" / "Spend some time with the Odyssey." / "A look at our next app update."
  - The only additions are final periods, which match the page's own hero and notice.
  - It embeds the real `ios-ipad/03-parallel.png` (sha `0fb91a86`) whole at 4:3 using CSS only. The mount is decorative.
  - The OG and Twitter image alt text is accurate.
- **Non-blocking notes.**
  - The unchanged Greek caption ("…with linked scrolling") is previously approved copy.
  - The registry hash, the `verify-site.mjs` pins, and the app-repo preview webps need updating before promotion. That's process, not content.

## Scope B: key results

- **Hashes.** `MANIFEST.sha256` verifies. Bound hashes:
  - `ipad_01` `3a28db97…f01e`
  - `ipad_02` `2825a343…d24d`
  - `ipad_03` `1179b88c…667f`
  - `ipad_04` `5b6732b9…8f63`
  - `MANIFEST.json` `055a6624…4d55`
  - `captions.json` `a85b5c54…bcef`
- **Captions.** Unchanged: file, source, lines and sub for all 4 panels match `captions.json` exactly. Source and renderer hashes match the working tree.
- **Crop fix.** The current production `ipad_01` really does crop the landscape capture inside a portrait frame. All 4 new panels are 2752×2064 and show the full capture: status bar, back chevron, CHAPTERS, bottom handle.
- **Claims per panel.**
  - Greek beside Butler.
  - Compare sheet: πολύτροπον crux, 24 editions, 11 languages.
  - Scholarship: Bassett "Read in full" + "Open DOI", with links qualified "where available" and no bundled-article implication.
  - Lastman art with collection action.
- **Renderer.** The diff sizes the frame from the browser's natural (oriented) dimensions. It doesn't change captions or the panel list.
- **Other 22 panels.** No production panel PNG is modified.
- **Publication claims.** The manifest is marked CANDIDATE and makes no store publication claims.

## Limitations

- My live check of the public sources (RCE NK1830 record, Wikimedia Commons) was declined in this session because WebFetch permission wasn't granted. Lastman provenance rests on the app repo's records and the visible capture.
- I didn't re-run the geometry test (53/53 vs 49/53) or the landing verifiers, as instructed. I spot-checked the worker's shots instead.
- This review is bounded to the changed web screens, social metadata and the 4 iPad panels. I can't certify files I didn't open.
