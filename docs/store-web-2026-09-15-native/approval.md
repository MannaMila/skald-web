# Final arbiter resolution: Skald native screenshots + iPad panels (2026-09-15)

**Decision: APPROVED** for both scopes, with no required corrections. No text was rewritten. This approval applies to the existing candidate bytes and nothing else.

| Role | Model | Session |
|---|---|---|
| Reviewer 1 (accuracy, anchors, claims) | claude-opus-5 | d7e94db3-4e7a-4cc9-89a0-771bcae6c315 |
| Reviewer 2 (reader value, art, provenance) | claude-opus-5 | 812ab667-2aca-4a5c-a84d-904bd9edaee2 |
| Final arbiter | claude-opus-5 | 9a20fe09-5729-4aa6-b8f0-ee342c4479a2 |

The authoritative record is `review-registry.json`. All of its hashes were recomputed from the actual bytes, and each value is the full 64-character sha256.

## A. Website: exactly 7 files (deploy root, mirrored at `skald/`)

| Path | sha256 |
|---|---|
| index.html (= `resolved-index.html`) | 2d52ae4d23fa614cb735b01920e10c6ea21b5daefb2c09f5aa8e770c24d1be2b |
| styles.css | d6c5c79d4ecc92a044a0b29489d560bb77d76ae3490b0debde2afa43620174b4 |
| assets/reader-art.webp | 10088bdc800d7d373dc6c9130497b7ddf64333ce5a2477a2bb45bfcc56b505be |
| assets/greek-split.webp | cf2b6955d19f5cda39e6441018ef05dfda9c360bfa05ca444a633d17eb38f3b7 |
| assets/museum-guide.webp | fcf9da94ee63fb38886f27156d02680bd0178fdcaf0f522426c3fff7c8095089 |
| assets/nostos-route.webp | 2a3114e2463d3bba79f849c27f4c5be59a070e95b1c1fbfae6dce16061eb20e3 |
| assets/skald-odyssey-og-070.jpg | 4600afb1a3311ea361bb50a419887e106a8a1356ea43b879b8ad1ad8d08f6a33 |

- **Scope:** only these 7 files. Do not copy anything else from the candidate or preview tree. Keep the old `assets/skald-odyssey-og.jpg`.
- **Copy changes:** the diff against the live index (0ac01407…) touches only the 4 image alts, the art figcaption, the og/twitter image URL and alt, the stylesheet key, and the class hooks. The 0.7.0 upcoming notice is kept verbatim, and there is no EU/UK claim.
- **Images:** the two iPad webps are upright 2752×2064 with EXIF-8 correctly applied. The OG card uses the real Greek iPad capture, uncropped, with only the 3 approved lines.

## B. iPad App Store panels: exactly 4 (`docs/store/marketing-panels/`)

| Path | sha256 (new) | superseded |
|---|---|---|
| app-store/ipad-13/ipad_01_greek_split.png | 3a28db975ba49d67a94aa069b839c6769362d03c5d8a609d1dd862201f2af01e | 7f776fcb… |
| app-store/ipad-13/ipad_02_nostos_route.png | 2825a3435f9f86d2ebc7b2071dc971d25138d1b1ec60c654cccdd8a73473e24d | 13927e8c… |
| app-store/ipad-13/ipad_03_translations.png | 1179b88ca10babb13225971e8e6d5183c46a428ccb53715e3f0e565f9652667f | 742ecec1… |
| app-store/ipad-13/ipad_04_museum_art.png | 5b6732b90e5a12ed4a5afba8d3d0decd6c6c8cd5c104f362ae1e08ac89cc8f63 | 84687486… |

- **Captions and captures:** `captions.json` is unchanged at a85b5c549d2bc7524e843ed07ad29cfae5609194412c697b3beb1eec2bc8bcef, and the raw captures are unchanged. The panels are full-width 2752×2064.
- **Geometry test:** 53/53 with the fixed renderer vs 49/53 with the old one. This is the worker's result and was not re-run.
- **Other 22 production panels:** they currently match `native-panel-hashes.json` and must stay unchanged. Their hashes are in the registry.

## Supersession (history preserved)

- **iPad panels:** `native-capture-review-registry.json` wrongly approved the 4 cropped iPad panels. Only those 4 `renderedPanelSha256` entries are superseded. Do not rewrite or delete the prior record; append or reference this one.
- **Landing index:** in `content-review-registry.json`, only `approved_sha256.resolved-index.html` is superseded (0ac01407… → 2d52ae4d…).
- **Preview webps:** the preview files `native-web-preview/greek-split.webp` and `museum-guide.webp` are unrotated and are not approved.

## Operator next steps (parent)

1. Rebind the guards honestly: the `verify-landing-copy.py` registry hash, and the `verify-site.mjs` pins for the map src/alt and og:image. Regenerate `.skald-source.json` through the promote script.
2. Apply the 7 web files and publish the website: 5 assets plus HTML and CSS.
3. Copy and upload the 4 iPad panels. The store listing stays a draft and app 0.7 stays unreleased.
4. Handle the EU/country work separately.

**Non-blocking:** the in-app Lastman note says "embossed shield". This is app content outside this scope and is worth a separate check. `review2.md` has a prose typo (ipad_04 "…8c63"); the JSON and the actual bytes are …8f63.

This approval makes no public-release, legal-rights, licence, or trader attestation.
