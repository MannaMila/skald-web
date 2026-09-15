# Skald website native screenshot refresh: candidate report

Worker model: `claude-opus-5` (Claude Opus 5, via Claude Agent SDK)
Date: 2026-09-15
Status: **candidate ready; nothing applied to either worktree, nothing committed/pushed.**
Tools: Google Chrome 153.0.8010.36 (headless=new), cwebp 1.6.0, sips (macOS 26.5.1), Node v26.0.0

## Roots

- Candidate root: `/tmp/skald-opus-20260915/web-candidate/`
  - `source/skald/`: drop-in files for `/Volumes/Dev/Code/mannamila-web-copy-20260913/skald/`
  - `deploy/`: drop-in files for `/Volumes/Dev/Code/skald-web-copy-20260913/`
  - `source.patch` / `deploy.patch`: binary git patches of the same thing (`git apply --check` passes on both clean worktrees)
  - `original/`: untouched copies of the files being replaced (for diffing)
  - `build-candidate.mjs`: deterministic HTML/CSS build (exact-match replacements, each asserted to match once)
  - `og-render/`: OG card source (`og.html`, `fonts.css`, `fonts/`, `03-parallel.png` copy), `og-render.mjs`, raw render PNG
  - `validation/`: `pixel-parity.mjs` + json, `shots-check.mjs` + `shots/`, verifier output in `landing-render/`
  - `MANIFEST.sha256` (candidate files), `INPUTS.sha256` (read-only inputs)
- Scratch (not deliverable): `/tmp/skald-opus-20260915/work/` (preview root, thumbnails, rotated PNGs)

Source and deploy candidate files are byte-identical (`index.html`, `styles.css`, 4 webps, OG jpg).

## What changes

Same set in both repos (paths relative to `skald/` or deploy root):

| File | Change |
|---|---|
| `index.html` | the 4 image mappings, dimensions, alt text, art caption, and cache keys from `candidate-native-index.html`; stylesheet key `?v=20260913-native`; `native-shot` / `tablet-shot` classes on the 4 figures; OG/Twitter image URL and alt (see social below) |
| `styles.css` | 17-line scoped block appended at the end (below) |
| `assets/reader-art.webp` | = reviewed `native-web-preview/reader-art.webp` (1320×2868) |
| `assets/nostos-route.webp` | = reviewed `native-web-preview/nostos-route.webp` (1920×1080) |
| `assets/greek-split.webp` | **re-encoded** from `ios-ipad/03-parallel.png`, 2752×2064 (see orientation bug) |
| `assets/museum-guide.webp` | **re-encoded** from `ios-ipad/07-art.png`, 2752×2064 (see orientation bug) |
| `assets/skald-odyssey-og-070.jpg` | **new** 1200×630 social card, 158,650 bytes |

The old `assets/skald-odyssey-og.jpg` stays put. `updates/index.html` and `translations/guide/index.html` still point at it, and `verify-feedback-render.mjs` / `scripts/test-encrypt-skald-mosaic.mjs` read it as a fixture. Overwriting it would change those unrelated routes and tests, so the landing page points at a new file instead.

The candidate `index.html` differs from `candidate-native-index.html` only in the 4 OG/Twitter meta lines and the class hooks on the 4 figures. The mapping, dimensions, alt text, caption, and image/stylesheet cache keys are byte-for-byte the same, including the `Butler&#x27;s` entity.

### Scoped CSS

```css
/* Native 0.7.0 captures keep their full aspect ratios: no crop, no tint. */
.shot-card-phone.native-shot img {
  aspect-ratio: 1320 / 2868;
  object-fit: contain;
  filter: none;
}

.landscape-shot.native-shot .shot-mount img {
  aspect-ratio: 16 / 9;
  object-fit: contain;
}

.landscape-shot.tablet-shot .shot-mount img {
  aspect-ratio: 2752 / 2064;
}
```

These override the old `9 / 16` + `object-fit: cover` + `filter: sepia()` on the hero, the `4 / 3` on the journey image, and the `16 / 9` crop on the two iPad images. The existing rules are untouched, so nothing else on the page is affected.

### Social

- `og:image` / `twitter:image`: `https://skald.mannamila.com/assets/skald-odyssey-og-070.jpg?v=070-native-20260915`
- `og:image:alt` / `twitter:image:alt`: `Skald 0.7.0 on iPad, with the Ancient Greek beside an English translation.` (`greek_alt` from `candidate-native-web.json`, verbatim)
- `og:image:width/height` unchanged (1200/630). No other meta changed.
- Card text is exactly `Skald: Odyssey`, `Spend some time with the Odyssey.`, and `A look at our next app update.` The render script asserts the page's `innerText` equals those strings and nothing else. "Odyssey" is set in italic, the same way the site hero does it.
- Screenshot: actual `ios-ipad/03-parallel.png` (sha `0fb91a86…`), shown whole and uncropped at 668×501 on a paper mount. Rendered with plain HTML/CSS in headless Chrome using the site's own fonts (Cormorant Garamond, Inter) and palette. No generative imaging, and no edits to the screenshot pixels.
- **Needs R1 + R2 + arbiter** before it goes to production; this is the new social addition.

## Orientation bug found in the reviewed preview webps

`ios-ipad/03-parallel.png` and `ios-ipad/07-art.png` store a 2064×2752 pixel buffer plus a PNG `eXIf` chunk with **Orientation = 8**, so browsers show them as 2752×2064 landscape. `candidate-native-index.html` has the right `width="2752" height="2064"`. But `native-web-preview/greek-split.webp` and `museum-guide.webp` were encoded from the raw buffer (reproduced exactly with `cwebp -q 88 -m 4 -metadata none`) and have no EXIF chunk, so **on the site they would have shown up rotated 90° and squashed into a landscape box.**

Fix: rotated the PNG pixels to display orientation (`sips -r 270`), then encoded with the same `cwebp -q 88 -m 4 -metadata none`. Nothing else about the pixels changed. Chrome pixel parity against the source PNGs (EXIF applied):

| webp | vs capture | mean abs diff (0–255) | pixels off by >48 |
|---|---|---|---|
| reader-art | ios-phone/01-reader.png | 0.836 | 0% |
| greek-split | ios-ipad/03-parallel.png | 0.726 | 0% |
| museum-guide | ios-ipad/07-art.png | 0.733 | 0% |
| nostos-route | android-tablet/08-voyage-map.png | 0.698 | 0% |

The reviewed mapping and source PNG hashes haven't changed. The two tablet webp hashes do differ from the `native-web-preview/` files (`cf2b6955…` and `fcf9da94…` instead of `840588de…` and `ebaaa41f…`), so whatever registry records the preview webp hashes needs those two updated. Whoever owns `native-web-preview/` in the app repo should also regenerate those two files (I didn't touch the app repo).

## Validation

All checks ran against a copy of the deploy tree (minus `.git` and `mosaic/`) with the candidate files on top, at `/tmp/skald-opus-20260915/work/preview-root`.

1. `/tmp/verify-skald-landing.mjs` (read it first): **PASS** at 1440×1000 and 390×844. No horizontal overflow, 0 broken images, 0 missing anchors, 4 store links, preview disclosure present, no JS exceptions. Screenshots in `validation/landing-render/`.
2. `validation/shots-check.mjs`: **PASS** at both widths. Lazy images are forced to load. For each of the 4 figures it checks natural size, width/height attributes, cache key, alt text (against the JSON), art caption, that the rendered layout box matches the natural aspect ratio (±0.5%) so nothing is cropped, `filter: none`, and that nothing spills past the viewport. It also checks the preview notice text verbatim, the stylesheet key, all OG/Twitter image meta, no JS exceptions, and no same-origin 4xx other than Chrome's automatic favicon request. Screenshots of hero/#translations/#journey/#art in `validation/shots/`.
   - Rendered image boxes at 1440: hero phone ≈350×760, Greek 690×518, map 16:9, art 690×518. At 390: hero 292×634, Greek 340×255, map 340×191, art 340×255.
3. `validation/pixel-parity.mjs`: **PASS** (table above).
4. `og-render.mjs` assertions: fonts actually loaded, image natural size is 2752×2064, text is exact, the page is exactly 1200×630, the screenshot fits uncropped, and the copy doesn't overlap it. Output checked by eye.
5. Rendered screenshots, the raw decodes of the new webps, and the OG card were all checked by eye.
6. Not run, as instructed: the legacy all-site `verify-site.mjs`, Atlas tests, and the encrypted-source verifier.

## Limitations / what the parent needs to handle

- **Approvals:** the 4-image mapping, alt text, and caption are the reviewed content, applied verbatim. The OG card, social alt, and new OG URL need R1 + R2 + arbiter. The two re-encoded tablet webps should also be noted in review, since the files differ from the reviewed previews but the source PNGs are the same.
- **`skald/verify-landing-copy.py`** asserts `index.html` sha256 equals `content-review-registry.json` → `approved_sha256.resolved-index.html` (currently `0ac01407…`, the live page). It will fail until the arbiter records the new hash `2d52ae4d23fa614cb735b01920e10c6ea21b5daefb2c09f5aa8e770c24d1be2b`.
- **`skald/verify-site.mjs`** still pins old values, and `scripts/promote-skald.mjs` runs it before `--apply`, so promotion will fail until these lines are updated. I haven't edited them:
  - L194 `src="./assets/nostos-route.webp"` (the quote right after `.webp` rejects the `?v=` key)
  - L195 the old map alt text
  - L198 the old `og:image` URL
  - optionally add `assets/skald-odyssey-og-070.jpg` to `requiredFiles` (L52–56)
- **`.skald-source.json`** in deploy is already stale (its `index.html` hash `f68d6555…` isn't the current `0ac01407…`), so I didn't hand-edit it. `promote-skald.mjs --apply` regenerates it. If the parent copies files by hand instead, it stays stale, same as after #74.
- **Page weight:** the 4 screenshots come to about 967 KB, up from about 351 KB, since they're full native resolution at the reviewed q88. The hero phone image is 260 KB with `fetchpriority="high"`. If that matters, downscaling (e.g. 1600 px on the long edge) would roughly halve it without touching content, but that's a separate call.
- **Hero height:** at 1440×1000 the uncropped phone shot makes the hero visual about 900 px tall, so the "Read · compare · explore" margin note ends up near the fold. That's the direct result of dropping the 9:16 crop, as asked.
- **Social crops:** some clients (square previews) center-crop 1.91:1 cards, which would clip the title and part of the screenshot. That's normal for OG cards, and the full image is intact.
- **Fonts for the OG render** were downloaded from Google Fonts (public OFL woff2, the same families the page loads) and saved in `og-render/fonts/` so re-renders come out the same.
- The app repo's `docs/marketing/store-web-2026-09-13/` inputs are untracked files in that checkout (`git status` shows them as `??`). They were read only.

## Applying (after approval)

```sh
git -C /Volumes/Dev/Code/mannamila-web-copy-20260913 apply --binary /tmp/skald-opus-20260915/web-candidate/source.patch
git -C /Volumes/Dev/Code/skald-web-copy-20260913 apply --binary /tmp/skald-opus-20260915/web-candidate/deploy.patch
```

Or copy `source/skald/*` and `deploy/*` over the matching paths. Then deal with the verifier pins and registry hash above before running `promote-skald.mjs`.
