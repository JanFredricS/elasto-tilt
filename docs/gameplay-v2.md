# Campaign v2 gameplay validation

The v2 campaign was played through the Vite game in headless Chrome on 4 October 2026. The browser used the normal requestAnimationFrame loop, renderer, UI, and Rapier fixed steps. A development hook supplied tilt and brake inputs once per 1/120 s step from the current snapshot. The controllers live in `src/dev/replay.ts` and observe the game state; they do not move the bike, collect apples, set the clock, or mark a map complete.

`e2e/gameplay-validation.spec.ts` checks all ten maps. Each reached the exit after collecting every apple, travelled more than 60 m, and took over 30 seconds in Orchard or over 45 seconds in every later map. This confirms the routes take sustained play through the rendered application. `e2e/game.spec.ts` separately completes Orchard, verifies the next room unlocks, reloads, and checks that progress persists.

| Map | Browser-observed route feature |
| --- | --- |
| Newton’s Orchard | Five apples and return to the entrance exit. |
| One Wheel Wonder | Six apples over the ridge and bowl, then return. |
| The Hanging Garden | Five apples, including the crossing on the suspended deck. A wheel was sampled at deck height and within the deck width. |
| The Pendulum Mill | Six apples across both suspended decks, around the outer turn, and along the high return gallery. Wheels were sampled on both decks. |
| The Room on Its Side | Six apples through the bowl, rounded wall, and ceiling route. |
| Newton’s Attic | Six apples, including the left storage pocket after the far ridge, before returning to the exit. The 2.2 m ridge appeared in the browser height trace. |
| Escher’s Orchard | Eight apples on the nested spiral. The east wall apple was collected after more than 1.3 rad of gravity rotation, the upper gallery after more than 2.9 rad, the west wall after more than 4.4 rad, and the inner return after more than 6 rad. The exit was reached above the starting floor. [Wall view](evidence/v2-escher-wall.png) · [Upper gallery view](evidence/v2-escher-ceiling.png). |
| The Contrary Conservatory | Seven apples along the lower room, end wall, and roof return. |
| The Gravity Engine | Seven apples, with wheel contact on the compact swing before the wall and overhead gallery. |
| The Clockwork Apple | Five apples. The high apple was reached above y=1.5 m after the lift phase exceeded 0.9. The timeline then reversed, the lift descended below y=-5 m, and the exit was reached with the phase below 0.1. [Raised lift view](evidence/v2-clockwork-high-apple.png). |

The landscape control check held and released the brake and right tilt buttons, then measured 120 warm requestAnimationFrame intervals at 844×390. The median and 95th percentile were both 16.7 ms; the largest sampled physics step was 1.1 ms. These are desktop Chrome measurements under this test run, not phone frame-time certification. Separate browser motion coverage exercises a 5° simulated phone pose after the bike sleeps, confirms it wakes and moves, holds the angle while sensor events stop, and returns to level.

The wheel-on-deck checks use the rendered physics snapshot's wheel and moving-deck positions at every fixed step. They support actual deck transfer during the completed routes, though they do not inspect Rapier contact manifolds. The playthroughs are deterministic automated demonstrations; they do not replace physical-device play testing for grip, comfort, and real sensor noise.
