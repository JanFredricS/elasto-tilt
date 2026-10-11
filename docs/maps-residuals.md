# Current map review and remaining design work

The first layouts and their review records are historical. The current ten-map redesign is documented in [maps.md](maps.md), [early routes](campaign-early.md), and [late routes](campaign-late.md). Fresh Astra review is in [review-campaign-v2-1.md](review-campaign-v2-1.md). Its implementation findings were addressed: Clockwork bounds contain the full lift travel, Attic copy describes the actual low route, and Engine asserts wheel support on the compact seat. The route table and test references have been replaced for the redesign.

All ten routes have successful normal-input Rapier playthroughs. Swings carry riders and matter to the tested crossings; removing each deck causes its unchanged route pilot to crash. Clockwork’s frozen-lift and missing-reverse experiments fail the corresponding route. These experiments establish the demonstrated solutions, not uniqueness across every possible control sequence.

Remaining design work:

- Sustained one-wheel upside-down hanging and brake-assisted capture of a swing are not yet campaign requirements. The separate cradle fixture demonstrates a strong-brake wheel catch and pivot.
- Attic’s loose weights and Conservatory’s inverted weights are physical objects, not required switches. Mill’s different lengths have different motion, but the passing route does not require waiting for a specific period.
- Escher is a readable planar spiral through four gravity faces, with a shared ceiling/floor and an inner reversal. It has no impossible topology or portal transition.
- Long controlled replay times are not minimum completion times. More human playtesting is needed to tune difficulty and discover shortcuts.
- Physical phone comfort, orientation changes and sustained frame pacing still need hardware validation.
- **The Pendulum Clock** (final audit residuals in [pendulum-clock.md](pendulum-clock.md#residuals--known-issues)): the east-end void beside the hand is shared with Huygens’ Return and turns a mis-parked swing into a fall out of bounds. The escapement pit is a soft-lock (no way out, restart needed) but not a skip. The safe parking span is 1.6 m of the 3 m plank and is marked by a BRAKE arrow. The clock theme is signage only (hour marks, labels).
- **Huygens’ Return pilot dismount (unverified, not changed).** The Pendulum Clock audit found that a rider creeping off a parked heavy-damped plank (mass .1, damping 400) levers it down off its tower stop, and a slow front wheel wedges under the tower’s foot. Huygens’ Return uses the same hand and its pilot climbs off at .4 m/s (`src/levels/huygens-return.ts`, stage 2). It likely shares that fragility to parking position and timing. Its replay passes as authored, but its tolerance to slower or off-centre dismounts has not been measured.
