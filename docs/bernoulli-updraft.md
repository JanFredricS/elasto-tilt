# Bernoulli’s Updraft

*Where the flow quickens, it lifts.* Campaign map 18 (index 17), difficulty 12.75, between Spiral Sanctuary and Switchback Scaffold. Code: `src/levels/bernoulli-updraft.ts`. Tests: `tests/bernoulli-updraft.test.ts`.

## Mechanic: a chimney climbed upside down

The chimney is 30 m tall. Each wall carries a brass spring pad (`kind: 'spring'`, angle ±90°; see [Hooke’s Springboard](hookes-springboard.md) for the pad law). The rider enters upside down, and the "updraft" is the world itself: gravity is held near straight up (gravity = g·(sin a, −cos a), a ≈ π). Each pad throws the rider back across at .9 of its normal speed and higher each time. At the top the rider meets a sloping hood at a glancing angle, which turns it onto the roof, and rides the roof back over the start.

**Getting in upside down.** A loop at the chimney foot turns the ride 160° onto the underside of a 9 m lintel that rises 20° back over the floor. Its top end is the foot of the right wall.

The skill that matters is to keep turning the world. The rider crawls round the loop and up the lintel only as fast as the world turns. At the .95 rad/s keyboard cap, turning from 0 to gravity-along-the-lintel (3π/2 − 20° ≈ 4.36 rad) takes about 4.5 s, and the world must keep turning until the lintel throws the rider off:

- Stopping at 4.2 rad or later (gravity within about 10° of along the lintel) leaves the lintel cleanly. Turning on through the launch is also fine, as long as gravity is then turned back up (below).
- Stopping at 4.05 rad or earlier leaves gravity pressing the rider into the lintel. The square end pivots the bike, the spin carries through the pad throw (pads keep the pre-impact spin), and the head meets the left wall at y ≈ 11.
- Between 4.05 and 4.2 the outcome flips run to run. That is about .15 rad, or .15 s of key-hold, at the end of a 4.5 s turn.

Route hints telegraph this: FOLLOW (rising world angle) before the loop, then KEEP TURNING (rising) under the lintel. Loop radius 3, lintel tilts of 15° and 25°, and lintel lengths of 7 m and 11 m were tried; none widened the window, and each broke other parts of the route.

**In the chimney.** The flights are short (about .8 s each), so at .95 rad/s the chimney forgives most sways. Swinging gravity anywhere up to about .9 rad either side of straight up completes, and so does holding it straight up or swinging it the wrong way. What the chimney does demand is turning gravity back from the lintel’s lean (≈ π + 1.1) toward straight up within about .6 s of the launch. Holding the lintel’s lean (a ≈ 4.2) carries the rider flat into the top of the left wall. Turning on past it (a ≈ 4.4) bounces the rider four times and misses the top apple. The level hint says so: turn gravity back to straight up, and the pads do the climbing.

**Deviation from the brief.** The brief asked for a turn of about 90° per flight, so that each wall becomes the floor at landing. That is not physically consistent:

- Making the left wall and then the right wall the floor means swinging gravity from −x to +x, which is half a turn through straight up, not a quarter.
- At the .95 rad/s keyboard cap, each such crossing spends about a second near "up" and adds about 20 m/s of lift.
- Point-mass sims of alternating crossings climbed 140–320 m before turning over. A 30 m chimney cannot hold that.

Three ways to make the sway matter were weighed, and none is robust:

- **Offset pads.** With gravity straight up there is no sideways drift, so vertically offset pads do not punish a straight hold.
- **A throat.** A narrowed throat mid-chimney meets every sway at the same height.
- **An off-axis apple.** Over the 0 to .9 rad swing range the wall-hit heights move by less than a metre (left pad y 10.3–10.5, right pad y 15.2–16.0). An apple that only one sway reaches would be a knife-edge.

The map keeps the brief’s chimney, alternating pads, floating apples and roof return, and is honest about what is enforced: turning over, the loop turn, and turning gravity back up.

## Route

| Section | Geometry |
| --- | --- |
| Start | Plateau top 2 (x −13…−4), spawn (−6, 2.72). A 3 m chute drops to the floor (y 0), building the approach to the 3 m/s cruise. One apple on the floor at (6, .9). |
| Loop and lintel | Loop radius 2.5 from x 16, turning 160°, chained to a 9 m lintel rising 20° to (≈ 8.4, ≈ 7.9). |
| Chimney | Left pad face x 0, y 2.6…22 (the floor passes under it); right pad face x ≈ 8.4, y ≈ 8.5…20.1, on the column above the lintel. That is 8.4 m between pad faces and about 6.3 m between wheel-contact lines. Three apples float in the core on the flight path: (4.5, 8.7), (4.7, 13.3), (4.8, 19.4). |
| Hood | Above the right pad, a 40° cap rises left from (8.4, 20.4) to (−1.4, 28.6). A radius-6 hood turns it into the flat roof at x −5.2. The cap is 2 m deep and the hood pieces as deep as fits under the roof’s top (y 30.6), so with the stepped stone behind them no sky shows through. |
| Roof gallery | Roof underside y 30 from the hood to x −9. Below it, the start room’s ceiling (shelf top 22, x −10…−.5) makes an 8 m-high gallery over the start. One apple at (−6, 29.3). |
| Way down | A radius-4 quarter-pipe at x −13 turns the roof into the far wall. The door is on that wall at (−12.1, 20). The wall’s foot curves (radius 2) out onto the plateau. |

**Measured flight.** The rider leaves the lintel at about 11 m/s:

1. The left pad throws it at y ≈ 10.5.
2. The right pad throws it at y ≈ 16.
3. It meets the cap near x 0 at about 21 m/s, heading about 20° off the cap’s line, and rides the hood onto the roof.

It then rides the roof left at about 16 m/s (11 m/s before the hood), turns down the far wall and reaches the door.

**Why the hood.** The roof used to be flat over the chimney. The rider met it head-on at about 19 m/s, normal to the stone, losing 6–12 m/s in a single 1/120 s step. At 1/60 s steps the same landing rebounded, and two of six tolerance runs cartwheeled and crashed on the roof. The cap takes the landing at a glancing angle: the worst one-step change is now 3–6 m/s for sways up to .85. The price is a faster roof run (about 16 m/s instead of 11), which is why the far quarter-pipe radius went from 2.5 to 4.

**Coming down short.** A rider who misses an apple (for example, the top core apple, after leaning gravity on in the chimney) slides down the far wall past the door. The wall’s curved foot sets the rider on the plateau, so turning the world back down and riding the route again works. Before the foot was curved, this ended in the plateau’s square corner and crashed.

**Camera.** Zoom .85. Route hints mark FOLLOW at the loop’s foot (14.8, 1.8), KEEP TURNING under the lintel (11.8, 3.4), UP in the chimney, ROOF in the gallery and DOWN at the quarter-pipe. The roof run and the descent are beyond the ±7.7 m the camera shows ahead. The camera follows the bike with no look-ahead. KEEP TURNING is on screen from the floor approach (landscape) or from the loop’s top (portrait). Its distance from the rider is about 3.1 m, clear of the rider’s head, when the world reaches 4.1 rad (t ≈ 12.7 s, bike at (10.8, 6.3)). It sat at (10.5, 5.2) until cycle 2, under the rider’s head at exactly that moment, and its label ran into FOLLOW’s on the overview.

## Demonstration and tests

**Demonstration.** `createBernoulliPilot({ lead = 1.5, release = 3π/2 − 20°, sway = .55, chimney, cruise = 3, roofAt = 21, roofLean = .35 })` observes the snapshot only and outputs tilt (no brake). It reads speeds from the snapshot clock, so it rides at any step size. It completes with all 5 apples in about 16 s over about 85 m. It is replay index 17 in `src/dev/replay.ts`.

The lead saturates: the world turns at its cap from the loop on whatever the lead, so leads of 1.6 and above are the same run. The player-facing variable is `release`, where the world stops turning.

| Variation (1/120 s) | Result |
| --- | --- |
| release ≥ 4.1 (lead 3) | Completes (4.1–4.2 flips run to run with sway) |
| release ≤ 4.05; lead 1, 1.25 | Leaves the lintel spinning; crashes on the left wall at y ≈ 11 |
| sway 0 … 1, straight up, wrong way | Completes |
| chimney held at 2.0 … 4.0 | Completes (the rate cap never lets it get far from π) |
| chimney held at 4.2 | Crashes into the top of the left wall |
| chimney held at 4.4 | Misses the top core apple; alive |
| no turn for .1 … .6 s after the launch | Completes; .8 s crashes |
| cruise 2 … 5, roofLean 0 … .6, roofAt 15 … 26 | Completes (13–20 s) |
| Pads turned into plain ground | Crashes on the first wall (y ≈ 10.5) |
| Pads removed | Crashes; never completes |

**Grid.** Release {4.15, 4.3, 4.5} × sway {0, .4, .8} × roofLean {0, .35, .6} × post-launch pause {0, .3 s} gives 54 runs:

- At 1/120 s, 42 of 54 complete (39 before the hood). Every failure is either a release at the lintel cliff (4.15) or a late release followed by a .3 s pause, which leans gravity too long (three of those crash at the top of the left wall; three miss the top apple and stay alive). None fails on the hood or the roof.
- At 1/60 s, 38 of 54 complete (30 before the hood; 37 in cycle 1, one 4.15 run flips). Four runs crash between the hood and the quarter-pipe at 7–13 m/s, all after a late release and a .3 s pause. Three of those miss an apple and stay alive at 1/120 s. Only one (release 4.5, sway 0, roofLean 0, pause .3) completes at 1/120 s and crashes at 1/60 s. The rest are the same two kinds as at 1/120 s.

The game always steps at a fixed 1/120 s (`FIXED_DT` in `src/main.ts`), so the 1/60 s losses are test-only. Quarter-pipe radii of 5 and 6 left the 1/120 s grid unchanged at 42/54 and moved 1/60 s only to 38 and 37. The crashes sit at the roof’s end (x −8.5 … −10), not on the curve, so the radius was left at 4.

**Release sweep (1/120 s, lead 3).** Releases 3.95 … 4.3 in .025 steps, sways 0, .55 and .8:

- 4.025 and below always crash on the left wall at y ≈ 11.
- 4.05 … 4.075 crash except one run (4.05 at sway 0).
- 4.1 and above complete, except 4.15 at sway 0.

**A rounded lintel lip was tried and rejected (cycle 2).** It was a convex arc at the lintel’s top end, so the bike does not pivot on a square corner. The lintel was shortened by the arc length. Some lips moved the cliff to below 3.95 (25° on radius 1.5, 30° on radius 1.25). Their neighbours were far worse: 20° on radius 1.5 crashed every release up to 5, and 30° or 35° on radius 1.75 crashed every release up to 4.2. A 5 × 3 grid of lip angles (22°–28°) and radii (1.35–1.65), with 10 rides each, gave every pattern from 0/10 to 10/10. The outcome depends chaotically on the spin the bike carries off the lintel into the left pad, so a lip would trade a known cliff for an untestable lottery.

**Tests.**

- Campaign placement (after spiral-sanctuary, before switchback-scaffold), difficulty 12.75, two ±90° pads, a chimney 6–9 m wide and at least 28 m tall.
- The deep cap and hood pieces stay below the roof's top (y 30.6).
- In the browser, `e2e/expansion.spec.ts` rides the replay through the rendered game. It completes with 5 apples over 85 m in 16 s, with three flights of .5–.65 s. Evidence: `docs/evidence/bernoullis-updraft-overview.png` and `-flight.png`.
- A full replay (via `createReplayPilot`) completes with every apple. It throws off the left then the right pad, stays upside down through the chimney, and swings the world more than .6 rad while staying within 1.2 rad of straight up.
- Releases of 4.25 and 5 (turning through the launch) complete. Sways of .4, .7 and 0 (straight up) complete.
- Holding the lintel’s lean in the chimney (4.2) crashes at the left wall. Turning on (4.4) never completes.
- The default pilot and sway 0 complete at 1/60 s.
- The worst one-step velocity change at the hood stays under 6 m/s (sway 0 and .55).
- Coming down short of the top apple, turning the world back at the plateau and riding a second lap completes.
- Leads of 1 and 1.25 crash on the left wall before the second core apple.
- Counterfactual: the same pilot with the pads made plain ground crashes before the second core apple; with the pads removed it never completes.
- Fixed tilt −1, −.3, 0, .3 and 1, and fixed world angles −π/2, .2, π/2 and π, never complete in 45 s.

## Residuals / known issues

- **Not on a real phone.** The route has not been tuned on a real phone; the margins come from the pilot only.
- **The sway is free.** See "In the chimney" above. Any swing within about .9 rad of straight up completes, including none and the wrong way. The chimney enforces only turning over at the loop, keeping turning up the lintel, and turning gravity back up within about .6 s of the launch. Ways to make the sway matter (offset pads, a throat, an off-axis apple) were weighed and none is robust.
- **The original concept is physically impossible.** The brief asked for about 90° of world turn per flight, each wall becoming the floor in turn. That is half a turn through straight up for every crossing, which at .95 rad/s adds about 20 m/s of lift each time; a 30 m chimney cannot hold it. See "Deviation from the brief".
- **The lintel release cliff.** The world must turn to at least 4.1 rad. Stopping at 4.05 rad or earlier crashes, and between 4.05 and 4.15 the outcome flips run to run. That is about .1 s of key-hold at the end of a 4.5 s turn. It is telegraphed (KEEP TURNING, on screen through the whole turn and clear of the rider), not widened. Loop radius 3, lintel tilts of 15° and 25°, lintel lengths of 7 m and 11 m (cycle 1) and a rounded lip (cycle 2) were all tried; none widens it robustly.
- **Short for its slot (accepted).** About 16 s and 85 m, against 95–108 s for its neighbours.
  - The time splits into about 8 s on the plateau and floor at the 3 m/s cruise, about 4.5 s turning the world round the loop and up the lintel (launch at t ≈ 13 s), about 1.5 s in the chimney, and about 1.5 s on the roof and the descent.
  - Its difficulty is precision, not stamina, as on Hooke’s Springboard (59 m / 12 s at 14.5).
  - A second beat after the roof was considered and not built. The roof run is fast (about 16 m/s), so a slower section there would need new geometry at speed. Every required section after the release cliff also makes each failed attempt longer.
  - Its 12.75 slot assumes that a miss costs a restart of only about 12 s.
- **1/60 s corners (test-only).** At 1/60 s, 1 of 54 grid runs that complete at 1/120 s crashes at the roof’s end; three runs that miss an apple at 1/120 s crash there instead. The game steps at a fixed 1/120 s, so players never meet this. Larger quarter-pipe radii did not help.
- **Bounds are not narrow.** The map is about 34 × 35 m: the loop and lintel sit beside the chimney, and the gallery runs back over the start. A tall portrait chimney was the concept.
- **Pads.** On the route every pad contact arrives at 8–15 m/s along the pad normal, well above the 1.2 m/s `SPRING_MIN_SPEED`. Below that a pad acts as plain ground. A slow rider can only meet one at the lintel’s top end, and there that is harmless.
- **Palette.** The map uses the default jade palette. A mint palette for the chimney is a future idea; adding a palette was out of scope.
