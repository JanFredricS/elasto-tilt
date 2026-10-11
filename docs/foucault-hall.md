# Foucault’s Hall

*The floor turns beneath the swing.* Campaign map 13 (index 12, difficulty 9.75), between the Hanging Garden and the Clockwork Apple. Sand palette. Source: `src/levels/foucault-hall.ts`; tests: `tests/foucault-hall.test.ts`.

## Route

A long mill hall over three water pools, crossed on three suspended cradle decks (3 m wide, hung 4, 6 and 8 m below their anchors). The decks move on their own; nothing calls them. Their periods are about 4.1, 5.0 and 5.7 s, so no single rhythm crosses the hall.

For each deck:

1. **Wait.** Stop braked at the top of the departure ramp (a WAIT marker hangs over it) and watch the deck.
2. **Board.** Release so the bike reaches the lip as the deck comes in against the bank’s stop. The roll down takes about 2.3 s, so let go as the deck tops out on the far side, a moment sooner for the long third deck. Too early or too late, and the bike drops into the water. Turning the floor back toward the bank as the front wheel crosses is optional. It neither widens nor narrows the window (see Timing).
3. **Ride.** Level the floor and brake to rest just east of the deck’s middle while it swings out.
4. **Dismount at the far apex.** As the deck rises toward the far bank, turn the floor under it so it comes to rest with its end over the arrival lip. Hold it there. Your weight east of the middle tips the deck down, and you roll off onto the bank.

An apple hangs above each deck’s far apex. Riding the deck out to the far bank collects it. The door bank follows the third deck.

## The stops

Each departure bank ends in a stop: a wall square to the deck’s west end when the deck is turned `−reach` (0.38 rad).

- The wall’s line keeps every other deck pose to its east, so a deck can only touch the stop’s face.
- The stop’s top block is pitched like the deck at that angle. A deck lying against the stop continues the bank’s surface with a 2 cm joint.

The stops do two jobs:

- **They make boarding possible.** A free deck at its apex accelerates away at g·sin A while the rear wheel is still on the bank. Without the stop the front wheel falls into the opening gap. The stop holds the deck still at the moment of boarding.
- **They limit amplitude.** Decks hit the stop and lose their surplus energy. Floor tilts pump the decks you are not riding, and the stops absorb that surplus on the west side. Arrival banks lie outside the circle the deck corners sweep, with a 3 cm margin.

## Deviations from the brief

| Brief | Built | Why |
| --- | --- | --- |
| Damping 0.3–0.6 | 0.001 | Rapier applies a swing’s damping to both its linear and angular velocity, so 0.3–0.6 lets the decks die out within about 20 s. At 0.001, an idle deck still reaches 0.372 rad after 60 s against the 0.38 stop. |
| Initial angles ±0.6 | +0.6 on all three decks | A deck released at −0.6 would start overlapping its stop. Released at +0.6 (east), each deck’s first westward swing strikes the stop. From then on, left alone, it swings out to 0.38 rad, the usable amplitude. |
| Free decks only | Stops | Boarding a free deck at its apex proved unreliable in grid searches over timing and tilt, for the reason given under The stops. |

## Replay pilot

`createFoucaultPilot()` (replay index 12) uses normal controls only. It moves through these stages:

| Stage | What the pilot does |
| --- | --- |
| `approach` / `wait` | Holds the brake at the ramp top. Estimates the deck’s amplitude from its energy and its phase from θ and ω. Rocks the floor slightly to keep the deck’s amplitude at the stop. |
| `board` | Releases when the time until the deck next strikes its stop drops below `lead` (2.4 s). Keeps the floor level while the bike rolls aboard. |
| `ride` | Levels the floor and brakes to rest just east of the deck’s middle. |
| `catch` | A servo decelerates the deck to `reach − overhang/2`. |
| `leave` | Holds the deck at the far bank (PD control) until the bike rolls off. |
| `land` | Brakes on the next bank. |
| `door` | Rolls to the exit. |

The demonstrated run completes in about 46 s of simulated time and collects all three apples. It waits 1.9, 5.5 and 1.9 s at the three ramp tops. Across the run, the maximum world tilt is about 0.41 rad and the deck swings peak near 0.8, 1.1 and 1.1 rad.

The pilot reads only what a player sees: each deck's angle, and its rate from successive frames. Earlier versions also tilted the floor back to pin the deck while boarding. That pin made no difference to the windows, so it was removed. The `wait` stage's floor rocking stays: riding the first deck leaves the second swinging out to only about 0.34 rad (short of its 0.38 stop), and the pilot rocks it back to the stop before releasing. See Residuals.

## Timing

Timing is the skill: an idle deck does not rest against its stop. It swings out to the stop (0.38 rad) and touches it only at the apex. Each deck's window, measured one deck at a time in 0.1 s steps of `lead`:

| Deck | Period | Boards at lead | Release at the far apex (half period) |
| --- | --- | --- | --- |
| 4 m | 4.1 s | 1.7–2.8 s | 2.05 s: boards |
| 6 m | 5.0 s | 1.8–2.8 s | 2.5 s: boards |
| 8 m | 5.7 s | 1.8–2.7 s | 2.85 s: too late |

The window is about 1 s in a 4–6 s cycle. Outside it, the bike drops into the water. Turning the floor back while boarding does not change it: a level floor, −0.15 and −0.45 give the same windows to within 0.2 s, and the whole run completes with any back-tilt from 0 to −0.6. The pilot boards on a level floor. The different periods matter twice. A player has to read each deck's own rhythm, and the hint's cue ("let go as it tops out") needs a correction on the slowest deck.

**Parking trick (known, accepted).** Tilting the floor back past the stop (about −0.42) while braked at the ramp top parks the deck against its stop. Releasing then with the floor held at a slight back-tilt boards it at any phase. The tilt has to suit the deck: −0.04 to −0.08 for the 4 m deck, −0.08 for the 6 m and −0.10 for the 8 m, each within about ±0.01 rad, and the run fails 0.02 rad either side. The trick exchanges reading the swing for a one-degree tilt, so it does not make the map easier.

## Safety and readability

- **Floor rocking cannot run a deck away.** Two minutes of rocking at ±0.6 rad, at the 4 m and 8 m decks' periods, keeps every deck below 1.5 rad. Five minutes of ±0.4–0.9 rad rocking peaks at 0.96–1.6 rad and does not grow after the first minute. The stops take the surplus every west swing.
- **Failures are fatal.** Random-input runs, 60 at each setting and 90 s each, started from all three banks with the brake held 40% of the time. With ±0.5 rad tilts, all 60 ended in the water within 47 s. With ±0.25 rad tilts, 58 ended in the water. The other two were still rolling on the start bank by the west wall, free to carry on. No run left the bike stranded alive over the water or on a deck.
- **The west end is walled.** Tilting back from the spawn rests the bike against a wall instead of dropping it off the map.
- **Camera zoom 0.8.** At the default framing (±7.75 m), a rider at the third ramp top could not see the 8 m deck's far half-swing (it tops out 10.5 m away). At 0.8 (±9.7 m), the deck's west half stays in view at its far apex.
- **Stop joint.** Wheel vertical accelerations crossing the 2 cm joint peak at 70–100 m/s² on good boardings, against 250 m/s² elsewhere on the route (landings). The joint gives no ghost bump strong enough to unseat a rider.

## Tests

`tests/foucault-hall.test.ts` covers:

- **Placement and geometry:** index 12, three 3 m decks of 4, 6 and 8 m, three water hazards, and spawn at y = .72. Each stop is flush with its deck at `−reach` (2 cm joint, matching pitch).
- **Positive replay:** complete, all three apples, under 60 s. The pilot boards, rides, catches, leaves and lands on all three decks.
- **Negative:** idling, or holding the brake, for 60 s never completes.
- **Timing:** releasing on the first deck half a period off (lead 0.347 s) drops the bike into the water. On each deck, with a level floor, leads of 1.9 and 2.7 s complete and 1.5 and 3.0 s crash. Releasing at each deck's far apex boards the first two decks and drops the bike from the third. The hint's cue and its WAIT markers are checked.
- **Safety:** two minutes of resonant floor rocking keeps every swing below 1.5 rad. Tilting back from the spawn rests the bike against the west wall.
- **Counterfactual:** with the swings removed, or frozen against their stops (damping 1000), the same pilot does not complete.
- **Amplitude:** with all three decks left alone for 60 s, each still swings out to within 0.02 rad of its stop in the last 8 s.

This closes the residual that the Pendulum Mill’s different lengths never require timing. Here each deck has to be boarded in its own phase.

## Residuals / known issues

Final audit, second cycle. Anything below is accepted for now. None of it blocks the route.

- **Parking trick (accepted edge case).** Tilting back past the stop at the ramp top parks the deck against its stop. Releasing with a deck-specific back-tilt (±0.01 rad) then boards at any phase. It swaps reading the swing for a one-degree tilt, so it is not easier (see Timing).
- **Deck strike near an arrival lip (documented, not fixed).** A braked rider standing within about 0.6 m of an arrival lip (about 1 m for the 8 m deck) can be hit on the helmet by the deck's end. It happens when the floor is snapped 0.3 rad or more east, in under a second, while the deck is on its west side. The deck then swings out to 0.75–1.3 rad. With a slow 3 s turn, it takes 0.5 rad or more. This was probed on all three banks: setbacks 0.3–1.5 m, tilts 0.2–0.6 rad, decks starting against their stops.
  - It never happens in the normal flow. Tilting 0.3–0.7 rad east right after stepping off leaves the held deck at or below 0.65 rad. Any crash there is the ordinary over-the-bars pitch of a braked bike on a steep floor, or rolling on into the next pool.
  - The arrival lip cannot be set back: the deck's end must reach over it at the far apex. The stop angle cannot change without moving the release windows. The deck sweeps up into the space above the lip, so no east stop can block it without also blocking the rider.
  - The strike is visible (a 3 m deck rising toward the rider) and only follows a large, sudden floor turn.
- **Amplitude after riding a deck.** The decks keep 0.38 rad only while left alone. Floor turns while riding one deck change the others. In the demonstrated run the second deck swings out to only 0.34 rad when the rider reaches its ramp.
  - The pilot rocks the floor at each ramp top (±0.15 rad at most) to bring the deck back to its stop. Without rocking it still boards.
  - Measured with no rocking, the windows are 1.7–2.8, 1.9–2.9 and 1.9–2.8 s (against 1.7–2.8, 1.8–2.8 and 1.8–2.7 s with rocking).
  - The third deck's far-apex release (2.85 s) is then at the edge of its window, not past it. The hint's "a moment sooner" stays right, but its margin is thin.
- **Pilot complexity.** The pin tilt was removed this cycle. The rocking `wait` stage stays (see above), as do the energy-based phase estimate and the `catch`/`leave` servos. The pilot is a demonstration, not the minimum input.
- **Missed boardings crash in the gap.** A missed boarding usually drops the bike into the gap between the stop and the deck, where the helmet hits the stop or the deck about 1 m below the lip, before it reaches the water. Either way it is a crash. The timing tests assert `crashed`, not the water hazard.
- **Counterfactual wording.** In the frozen-decks test (damping 1000), the pilot never releases, because a still deck never strikes its stop. The test shows that this pilot needs a moving deck. It does not show that a player cannot cross a frozen deck.
- **West wall.** It holds an unbraked rider at back-tilts of 0.2–0.45 rad. At 0.6 rad, the 4 m roll back hits the wall hard enough to crash. That is still not a fall off the map.
- **Camera and orientation.** At zoom 0.8 in phone landscape (844×390), a rider braked at the third ramp top sees the whole 8 m deck at its far apex. At desktop 1024×768, its west end and the apple stay in view. In portrait (390×844), no deck is visible from the third ramp top. The game is landscape-first, and the map overview pauses physics, so portrait play here relies on the landscape lock.
- **Readability on hardware is untested.** WAIT markers are legible and do not overlap each other or the decks, in the overview and in landscape play. The stop joints show no gap or seam artifact at boarding. The 2 cm joint and the WAIT arrows (pointing east, the direction of travel) have not been checked on a physical phone.
- **Browser e2e not run.** Playwright browsers are not installed in this environment. The e2e specs that now look up maps by id were not executed. Visual checks were made in the desktop app's browser pane against a local dev server.

