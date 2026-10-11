# Current map review and remaining design work

The first layouts and their review records are historical. The current ten-map redesign is documented in [maps.md](maps.md), [early routes](campaign-early.md), and [late routes](campaign-late.md). Fresh Astra review is in [review-campaign-v2-1.md](review-campaign-v2-1.md). Its implementation findings were addressed: Clockwork bounds contain the full lift travel, Attic copy describes the actual low route, and Engine asserts wheel support on the compact seat. The route table and test references have been replaced for the redesign.

All ten routes have successful normal-input Rapier playthroughs. Swings carry riders and matter to the tested crossings; removing each deck causes its unchanged route pilot to crash. Clockwork’s frozen-lift and missing-reverse experiments fail the corresponding route. These experiments establish the demonstrated solutions, not uniqueness across every possible control sequence.

Remaining design work:

- Sustained one-wheel upside-down hanging and brake-assisted capture of a swing are not yet campaign requirements. The separate cradle fixture demonstrates a strong-brake wheel catch and pivot.
- Attic’s loose weights and Conservatory’s inverted weights are physical objects, not required switches. Mill’s different lengths have different motion, but the passing route does not require waiting for a specific period.
- Escher is a readable planar spiral through four gravity faces, with a shared ceiling/floor and an inner reversal. It has no impossible topology or portal transition.
- Long controlled replay times are not minimum completion times. More human playtesting is needed to tune difficulty and discover shortcuts.
- Physical phone comfort, orientation changes and sustained frame pacing still need hardware validation.

## Noether’s Symmetry (map 23)

The full list is in [noether.md](noether.md#residuals--known-issues). In brief:

- The original chock floats off-map on the return. This is cosmetic and accepted, because a pocket-and-lip containment introduced a chock jam that stalled the twin plank.
- The pilot now recovers from a missed lift roll-off. A late lift boarding (`push: .3`, untested variant) can still drift the twin wedge onto its lip and jam it .25 m short. A player recovers by rolling back and re-pushing.
- Holding +.3 rad for a minute at the spawn creeps the original plank enough to crash boarding. A restart fixes it.
- The nose interiors are see-through hoops.
- The phone playtest of the −2π circuit is still needed, and the e2e coverage was added but not run.

