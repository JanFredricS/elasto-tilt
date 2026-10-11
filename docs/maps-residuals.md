# Current map review and remaining design work

The first layouts and their review records are historical. The current ten-map redesign is documented in [maps.md](maps.md), [early routes](campaign-early.md), and [late routes](campaign-late.md). Fresh Astra review is in [review-campaign-v2-1.md](review-campaign-v2-1.md). Its implementation findings were addressed: Clockwork bounds contain the full lift travel, Attic copy describes the actual low route, and Engine asserts wheel support on the compact seat. The route table and test references have been replaced for the redesign.

All ten routes have successful normal-input Rapier playthroughs. Swings carry riders and matter to the tested crossings; removing each deck causes its unchanged route pilot to crash. Clockwork’s frozen-lift and missing-reverse experiments fail the corresponding route. These experiments establish the demonstrated solutions, not uniqueness across every possible control sequence.

Remaining design work:

- Sustained one-wheel upside-down hanging and brake-assisted capture of a swing are not yet campaign requirements. The separate cradle fixture demonstrates a strong-brake wheel catch and pivot.
- Attic’s loose weights and Conservatory’s inverted weights are physical objects, not required switches. Mill’s different lengths have different motion, but the passing route does not require waiting for a specific period.
- Escher is a readable planar spiral through four gravity faces, with a shared ceiling/floor and an inner reversal. It has no impossible topology or portal transition.
- Long controlled replay times are not minimum completion times. More human playtesting is needed to tune difficulty and discover shortcuts.
- Physical phone comfort, orientation changes and sustained frame pacing still need hardware validation.
- Galileo’s Ramp (difficulty 1.5) forgives a held lean up to about .3 rad, with one narrow exception near .22 rad where pad 3 keeps a nose-down spin. A held lean above .3 rad still crashes in the gallery, and braking for .2 s or more in the gallery fall crashes on purpose. Its stone-kicker counterfactual holds only at the pilot’s speed. It runs about 46 s, longer than Orchard. Details in [galileos-ramp.md](galileos-ramp.md#residuals--known-issues).

- The Ice House (difficulty 8.5) probably rates high. Audit probes suggest about 7.5–8: careful tilt play has wide margins and there are six rest mats, though the map is sensitive to reaction delay. Its final-slide kicker enforces only a small (about .1 rad) tilt-back. See [ice-house.md](ice-house.md#residuals--known-issues).
- The README's "Map 15 — Stairway to Heaven" line is stale. Stairway is now map 23, and the README does not list the later inserted maps.

- **The Pendulum Clock** (final audit residuals in [pendulum-clock.md](pendulum-clock.md#residuals--known-issues)): the east-end void beside the hand is shared with Huygens’ Return and turns a mis-parked swing into a fall out of bounds. The escapement pit is a soft-lock (no way out, restart needed) but not a skip. The safe parking span is 1.6 m of the 3 m plank and is marked by a BRAKE arrow. The clock theme is signage only (hour marks, labels).
- **Huygens’ Return pilot dismount (unverified, not changed).** The Pendulum Clock audit found that a rider creeping off a parked heavy-damped plank (mass .1, damping 400) levers it down off its tower stop, and a slow front wheel wedges under the tower’s foot. Huygens’ Return uses the same hand and its pilot climbs off at .4 m/s (`src/levels/huygens-return.ts`, stage 2). It likely shares that fragility to parking position and timing. Its replay passes as authored, but its tolerance to slower or off-centre dismounts has not been measured.

- Hooke’s Ceiling is the first map to start with the world turned over (`initialAngle` and `spawnAngle` π). On a phone that means starting half turned or recalibrating. Its nose (radius 3 m) is keyboard-rate limited to about 3.3 m/s, but a phone has no rate limit, so the map plays differently on the two inputs. See [hookes-ceiling.md](hookes-ceiling.md#residuals--known-issues).

## Pascal’s Presses
- A crate-less rider braked on press A’s top can tilt the world about 1–1.6 rad and tumble across the pit (35 of 2,592 open-loop runs end upright on the ledge). Every such run also collects the step apple, so the skip wins the map. Accepted as a rare advanced skip because the legitimate crossing and the tumble share the same airspace; pinned by a test. Details in [pascals-presses.md](pascals-presses.md#residuals--known-issues).
- The A-to-ledge crossing uses unchained blocks (plate, face, sill, crate, ledge). Probed at .6–5 m/s with no ghost bump beyond .29 m/s of extra vertical jitter.
- Phone timing for the 12 s presses and 7 s crush presses is untested. The latest ram-entry variant clears the head by only 9 mm.
- docs/DELIVERY.md still says “twenty actual Rapier routes”; the campaign now has twenty-three. Not updated here.

Leibniz’s Counterweight (see [leibniz-counterweight.md](leibniz-counterweight.md#residuals--known-issues)):
- Plug speed: a fairing east of the well now carries westbound inverted riders onto the plug at any tested speed (to 15 m/s; 9 m/s used to crash). Riding east over the plug upside down needs a run-up of about 6 m/s, or the rider stalls in the dip beyond the crown and must back out.
- Saturation drain: a hard brake on a kerb top leaves the bridge a small step up: .10 m from 4 m/s, .19 m from 5 m/s. It is climbed from a standstill. Knee hops up to 12 m/s leave none. Larger losses need a trip through the cellar or the hall; none is a soft-lock.
- From the pit edge the raised bridge is out of view. A BRIDGE arrow points up at it, untested on phones.
- The LEDGER timeline shows ↑/↓ (vertical `timeAxis`), but its bar still fills left to right.
- Phone feel is untested, and the map is not yet in the browser e2e replays.

- Attic’s loose weights and Conservatory’s inverted weights are physical objects, not required switches. Mill’s different lengths have different motion, but its passing route does not require waiting for a specific period. Addressed by Foucault’s Hall: its three free decks have their own periods, and boarding each one off-phase drops the bike into the water ([foucault-hall.md](foucault-hall.md)).
## Foucault’s Hall
Details in [foucault-hall.md](foucault-hall.md#residuals--known-issues).
- **Parking trick (accepted).** Parking a deck against its stop with a back-tilt, then releasing with a deck-specific ±0.01 rad tilt, boards it at any phase. It is no easier than reading the swing.
- **Deck strike: documented, not fixed.** A braked rider idling within about 0.6–1 m of an arrival lip can be struck by the deck's end if the floor is snapped 0.3 rad or more east. It never happens in the normal step-off-and-roll-on flow. A lip setback or a new stop angle would break the far-apex dismount or move the release windows.
- **Deck amplitude depends on earlier riding.** Riding one deck can leave the next swinging short of its stop (0.34 against 0.38 rad). Boarding still works, with windows within 0.1 s of those measured. The third deck's far-apex cue then sits at the window's late edge.
- **Pilot complexity kept.** The pin tilt is gone. Floor rocking at the ramp tops and the catch/hold servos stay.
- **Phone readability untested.** Landscape framing shows the 8 m deck's far apex. Portrait shows no deck from the third ramp top. Nothing has been checked on hardware.
- **E2E browsers unavailable.** The Playwright specs, updated to look up maps by id, were not run.

## Euler’s Bridges (second audit)
Full notes are in [eulers-bridges.md](eulers-bridges.md#residuals--known-issues).
- **Landing.** The old level-table lip landed every rider nose-down at about 60°. Survival then flickered with the lean (.22 crashed between .2 and .24), and at 4 m/s over the canals no lean survived. The rider now leaves straight off a tight bend that still heads down, and 245 of 248 sampled leans from level to .6 rad land, at canal speeds of 1–6 m/s.
- **FLOOD.** It is now a real step: turning home on landing leaves b5 under water. It is soft, because a forward-leaning rider's momentum nearly reaches the wall unaided.
- **Difficulty.** 12.25 holds: the conceptual load is high and the execution load is moderate.
- **Readability and polish.** Sunken decks show the red water band above them, so they read as under water. b5 overlaps the chute's launch cosmetically at the clock-empty reading (whole-map view only).
- **Untested.** The river half is pure execution, and phone feel is untested.

## Noether’s Symmetry (campaign finale)
The full list is in [noether.md](noether.md#residuals--known-issues). In brief:
- The original chock floats off-map on the return. This is cosmetic and accepted, because a pocket-and-lip containment introduced a chock jam that stalled the twin plank.
- The pilot now recovers from a missed lift roll-off. A late lift boarding (`push: .3`, untested variant) can still drift the twin wedge onto its lip and jam it .25 m short. A player recovers by rolling back and re-pushing.
- Holding +.3 rad for a minute at the spawn creeps the original plank enough to crash boarding. A restart fixes it.
- The nose interiors are see-through hoops.
- The phone playtest of the −2π circuit is still needed, and the e2e coverage was added but not run.

- Attic’s loose weights and Conservatory’s inverted weights are physical objects, not required switches. *Addressed for inverted weights:* in [Torricelli’s Well](torricellis-well.md) two inverted floats must each rise into their own vault socket and seat as the footholds of the inverted return; with the floats removed the unchanged pilot cannot get home. Mill’s different lengths have different motion, but the passing route does not require waiting for a specific period.
## Torricelli’s Well
Full detail is in [torricellis-well.md](torricellis-well.md#residuals--known-issues). The issues are:
- **Back-tilt lock (restart only).** Float B is loose for about 5 s after the push. In that window a back-tilt of .7 rad held for 3 s, or .8 rad held for 1 s, carries it over the sill into socket A’s cap, where it never seats and holds float A out. Up to .6 rad is safe. No recovery was found, and there is no cheap geometric fix.
- **Float fling.** A long, wild tilt sawtooth (about 20 s of ±1 rad with the brake held) once drove float B through the door pocket, down the shaft and out of the open well mouth. That was 1 of 78 flail patterns. The rider lives but the map cannot be won without a restart. A narrower mouth cannot block a 2 m float without also blocking the rider’s fall corridor.
- **Extreme ferry tilt.** At 1.1 rad or more the ride ends in a crash on beam B’s lip, which is acceptable and tested.
- **Not checked.** Physical phone play has not been tested, and the e2e specs (indices updated for the insertion at index 10) were not run.

## Bernoulli’s Updraft (map 18)
Full write-up: [bernoulli-updraft.md](bernoulli-updraft.md), "Residuals / known issues".
- The 90°-per-flight concept is physically impossible: each crossing would need half a turn through straight up and add about 20 m/s. The chimney sway is free; only turning over and turning gravity back up within about .6 s of the launch are enforced.
- There is a release cliff at the lintel. The world must turn to at least 4.1 rad; 4.05 or earlier crashes, and 4.05–4.15 is chaotic. It is telegraphed by KEEP TURNING, not widened. Loop, lintel and lip variants were all rejected with data.
- The map is short (85 m / 16 s) for slot 12.75. That is accepted as a short precision map, like Hooke’s Springboard.
- At 1/60 s, one grid run that completes at 1/120 s crashes at the roof’s end. The game's fixed 1/120 s step makes this test-only.
- The map has not been played on a phone.

- Kepler’s Orbit can also be left clockwise, back over the far lip, once both loop apples are in; this is kept as a feature. Its door is touched mid-fall, with a measured margin of at least 0.175 s before the head reaches stone. See [keplers-orbit.md](keplers-orbit.md#residuals--known-issues).
