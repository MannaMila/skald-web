# Ten most interesting Greek words in the Odyssey — draft brief (2026-08-31)

Owner request: a page ranking the top ten "most interesting" Greek words in the
Odyssey — words translators most often render differently / stamp with their own
choices. Audience: general readers; plain language (no "tokens", no "modal candidate";
where per-translation statistics are cited, use the "recurring nearby word" framing).

## Candidate words (select the TEN; argue any substitution)

πολύτροπος (1.1, the famous crux — Butler "ingenious"), ἀμύμων (1.29, "blameless"
Aegisthus problem), νόστος (1.5 etc.; the homecoming word), θυμός, μῆτις (incl. the
Οὖτις/μή τις pun, 9.405-414), κλέος (9.19-20 area), ξεῖνος (xenia; e.g. 14.57-58),
ψυχή (Book 11 shades), δαίμων, πεπνυμένος (Telemachus's epithet — corpus shows 12
distinct recurring nearby words across English translations), οἶνοψ πόντος (wine-dark
sea, e.g. 1.183, 2.421), ἀτασθαλίαι (1.7, "their own recklessness"), γλαυκῶπις
(Athena's epithet), πολύμητις.

## Per selected word, produce (all VERIFIED, nothing estimated)

1. Greek headword in native script + transliteration + a short literal gloss.
2. One flagship Homeric line quoted in Greek (from
   /Volumes/Dev/Code/skald/core/src/main/assets/content/odyssey/<family>/greek.json —
   lines[{n,t}]; the line MUST contain the headword form; give book.line).
3. renderings: for EVERY English translation in Skald (butler, palmer, murray,
   butcher-lang, cowper, bryant, pope, chapman, hobbes, morris, worsley, cotterill,
   johnston): the VERBATIM phrase that translation uses for the word at the flagship
   line, extracted from the chunk containing that line in
   <family>/translation-<id>.json (chunks[{start,end,en}]). Record
   {translationId, phrase, window} where `phrase` is a verbatim substring of `window`
   and `window` is a verbatim substring of the chunk text. When a translator omits or
   paraphrases the word away, record {translationId, omits: true, note} — that is
   itself interesting. Non-English translations: include up to 3 notable ones per word
   only when genuinely notable (e.g. Voss, Leconte, Segalá), same verbatim rule.
4. narrative: 90-140 words — why the word resists translation, what the choices reveal,
   one or two named-translator contrasts. Concrete, no hype, no jargon.
5. sources: primary locus (Odyssey book.line) + at least one independent source from
   the canon: LSJ s.v. (native script), Cunliffe, Autenrieth, Heubeck-West-Hainsworth
   ad loc., de Jong, M.L. West, Nagy, Parry/Lord, skald-translation-stats (cite as
   corpus statistic only, with the recurring-nearby-word framing). NEVER invent a work
   or a page number; cite s.v./ad loc.
6. Ranking: order the ten by interest with a one-line reason each (the ranking is
   editorial; say so honestly).

## Output

Write ONLY <SCRATCH>/greek-words-draft.json:
{selection: [{rank, headword, translit, gloss, flagship: {location, greekLine},
renderings: [...], notableOther: [...], narrative, sources, rankReason}],
rejected: [{headword, whyNot}], method: one paragraph in plain language}.
Verify every Greek line and every rendering phrase by actually reading the JSONs;
a reviewer will re-grep each one and reject fabrications. Do not modify any repo file.
