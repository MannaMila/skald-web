# Reviewed Skald 0.7.0 privacy pages

The English page renders the canonical policy approved in MannaMila/skald's
2026-09-13 iOS ATT arbitration. The French page renders its independently reviewed
translation. Both use an effective date tied to first availability of 0.7.0 and
retain a separate earlier-versions explanation.

English policy SHA-256: `5d8a0792497042116ca72e10a679e1c3de0511c12a250be8d91942ceb66e4787`.
French policy SHA-256: `7dbe1796f56470dcf03a8143d2cf8fd8c6d892d7f011fb0b84a7017a3f9433b5`.
French arbitration SHA-256: `201ae46d49d96ef19dce61fcd3324249aff15db1bc68aeda3b959bbdf270e4bf`.
The app repository records the review roles, models, findings, and decisions in
`docs/sessions/2026-09-13-ios-att/`; French approval was committed as `7e4765efd`.

`parity-report.json` proves every visible policy word matches its approved source,
and that the two staging repositories contain identical policy HTML. The 390px and
1280px renders and `visual-report.json` show no horizontal overflow. Existing site
styles and language navigation are retained; the French body now uses the shared
bounded reading column.

This is a scoped privacy update, not a full promotion of the canonical site tree.
The independently maintained Mosaic, Translation Atlas, translators, and other
published surfaces remain outside the patch. No app-store operation is included.
