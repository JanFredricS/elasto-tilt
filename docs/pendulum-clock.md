# The Pendulum Clock

*Tick, tock, and a time to cross.*

Campaign map 17 (index 16), difficulty 11.75, between Huygens’ Return (11.5) and Spiral Sanctuary (12). Palette jade. Code: `src/levels/pendulum-clock.ts`. Tests: `tests/pendulum-clock.test.ts`. Overview: `docs/evidence/pendulum-clock-overview.png` (written by `e2e/expansion.spec.ts`).

The ride takes place inside a giant clock. It continues the Huygens’ Return and Piston Works thread. The escapement’s lifts run on their own clocks, as in the Piston Works. The hand is a Huygens pendulum. The map also adds one new engine part: a moving hazard, used for the escapement anchor’s two pallets.

## Mechanic: moving hazard (`TimePlatform.kind: 'hazard'`)

A time platform can now set `kind: 'hazard'`. It moves exactly like any other time platform, on the route clock or on its own `period`/`offset` cycle. The difference is what happens on contact:

- **Physics** (`src/physics.ts`, where time-platform colliders are created): the collider is tagged `'hazard'` instead of `'time'`. The existing collision-event handler ends the ride on any bike contact, including wheels and frame, the same way it does for a hazard surface. A hazard bar is never a carrying support: support detection only looks for `'time'` tags.
- **Renderer** (`src/renderer.ts`): hazard-kind platforms are drawn as red hazard stone with ivory stripes and an ink rim, instead of the brass time-platform look.
- **Types** (`src/types.ts`): `kind?: 'hazard'` is optional, so no existing map changes.

The tests cover the tagging directly. On a bench level, a low bar slides into a braked bike’s front wheel, away from the helmet:

- tagged `'hazard'`, the bar crashes the ride as it arrives;
- the same bar without the kind only shoves the bike, and the ride stays `'playing'`.

## Route

All coordinates are in metres, with y pointing up.

| Section | Geometry |
| --- | --- |
| Start | Floor at top 0, x −9…0, with a back wall. Spawn is at (−5, .72). WAIT hint. |
| Escapement | E1 is at x 1.2 and runs 0 → 3. E2 is at x 3.5 and runs 3 → 6. Each lift is a pair of .9 m pistons, ±.65 from its centre. Both run on a 12 s cycle in antiphase (offsets 2/3 and 1/6). Each over-travels its floors by .1, so a rider steps down onto it. Their tops meet only as E1 peaks. An apple hangs over the seam, with the CROSS hint. A pit (top −1.2) lies under both lifts. |
| Dial floor | Top 6, x 4.7…18.47. Twelve gilded hour marks (`clock-hour-*`, kind `'cradle'`) are set into the dial’s face below the floor, wholly inside its stone. |
| Pallets | Two red bars, TICK at x 9 and TOCK at x 14, each .5 × 2.4, on the same 6 s eased cycle in antiphase (offsets 0 and .5). Each underside drops to .15 above the dial floor, which stops a wheel, and rises to 3.1 above it, clear of a helmet (about 1.75). Each bar clears 1.9 m for about 2.65 s of its cycle. The 4.5 m gap between them holds a stopped bike (2.08 m) with about 1.2 m to spare at each end. An apple sits in each one’s jaws (`clock-tick-jaws`, `clock-tock-jaws`), .9 above the floor. A TICK arrow stands short of the first bar, a TOCK arrow between the bars. |
| Hand | A swing anchored at (20, 11.88): length 6, plank width 3, mass .1, damping 400. At rest its plank top is flush with the dial floor; the dial floor’s end is its lower stop. A BRAKE arrow points down at anchor + .4, the middle of the safe parking span. Swung a quarter turn, the plank’s face lines up with the tower’s west face at x 25.88. The tower’s foot (y 13.41) is the upper stop. RIDE THE HAND hint, with a spin arrow. |
| 12 tower | West face x 25.88, from y 13.41 to 17.41, with an apple on the face. A quarter-circle crown (radius 3, 16 chained slabs) turns the course onto the “12” ledge at top 20.41, marked XII. A second apple sits on the crown. |
| Door | On the 12 ledge at (32.88, 21.21), the clock’s centre arbor. An end wall stands at x 36.18. |

Five apples: `clock-seam`, `clock-tick-jaws`, `clock-tock-jaws`, `clock-hand-face`, `clock-crest`.

## Pilot and evidence

`createPendulumClockPilot` uses only tilt and brake. It reads the lift and pallet cycles off the clock, as a watching player would (`escapeSchedule`, `palletSchedule`):

1. It waits braked short of the shaft and boards E1 as it rests low.
2. It crosses to E2 one second before E1 crests.
3. It leaves E2 .9 s before E2 tops out.
4. It waits braked short of TICK and sets off 1.5 s before that bar is fully raised.
5. It stops braked between the bars and sets off 1.5 s before TOCK is fully raised.
6. It stops braked on the plank under the anchor and leads the world angle .55 rad ahead of the hand until the hand is against the tower.
7. It rides briskly (1.4 m/s) off the plank onto the tower face, then follows its own heading up the wall, round the crown at 1.6 m/s, and along the 12 ledge to the door.

The demonstrated route covers 52 m in 50 s and collects all five apples (the rendered e2e replay measured 52.4 m / 49.5 s). The campaign replay is at index 16.

Measured single-parameter windows (each varied alone, others at default, 120 s budget):

| Option | Completes | Fails |
| --- | --- | --- |
| `lead` (board E1) | .4–2.3 s | ≥ 2.4 s crashes; ≤ .3 s can miss its go window |
| `cross` (to E2) | .6–1.7 s | ≥ 1.8 s crashes; ≤ .5 s never goes |
| `leave` (off E2) | .1–2.1 s | ≥ 2.2 s crashes |
| `pallet` (go at TICK) | .5–2.9 s | the rest of the 6 s cycle crashes on TICK |
| `tock` (go at TOCK) | .5–2.7 s | the rest crashes on TOCK |
| `park` (on the plank, from the anchor) | −.4…+1.2 m | ≤ −.6 m and ≥ 1.4 m fall off into the east void |
| `swing` (lead of the hand) | .2–.95 rad | ≥ 1 rad crashes |
| `climb` (off the plank) | .3–3.5 m/s at park 0…+.4; ≥ .9 m/s over the whole parking span | ≤ .7 m/s at park −.4 or ≥ .8 wedges under the tower’s foot (the ride stalls) |
| `rounding` (the crown) | .8–3 m/s | none measured |

Why the climb must not dawdle: a rider on the parked plank’s upper half levers the light, heavily damped hand down off its stop at about .08 rad/s, opening a gap under the tower’s foot that a slow front wheel wedges into. Parked near the anchor this hardly matters; parked toward either end of the safe span it does. The hint says to ride briskly off the hand.

A rider who does not stop between the pallets (rolling from the TICK wait spot at 1.5–3 m/s, set off at a random moment) passes both bars in 6–9 of 24 evenly spread set-off times (25–37 %). With a single pallet and the old 3.6 m lift, the same blind run passed about 45 % of the time.

Tests in `tests/pendulum-clock.test.ts`:

- **Positive.** The full replay completes. It crosses the seam with the tops within .35 m of each other. It stays under each bar only while that bar clears 1.9 m, and it stops between the bars while TICK is down. It swings the hand to at least 90° − .05 and rides the wall.
- **Timing tolerance.** Lead, leave, cross, tick and tock timings are set near the early and late ends of their windows. The hand technique is varied: parking at both ends of the safe span (−.4 and +1.2 m), leading the swing .3–.8 rad, climbing off at .9–2.5 m/s, and a .3 m/s climb under the BRAKE arrow. The crown is rounded at 1.3 and 2 m/s.
- **Negative.** Setting off 4.5 s before either bar is fully raised meets that bar as it drops, and crashes at that bar.
- **Pit dead end.** A rider dropped into the escapement pit who turns the world toward the dial’s 7.2 m west face (four ramp rates, lift phases and final angles) never climbs above y 1.
- **Moving hazard.** The bench test above shows that a hazard bar kills and a plain bar only shoves.
- **Counterfactual.** With the escapement frozen (period 1e9), the rider never reaches the dial floor.
- **Trivial inputs.** Fixed controls never complete the map.
- **Campaign table.** The campaign replay table drives the map at its own index, between Huygens’ Return and Spiral Sanctuary.

Inserting the map at index 16 moves every later map one place down. An existing save that had unlocked them may need one map replayed.

## Audit cycle 2 (final)

- **Parking marker.** The hint said “middle of the hand”, but nothing on the map marked it, and parking ≤ −.6 m from the anchor (rear wheel still on the dial floor’s corner as the plank drops) throws the bike into the east void. A swing cannot carry a cradle stripe (stripes are surface signage, and a swing is not a surface), so a downward BRAKE arrow now marks anchor + .4, the middle of the measured safe span (−.4…+1.2 m). There, even a .3 m/s climb works.
- **Length and the pallet gate.** The map was short for its slot (49 m / 40 s against Huygens’ 102 m / 58 s), and a blind ride passed the single pallet about half the time. The pallet became an escapement anchor: two antiphase bars, TICK and TOCK, with a stop between them. The hand and tower moved 3.5 m east to make room, which leaves their geometry unchanged. The raised underside dropped from 3.6 to 3.1 m, which shortens each bar’s clear dwell from about 2.95 s to 2.65 s. The route is now 52 m / 50 s with five apples, and the blind pass rate fell to 25–37 %. The hand, the escapement and every pilot window were re-measured after the change (table above).
- **Pit lift-skip.** Not a skip, and now tested. The pit’s floor-to-wall corner is a sharp concave 90°. With tilt-only control, a bike in it noses into the wall and topples as gravity turns: in 54 of 54 probe runs entering the pit from the start floor, and in every scripted turn from inside the pit, the bike never rose above y −.16. E2’s east piston (x 3.7…4.6, at most .1 m from the face) would also cap the face’s top.
- **Clock reading.** With no new renderer features, the theme now reads as a clock: twelve gilded hour marks on the dial’s face (cradle-kind blocks embedded inside the dial’s stone, never ridden), TICK and TOCK labels on the pallets, a BRAKE arrow on the hand and XII on the ledge by the door.
- **Corrected claim.** Cycle 1 documented the climb off the hand as reliable from .6 m/s. That holds only when parked near the anchor. Over the whole parking span the threshold is about .9 m/s. On the cycle-1 geometry, too, climbs of .3–.6 m/s stalled at park −.4, +.8 and +1.2 m. The pilot’s 1.4 m/s default has margin, and the docs and tests now say so.

## Residuals / known issues

- **East-end overshoot void.** Shared with Huygens’ Return. The space east of the dial floor and below the tower’s foot is open air down to the bounds. A rider who parks off the safe span, turns the world before both wheels are on the plank, or slips off the plank while it swings falls east out of bounds and crashes. This is fair (it reads as a fall), but it costs the whole run. A catch floor was not added: it would change the hand’s lower travel and the proven windows.
- **The pit is a soft-lock, not a crash.** A rider who drops into the pit under the lifts cannot climb back out. The 1.1 m step up to E1’s lowest top and the sharp corner of the dial wall are both unclimbable. The rider must restart from the pause card. It is not a skip.
- **Parking span is narrow.** The safe span is 1.6 m of a 3 m plank. It is marked by the BRAKE arrow and the hint, but it is still the map’s least forgiving input. Slow climbs (≤ .7 m/s) also wedge at both ends of the span.
- **Hour marks are colliders.** Cradle kind is drawn as gold signage, but cradle surfaces are ordinary stone colliders. The twelve marks sit wholly inside the dial block (asserted in the tests), so the bike cannot reach them. They add 12 static colliders.
- **Theme limits.** The clock is sold by signage only: stone blocks, embedded hour marks, labels and the existing pendulum and pallet art. There is no rendered clock-hand on the dial, no gear art and no tick sound. Any of those needs renderer or audio work.
- **Pilot artefacts.** At `lead` ≤ .3 s or `cross` ≤ .5 s, the pilot’s .6 s “due” window can step past its go moment, so it waits forever (the ride stays `'playing'`). This belongs to the scripted pilot, not to the map.
- **Human tuning.** Difficulty 11.75 rests on scripted windows and blind-pass rates. Human playtesting has not confirmed it. A skilled rider can flow through both pallets without stopping, about a third of set-off moments work, and that is intended.
