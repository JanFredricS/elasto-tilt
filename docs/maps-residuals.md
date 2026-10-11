# Current map review and remaining design work

The first layouts and their review records are historical. The current ten-map redesign is documented in [maps.md](maps.md), [early routes](campaign-early.md), and [late routes](campaign-late.md). Fresh Astra review is in [review-campaign-v2-1.md](review-campaign-v2-1.md). Its implementation findings were addressed: Clockwork bounds contain the full lift travel, Attic copy describes the actual low route, and Engine asserts wheel support on the compact seat. The route table and test references have been replaced for the redesign.

All ten routes have successful normal-input Rapier playthroughs. Swings carry riders and matter to the tested crossings; removing each deck causes its unchanged route pilot to crash. Clockwork’s frozen-lift and missing-reverse experiments fail the corresponding route. These experiments establish the demonstrated solutions, not uniqueness across every possible control sequence.

Remaining design work:

- Sustained one-wheel upside-down hanging and brake-assisted capture of a swing are not yet campaign requirements. The separate cradle fixture demonstrates a strong-brake wheel catch and pivot.
- Attic’s loose weights and Conservatory’s inverted weights are physical objects, not required switches. Mill’s different lengths have different motion, but the passing route does not require waiting for a specific period.
- Escher is a readable planar spiral through four gravity faces, with a shared ceiling/floor and an inner reversal. It has no impossible topology or portal transition.
- Long controlled replay times are not minimum completion times. More human playtesting is needed to tune difficulty and discover shortcuts.
- Physical phone comfort, orientation changes and sustained frame pacing still need hardware validation.

## Bernoulli’s Updraft (map 18)

Full write-up: [bernoulli-updraft.md](bernoulli-updraft.md), "Residuals / known issues".

- The 90°-per-flight concept is physically impossible: each crossing would need half a turn through straight up and add about 20 m/s. The chimney sway is free; only turning over and turning gravity back up within about .6 s of the launch are enforced.
- There is a release cliff at the lintel. The world must turn to at least 4.1 rad; 4.05 or earlier crashes, and 4.05–4.15 is chaotic. It is telegraphed by KEEP TURNING, not widened. Loop, lintel and lip variants were all rejected with data.
- The map is short (85 m / 16 s) for slot 12.75. That is accepted as a short precision map, like Hooke’s Springboard.
- At 1/60 s, one grid run that completes at 1/120 s crashes at the roof’s end. The game's fixed 1/120 s step makes this test-only.
- The map has not been played on a phone.
