# Review 2: content (reader usefulness, clarity, art relevance, provenance)

Model: `claude-opus-5` · 2026-09-15 · independent (review1 files not read; nothing written except review2.json/md and view copies in `review2-view/`)

| Scope | Verdict | Required corrections |
|---|---|---|
| A. Website candidate | **APPROVED** | none |
| B. 4 corrected iPad store panels | **APPROVED** | none |

## A. Website candidate (`web-candidate/`)

**Bound:** `index.html` 2d52ae4d…be2b · `styles.css` d6c5c79d…74b4 · `reader-art.webp` 10088bdc…05be · `greek-split.webp` cf2b6955…f3b7 · `nostos-route.webp` 2a3114e2…20e3 · `museum-guide.webp` fcf9da94…5089 · `skald-odyssey-og-070.jpg` 4600afb1…6a33 · `deploy.patch` aa11158f…5d57 · `source.patch` e1267d48…7ea49. Inputs: `candidate-native-web.json` b8c1f50d…c7ad, captures 01-reader 11d2aea0…, 03-parallel 0fb91a86…, 07-art b29d853d…, 08-voyage-map fdce123c…

- **Hashes:** MANIFEST and INPUTS `shasum -c` all OK. `deploy/` and `source/skald/` are byte-identical.
- **Copy:** compared with live `0ac01407…`, the only changes are OG/Twitter image and alt, the CSS key, the figure classes, the 4 img src/size/alt, and the art figcaption. Alt text and caption match the JSON verbatim. The body copy, the 0.7.0 preview notice, "Available now…", and the FAQ regions (US/CA/AU/NZ) are unchanged. **No EU availability claim.**
- **Images (all 4 decoded and viewed):** the Greek and art webps are 2752×2064 and upright (the EXIF-8 fix is correct). The phone image is 1320×2868 and the map 1920×1080. All show the full frame, with no tint or distortion.
- **Page renders:** in the 1440 and 390 renders, every figure box matches its natural ratio (for example 292×634 and 340×255 at 390) and uses `contain`. There is no overflow, no broken images, and no exceptions.
- **Relevance:** the hero shows Butler Book I with a note and inline Lastman art. The Greek image shows Butler EN beside Greek ll. 1–21. The map shows Nostos Route Map at Ithaca. The art image shows Lastman *Odysseus and Minerva* (1625) with the Rembrandthuis link and the Od. 13 note. Every alt and caption is accurate.
- **Social card:** it uses the real `03-parallel.png`, shown whole at 4:3. The text is exactly *Skald: Odyssey* / *Spend some time with the Odyssey.* / *A look at our next app update.*, with italic "Odyssey" and a line break matching the page hero. Nothing is clipped or overlapping, and there are no availability claims.

**Non-blocking notes:**
- In the native Greek capture, the "Ελληνικά" segment is selected, not "Parallel". The caption doesn't name a mode, so nothing is false.
- The existing caption says "with linked scrolling", which a still image can't show. That caption was already on the page.
- The art note text is unreadable at web display size. That's expected, and the alt text covers it.
- The OG alt describes only the screenshot. It's the approved `greek_alt`.
- The arbiter must rebind the page pin to `2d52ae4d…`. The two tablet webps differ from the preview files only because of the orientation fix.

## B. iPad panels (`ipad-candidate/`)

**Bound:** `ipad_01_greek_split` 3a28db97…f01e · `ipad_02_nostos_route` 2825a343…d24d · `ipad_03_translations` 1179b88c…667f · `ipad_04_museum_art` 5b6732b9…8c63 · `MANIFEST.json` 055a6624…4d55 · `captions.json` a85b5c54…bcef (unchanged). Sources: 03-parallel 0fb91a86…, 06-compare ae4fc922…, 05-scholarship 4b93d5fa…, 07-art b29d853d…

- **Captions and repo state:** the lines, subs, and sources match `captions.json` exactly. In the app repo, `git diff HEAD` is clean for all 26 tracked panel PNGs and for the 0.7.0 captures. The production 4 still have their superseded hashes (7f776fcb…, 13927e8c…, 742ecec1…, 84687486…), so nothing has been applied and the other 22 are unchanged.
- **Old defect confirmed:** in the old ipad_01, a portrait frame crops off the English column, the controls, and the status bar.
- **New panels:** each shows the full 4:3 screen with the status bar and reader controls visible. Headlines are large and legible. Checked at full resolution with 1:1 crops:
  - **01, Greek beside translation:** Butler (1900) EN sits beside the Greek. Accurate.
  - **02, Compare:** the "In other words · Book I · lines 1–10" sheet shows the πολύτροπον crux (Murray/Voss/Morris) and Butler 1900 beside Chapman 1616. Accurate.
  - **03, Scholarship:** citations for Bassett 1923, McConnell 2026, and Moran 2021, with license and access lines and "Read in full" / "Open DOI" links. These are links, not bundled articles, and "where available" is accurate.
  - **04, Art:** Lastman *Odysseus and Minerva*, 1625, the Rembrandthuis Amsterdam link, the note citing Od. 13.221–235, and the owl are all visible. The credit is legible.

**Non-blocking notes:**
- The "nostos_route" filename is legacy and not user-visible.
- In panel 04, the duplicate inline credit shows faintly behind the translucent pill. This comes from the native capture.
- I did not check the in-app note's "embossed shield" wording against the museum record. It's app content, outside this re-render scope.

I make no claims about app binaries, store upload, or publication. The geometry tests were not rerun, because no specific concern came up.
