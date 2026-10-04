# Redesigned campaign routes

This replaces the short original routes. Coordinates are metres, positive y up. All fifteen have real Rapier replays that collect every apple and reach the exit using normal control commands. Timing below measures controlled demonstrations, not a forced minimum or speedrun record. Earlier review documents describe the superseded first layouts.

| Map | Route | Apples | Demonstrated distance / time |
| --- | --- | --- | --- |
| Newton’s Orchard | Climb to a 4 m terrace, descend into a hollow, reach the far hill, brake and return home. | 5 | 98 m / 45 s |
| One Wheel Wonder | Brake the rear wheel against a gold stop and pivot up to the high apple; descend into the deep bowl, climb the far bank and return. | 6 | 58 s |
| The Hanging Garden | Upper garden, compact suspended crossing, sunken orchard, then cross the moving deck again on the return. | 5 | 98 m / 49 s |
| The Pendulum Mill | Two compact decks of different suspension lengths, curved mill wall, long overhead return. | 6 | 103 m / 53 s |
| The Room on Its Side | Sunken floor around a central divider, rounded end wall, ceiling journey home. | 6 | 92 m / 46 s |
| Newton’s Attic | Ramped ridge and loose weights; return past the home door to collect a storage-pocket apple, then reverse again. | 6 | 102 m / 69 s |
| Escher’s Orchard | Lower gallery → east wall → roof → west wall → top of the former entry ceiling → inner-room reversal. | 8 | 119 m / 81 s |
| The Contrary Conservatory | Lower greenhouse, rising weights, end wall and roof; reverse out of the final roof pocket. | 7 | 102 m / 68 s |
| The Gravity Engine | Compact hanging deck, long approach around an axle, wall climb and overhead gallery return. | 7 | 83 m / 56 s |
| The Clockwork Apple | Long approach raises a lift; collect the high apple and reverse the entire journey to lower it and return. | 5 | 74 m / 49 s |
| The Other Side | Turn around the exposed end of one solid strip and return along its underside. | 5 | 61 m / 31 s |
| Spiral Sanctuary | More than two inward circular turns, two airborne gap crossings, central door. | 9 | 192 m / 95 s |
| Switchback Scaffold | Wall climb, free-air somersault, wheels-on-top landing, upper-storey return. | 6 | 182 m / 108 s |
| The Hidden Way Home | Two opposing wall jumps, final wall apple, inverted ascent to a hidden ledge, original door. | 6 | about 387 m / 132 s |
| Stairway to Heaven | Four giant steps: turn onto each vertical riser, ease over each crest, collect the summit apple, and descend home. | 8 | 197 m / 160 s |

The map 2 correction and measured one-wheel apple collection are documented in [one-wheel-fix.md](one-wheel-fix.md).

Acceptance coverage is in `tests/campaign-early.test.ts` and `tests/campaign-late.test.ts`. Static tests separately check rotated bounds and bike spawn clearance. Campaign tests reject idle, held rotation, and fixed-angle attempts as trivial quick solutions. They record actual wheel support on the swings. An independent reviewer removed each of the four swing decks and observed the unchanged pilot crash at its gap. Clockwork tests freeze the lift and omit the return leg; both experiments prevent the tested route from completing.

Escher now involves a complete gravity circuit and a shared ceiling/floor, with nested architecture and a reverse detour. Its geometry remains planar; it is not a topologically impossible world or a teleport system. Loose/inverted weights respond physically but do not operate mandatory gates. Sustained upside-down hanging and brake-assisted free-wheel swing capture still need dedicated campaign challenges. See [map residuals](maps-residuals.md).

Browser gameplay evidence is recorded independently in [gameplay-v2.md](gameplay-v2.md). Full route overview is available using MAP or M, which pauses simulation. Physical phone sensor feel and sustained mobile performance remain hardware checks.

Design reference: Elasto Mania’s traversal, balance, and collectible-route tradition; see the [official game page](https://elastomania.com/index.html) and [community level overview](https://www.pcgamer.com/how-a-17-year-old-community-is-keeping-elasto-mania-alive/). All terrain and artwork here are original.

Expansion route details and control coverage: [flip and spiral](flip-spiral.md), [scaffold and chasm](tower-chasm.md), [rendered validation](expansion-gameplay.md).

[Stairway to Heaven](stairway.md) adds demonstrated contact on every riser, tread and local corner, including the return descent.
