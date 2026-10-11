# The Pendulum Clock

*Tick, tock, and a time to cross.*

Campaign map 17 (index 16), difficulty 11.75, between Huygens’ Return (11.5) and Spiral Sanctuary (12). Palette jade. Code: `src/levels/pendulum-clock.ts`. Tests: `tests/pendulum-clock.test.ts`.

The ride takes place inside a giant clock. It continues the Huygens’ Return and Piston Works thread. The escapement’s lifts run on their own clocks, as in the Piston Works. The hand is a Huygens pendulum. The map also adds one new engine part: a moving hazard.

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
| Dial floor | Top 6, x 4.7…14.97. |
| Pallet | A red bar, .5 × 2.4, at x 11. Its underside drops to .15 above the dial floor, which stops a wheel. It rises to 3.6 above the floor, clear of a helmet (about 1.75). The cycle is 6 s, eased, and dwells at both ends. The bar clears 1.9 m for about 2.9 s of each cycle. An apple (`clock-jaws`) sits in its jaws, .9 above the floor. A WAIT hint stands short of it. |
| Hand | A swing anchored at (16.5, 11.88): length 6, plank width 3, mass .1, damping 400. At rest its plank top is flush with the dial floor; the dial floor’s end is its lower stop. Swung a quarter turn, the plank’s face lines up with the tower’s west face at x 22.38. The tower’s foot (y 13.41) is the upper stop. RIDE THE HAND hint, with a spin arrow. |
| 12 tower | West face x 22.38, from y 13.41 to 17.41, with an apple on the face. A quarter-circle crown (radius 3, 16 chained slabs) turns the course onto the “12” ledge at top 20.41. A second apple sits on the crown. |
| Door | On the 12 ledge at (29.38, 21.21), the clock’s centre arbor. An end wall stands at x 32.68. |

Four apples: `clock-seam`, `clock-jaws`, `clock-hand-face`, `clock-crest`.

## Pilot and evidence

`createPendulumClockPilot` uses only tilt and brake. It reads the lift and pallet cycles off the clock, as a watching player would (`escapeSchedule`, `palletSchedule`):

1. It waits braked short of the shaft and boards E1 as it rests low.
2. It crosses to E2 one second before E1 crests.
3. It leaves E2 .9 s before E2 tops out.
4. It waits braked short of the pallet and sets off 1.5 s before the bar is fully raised.
5. It stops braked in the middle of the plank and leads the world angle .55 rad ahead of the hand until the hand is against the tower.
6. It rides briskly (1.4 m/s) off the plank onto the tower face, then follows its own heading up the wall, round the crown at 1.6 m/s, and along the 12 ledge to the door.

The climb off the hand must not dawdle. A rider on the parked plank's upper half (above the anchor) levers the light, heavily damped hand down off its stop at about .08 rad/s. At .4 m/s the hand sags a few degrees, and the front wheel wedges in the gap that opens under the tower's foot. At .6 m/s or faster the climb is reliable. The hint says so.

The demonstrated route covers 49 m in 40 s and collects all apples. The campaign replay is at index 16.

Tests in `tests/pendulum-clock.test.ts`:

- **Positive.** The full replay completes. It crosses the seam with the tops within .35 m of each other. It stays under the bar only while the bar clears 1.9 m. It swings the hand to at least 90° − .05 and rides the wall.
- **Timing tolerance.** Lead, leave, cross and pallet timings are set near the early and late ends of their windows (each alone works over about lead .6–2.1 s, cross .6–1.5 s, leave .3–2.1 s, pallet .3–2.7 s). The hand technique is varied: parking −.4 to +1.2 m from the anchor, leading the swing .35–.8 rad, climbing off at .8–2.5 m/s. The crown is rounded at 1.3 and 2 m/s.
- **Negative.** A pilot that sets off for the pallet 4.5 s early meets the bar as it drops, and crashes at the bar.
- **Moving hazard.** The bench test above shows that a hazard bar kills and a plain bar only shoves.
- **Counterfactual.** With the escapement frozen (period 1e9), the rider never reaches the dial floor.
- **Trivial inputs.** Fixed controls never complete the map.
- **Campaign table.** The campaign replay table drives the map at its own index, between Huygens’ Return and Spiral Sanctuary.

Inserting the map at index 16 moves every later map one place down. An existing save that had unlocked them may need one map replayed.
