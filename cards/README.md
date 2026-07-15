# Base card catalog

`base.json` is the immutable card catalog used by the rebuilt game. It contains only the legacy `CAH_BASE` deck: 458 answer cards and 76 single-answer question cards.

## Provenance

The catalog was exported on 2026-07-15 from the publicly readable `cards` collection in the legacy `paininmydeck` Firestore database. Only documents whose `decks` array contained exactly `CAH_BASE` were retained. No Firebase API key, session credential, or ignored configuration file was copied into this directory.

Each entry preserves:

- the Firestore document ID as `id`;
- the exact stored `text`;
- the legacy `A`/`Q` distinction as `answer`/`question`;
- all five legacy classification flags; and
- `pick: 1` for every question.

The catalog metadata records its source, version, expected counts, license, and a SHA-256 digest of the compact JSON encoding of the `cards` array. The fixed digest is also asserted by the integrity test so content changes require an explicit catalog-version decision.

Family mode retains a card only when `obscene`, `offensive`, and `sex` are all `false`. It intentionally does not filter the `language` or `politics` flags, matching the original server behavior. Expected family-mode counts are 305 answers and 71 questions.

This file is server-owned game data. Import it from Worker/domain code, not from the browser application bundle.

See [`../LICENSE-CARDS.md`](../LICENSE-CARDS.md) for content licensing and attribution.
