# Controls redesign independent review

Result: **pass; no actionable findings** in the reviewed changes.

Reviewed `src/input.ts`, `src/physics.ts`, `tests/input.test.ts`, `tests/physics-control-redesign.test.ts`, and `tests/physics-pivot.test.ts`, with the wake regression suite as supporting coverage.

- Motion remains an absolute angle target, with a monotonic odd response curve, a neutral dead zone, fine low-bank control, and ±2π reach. The input hold tests and physics hold test establish that an unchanged pose does not keep spinning. Physics follows the unwrapped target directly, so the full turn is not shortened to an equivalent zero angle.
- Braking resists wheel rotation relative to the frame. It uses finite mass-scaled torque and an equal opposite frame torque; it neither pins a wheel to the world nor overwrites falling velocity. The relative-angle target resets on release and during torque saturation to avoid accumulated spring windup. Tests cover stationary slope hold, moving stopping distance, release, an airborne comparison, and a supported pivot with intact joints.
- The swing seat position and local suspension anchor agree geometrically at nonzero initial angle. The displaced-swing test checks that position, suspension length during motion, and crossing through vertical.
- The loaded swing test places the bike on the physical seat and checks rider position in seat-local coordinates after motion in both directions. Its expected 0.82 offset agrees with frame-to-wheel offset 0.36, wheel radius 0.34, and seat half-thickness 0.12. With no other surfaces and 31 seconds of settling, this is meaningful physical support coverage rather than incidental proximity to an unloaded swing.

Independent validation: `vitest run tests/input.test.ts tests/physics-control-redesign.test.ts tests/physics-pivot.test.ts tests/physics-wake.test.ts` passed **24 tests in 4 files**. Run used the bundled Node runtime on PATH. Rapier emitted its existing initialization-parameter deprecation warning; no test failures occurred.

Scope: code and automated physics/input behavior. This review does not establish subjective feel on a physical phone.
