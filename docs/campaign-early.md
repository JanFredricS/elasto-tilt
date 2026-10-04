# Opening campaign routes

The first five level IDs, display names and order remain save-compatible. Their terrain is authored in metres. Each map has five or six apples, meaningful elevation changes, and a route that needs deliberate steering. There are no timers or artificial waiting gates.

| Map | Route | Demonstrated time | Travel |
| --- | --- | ---: | ---: |
| Newton’s Orchard | Out over a 4 m terrace, through a hollow at −1.5 m, up to a far 3 m terrace, brake and return to the start | 44.7 s | 98.5 m |
| One Wheel Wonder | Climb to a 5 m beam, descend into a −5 m bowl, climb the far bank, reverse and return | 53.5 s | 118.4 m |
| The Hanging Garden | Upper garden, short suspended crossing, sunken orchard, return across the same moving deck | 49.2 s | 97.8 m |
| The Pendulum Mill | Climbing entrance, two independent suspended decks, large curved end wall, ceiling return gallery | 52.9 s | 102.5 m |
| The Room on Its Side | Sunken floor, rising bank, rounded end wall, ceiling route above a central divider | ≈46 s | 92.0 m |

These are representative controlled runs, not enforced minimums or speedrun estimates. The test pilot targets 2.4 m/s on terrain (2.3 m/s in Room), 1.5 m/s near suspended decks and 1.8 m/s on the wall turns. It operates the normal tilt-rate and brake controls, observes snapshots, and never changes bodies, positions, velocities, collection state or time. Phone angle input is not required for the demonstration.

Terrain grades use sampled cosine curves with horizontal joins to the terraces. The short collider segments meet continuously with small overlaps, so a wheel encounters a smooth grade rather than a staircase. The beam in Wonder is a 4 m unsupported slender span over thorns. The curved wall transfers in Mill and Room use a 6 m radius, giving a full bicycle enough room to turn while the helmet stays inside the curve.

Garden has one 2.8 m deck on a 3 m pendulum. Mill has two 2.8 m decks on 2.6 m and 3.8 m pendulums, separated by a settling terrace. Each spans a 3 m opening. Their damping is finite; decks can rotate and must actually carry a wheel during the completion tests.

`createEarlyReplayPilot(index)` is exported from `src/levels/early.ts` for browser demonstrations as well as tests. Invoke its returned function once per 1/120 s physics step with the current snapshot; pass its controls directly to `game.step`. Each new run needs a fresh pilot.

Run the acceptance checks with `vitest run tests/campaign-early.test.ts`. They assert all five actual Rapier routes finish, collect every apple, travel more than 60 m, span more than 4 m of elevation, and take 30–100 s for the tutorial or 45–100 s for later maps. The returning routes must use the brake; every authored swing must support a wheel. Separate trials check that no input, continuously held rotation in either direction, fixed ±90° phone tilt, and fixed moderate tilt do not finish within 20 seconds.
