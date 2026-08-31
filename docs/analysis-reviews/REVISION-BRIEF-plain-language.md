# Copy revision review — plain-language pass on /translations/analysis/ (2026-08-31)

Owner feedback on the live pages: (1) "stability" was unexplained jargon; (2) the
"One Greek word, many choices" cards did not quote the Greek; (3) "tokens" reads as
AI/LLM jargon. The generator now (a) quotes, for every variant, the exact Greek line
containing the headline form (accent-exact selection: grave→acute normalized, all other
diacritics distinguishing, so δῖος never matches Διός); (b) renames the stability chip;
(c) replaces token/type–token terminology in all user-facing copy, including a
display-layer map over the reviewed narratives (registry final.json untouched).

## Ground truth (from tools/scholia/translation-stats.mjs)
- A term's per-occurrence `candidates` = content words in the aligned or estimated line
  window after a corpus stoplist. The modal candidate is the candidate appearing in the
  most occurrence windows. `stability = modalOccurrences / occurrenceCount`.
- Word counts: Unicode letter-and-mark runs, lowercased, no stemming/lemmatization.
  typeTokenRatio = uniqueForms / tokens. Sentence length = punctuation split.

## Changed user-facing copy (review THESE exact strings)

1. Stability chip: `usual wording NN%` with title attr: "Share of this word's passages
   where the translator's most frequent nearby rendering choice appears again".
2. Variation aside: "**What "usual wording" measures.** For each Greek word we look at
   the words that appear near it in this translation and find the one it most often
   travels with — the translator's habitual choice. The percentage is the share of that
   word's passages where the habitual choice shows up again. It measures habit in
   wording only, not meaning, fidelity, or quality."
3. Variation intro adds: "The Greek line that contains the word is quoted first, then
   the passage rendering it."
4. Overview method note: "A "word" here is an unbroken run of letters, lowercased, with
   no stemming — so "sing" and "singing" count separately. Vocabulary variety is
   distinct word forms divided by total words; sentence length uses a simple punctuation
   split. "Formula" means a recurring phrase of three to six words, not necessarily an
   oral formula. Rendering candidates are context words, not asserted translations.
   Cross-language totals are descriptive only, because spelling and inflection differ
   by language."
5. Chart aside: "A higher distinct-word figure can reflect grammar, spelling, or corpus
   conventions as well as vocabulary…" (was "A higher TTR can reflect morphology,
   orthography, or corpus conventions…").
6. Labels: stat tiles now words / distinct word forms / distinct ÷ total words / mean
   sentence length; chart legend same; overview table headers Words / Vocabulary variety.
7. Formulas intro: "The ten highest-ranked recurring phrases of three to six words,
   ordered by a count-times-length score."
8. Narrative display map (reviewed text otherwise verbatim): tokens→words, token→word,
   "unique forms"→"distinct word forms". Example result: "The corpus contains 117938
   words and 6322 distinct word forms."

## Questions
- R1 (accuracy/method fidelity): Does each string state the method truthfully? Any
  claim now stronger than the computation supports? Is "usual wording" an honest name
  for modal-candidate share? Does the grave→acute accent fold introduce false Greek
  matches (e.g. any pair distinguished ONLY by grave vs acute in lexical form)?
- R2 (lay-reader clarity/usefulness, independent): Would a non-specialist understand
  each string on first read? Any remaining jargon? Is the Greek-first card layout
  self-explanatory? Better wording where unclear.

Write verdict JSON {reviewer, verdicts: [{item: 1-8, verdict: accept|revise, revision,
reason}], overall} to the path given in your prompt. Do not modify any repo file.
