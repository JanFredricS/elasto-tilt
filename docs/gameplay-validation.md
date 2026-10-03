# Gameplay validation evidence

The tests here drive the actual Rapier simulation and, for selected maps, the Vite game running in headless Chrome. Browser routes use the development control hook to send tilt commands while the normal animation loop, physics, renderer, UI, and completion logic run. They are repeatable controlled playthroughs, not human play sessions.

| Check | Observed result |
| --- | --- |
| All ten campaign maps | Deterministic Rapier replays in `tests/levels.replay.test.ts` and `tests/clockwork.test.ts` collected every apple and reached `complete`. |
| Orchard | Chrome completion and saved unlock verified in `e2e/game.spec.ts`. |
| Escher | Chrome route completed with all three apples. The wall apple was collected after more than 1.4 rad and the ceiling apple after more than 2.8 rad. [Wall](evidence/escher-wall.png) and [ceiling](evidence/escher-ceiling.png) screenshots show the rendered 90° and 180° checkpoints. |
| Hanging Garden | Chrome route completed with all three apples. Bike crossed x=6.2–9.0 above the pit, with a wheel sampled within 0.8 m vertically of the moving swing. |
| Pendulum Mill | Chrome route completed with all three apples and crossed both unsupported swing intervals above the pits. |
| Gravity Engine | Chrome route completed with all three apples, crossed the swing gap, and collected the wall apple after more than 1.4 rad of world rotation. |
| Clockwork | Chrome route completed with both apples after riding right to raise the platform and left to lower it. [Lift screenshot](evidence/clockwork-lift.png) shows the wheels on the raised platform. In a 120 Hz Rapier replay, the high apple was reached at bike y>1.3 m and phase>0.6; the phase later reversed below 0.15 before exit completion. Freezing the lift at its initial position prevented the high apple under the same controller. Omitting the backward leg collected the high apple but did not complete. These comparisons establish the role of reversal for the tested route; they are not a proof that no other route exists. |
| Helmet and brake | Actual Rapier collision fixtures in `tests/physics.test.ts` crashed on helmet/roof contact and wheel/hazard contact, while ordinary wheel/floor contact remained safe. Brake resistance and a wheel-cradle pivot passed in `tests/physics.test.ts` and `tests/physics-pivot.test.ts`. Chrome pointer testing confirmed brake and tilt buttons enter and leave their held states; pressing right tilt changed the world angle, which then settled after release. |
| Landscape performance sample | In headless Chrome at 844×390, a warmed 120-frame requestAnimationFrame sample had median and 95th-percentile intervals of 16.7 ms; the largest sampled physics-step measurement was 1.0 ms. This is one desktop-host sample, not phone performance certification. |

The browser tests are in `e2e/gameplay-validation.spec.ts`. The fixture and replay tests used a 1/120 s fixed step. The screenshots were visually inspected; the moving lift and Escher geometry were legible. At the 180° Escher checkpoint, the rotated left wall briefly overlaps a few letters of the upper-left level title. This is a minor presentation defect, not an observed route blocker.

The Escher browser route tests a quarter turn and half turn; a full 360° map traversal was not recorded. Rapier axle stability under repeated complete gravity rotations is separately tested in `tests/physics.test.ts`. Swing proximity and successful gap crossing support swing transfer, but the public snapshot does not expose contact manifolds, so these browser assertions do not prove a specific wheel contact on every frame. Physical phone orientation input, device ergonomics, and phone frame time remain untested.
