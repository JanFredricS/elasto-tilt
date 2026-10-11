# Hooke’s Ceiling

Campaign map 21 (index 20), difficulty 14.6. It is the direct sequel to Hooke’s Springboard (14.5) and comes before The Piston Works (14.75). Subtitle: *What falls up must come down.* Palette: jade (the default; no `paletteFor` change). Code: `src/levels/hookes-ceiling.ts`. Tests: `tests/hookes-ceiling.test.ts`.

## Starting upside down

The map sets `initialAngle: Math.PI`. Gravity is g·(sin a, −cos a), so at π it points map-up, and the rider starts on the **underside** of a long slab.

**New field: `Level.spawnAngle`.** The bike used to always spawn upright in map space (wheels at map −y), so under π gravity it fell up onto its head and crashed. This map needed an orientation for the rider at spawn, so `Level.spawnAngle` was added (default 0, so no other map changes):

- `src/physics.ts` rotates the frame by that angle about the spawn point and places the wheels at the rotated axle offsets.
- The spawn-overlap test in `tests/levels.test.ts` rotates the same chassis, wheel, neck and visible-head shapes by `spawnAngle`.
- `spawnAngle` is not derived from `initialAngle` (Spiral Sanctuary starts banked .06 rad with an unturned rider), but `tests/levels.test.ts` checks on every map that the two agree to within .2 rad, so a map cannot turn the world over and forget the rider.

This map uses `spawnAngle: π`. The frame centre spawns at map (1, −.72), .72 m *below* the ceiling face at y 0. The wheels sit at y −.36 with a 2 cm gap, the neck ball hangs at y −1.41 and the visible head at y −1.52. The test also checks that the same spawn with `spawnAngle: 0` crashes on the head.

## Route

The **first half is Hooke’s Springboard, exactly**. It is authored in the rider’s turned frame (X = −x, Y = −y) using Hooke’s own numbers, then given half a turn (`turn()` maps each surface to (−x, −y) and adds π to its angle). Turning rigid geometry and gravity together does not change the physics, so every margin measured on Hooke’s carries over. The rider travels map −x, which is screen-right while the world is at π.

**Ceiling-mounted pads.** A pad reflects the rig’s velocity about the contact normal (`v − (1+e)(v·n)n`), so a pad facing down throws exactly as a pad facing up does. Leaning forward in the rider’s frame means world angle π + a.

| Section (map space) | Geometry |
| --- | --- |
| Ceiling plateau | Underside y 0, x 4 … −6; back wall at x 4.3; one apple. A knee rounds it into a 50° slide that rises into the stone to ceiling pad 1 (y 5). |
| Ceiling pit 1 | Spikes x −15 … −19 (4 m), set into the ceiling; apple in the air at (−17, 1.2). |
| Ceiling ledge 1 | Underside y 3.5, x −19 … −34; one apple. A slide rises to ceiling pad 2 (y 8.5). |
| Ceiling pit 2 | Spikes x −43 … −49 (6 m); apple at (−45, 4.9). |
| Ceiling ledge 2 | Underside y 7, x −49 … −68 (19 m): room to scrub a fast landing before the nose. A SLOW arrow sits 5 m past the landing edge. |
| Nose | Convex 32-piece chain of radius 2.5 m, centred at (−68, 9.5), like the underside-return nose. It curls from the underside (y 7) round the slab’s left end onto its top face (y 12). Apple at (−71.3, 9.5). |
| Top face | y 12, x −68 … −33 (35 m), right-way-up in map space. |
| Floor pit 3 | The same knee and 50° slide drop 5 m to an ordinary floor pad (y 7, to x −24). Spikes x −24 … −19 (5 m); apple at (−22, 10.8). |
| Door ledge | Top 8.5, x −19 … −9, door at (−14, 9.3). It ends in a catching quarter-pipe and wall. |

The top-half pit is cut into the stone over ceiling ledge 1. Ledge 1’s block stops at y 6.5, under pad 3. The slab’s top block (y 9.3 … 12) sits over pad 2 and the ceiling pit 2 floor.

**Rounding the nose.** Gravity must keep pointing into the stone as the wheels curl: π on the underside, π/2 at the left end, 0 on top. The world angle therefore falls by π, which is the circular hint’s `spin: −1`. Taken at the slow speed the hint asks for (about 1.8 m/s), it takes about 4.5 s. The keyboard turns the world at most .95 rad/s, and the wheels’ path round the nose is about π·2.84 m, so the turn can keep up only below about 2.7 m/s. Measured with the pilot’s heading-tracking curl: approach speeds 1 … 2.5 m/s complete and 3 m/s flies off the top of the nose. The world may lag or lead the frame’s heading by about .15 … .25 rad. Turning at a fixed rate from the start of the nose fails at every rate from .5 to .95 rad/s, because gravity swings back toward pit 2 before the wheels reach the vertical. The Other Side behaves the same way.

## Demonstration

`createHookesCeilingPilot(lean = .6, secondLean = lean, lastLean = lean, cruise = 2.5)` reads only the snapshot and outputs tilt and brake.

1. Over the ceiling it runs Hooke’s pilot logic in the turned frame, with positions, pitch and world angle measured relative to π.
2. On ledge 2 it leans back and feathers the brake to about 1.8 m/s.
3. At the nose it keeps the world angle equal to the frame’s unwrapped heading, plus a small speed-keeping lean.
4. On top it repeats the springboard drill once with `lastLean`.

It completes with all 6 apples in about 39 s, over about 125 m.

Measured with the other leans held at .6:

| Lean (rad) | Ceiling jump 1 | Ceiling jump 2 | Last (floor) jump |
| --- | --- | --- | --- |
| 0 | Drops onto the pit 1 spikes | Drops onto the pit 2 spikes | Drops onto the pit 3 spikes |
| .3 | Clears the spikes; head strikes ledge 1’s lip | — | Clears the spikes; head strikes the door ledge’s lip |
| .35 | Completes | Head strikes ledge 2’s lip | Crashes at the door ledge’s lip |
| .4 | Completes | — | Crashes on the door ledge |
| .45 | — | Head strikes ledge 2’s lip | Completes |
| .5 … .8 | Completes | Completes | Completes |
| .85 | Crashes later, while scrubbing on ledge 2 | Completes | Completes |
| .9 | Crashes later, on ledge 2 | Crashes later, on the top face | Completes |

So the windows are about .33 … .8 for jump 1, .5 … .85 for jump 2 and .45 … 1 for the last jump.

The ceiling half is an exact mirror of Hooke’s Springboard: lean 0 crashes at (−17.61, 3.76) here and at (17.61, −3.76) there.

Ledge 2 was lengthened from 15 to 19 m. At 15 m, a .8 second lean arrived at the nose at about 7 m/s and flew off it.

## Tests

- **Placement:** directly after Hooke’s Springboard and before the Piston Works, difficulty 14.6, three brass pads. The hint warns about the inverted start and says “don’t brake on brass”.
- **Inverted spawn:** the world is at π and the frame is turned over. The bike rests .72 m under the ceiling. The same spawn with `spawnAngle: 0` crashes.
- **Full replay:** collects every apple with exactly three pad throws. The world leans past π + .45 and returns below .1. The bike reaches the top face. The run is also driven through `createReplayPilot` at the map’s campaign index.
- **Negative tests:** with no lean, each of the three throws drops into its spike pit. The same run over harmless spikes (made stone) is still riding, so the spikes are what kill. Short throws (.3 on pit 1, .35 and .45 on pit 2, .3 on pit 3) clear the spikes, but the head strikes the far ledge’s lip. They crash at the same point with the spikes made stone. Fixed tilt −1, 0 and +1 never complete.
- **Tolerance:** the first jump completes at .35, .55 and .8.
- **Counterfactual:** with all three pads turned into plain stone, the same pilot never gets out of ceiling pit 1.
- **Rendered:** `e2e/expansion.spec.ts` drives the replay through the real game page and saves `docs/evidence/hookes-ceiling-overview.png`.

## Known limits

- **Not on a real phone.** The route has not been tuned on a real phone. Rounding the nose from π to 0 is a long continuous turn, the same as The Other Side.
- **Turned screen direction.** While the world is at π, map −x is screen-right, so the whole ride reads left to right on screen. After the nose, the rider also travels screen-right.
