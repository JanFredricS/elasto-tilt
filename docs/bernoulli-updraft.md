# Bernoulli’s Updraft

*Where the flow quickens, it lifts.* Campaign map 18 (index 17), difficulty 12.75, between Spiral Sanctuary and Switchback Scaffold. Code: `src/levels/bernoulli-updraft.ts`. Tests: `tests/bernoulli-updraft.test.ts`.

## Mechanic: a chimney climbed upside down

The chimney is 30 m tall. Each wall carries a brass spring pad (`kind: 'spring'`, angle ±90°; see [Hooke’s Springboard](hookes-springboard.md) for the pad law). The rider enters upside down, and the "updraft" is the world itself. Gravity is held near straight up (gravity = g·(sin a, −cos a), a ≈ π) and leaned toward the wall the rider is flying at. Each pad throws the rider back across at .9 of its normal speed and higher each time. At the top the rider lands wheels-first on the roof and rides it back over the start.

**Getting in upside down.** A loop at the chimney foot turns the ride 160° onto the underside of a 9 m lintel that rises 20° back over the floor. Its top end is the foot of the right wall.

The skill that matters is following the bike round the loop with the world: lead the bike’s own pitch by 1.5 rad or more. Then gravity runs nearly along the lintel by its end, and the rider leaves it with no pitch spin. Lead by 1.25 rad or less, and the rider leaves with gravity across the surface. The square end pivots the bike, the spin carries through the pad throw (pads keep the pre-impact spin), and the head meets the left wall.

**Deviation from the brief.** The brief asked for a turn of about 90° per flight, so that each wall becomes the floor at landing. That is not physically consistent:

- Making the left wall and then the right wall the floor means swinging gravity from −x to +x, which is half a turn through straight up, not a quarter.
- At the .95 rad/s keyboard cap, each such crossing spends about a second near "up" and adds about 20 m/s of lift.
- Point-mass sims of alternating crossings climbed 140–320 m before turning over. A 30 m chimney cannot hold that.

The map keeps the brief’s chimney, alternating pads, floating apples and roof return. In the chimney the world swings about ±.55 rad either side of π (measured ≈ .7 rad, about 40°, between the walls). The bike stays upside down, so it meets each pad wheels-first with the head hanging away from the wall. In this geometry the sway is optional: a pilot holding gravity straight up, or leaning it the wrong way, also completes. The required skills are the loop lead and turning the world over, plus the pads (see the counterfactual below).

## Route

| Section | Geometry |
| --- | --- |
| Start | Plateau top 2 (x −13…−4), spawn (−6, 2.72). A 3 m chute drops to the floor (y 0), building the approach to the 3 m/s cruise. One apple on the floor at (6, .9). |
| Loop and lintel | Loop radius 2.5 from x 16, turning 160°, chained to a 9 m lintel rising 20° to (≈ 8.4, ≈ 7.9). |
| Chimney | Left pad face x 0, y 2.6…22 (the floor passes under it); right pad face x ≈ 8.4, y ≈ 8.5…27, on the column above the lintel. That is 8.4 m between pad faces and about 6.3 m between wheel-contact lines. Three apples float in the core on the flight path: (4.5, 8.7), (4.7, 13.3), (4.8, 19.4). |
| Roof gallery | Roof underside y 30 from the outer wall to x −10.5. Below it the start room’s ceiling (shelf top 22, x −10…−.5) makes a 8 m-high gallery over the start. One apple at (−6, 29.3). |
| Way down | A radius-2.5 quarter-pipe at x −13 turns the roof into the far wall, which runs down to the plateau. The door is on that wall at (−12.1, 20). |

**Measured flight.** The rider leaves the lintel at about 11 m/s:

1. The left pad throws it at y ≈ 10.5.
2. The right pad throws it at y ≈ 16.
3. It reaches the roof near x −1 at up to 22 m/s, landing wheels-first.

It then rides the roof left at about 11 m/s, turns down the far wall and reaches the door.

**Camera.** Zoom .85. Route hints mark FOLLOW at the loop (rising world angle), UP in the chimney, ROOF in the gallery and DOWN at the quarter-pipe. The roof run and the descent are beyond the ±7.7 m the camera shows ahead.

## Demonstration and tests

**Demonstration.** `createBernoulliPilot({ lead = 1.5, sway = .55, cruise = 3, roofAt = 21, roofLean = .35 })` observes the snapshot only and outputs tilt (no brake). It completes with all 5 apples in about 16.9 s over about 86 m. It is replay index 17 in `src/dev/replay.ts`.

| Variation | Result |
| --- | --- |
| lead 1.5, 1.75, 2 | Completes |
| lead 1, 1.25 | Leaves the lintel spinning; crashes on the left wall at y ≈ 11 |
| sway .4 … .7 | Completes |
| cruise 2.5 … 4 | Completes (15–18 s) |
| Pads turned into plain ground | Crashes on the first wall (y ≈ 10.5) |
| Pads removed | Crashes; never completes |

**Tests.**

- Campaign placement (after spiral-sanctuary, before switchback-scaffold), difficulty 12.75, two ±90° pads, a chimney 6–9 m wide and at least 28 m tall.
- A full replay (via `createReplayPilot`) completes with every apple. It throws off the left then the right pad, stays upside down through the chimney, and swings the world more than .6 rad while staying within 1.2 rad of straight up.
- Leads of 1.75 and 2 and sways of .4 and .7 complete.
- Leads of 1 and 1.25 crash on the left wall before the second core apple.
- Counterfactual: the same pilot with the pads made plain ground crashes before the second core apple; with the pads removed it never completes.
- Fixed tilt −1, −.3, 0, .3 and 1, and fixed world angles −π/2, .2, π/2 and π, never complete in 45 s.

## Known limits

- **Not on a real phone.** The route has not been tuned on a real phone; the margins come from the pilot only.
- **The sway is not enforced.** See "Deviation from the brief" above.
- **Bounds are not narrow.** The map is about 34 × 35 m: the loop and lintel sit beside the chimney, and the gallery runs back over the start.
- **Fast roof landing.** The rider meets the roof at up to 22 m/s. It is survivable because the bike lands wheels-first (as on The Hidden Way Home’s inverted ascent), but it is abrupt.
- **Palette.** The map uses the default jade palette. A mint palette for the chimney is a future idea; adding a palette was out of scope.
