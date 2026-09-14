# Independent reader review

Reviewer role: reader usefulness, clarity, art relevance, and provenance  
Reviewer/model: reviewer 2, gpt-5.6-sol/high  
Reviewed source: Skald `6d846a8d46b1467ad68c353c5e489245155465c2` and website `5d6168d`  
Production changes: none

## Decision

**Approve after required corrections.** The candidate has the right reader value and voice: it presents a large Odyssey library as an invitation to read, compare, follow a detail, and return. It avoids inflated learning promises and does not guarantee novelty on every reread. Three accuracy/clarity corrections are needed before production:

1. Replace “48 museum collections” with “48 collections” or “48 museum and cultural collections” everywhere. The 48 catalog groups include museums and galleries, but also a national library, a palace, and other kinds of collections.
2. Replace “the others have a citation and publisher link” with “the others have a citation and DOI link” in the store description and website notes section. The rendered action is “Open DOI”; the publisher is named in the citation line but is not a separate publisher-link field.
3. Avoid implying that every catalog record names an artist and date. Twenty-eight of the 230 records have no artist value and one has no date. In the store description and website art section, use the consistently available details: title, medium, collection, source/credit, and rights. A compact accurate version is “Open paintings, prints and ancient objects with their collection, source and rights details.”

After those changes, I recommend approval without further editorial expansion. The exact count-led copy is balanced by the warmer “Spend some time with the Odyssey” framing, and the repeated invitations to try another translation support deep rereading without becoming a slogan or a guarantee.

## Candidate reviewed

- `candidate-store.json`: `1a263818ec896ee6cd3753172cee9d8dad61c7bf9812c11b46144143e8ceb633`
- `candidate-index.html`: `66f0a71be610df9100965ea9059078134cd4751aa101e3a2f14da4f0e8104249`
- `candidate-captions.json`: `8169389b57439446cba84c6e320bc088c8c42a0992d969a7384f62faf6de9d89`
- `brief.md`: `d51987a585c188f6f98ca1c6e1318e50574f576200e9615983638cb152caf131`

The entire candidate homepage was reviewed, including retained FAQ, availability, privacy/offline, pricing, update-signup, and independence copy.

### Candidate-specific findings

- “24 translations in 11 languages, plus Ancient Greek” is accurate and clear. The fuller breakdown into 13 English, two French, and one in each of nine other named languages adds up correctly.
- “3,288 reading notes” is an accurate corpus count. The candidate correctly uses “thousands” in the hero and reserves the exact number for proof/store fields. It does not present the count as 3,288 independent scholarly findings.
- “Fresh notes can surface as you reread or change editions” is appropriately qualified. It matches per-edition consumed state, alternate eligible notes, local ranking, and re-resolution when the translation changes.
- “54 journal articles” correctly deduplicates the 68 passage placements by DOI. “42 have direct full-text links … online” is accurate and avoids claiming that full articles are bundled in the app.
- The art copy correctly distinguishes scene illustrations from objects that illuminate customs, crafts, and everyday life. The 230 figure is the museum-catalog record count; it should not be combined with inline-plate counts. “Artworks and artifacts” is understandable, though “works and objects” is plainer if the arbiter wants a less institutional phrase.
- The upcoming-release disclosure is brief and explicit. The nearby “Available now” line refers to the current store app and could momentarily slow a reader, but the disclosure precedes it and the final call to action repeats that the expanded library arrives in version 0.7.0. I do not treat this as a blocker for publication ahead of the release.
- The remaining independence sentence uses a factual “not affiliated” disclosure rather than a rhetorical “not X but Y” construction. It should remain.
- “A little closer to ancient lives” and the paragraph about meals, hospitality, boatbuilding, and waiting at home capture the requested value without overclaiming certainty. The candidate also credits generations of translators, artists, and scholars in a restrained way.
- Screenshot captions are accurate to their named surfaces. If one optional tone edit is made, “24 translations. Try another voice.” could become “Try another translation” to sound less like an advertising slogan, but this is not required for approval.

## Reader-facing evidence

### Notes and rereading

- The content contains 3,288 distinct note records across all 24 books. That is a useful catalog count, but it should not be described as 3,288 wholly independent scholarly discoveries.
- Of those records, 2,678 are available across editions and 610 are scoped to one or more translations. There are 469 notes scoped to exactly one translation. The clearest reader-facing description is therefore “more than 3,000 notes,” with a separate explanation that some notes respond to the wording of a particular translation.
- Translation-focused material is substantial: 475 `craft` notes and 127 `translator` notes, or 602 records in those two kinds. This supports copy about seeing how a translator handles a line or phrase.
- The reader does not put all notes on the page at once. It selects marks from the catalog, records opened notes per edition, and lets readers browse all notes available to the open edition through “Notes about this book,” including total and opened counts.
- Opened notes leave the live selection for that edition, allowing other eligible notes to surface. Selection also responds to local engagement, uses a day-based seed, and resolves notes again when the translation changes. A reread can therefore produce a different set of visible notes. It is not guaranteed that every reread or every session will show something new.
- Recommended promise: “Fresh notes can surface as you reread or switch translations.” Avoid “every reread reveals something new,” “endless discoveries,” or similar guarantees.

### Translations and Greek

- The manifest contains 24 translations in 11 languages: 13 English translations and 11 translations across ten other language codes. Ancient Greek is a separate original-text reading pane.
- “24 translations across 11 languages, beside the original Greek” is accurate and easier to understand than presenting Greek as a twenty-fifth translation.
- Notes can be tied to a particular edition, and universal notes carry reviewed phrase anchors across editions. Switching translations can change both the wording under discussion and the notes that are eligible to appear.
- The strongest reader value is concrete: stay at the same passage, switch voices, compare choices, and open a short explanation of what changes. Avoid claims that the app explains every difference or provides exhaustive textual commentary.

### Art and collections

- The museum catalog contains 230 unique records across 48 named collections. Every record has an image and collection URL. The detail surface shows the holding collection, object metadata, a short passage-relevant explanation, credit, and a public-domain or CC BY rights line.
- The records include paintings and prints as well as vases, coins, mirrors, reliefs, statuettes, and other objects. “230 artworks” is understandable shorthand, but “230 works and objects from 48 collections” is more faithful to what readers actually browse.
- “48 museum collections” is slightly too narrow. The named holders also include a national library, a palace, and other art collections. Use “48 collections” or “48 museum and cultural collections.”
- Art is connected to reading in two ways: the searchable catalog and inline plates placed beside relevant passages. The 24 book masters contain 263 plate placements using 171 unique image assets. Many plates repeat where the same work helps explain more than one passage, and some older historical plate assets do not have full catalog records. Do not add the plate and catalog counts together.
- The useful promise is that art is placed near the scene or object it illuminates and keeps its source close. Avoid suggesting that every catalog object appears inline or that every object is currently on view. Only 61 of the 230 catalog records are marked on view, with month-stamped status.

### Scholarship and articles

- There are 68 citation-note placements representing 54 unique articles by DOI. Repeated placement is useful because one article can bear on more than one passage, but “68 articles” would overcount the library.
- The citation card shows title, author, journal, year, an editorial “Why here” explanation, licence and DOI. Forty-eight of the 68 placements include an abstract excerpt.
- Forty-two unique articles have direct full-text links; every article has a DOI link. The app’s “Read in full” action opens the linked URL through the platform URI handler. The full article body is not bundled or rendered as part of the offline reader.
- Recommended promise: “Open-access scholarship is linked to the passages it discusses.” If a number is useful: “54 articles represented by 68 passage-linked notes, with direct full-text links for 42.” Avoid “68 full journal articles in the app.”

## Voice and value

The copy should lead with the gathered Odyssey library and what a reader can do with it. A good value sequence is: read the whole poem at a comfortable depth; stay with a passage across Greek and translations; open the art, objects, language, and scholarship connected to it; return in another voice and notice something else.

The intended emotional value can be stated plainly: the app gives readers time with the poem, the ancient world around it, and generations of translators, artists, and scholars. “A deep, rewarding reread” works as an invitation or aspiration. It should not become a promise that the app produces a novel insight every time.

Prefer ordinary verbs such as read, compare, open, follow, return, and notice. Avoid slogans, superlatives, “not X but Y” pivots, and broad claims that turn a rich reading library into an achievement badge.
