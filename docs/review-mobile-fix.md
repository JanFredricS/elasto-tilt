# Mobile gravity and tilt review

Fresh-context review of the uncommitted changes in `src/input.ts`, `src/physics.ts`, `src/types.ts`, `src/main.ts`, `tests/input.test.ts`, and `tests/physics-wake.test.ts`.

No actionable implementation defects found within this scope.

- Gravity changes wake all dynamic bodies, covering the jointed bicycle, props, inverted props, and swings. A held absolute phone target stops changing gravity once reached.
- Phone samples select an absolute, bounded offset from the calibration anchor. Screen-axis projection avoids the raw Euler-angle discontinuity near upright. Sensor silence holds the last target rather than integrating rotation.
- Manual controls retain rate behavior; releasing them reanchors phone control at the current world angle. Reset, level loading, pause, and resume preserve their intended world anchors. Explicit calibration targets a flat world.
- Permission completions remain generation-guarded. Hidden-tab and blur handling clear held controls and establish a new sensor baseline.

Validation: independently ran `vitest run tests/input.test.ts tests/physics-wake.test.ts` using the bundled Node runtime: **14/14 tests passed**. Coverage includes idle wake-up, held targets, Euler aliasing, screen direction, manual override, and reset behavior. Rapier emitted its existing initialization deprecation warning. Actual phone sensor feel, permission UI, and hardware noise remain physical-device checks.
