# Current map review and remaining design work

The first layouts and their review records are historical. The current ten-map redesign is documented in [maps.md](maps.md), [early routes](campaign-early.md), and [late routes](campaign-late.md). Fresh Astra review is in [review-campaign-v2-1.md](review-campaign-v2-1.md). Its implementation findings were addressed: Clockwork bounds contain the full lift travel, Attic copy describes the actual low route, and Engine asserts wheel support on the compact seat. The route table and test references have been replaced for the redesign.

All ten routes have successful normal-input Rapier playthroughs. Swings carry riders and matter to the tested crossings; removing each deck causes its unchanged route pilot to crash. Clockwork’s frozen-lift and missing-reverse experiments fail the corresponding route. These experiments establish the demonstrated solutions, not uniqueness across every possible control sequence.

Remaining design work:

- Sustained one-wheel upside-down hanging and brake-assisted capture of a swing are not yet campaign requirements. The separate cradle fixture demonstrates a strong-brake wheel catch and pivot.
- Attic’s loose weights and Conservatory’s inverted weights are physical objects, not required switches. Mill’s different lengths have different motion, but its passing route does not require waiting for a specific period. Addressed by Foucault’s Hall: its three free decks have their own periods, and boarding each one off-phase drops the bike into the water ([foucault-hall.md](foucault-hall.md)).
- Escher is a readable planar spiral through four gravity faces, with a shared ceiling/floor and an inner reversal. It has no impossible topology or portal transition.
- Long controlled replay times are not minimum completion times. More human playtesting is needed to tune difficulty and discover shortcuts.
- Physical phone comfort, orientation changes and sustained frame pacing still need hardware validation.

## Foucault’s Hall

Details in [foucault-hall.md](foucault-hall.md#residuals--known-issues).

- **Parking trick (accepted).** Parking a deck against its stop with a back-tilt, then releasing with a deck-specific ±0.01 rad tilt, boards it at any phase. It is no easier than reading the swing.
- **Deck strike: documented, not fixed.** A braked rider idling within about 0.6–1 m of an arrival lip can be struck by the deck's end if the floor is snapped 0.3 rad or more east. It never happens in the normal step-off-and-roll-on flow. A lip setback or a new stop angle would break the far-apex dismount or move the release windows.
- **Deck amplitude depends on earlier riding.** Riding one deck can leave the next swinging short of its stop (0.34 against 0.38 rad). Boarding still works, with windows within 0.1 s of those measured. The third deck's far-apex cue then sits at the window's late edge.
- **Pilot complexity kept.** The pin tilt is gone. Floor rocking at the ramp tops and the catch/hold servos stay.
- **Phone readability untested.** Landscape framing shows the 8 m deck's far apex. Portrait shows no deck from the third ramp top. Nothing has been checked on hardware.
- **E2E browsers unavailable.** The Playwright specs, updated to look up maps by id, were not run.

