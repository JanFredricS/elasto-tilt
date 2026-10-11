# Current map review and remaining design work

The first layouts and their review records are historical. The current ten-map redesign is documented in [maps.md](maps.md), [early routes](campaign-early.md), and [late routes](campaign-late.md). Fresh Astra review is in [review-campaign-v2-1.md](review-campaign-v2-1.md). Its implementation findings were addressed: Clockwork bounds contain the full lift travel, Attic copy describes the actual low route, and Engine asserts wheel support on the compact seat. The route table and test references have been replaced for the redesign.

All ten routes have successful normal-input Rapier playthroughs. Swings carry riders and matter to the tested crossings; removing each deck causes its unchanged route pilot to crash. Clockwork’s frozen-lift and missing-reverse experiments fail the corresponding route. These experiments establish the demonstrated solutions, not uniqueness across every possible control sequence.

Remaining design work:

- Sustained one-wheel upside-down hanging and brake-assisted capture of a swing are not yet campaign requirements. The separate cradle fixture demonstrates a strong-brake wheel catch and pivot.
- Attic’s loose weights and Conservatory’s inverted weights are physical objects, not required switches. Mill’s different lengths have different motion, but the passing route does not require waiting for a specific period.
- Escher is a readable planar spiral through four gravity faces, with a shared ceiling/floor and an inner reversal. It has no impossible topology or portal transition.
- Long controlled replay times are not minimum completion times. More human playtesting is needed to tune difficulty and discover shortcuts.
- Physical phone comfort, orientation changes and sustained frame pacing still need hardware validation.

Leibniz’s Counterweight (see [leibniz-counterweight.md](leibniz-counterweight.md#residuals--known-issues)):

- Plug speed: a fairing east of the well now carries westbound inverted riders onto the plug at any tested speed (to 15 m/s; 9 m/s used to crash). Riding east over the plug upside down needs a run-up of about 6 m/s, or the rider stalls in the dip beyond the crown and must back out.
- Saturation drain: a hard brake on a kerb top leaves the bridge a small step up: .10 m from 4 m/s, .19 m from 5 m/s. It is climbed from a standstill. Knee hops up to 12 m/s leave none. Larger losses need a trip through the cellar or the hall; none is a soft-lock.
- From the pit edge the raised bridge is out of view. A BRIDGE arrow points up at it, untested on phones.
- The LEDGER timeline shows ↑/↓ (vertical `timeAxis`), but its bar still fills left to right.
- Phone feel is untested, and the map is not yet in the browser e2e replays.
