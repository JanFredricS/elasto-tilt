# Current map review and remaining design work

The first layouts and their review records are historical. The current ten-map redesign is documented in [maps.md](maps.md), [early routes](campaign-early.md), and [late routes](campaign-late.md). Fresh Astra review is in [review-campaign-v2-1.md](review-campaign-v2-1.md). Its implementation findings were addressed: Clockwork bounds contain the full lift travel, Attic copy describes the actual low route, and Engine asserts wheel support on the compact seat. The route table and test references have been replaced for the redesign.

All ten routes have successful normal-input Rapier playthroughs. Swings carry riders and matter to the tested crossings; removing each deck causes its unchanged route pilot to crash. Clockwork’s frozen-lift and missing-reverse experiments fail the corresponding route. These experiments establish the demonstrated solutions, not uniqueness across every possible control sequence.

Remaining design work:

- Sustained one-wheel upside-down hanging and brake-assisted capture of a swing are not yet campaign requirements. The separate cradle fixture demonstrates a strong-brake wheel catch and pivot.
- Attic’s loose weights and Conservatory’s inverted weights are physical objects, not required switches. Mill’s different lengths have different motion, but the passing route does not require waiting for a specific period.
- Escher is a readable planar spiral through four gravity faces, with a shared ceiling/floor and an inner reversal. It has no impossible topology or portal transition.
- Long controlled replay times are not minimum completion times. More human playtesting is needed to tune difficulty and discover shortcuts.
- Physical phone comfort, orientation changes and sustained frame pacing still need hardware validation.

## Euler’s Bridges (second audit)

Full notes are in [eulers-bridges.md](eulers-bridges.md#residuals--known-issues).

- **Landing.** The old level-table lip landed every rider nose-down at about 60°. Survival then flickered with the lean (.22 crashed between .2 and .24), and at 4 m/s over the canals no lean survived. The rider now leaves straight off a tight bend that still heads down, and 245 of 248 sampled leans from level to .6 rad land, at canal speeds of 1–6 m/s.
- **FLOOD.** It is now a real step: turning home on landing leaves b5 under water. It is soft, because a forward-leaning rider's momentum nearly reaches the wall unaided.
- **Difficulty.** 12.25 holds: the conceptual load is high and the execution load is moderate.
- **Readability and polish.** Sunken decks show the red water band above them, so they read as under water. b5 overlaps the chute's launch cosmetically at the clock-empty reading (whole-map view only).
- **Untested.** The river half is pure execution, and phone feel is untested.
