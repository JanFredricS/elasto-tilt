# Current map review and remaining design work

The first layouts and their review records are historical. The current ten-map redesign is documented in [maps.md](maps.md), [early routes](campaign-early.md), and [late routes](campaign-late.md). Fresh Astra review is in [review-campaign-v2-1.md](review-campaign-v2-1.md). Its implementation findings were addressed: Clockwork bounds contain the full lift travel, Attic copy describes the actual low route, and Engine asserts wheel support on the compact seat. The route table and test references have been replaced for the redesign.

All ten routes have successful normal-input Rapier playthroughs. Swings carry riders and matter to the tested crossings; removing each deck causes its unchanged route pilot to crash. Clockwork’s frozen-lift and missing-reverse experiments fail the corresponding route. These experiments establish the demonstrated solutions, not uniqueness across every possible control sequence.

Remaining design work:

- Sustained one-wheel upside-down hanging and brake-assisted capture of a swing are not yet campaign requirements. The separate cradle fixture demonstrates a strong-brake wheel catch and pivot.
- Attic’s loose weights and Conservatory’s inverted weights are physical objects, not required switches. Mill’s different lengths have different motion, but the passing route does not require waiting for a specific period.
- Escher is a readable planar spiral through four gravity faces, with a shared ceiling/floor and an inner reversal. It has no impossible topology or portal transition.
- Long controlled replay times are not minimum completion times. More human playtesting is needed to tune difficulty and discover shortcuts.
- Physical phone comfort, orientation changes and sustained frame pacing still need hardware validation.

## Ampère’s Loop

Full numbers are in [amperes-loop.md](amperes-loop.md#residuals--known-issues).

- **Throw variance:** about one throw in seven at a correct charge angle clips the ring's square end. The rate is 122/144 on a fine charge-by-turn-start grid at 120 and 60 Hz. Rounding the end, moving the ring's start and moving its right wall gave no gain beyond noise.
- **Head clearance:** on the lip climb, the head clears the floor's end by only 0.03–0.28 m. No tested throw clips it at 120 or 60 Hz.
- **Drop geometry:** the floor's end position is a ±0.1 m knife-edge for editors. Player tips of 45°–60° all land.
- **60 Hz windows:** narrower than at 120 Hz (charge about 72°–90°, tip about 40°–62°). This only affects the tests, because the game steps at 1/120 s.
- **Sketch fidelity:** the sketch's large top-left lobe is deliberately compressed to a 3 m wall and a radius-2.5 crown.
- **Late failures:** a slip in the 25 s inverted creep restarts a 43 s run, which is harsh even at difficulty 12.5.
- **Untested:** phone play has not been tested and the e2e spec has not been run.
