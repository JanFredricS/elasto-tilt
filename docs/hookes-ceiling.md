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
| Nose | Convex 32-piece chain of radius 3 m (2.5 m until the second audit), centred at (−68, 10), like the underside-return nose. It curls from the underside (y 7) round the slab’s left end onto its top face (y 13). Apple at (−71.8, 10). |
| Top face | y 13, x −68 … −33 (35 m), right-way-up in map space. One apple halfway, at (−50.5, 13.9). |
| Floor pit 3 | The same knee and 50° slide drop 5 m to an ordinary floor pad (y 8, to x −24). Spikes x −24 … −19 (5 m); apple at (−22, 11.8). |
| Door ledge | Top 9.5, x −19 … −9, door at (−14, 10.3). It ends in a catching quarter-pipe and wall. |

The top half is placed from the top face down (pit 3 floor = top − 5, door ledge = floor + 1.5), so its throw is the same whatever the nose radius. The top-half pit is cut into the stone over ceiling ledge 1. Ledge 1’s block stops at y 7.5, under pad 3. The slab’s top block (y 9.3 … 13) sits over pad 2 and the ceiling pit 2 floor.

**Filler stone.** The overview used to show two see-through holes: the cavity between ceiling slide 2 and the last slide (two parallel 50° faces, x ≈ −38 … −28) and a half-disc inside the nose ribbon. Both are now filled with stone that no ride touches: a backing under each slide, one slab spanning the two faces, a cap behind pad 2, and rings of short facets inside the nose (they read as a coiled spring cut through). They are listed first so the ridden stone draws over their seams. `CEILING_FILLER` lists their ids. A test checks that the ride is the same with them removed and that none of their corners comes within a metre outside a ridden face.

**Rounding the nose.** Gravity must keep pointing into the stone as the wheels curl: π on the underside, π/2 at the left end, 0 on top. The world angle therefore falls by π, which is the circular hint’s `spin: −1`. Taken at the slow speed the hint asks for (about 1.8 m/s), it takes about 5 s. The keyboard turns the world at most .95 rad/s, and the wheels’ path round the nose is about π·3.34 m, so the turn can keep up only below about 3.2 m/s.

The nose was the map’s real difficulty spike, so the second audit widened it from 2.5 to 3 m, following the widening of Huygens’ crown. Measured with the pilot’s heading-tracking curl at keyboard rate (`noseSpeed`, `noseBias`):

| Nose radius | Approach speeds that complete | First failure | Gravity offset from the frame’s heading that completes |
| --- | --- | --- | --- |
| 2.5 m | 1 … 2.8 m/s | 3 m/s flies off the top and crashes on the top face | −.3 … +.2 rad |
| 3 m | 1 … 3.3 m/s | 3.6 m/s, same failure | −.25 … +.25 rad (−.3 still riding, too slowly, at 55 s) |

So the wider nose forgives about half a metre per second more pace, and the same .5 rad width of tracking error. Lagging by .4 rad or more lets the bike roll back off the nose into pit 2 at either radius. Turning at a fixed rate from the start of the nose fails, because gravity swings back toward pit 2 before the wheels reach the vertical. The Other Side behaves the same way.

## Demonstration

`createHookesCeilingPilot(lean = .6, secondLean = lean, lastLean = lean, cruise = 2.5, noseSpeed = 1.8, noseBias = 0)` reads only the snapshot and outputs tilt and brake.

1. Over the ceiling it runs Hooke’s pilot logic in the turned frame, with positions, pitch and world angle measured relative to π.
2. On ledge 2 it leans back and feathers the brake to `noseSpeed`.
3. At the nose it keeps the world angle equal to the frame’s unwrapped heading (plus `noseBias`), plus a small speed-keeping lean.
4. On top it repeats the springboard drill once with `lastLean`.

It completes with all 7 apples in about 40 s, over about 141 m (rendered e2e trace).

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
| 1 … 1.1 | Crashes later, at pit 2 | 1: crashes on the top face; 1.1: reaches the door short of an apple | Completes |

So the windows are about .33 … .8 for jump 1, .5 … .85 for jump 2 and .45 … 1.1 for the last jump. They are the same with the 2.5 m nose, except that a .85 second lean then reached the nose fast (4 m/s) and only just survived; with the 3 m nose it rounds it at 2 m/s. Cruise speeds 1.5 … 4 m/s all complete.

The ceiling half is an exact mirror of Hooke’s Springboard: lean 0 crashes at (−17.61, 3.76) here and at (17.61, −3.76) there.

Ledge 2 was lengthened from 15 to 19 m. At 15 m, a .8 second lean arrived at the nose at about 7 m/s and flew off it.

## Tests

- **Placement:** directly after Hooke’s Springboard and before the Piston Works, difficulty 14.6, three brass pads. The hint warns about the inverted start and says “don’t brake on brass”.
- **Inverted spawn:** the world is at π and the frame is turned over. The bike rests .72 m under the ceiling. The same spawn with `spawnAngle: 0` crashes.
- **Full replay:** collects every apple with exactly three pad throws. The world leans past π + .45 and returns below .1. The bike reaches the top face. The run is also driven through `createReplayPilot` at the map’s campaign index.
- **Negative tests:** with no lean, each of the three throws drops into its spike pit. The same run over harmless spikes (made stone) is still riding, so the spikes are what kill. Short throws (.3 on pit 1, .35 and .45 on pit 2, .3 on pit 3) clear the spikes, but the head strikes the far ledge’s lip. They crash at the same point with the spikes made stone. Fixed tilt −1, 0 and +1 never complete.
- **Tolerance:** the first jump completes at .35, .55 and .8. The nose completes from 1 and 3 m/s approaches and with gravity .25 rad behind or ahead of the frame; at 3.6 m/s the rider flies off it.
- **Filler:** the ride is unchanged with the filler stone removed, and no filler corner sits on the ridden side of any face.
- **Counterfactual:** with all three pads turned into plain stone, the same pilot never gets out of ceiling pit 1.
- **Rendered:** `e2e/expansion.spec.ts` drives the replay through the real game page and saves `docs/evidence/hookes-ceiling-overview.png`.

## Residuals / known issues

What remains after two audits:

- **Not played on a real phone.** All numbers come from the scripted pilot at keyboard rate (.95 rad/s). Nobody has ridden the route on hardware.
- **Phone versus keyboard at the nose.** On a phone the world angle follows the bank directly, so the nose has no rate limit: a phone rider can round it faster than 3.3 m/s, if they can track the heading. A keyboard rider is limited by the turn rate and must arrive slowly. So the nose is harder on keys than on a phone. Only the keyboard path is measured.
- **The phone must turn 180° and back.** The map starts at world π. On a phone that means starting with the device turned half over, or recalibrating at a turned pose. Then the nose asks for a continuous half turn back to 0, as The Other Side does, which is a large bank change on the phone curve (README). Whether players manage it comfortably, and whether they need to recalibrate on the top face, is untested.
- **The nose is still the spike.** Widening it to 3 m helps (up to 3.3 m/s, ±.25 rad), but it is still the hardest moment on the map. It needs a slow, continuous, heading-tracking turn, unlike the throws that come before it. The SLOW arrow and the hint say so. Whether that is enough for slot 14.6 needs real players.
- **The first half looks like Hooke’s Springboard.** The camera turns with the world, so for the first ~50 m the screen shows Hooke’s Springboard, and the inversion is visible only on the HUD dial (180°), the DROP UP label and the overview. This is deliberate: the throws carry Hooke’s measured margins exactly. It was left as is, because changing the apple rhythm or the geometry would break the exact-mirror property the tests rely on. The new parts are the nose and the top half.
- **Top-face pacing.** The 35 m top face has only one beat, the apple halfway along. A terrain change there was not added, so the final throw’s approach stays as measured.
- **Cosmetic seams.** The filler stone leaves a few faint joints in the overview. Tiny gaps at the convex knees (the same as on Hooke’s Springboard) remain.
- **Turned screen direction.** While the world is at π, map −x is screen-right, so the whole ride reads left to right on screen. After the nose, the rider also travels screen-right.
- **Saves.** Inserting the map at index 20 shifts the later maps by one in an existing save (see maps.md).
