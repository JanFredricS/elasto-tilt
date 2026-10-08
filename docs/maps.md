# Redesigned campaign routes

This replaces the short original routes. Coordinates are metres, positive y up. Every campaign map has a real Rapier replay (`src/dev/replay.ts`) that collect every apple and reach the exit using normal control commands. Timing below measures controlled demonstrations, not a forced minimum or speedrun record. Earlier review documents describe the superseded first layouts.

| Map | Route | Apples | Demonstrated distance / time |
| --- | --- | --- | --- |
| Newton’s First Lesson | *A body at rest stays at rest.* The opening lesson: tilt right a little to start rolling, then a gentle 8° hill with a long level run-out into the door; a back wall stops a wrong-way start. No brake needed, no hazards; its brake is soft (`brakeScale` .3), so grabbing it at speed off the hill top slows the rider instead of pitching them over the bars. For its first 8 s it alone shows the objective line. | 3 | 39 m / 18 s |
| Newton’s Orchard | Climb to a 4 m terrace, descend into a hollow, reach the far hill, brake and return home. | 5 | 98 m / 45 s |
| One Wheel Wonder | Brake the rear wheel against a gold stop and pivot up to the high apple; descend into the deep bowl, climb the far bank and return. | 6 | 58 s |
| The Hanging Garden | Upper garden, compact suspended crossing, sunken orchard, then cross the moving deck again on the return. | 5 | 98 m / 49 s |
| The Pendulum Mill | Call, board and brake on two compact cradles across moderate gaps, then climb the curved mill wall and return overhead. | 6 | 104 m / 77 s |
| The Room on Its Side | Sunken floor around a central divider, rounded end wall, ceiling journey home. | 6 | 92 m / 46 s |
| Newton’s Attic | *Set the mass in motion.* Nudge a small barrel into its floor socket (it seats and becomes floor), climb the ramp to the ridge cradle and lean into the 9.8 kg barrel until it pops over its 35° right lip (≈26–28° tilt with the bike pushing, ≈34° by tilt alone; the 68° back of the cradle holds it against any leftward tilt up to ≈1.15 rad), wait for it to drop into the matching round well and lock as the bridge, cross to the far apples, then return over the plug and up out of the cradle bowl past the door to the storage apple. | 6 | 108 m / 70 s |
| Escher’s Orchard | Lower gallery → east wall → roof → west wall → top of the former entry ceiling → inner-room reversal. | 8 | 111 m / 75 s |
| The Contrary Conservatory | Lower greenhouse, rising weights, end wall and roof; reverse out of the final roof pocket. | 7 | 102 m / 68 s |
| The Gravity Engine | Compact hanging deck, long approach around an axle, wall climb and overhead gallery return. | 7 | 83 m / 56 s |
| The Clockwork Apple | Long approach raises a lift; collect the high apple and reverse the entire journey to lower it and return. | 5 | 74 m / 49 s |
| The Clockwork Wedge | Second time map. Riding right lowers a counterweight onto the door, which the spawn deck cannot reach. Ride west off the deck, come back beneath it and push a wooden wedge from under the deck to the weight (it seats as stone), ride over the weight and a one-way drop, loop a half-pipe onto the roof, ride left to lift the weight until a catch over the door stops you, then keep turning the world and fall onto the door. No brake needed. See [clockwork-wedge.md](clockwork-wedge.md). | 6 | 160 m / 79 s |
| The Other Side | Turn around the exposed end of one solid strip and return along its underside. | 5 | 61 m / 31 s |
| Huygens’ Return | One long, heavily damped pendulum: brake on its plank and turn the world to swing it a quarter turn up against a tower, ride up the wall and round a 180° crown, jump a saw-tooth spike trench off a kicker lip, tip the world back to re-park the plank, then ride its underside and swing home beneath the start shelf to the door. | 4 | 102 m / 58 s |
| Spiral Sanctuary | More than two inward circular turns, two airborne gap crossings, central door. | 9 | 192 m / 95 s |
| Switchback Scaffold | Wall climb, free-air somersault, wheels-on-top landing, upper-storey return. | 6 | 182 m / 108 s |
| The Hidden Way Home | Two opposing wall jumps, final wall apple, inverted ascent to a hidden ledge, original door. | 6 | about 387 m / 132 s |
| Hooke’s Springboard | Spring pads: slide into a brass pad, lean gravity forward in the throw to clear a spike pit, scrub the landing speed, then repeat over a wider pit to the door. The first throw forgives any lean from ≈ .35 to .8 rad; the second needs ≥ .5. See [hookes-springboard.md](hookes-springboard.md). | 4 | 59 m / 12 s |
| The Piston Works | Self-running lifts (pairs of tyre-wide pistons on their own periods): board lift A as it rests low, ride up, drop through a half-pipe, ride B1 up and cross to B2 only as their tops meet, then ride lift C down its shaft for a mandatory apple and back up to the door. | 5 | 72 m / 63 s |
| Stairway to Heaven | Four giant steps: turn onto each vertical riser, ease over each crest, collect the summit apple, and descend home. | 8 | 197 m / 160 s |

The map 2 correction and measured one-wheel apple collection are documented in [one-wheel-fix.md](one-wheel-fix.md).

Acceptance coverage is in `tests/campaign-early.test.ts` and `tests/campaign-late.test.ts`. Static tests separately check rotated bounds and bike spawn clearance. Campaign tests reject idle, held rotation, and fixed-angle attempts as trivial quick solutions. They record actual wheel support on the swings. An independent reviewer removed each of the four swing decks and observed the unchanged pilot crash at its gap. Clockwork tests freeze the lift and omit the return leg; both experiments prevent the tested route from completing.

Escher now involves a complete gravity circuit and a shared ceiling/floor, with a continuous low tunnel around each bend and a reverse detour. Its geometry remains planar; it is not a topologically impossible world or a teleport system. Newton’s Attic’s ridge barrel is a required plug: props with a `socket` lock in place once they come to rest there. Loose props are harmless to the helmet. The Conservatory’s inverted weights still respond physically without operating a mandatory gate. Sustained upside-down hanging and brake-assisted free-wheel swing capture still need dedicated campaign challenges. See [map residuals](maps-residuals.md).

Browser gameplay evidence is recorded independently in [gameplay-v2.md](gameplay-v2.md). Full route overview is available using MAP or M, which pauses simulation. Physical phone sensor feel and sustained mobile performance remain hardware checks.

Design reference: Elasto Mania’s traversal, balance, and collectible-route tradition; see the [official game page](https://elastomania.com/index.html) and [community level overview](https://www.pcgamer.com/how-a-17-year-old-community-is-keeping-elasto-mania-alive/). All terrain and artwork here are original.

Expansion route details and control coverage: [flip and spiral](flip-spiral.md), [scaffold and chasm](tower-chasm.md), [rendered validation](expansion-gameplay.md).

[Stairway to Heaven](stairway.md) adds demonstrated contact on every riser, tread and local corner, including the return descent.

Campaign order (22 maps): First Lesson; Orchard; One Wheel Wonder; Room on Its Side; Attic; Pendulum Mill; Escher’s Orchard; Cannonball; Ouroboros; Contrary Conservatory; Gravity Engine; Hanging Garden; Clockwork Apple; Clockwork Wedge; The Other Side; Huygens’ Return; Spiral Sanctuary; Switchback Scaffold; The Hidden Way Home; Hooke’s Springboard; The Piston Works; Stairway to Heaven. Saves store only an unlocked count, so inserting the First Lesson at the front shifts an existing save's unlocked set by one map. Inserting Huygens’ Return (16th) and the Piston Works (21st) likewise moves every later map one or two places down, so an existing save may need those maps replayed.
