# Newton’s Ride — redesigned playable campaign

[Play on GitHub Pages](https://janfredrics.github.io/elasto-tilt/) · [Public source](https://github.com/JanFredricS/elasto-tilt)

## Current implementation

- Fifteen maps: the ten original routes rebuilt by two Astra map agents: rolling hills, deep bowls, return detours, compact suspended crossings, wall/ceiling circuits and an Escher spiral through all four gravity faces. Each has 5–8 apples; controlled successful runs travel 74–119 m in roughly 45–81 seconds.
- Four new gravity journeys: the underside of one shared strip, a circular inward spiral with two real gaps, a tiered airborne somersault, and a chasm chain with a final inverted ascent to a hidden return ledge. See [expansion evidence](expansion-gameplay.md).
- Map 15, Stairway to Heaven: four tall steps, wheel-supported quarter-turns at their feet and crests, eight apples, and a careful descent to the starting door. Native, discrete-button and synthetic-phone routes pass.
- Progressive phone response: gentle near neutral, stronger farther out, full 360° world rotation at 75° phone bank. A steady phone holds its angle. Keyboard/touch remain held rotation controls.
- Map 2 now requires reaching an elevated apple: its demonstrated solution catches the rear wheel against a gold stop, holds brake and tilts the front wheel up, then lowers it safely. Ordinary rolling misses that apple; creative alternate stunts remain possible. Pause shows the map instructions on phones.
- Strong bounded brakes capture wheel angle relative to the frame. They resist steep downhill motion without anchoring the bike or cancelling airborne velocity.
- Compact 2.7–2.8 m swing decks, distinct suspension lengths, working gravity response and loaded rider support. All four tested crossings fail when their seat is removed.
- Rebuilt smooth vector bicycle with detailed rims/spokes, sculpted frame, shaped rider and helmet. Monument Valley inspired pastel architecture, ivory lit faces, recessed windows and warm archways. Quiet gradients and exact collider rims keep the route readable. See [art direction](art-direction.md).
- MAP/M pauses simulation and shows the full route, remaining apples and current position. Touch controls, motion calibration, pause/retry, local progress saves, campaign selection and FPS/frame/physics HUD remain available.
- TypeScript/Vite, PixiJS and Rapier 2D; no gameplay backend. Main pushes run tests/build and publish the result to GitHub Pages.

## Verification

- TypeScript and production build pass. The unit runner reports 157 successful cases: 155 acceptance passes and 2 explicitly expected failures for the known passive-carry defect. Unit coverage includes both redesigned campaign suites, curve and lifecycle regressions, gravity wake-up after rest, steep braking and stopping distance, loaded swings, all four seat-removal experiments, and Clockwork frozen-lift/omitted-return comparisons.
- All fifteen actual Rapier routes complete with every apple. Escher collects at 0°, 90°, 180°, 270° and 360° and reverses in its final room. Clockwork raises its lift, reaches the high apple, then lowers it on the return journey.
- All 25 distinct browser checks passed across the full-route and focused runs, including all ten rendered campaign completions, unlock/save persistence and the final tilt/calibration regression. Independent rendered browser gameplay evidence is in [gameplay-v2.md](gameplay-v2.md). Seven additional overview/motion/layout/lifecycle browser checks passed, including three viewport sizes, map-view pause and keyboard repeat, and idle-then-phone-tilt.
- Fresh Astra-low reviews covered maps, controls and visuals. One bounded fix cycle resolved the map/visual findings; the follow-up found no new defect. See [implementation-log.md](implementation-log.md).
- The production build excludes the development control hook and replay helpers. Synthetic phone events and desktop FPS samples are separate from physical device validation.

## Remaining design and validation work

1. Sustained upside-down wheel hanging and brake-assisted free-wheel capture of a swing are not yet campaign requirements. The component fixture demonstrates a strong-brake wheel catch and pivot.
2. Horizontal/oblique time-platform carrying can feed passive motion into the clock. Two explicitly expected-failing regressions document it; they are not acceptance passes. The campaign’s vertical lift avoids this case.
3. Loose and inverted weights respond physically but do not operate mandatory gates. Mill’s different swing lengths do not yet require a timed-period solution.
4. Escher is a planar gravity spiral with a shared ceiling/floor and inner reversal. It has no impossible topology or portal transition.
5. Controlled replay times are not minimum completion times. Human difficulty, shortcuts, actual iOS/Android sensors, orientation changes and sustained device frame pacing need further playtesting.
6. Map 14 completion is verified through synthetic phone input, including smoothing and pause/resume recentering. Keyboard/button completion remains unproved after bounded tuning. Maps 11–13 complete through discrete button pulses; these automated timings do not establish comfortable human control.
7. Time platforms may finish bounded catch-up after the bike stops; this is authored reversible motion rather than arbitrary negative-time physics.

## Run

`pnpm install`, `pnpm dev`. Use A/D or arrow keys to rotate, Space to brake, R to restart, Escape to pause, F for FPS, and M for the map. Motion sensors require HTTPS. Run `pnpm test`, `pnpm build`, and—with the development server running—`pnpm test:browser`. `pnpm build:pages` uses the repository asset path.
