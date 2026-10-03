# Implementation and review record

## Authorization and model assignment

The user requested concurrent implementation, Astra for physics/controller, Sol 6 for other implementation and gameplay validation, fresh-context Astra-low review of each slice, and at most two fix cycles before recording residuals. Sol 6.1 was not available; the advance review used available `gpt-6-sol`, as disclosed before work began.

No external review message was sent. Reviews are local subagent work, saved here. The repository is private: https://github.com/JanFredricS/elasto-tilt.

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
