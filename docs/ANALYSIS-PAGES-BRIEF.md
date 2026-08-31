# ANALYSIS-PAGES-BRIEF — deep per-translation analysis pages (owner ruling 2026-08-30)

Repo ~/Code/skald-web, branch feature/translation-analysis-pages (verify with
`git branch --show-current`; never switch/commit/push; only this tree). This is the LIVE
marketing site skald.mannamila.com. Read: index.html + styles.css (house style),
translations/index.html (the atlas — embedded DATA JSON ~line 264, 233 records; Skald
in-app records carry a truthy "skald" field), translations/guide/index.html (the page
pattern to imitate: head/meta/OG, nav, footer, sitemap conventions), sitemap.xml.

DATA SOURCES (read-only, from the app repo):
- /Volumes/Dev/Code/skald/docs/content/translation-stats/<id>.json (24 files) + index.json
- /Volumes/Dev/Code/skald/docs/content/translation-stats.md
- /Volumes/Dev/Code/skald/docs/content/greek-lexicon-stats.json
- the atlas DATA itself for names/years/blurbs/links.

BUILD:
1. /translations/analysis/index.html — overview: what this analysis is (surface-form corpus
   statistics + line-aligned rendering variation; honest method note), a table of the 24
   Skald translations (name, year, language, tokens, TTR, top formula) each linking to its
   page.
2. /translations/analysis/<skald-app-id>/index.html x24 — per translation:
   - headline stats (tokens, unique forms, TTR, mean sentence length) with a small
     static bar viz vs same-language siblings (inline SVG, house palette);
   - "The translator's formulas": top 10 recurring phrases with counts + 2 locations each;
   - "One Greek word, many choices": the 4-6 best rendering-variation cases for THIS
     translation (term in Greek script + transliteration, the variant renderings with
     book.line refs, stability) — pick cases where variation is REAL and visible;
   - "Against its siblings": 120-180 word NARRATIVE comparing this translation with the
     other Skald translations sharing its language (or, for single-translation languages,
     its closest form/style group) — grounded ONLY in the stats (distinctiveness lists,
     TTR, formula habits) + the atlas blurbs; no invented claims;
   - link back to the atlas entry + the app store links found in the atlas record.
3. NARRATIVE PROTOCOL (three-agent, machine-recorded): stage the 24 narratives through
   draft -> review1 (verify EVERY numeric/statistical claim against the JSONs; reject
   anything unverifiable) -> review2 (clarity, marketing tone: serious, no hype) ->
   arbiter (only its output ships). Run these stages YOURSELF sequentially as separate
   passes writing work files under docs/analysis-reviews/ (draft.json, review1.json,
   review2.json, final.json + a REVIEWS.md recording the three roles with model
   gpt-5.6-sol for all three passes and the review basis). This is the site-content
   adaptation of the app's protocol; keep the records.
4. ATLAS LINKING (SURGICAL — never regenerate the DATA from any script): for each of the
   24 records with a truthy "skald" field, append {"host":"Skald deep analysis",
   "url":"/translations/analysis/<id>/"} to that record's links array, editing the
   embedded JSON in place with a careful script you write for this purpose; verify the
   page still parses (node --check equivalent: extract DATA and JSON.parse it) and that
   record count stays 233. If the atlas card template needs a tweak to surface the link
   prominently for skald records, make the minimal change consistent with existing pills.
5. sitemap.xml: add the 25 new URLs. OG tags per page (reuse translations/assets/og.jpg).
6. VERIFY: a small node script docs/verify-analysis.mjs asserting: 25 pages exist, every
   Skald atlas record links to an existing analysis dir, DATA parses, every numeric claim
   file in final.json matches the shipped HTML (spot: the headline numbers). Run it and
   include output in the report.

Style: match the site (fonts, palette, spacing); pages must be readable on phones; no
external JS/frameworks; static only. Report docs/ANALYSIS-PAGES-REPORT.md: files, protocol
records summary, verify output verbatim. Never commit or push.
