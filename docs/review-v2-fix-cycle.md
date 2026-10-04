# Redesign follow-up review — fix cycle 1

Reviewed the current source, tests and integrated documentation on 2026-10-04 against `review-campaign-v2-1.md` and `review-visual-v2-1.md`. This is a bounded follow-up of those findings; no implementation changes were made.

## Result

All five findings are resolved. No new concrete defect was found in the reviewed fixes.

- **Attic instructions:** the mechanic and hint now describe the ramped ridge, loose weights, left storage apple and return to the door. They no longer promise required weight pockets or a rafter route. The apple and exit coordinates match that description.
- **Clockwork bounds:** the lower bound is now y=-9. The lift travels from y=-6.9 to y=2.2 with half-height 0.21, so its complete vertical extent (-7.11 to 2.41) is contained. Its horizontal extent is also contained. The geometry test checks both endpoint boxes.
- **Engine swing evidence:** the replay now requires a wheel to be above the actual moving seat, within its width, at the expected wheel/deck separation in the seat's rotated local coordinates. The assertion passes with the real physics replay. This is wheel/deck proximity evidence, comparable to the early suite, rather than a contact-force measurement; combined with the earlier deck-removal experiment it addresses the original location-only assertion.
- **Documentation integration:** `docs/maps.md`, `docs/maps-residuals.md`, `README.md` and `PLAN.md` describe the redesigned routes and qualify replay times, mechanism necessity and hardware validation. Earlier review records are historical evidence, not current route specifications. Delivery counts and the independently running browser gameplay report are outside this follow-up's scope.
- **M key repeat:** `src/main.ts` gates the map toggle with `!event.repeat`. `e2e/map-overview.spec.ts` exercises overview pause/resume at three viewport sizes and verifies that repeated M keydowns leave overview active and simulation elapsed time unchanged. Source inspection confirms physics stepping is disabled throughout overview. The parent reports seven overview/motion/visual browser checks passing; this reviewer did not rerun those browser checks.

## Independent validation

Ran `vitest run tests/levels.test.ts tests/campaign-early.test.ts tests/campaign-late.test.ts` using the bundled Node runtime: **39 tests passed across all three files** (2.06 seconds). This covers current geometry, the early and late route replays, Engine wheel support, and Clockwork's frozen-lift and omitted-return experiments.

The existing limitations concerning required hanging transfers, optional weights and pendulum timing, alternative solutions, human difficulty, and physical phone performance remain disclosed. This follow-up does not certify those deferred mechanics or hardware behavior.
