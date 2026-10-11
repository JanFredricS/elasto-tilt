# Current map review and remaining design work

The first layouts and their review records are historical. The current ten-map redesign is documented in [maps.md](maps.md), [early routes](campaign-early.md), and [late routes](campaign-late.md). Fresh Astra review is in [review-campaign-v2-1.md](review-campaign-v2-1.md). Its implementation findings were addressed: Clockwork bounds contain the full lift travel, Attic copy describes the actual low route, and Engine asserts wheel support on the compact seat. The route table and test references have been replaced for the redesign.

All ten routes have successful normal-input Rapier playthroughs. Swings carry riders and matter to the tested crossings; removing each deck causes its unchanged route pilot to crash. Clockwork’s frozen-lift and missing-reverse experiments fail the corresponding route. These experiments establish the demonstrated solutions, not uniqueness across every possible control sequence.

Remaining design work:

- Sustained one-wheel upside-down hanging and brake-assisted capture of a swing are not yet campaign requirements. The separate cradle fixture demonstrates a strong-brake wheel catch and pivot.
- Attic’s loose weights and Conservatory’s inverted weights are physical objects, not required switches. *Addressed for inverted weights:* in [Torricelli’s Well](torricellis-well.md) two inverted floats must each rise into their own vault socket and seat as the footholds of the inverted return; with the floats removed the unchanged pilot cannot get home. Mill’s different lengths have different motion, but the passing route does not require waiting for a specific period.
- Escher is a readable planar spiral through four gravity faces, with a shared ceiling/floor and an inner reversal. It has no impossible topology or portal transition.
- Long controlled replay times are not minimum completion times. More human playtesting is needed to tune difficulty and discover shortcuts.
- Physical phone comfort, orientation changes and sustained frame pacing still need hardware validation.

## Torricelli’s Well

Full detail is in [torricellis-well.md](torricellis-well.md#residuals--known-issues). The issues are:

- **Back-tilt lock (restart only).** Float B is loose for about 5 s after the push. In that window a back-tilt of .7 rad held for 3 s, or .8 rad held for 1 s, carries it over the sill into socket A’s cap, where it never seats and holds float A out. Up to .6 rad is safe. No recovery was found, and there is no cheap geometric fix.
- **Float fling.** A long, wild tilt sawtooth (about 20 s of ±1 rad with the brake held) once drove float B through the door pocket, down the shaft and out of the open well mouth. That was 1 of 78 flail patterns. The rider lives but the map cannot be won without a restart. A narrower mouth cannot block a 2 m float without also blocking the rider’s fall corridor.
- **Extreme ferry tilt.** At 1.1 rad or more the ride ends in a crash on beam B’s lip, which is acceptable and tested.
- **Not checked.** Physical phone play has not been tested, and the e2e specs (indices updated for the insertion at index 10) were not run.
