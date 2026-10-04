# Four-map expansion gameplay evidence

2026-10-04. Two Astra map agents authored maps 11–14; root validated the rendered campaign in Chrome using the same fixed-step Rapier simulation as normal play. Pilots emit only controls and never move bodies, write velocities or grant apples. These are demonstrated solutions, not minimum times or proof against creative shortcuts.

| Map | Apples | Rendered duration | Bike travel | Distinctive move verified |
| --- | ---: | ---: | ---: | --- |
| 11 · The Other Side | 5 | 31.317 s | 60.87 m | Wheel contact on both faces of the same solid strip, around its exposed convex end. |
| 12 · Spiral Sanctuary | 9 | 94.625 s | 192.10 m | More than two circular turns, two fully unsupported gap crossings and landings, central door. |
| 13 · Switchback Scaffold | 6 | 108.300 s | 181.59 m | Wall climb, about 1.44 s free-air somersault, then wheels on top of a horizontal tier. |
| 14 · The Hidden Way Home | 6 | 132.125 s | 387.41 m | Opposing chasm jumps, last apple on final wall, inverted ascent, hidden ledge catch, return to starting door. |

The final map's first two substantial flights last 2.925 s and 2.600 s. Its unsupported ascent lasts 5.750 s and rises about 52.5 m; the final apple has already been collected before the half-loop and return ascent. Tests measure each wheel against every oriented terrain rectangle so rim contact cannot masquerade as flight. No portals, auto-alignment or extra airborne attitude force was introduced.

`e2e/expansion.spec.ts` verifies all four rendered completions, apple totals, movement and airborne intervals, and captures route overviews and first flights. Final map 14 was rerun after moving its last apple to the requested wall and updating stage detection. Overview screenshots are `evidence/{map-id}-overview.png`; flight captures are corresponding `-flight.png` files. `evidence/hidden-way-phone-overview.png` shows the final 390×844 route overview and readable arrows.

## Input and robustness

- All new maps reject idle, continuously held rotation and fixed-gravity shortcuts in their tested initial conditions.
- Spiral completes at the normal 120 Hz physics timestep after each of 31 startup delays from 0 to .25 s, at a slightly higher release, and at 60 Hz. An ordinary follow-the-frame rolling controller fails at its first gap.
- `tests/expansion-input.test.ts` uses real input smoothing and 60 Hz samples held over two 120 Hz physics steps. Discrete −1/0/+1 button-pulse routes complete maps 11, 12 and 13 in 31.28, 91.98 and 114.95 s respectively.
- Maps 13 and 14 also complete using synthetic phone orientation, the actual progressive response, and at most 180° of phone-pose movement per second. Pause/resume recentering preserves world orientation and bodies while making a comfortable neutral pose the reference. These routes use one and three recenters respectively; hints explain recentering.
- Map 14 keyboard/button completion remains unproved after bounded tuning. This is a coverage limitation, not a proof of impossibility. Automated frame-cadence button pulses do not establish human timing tolerance, and synthetic phone events do not establish hardware feel.

## Integration and review

149 unit runner-success cases: 147 acceptance passes and two unchanged expected failures documenting passive time-platform carry. TypeScript and Pages production build pass. Eight additional browser checks cover all fourteen finite idle spawns, menu/phone hints, visible controls/FPS, three viewport layouts, Clockwork utility separation and repeated annotated renderer teardown. Production contains no development control hook or replay helper.

Fresh Astra-low reviews: `review-new-map-physics.md` and `review-expansion-ui.md`. Physics evidence required one correction to use discrete button states; visual guidance used two bounded fixes for label spacing and authored marker placement. Existing time-carry and other campaign-design residuals remain in `DELIVERY.md`.

Physical iOS/Android input, comfortable human timing, and sustained low-end phone frame pacing still require device playtesting. Desktop frame samples are recorded below and do not substitute for those checks.

A warm 150-frame Chrome sample on the spiral at 1280×800 measured median/p95 **16.7/16.7 ms**. The final rendered map 14 run recorded a maximum physics step of **1.5 ms** on this desktop. These are local samples, not mobile performance guarantees.
