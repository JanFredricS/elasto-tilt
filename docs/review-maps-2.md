# Slice C final review — cycle 2

Verdict: clean for the documented map scope. No new blocking defects found. This is a route-reachability verdict, not proof that the full intended puzzle design is complete.

Reviewed `PLAN.md`, `src/types.ts`, all ten maps in `src/levels.ts`, `tests/levels.test.ts`, `tests/levels.replay.test.ts`, `tests/clockwork.test.ts`, and `docs/maps.md`. Checked the geometry assumptions against the physics collider construction.

Re-ran the requested three Vitest files on 2026-10-04: **27 tests passed across 3 files**. Nine campaign maps complete through actual physics controllers in `levels.replay.test.ts`; Clockwork completes in its dedicated test. Each successful route collects every apple. Static checks now account for rotated surface corners and collider-local circle contact, and cover initial prop, swing, and temporal platform geometry as well as the complete bike assembly.

Clockwork has one vertical lift, a high apple, and a return exit. Its actual replay raises and lowers the lift and completes; freezing the lift at its start prevents that replay from collecting the high apple, and omitting the backward leg prevents completion after collecting it. These ablations establish dependence for this controller, not global necessity under all control sequences. The documentation explicitly preserves this distinction.

The mechanic text now describes the implemented static bridge and demonstrative inverted weight honestly. The map documentation explicitly records the unproved sustained wheel catch, upside-down hang, brake-assisted swing transfer, weight-operated bridge, and required inverted-weight interaction. Visual and physical-device validation remain pending. Those existing limitations remain delivery residuals, not newly discovered cycle-2 failures.

Minor evidence precision: Clockwork documentation says final phase falls below 0.1, while the regression assertion allows below 0.15. Aligning those thresholds would prevent future drift, but it does not undermine the demonstrated reversal or completion. The Gravity Engine test title says “ceiling apple” although `engine-c` is the wall apple; its assertions and map documentation correctly describe the wall turn.
