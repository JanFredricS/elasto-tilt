# Implementation and review record

## Authorization and model assignment

The user requested concurrent implementation, Astra for physics/controller, Sol 6 for other implementation and gameplay validation, fresh-context Astra-low review of each slice, and at most two fix cycles before recording residuals. Sol 6.1 was not available; the advance review used available `gpt-6-sol`, as disclosed before work began.

No external review message was sent. Reviews are local subagent work, saved here. The repository is public, as authorized for GitHub Pages: https://github.com/JanFredricS/elasto-tilt.

## Advance review

`docs/advance-review.md` prompted a frozen y-up coordinate/gravity/render contract, explicit collision filtering, bounded brakes, actual-physics route validation, planar Escher geometry, and explicit temporal objects. Accepted corrections are in PLAN.md.

## Slice A: physics and controls

Owner: Astra. Initial focused tests passed 15 cases including 3,000 physics steps with full rotations and brakes.

Fresh Astra-low reviews: `review-physics-1.md` and `review-physics-2.md`. Fix cycle 1 adds a lossless target clock with bounded physical catchup, supporting-wheel carry filtering, conservative slip handling, IMU expiry/recalibration, and regressions. Cycle 2 adds actual horizontal/oblique contact validation. It exposed passive-carry feedback on trajectories along the time axis; two explicitly expected-failing regressions preserve the defect. The campaign’s vertical lift avoids this case. The remaining hanging/transfer gap and exact evidence are in `physics-residuals.md`. Both cycles are closed.

## Slice B: graphics and interface

Owner: Sol 6. Initial browser checks passed startup/movement, all map spawns, three viewport layouts, visible menu navigation, pointer cancellation and FPS toggle. Root caught and owner fixed transient Graphics accumulation before review.

Fresh Astra-low reviews: `review-visual-1.md` and `review-visual-2.md`. Fix cycle 1 moves debug to reserved HUD space, traps overlay focus and makes background controls inert, fixes teardown and compact control sizing. Cycle 2 fixes aggregate graphics-context destruction, Clockwork/utility overlap and focus outlines. Targeted browser checks pass. Remaining device-only checks are in `visual-residuals.md`. Both cycles are closed.

## Slice C: maps and gameplay

Owner: Sol 6. Actual physics probes replace sharp impassable corners with rideable arcs. Fresh Astra-low reviews are `review-maps-1.md` and `review-maps-2.md`. Cycle 1 adds rotation-aware terrain/spawn/initial-object tests and accurate mechanism descriptions. Cycle 2 corrects final phase evidence and test wording. Both cycles are closed. All ten deterministic scripted controllers complete with all apples; residual deeper puzzle requirements are in `maps-residuals.md`.

An independent Sol gameplay agent redesigned the initially unreachable Clockwork map into a demonstrated raise/reverse/return lift route. It added actual-physics frozen-platform/no-backward-leg comparisons and browser playthroughs. The browser validation and exact limits are in `gameplay-validation.md`.

## Browser evidence

Chrome tests verify actual Orchard completion, both apples, next-room unlock, and save persistence across reload. Independent routes complete Escher, Clockwork, Hanging Garden, Pendulum Mill and Gravity Engine. Screenshots have been inspected at 844×390, 390×844, and 1440×900; saved evidence also shows Escher’s 90°/180° checkpoints and the raised Clockwork lift. A warm desktop landscape frame sample measured median/p95 16.7 ms. Physical phone sensors and device frame pacing are not yet validated; simulated browser dimensions are not a substitute.

## Mobile feedback: gravity wake-up and absolute phone tilt

The user’s iPhone report exposed two gaps: a bicycle left idle could remain asleep when gravity rotated, and the original rate-based phone input continued rotating the room while the phone was held at an angle. Earlier browser routes started moving immediately and did not reproduce the idle case.

Astra reproduced the sleeping-body bug with failing regression tests, then made gravity changes wake all dynamic bodies, including bicycle parts, props, and swings. Phone input now uses a calibrated absolute bank target, with a 3× response, a small dead zone, and bounded smoothing. A steady phone holds the world angle. Screen-horizontal gravity projection avoids raw beta/gamma discontinuities near upright. Keyboard and touch controls retain rate behavior and reanchor motion on release. Explicit calibration targets a flat world; pause/resume retain the current world angle.

Regression coverage includes ten seconds at rest before tilting in either direction, brake release at a held gravity angle, ordinary and inverted props, swings, sensor silence, orientation aliasing, screen direction, manual override, and calibration. `e2e/motion-regression.spec.ts` exercises the permission button and synthetic phone orientation through the real browser game after ten idle seconds. Fresh Astra-low review is recorded in `review-mobile-fix.md`; no actionable findings required a fix cycle. Physical iPhone sensor feel remains a device-only check.

## Campaign and feel redesign after player feedback

The user rejected the short straight layouts, oversized swings, weak brake, linear tilt and rough bicycle artwork. Two Astra agents replaced the ten routes with substantial terrain, return detours and gravity circuits. The controlled replays now cover 74–119 m and roughly 45–81 seconds, with 5–8 apples. Escher makes a complete gravity circuit through nested galleries, returns above the entry ceiling, and reverses inside the inner room. Four compact swing crossings fail when their respective seat is removed using unchanged pilots.

A third Astra agent implemented a gradual linear/cubic absolute phone response (full 360° at 75° bank), a bounded wheel/frame brake with relative-angle capture and slip handling, and explicit seat-centred pendulums with effective damping. Root rebuilt the bicycle as smooth, detailed vector geometry with a shaped rider, technical wheels and a modern frame. MAP/M pauses the ride and shows the full route and remaining apples. A development-only control pilot drives the same 120Hz simulation for repeatable browser playthroughs; the public build exposes no such hook.

Fresh Astra-low reviews: `review-campaign-v2-1.md`, `review-controls-v2-1.md`, and `review-visual-v2-1.md`. Controls passed without a fix cycle. Campaign/visual fix cycle 1 corrected Clockwork bounds, Attic wording, Engine wheel-support evidence, stale current documentation and repeated M-key toggles. Fresh follow-up `review-v2-fix-cycle.md` confirms all five findings resolved and no new defect. No second fix cycle was needed; remaining design gaps stay in `maps-residuals.md` and `physics-residuals.md`.

Current route tests supersede the old short-route `levels.replay` and `clockwork` fixtures. Persistent `campaign-swings` tests reproduce the reviewer's four seat-removal failures. Independent Sol browser evidence is in `gameplay-v2.md`. Desktop browser/synthetic sensor tests do not establish physical-phone feel or sustained device frame pacing.

A final full-turn calibration edge case was reproduced after route validation: choosing flat at 2π would command an unnecessary reverse revolution. The core owner now selects the nearest flat revolution and restarts smoothing from the actual current angle. Seven new regressions pass; a fresh Astra-low follow-up in `review-calibration-v2.md` found no defect. This was the controls slice’s first bounded fix cycle. Final unit run: 90 runner-success cases, comprising 88 acceptance passes and 2 unchanged expected failures. TypeScript and the Pages production build pass.

All 25 distinct browser checks passed across the independent full-route run and focused reruns. The final phone browser regression also clicks Calibrate and verifies a held pose becomes level. Smooth bicycle detail and Escher overview images are saved in `docs/evidence/v2-bike-detail.png` and `docs/evidence/v2-escher-overview.png`.

## Monument Valley visual direction

Root rebuilt static terrain with four pastel palettes, lit depth, recessed wall windows, warm archways and exact collider rims. Sol 6 restyled the interface and scene gradients. The physics and map geometry are unchanged. Root also made map-view camera pivot/scale atomic and removed overlapping shading fins on curved terrain. Fresh Astra-low review required two bounded brake-label contrast adjustments; the final foreground/background combinations pass 4.5:1. Thirteen targeted browser checks, TypeScript and Pages build pass. Desktop median/p95 frame samples remain 16.7 ms. Final phone evidence was recaptured in a fresh viewport after an immediate-resize screenshot artifact. See `art-direction.md`, `review-monument-art.md` and `evidence/monument-*.png`.

## Map 2: a useful one-wheel move

Astra replaced the cosmetic thin bridge with a short gold wheel stop and an elevated apple. The successful route brakes against the rear-wheel catch, tilts the front wheel upward, then counter-tilts to land and continue. The ordinary rolling policy collects five apples but misses the raised one. There is no artificial brake condition on apple collection.

Fresh Astra-low review independently passed 14 relevant tests and inspected the rendered pivot. The only integration corrections were stale map descriptions and removing a diagnostic probe; both were resolved in the first review cycle. Root added the map hint to the pause overlay so phone players can read the instructions, and verified it at 390×844. The final browser replay completes all six apples in 57.733 seconds, records 186 consecutive braked one-wheel steps and 0.6655 rad of pivot rotation, and specifically witnesses elevated apple collection with one supported wheel at 0.4466 rad.

Full suite: 93 runner-success cases (91 acceptance passes plus 2 unchanged expected failures). TypeScript and Pages build pass. Evidence and limitations are in `one-wheel-fix.md`, `review-one-wheel.md`, and `evidence/one-wheel-*.png`. Human control tolerance and other stunt solutions remain unverified; the change proves a useful physical move rather than forbidding creative alternatives.

## Four new gravity journeys

Two Astra agents authored maps 11–14: a shared-strip underside return, inward circular spiral with two genuine gaps, scaffold wall climb and free-air somersault, and two-chasm route ending with an inverted ascent to a hidden ledge and the starting door. Sol added sparse map-space arrows, upright labels and dynamic campaign counts. Root integrated the campaign and ran rendered completion and real-input checks. Existing ten IDs/order and saved progression remain compatible.

Fresh Astra-low physics review verified real terrain clearance and contact, all apples and doors, final-wall last-apple order, and true wheels-on-top scaffold landing. One evidence fix converted fractional pilot proposals into discrete button pulses through the real smoothed input for maps 11–13. Map 14 has successful synthetic phone-input completion; bounded keyboard attempts remain unproved. The automated pulses and synthetic poses establish control feasibility, not human timing comfort.

UI review used two bounded fixes: screen-space arrow/label clearance, then moving the final ROTATE marker above its wall for phone overview readability. Final review and remaining limits are recorded in `review-expansion-ui.md` and `review-new-map-physics.md`.

Validation: 149 unit runner-success cases (147 acceptance passes and the two unchanged expected failures); TypeScript and Pages build pass. All four new maps complete through rendered Chrome physics, and eight additional browser checks cover the fourteen-map menu, phone hints, all map spawns, three control layouts, FPS controls, Clockwork utilities, and repeated annotated renderer teardown. Exact route evidence and hardware/control limitations are in `expansion-gameplay.md`. Production excludes development replay/control hooks.


## Stairway to Heaven

Astra authored map15 with four 11m rises, 7m vertical faces, 10m treads, and small local corner fillets. Eight apples require the climb; the starting door requires descending the same stairs. No physics changes or body manipulation. Root integrated the campaign, existing blue palette, replay and browser harness, and added discrete-button plus synthetic-phone input proofs. Native and rendered completion:159.783s,196.53m. Phone menu and overview pass.

Fresh Astra-low review independently passes32 relevant tests and typechecking; one visual fix removed overlapping CLIMB/UP labels on phone by keeping only UP. Full157-case runner comprises155 acceptance passes and2 unchanged expected failures. Build passes. Evidence and remaining human/hardware limits are in `stairway.md` and `review-stairway.md`.


## Desktop controls and iPhone screen guide — 2026-10-04

Desktop pointer/hover capability now hides riding, motion and calibration buttons while retaining keyboard guidance, map and FPS controls. Touch devices keep their controls. Landscape iPhones receive a paused swipe guide once per page; SCREEN reopens it. A native upward page scroll can minimize Safari chrome; supported browsers request fullscreen from a user gesture. Dismissal resumes only the ride paused by this guide. Standalone launches skip it. Added manifest and Apple web-app metadata for Home Screen launch under the repository path.

Two fresh-context review passes completed. First-pass portrait/retry findings were fixed by limiting SCREEN to landscape and resetting Continue on each opening. The second pass found no further source issues. Browser testing subsequently caught and fixed dismissal before the next animation frame. Five focused browser tests pass, including genuine Chromium touch scrolling, desktop keyboard movement, installed mode, and fullscreen rejection. Eleven existing browser checks pass (maps boot, touch release, motion/calibration, map overview and viewport bounds). All 161 unit/physics cases and the production build pass.

Residual: physical iPhone Safari toolbar collapse and installed launch still need device validation. Chromium phone emulation verifies native page scrolling and interface lifecycle, not Safari's toolbar policy. The guide explicitly offers Safari Hide Toolbar and Add to Home Screen rather than claiming that a swipe guarantees fullscreen. The separate Natural Philosopher draft is not included in this deployment.

## Taller philosopher on original wheelbase — 2026-10-04

Integrated the philosopher on the original 1.4 m axle spacing with a taller body and larger head. Preserved original mass, brakes, wheel radii, and apple reach, and added a matching visible-head collision query. Full 161-case campaign suite passes without map or pilot edits; the added crown-clearance and fast inverted-flight regressions also pass (163 total). The head check sweeps between physics steps, addressing the second Sol review finding. See `rider-integration.md` for validation and review limitations. Sol generated four start-page illustration variants under `docs/design/newton-start/`; these remain options for user selection.
