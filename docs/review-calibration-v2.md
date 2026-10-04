# Calibration fix independent review

Result: **pass; no actionable findings** in this focused fix (review cycle 1).

Reviewed `calibrate()` in `src/input.ts`, the full-turn, nearby-angle and stale-target regressions in `tests/input.test.ts`, and the calibration explanation in `docs/control-redesign.md`. Checked the actual-angle handoff in `src/main.ts` and unwrapped target following in `src/physics.ts`.

The rounded full-turn anchor selects the nearest physically flat angle, with a correction no larger than π radians. Exact positive and negative full turns retain their accumulated rotation instead of unwinding to zero. At the halfway boundary either neighbouring flat turn is equally close; JavaScript rounding consistently chooses one. Restarting smoothing from `currentAngle` prevents an older, more advanced sensor target from pulling the world away before flattening. Assigning `baseline = raw` makes the current phone pose neutral for the new anchor.

Small angles still flatten toward zero. The change is confined to explicit calibration; reset, screen rotation, blur, visibility handling, permission generation checks and manual override paths retain their existing behavior. The documentation accurately describes nearest-turn calibration and the actual-pose smoothing restart.

Independent validation: `vitest run tests/input.test.ts`, with the bundled Node runtime on PATH, passed **17 tests in 1 file**. This includes exact ±1/±2 turn preservation, monotonic convergence near positive and negative full turns, stale-target restart, and the existing small-angle and lifecycle cases.

Scope: focused source and automated input review. Physical-device comfort and browser integration are outside this review.
