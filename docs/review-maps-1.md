# Slice C independent review — cycle 1

Scope: maps 1–9 in `src/levels.ts`, their schema/replay tests, `docs/maps.md`, and campaign requirements in `PLAN.md`. Level 10 is being rebuilt independently and is excluded from this snapshot review.

## Evidence

- Independently ran `node node_modules/vitest/vitest.mjs run tests/levels.replay.test.ts`: **9/9 pass**, actual Rapier simulation, every level reaches complete with all apples.
- Independently ran the static suite with Clockwork tests excluded: **12 pass, 2 skipped**.
- Reviewed geometry creation against physics collider construction and renderer rotation. Terrain uses visible oriented rectangles; the authored corner segments are actual colliders. No impossible route or out-of-bounds terrain was established for maps 1–9. Successful automated routes establish reachability, not phone usability or every advertised mechanic.
- These replays use continuous state feedback rather than a literal recorded list of inputs. This is legitimate engine validation but should be described as deterministic scripted controllers.

## Prioritized findings

1. **P1 acceptance gap, explicitly retain as residual if not fixed:** the campaign still does not demonstrate the central wheel catch, sustained upside-down hanging, or brake-assisted transfer. The level 2 assertion only establishes that a brake command was sent; levels 3 and 9 complete without braking. Their current broad platforms prove basic gap traversal, not the originally proposed transfer puzzle. The docs already acknowledge much of this, which is good. A real fix requires an authored catch/transfer obstacle and evidence of sustained wheel contact, helmet clearance, controlled release, and successful transfer. Do not close this requirement merely because all map completion tests pass.

2. **P2 test correctness:** `tests/levels.test.ts:39–49` ignores `surface.angle` when testing bounds and spawn overlap. The campaign now contains numerous rotated corner segments and a ramp. Compute all four transformed corners for bounds; use an oriented-box overlap check (or the actual collider query) for spawn clearance. Props are checked only at their center, swings are not checked, and moving platforms only at endpoint centers. Check initial collider extents and finite dimensions/angles. This is a validation hole rather than a demonstrated bad current route.

3. **P2 campaign scope gap:** Newton’s Attic has a static bridge and a loose ball; there is no weight-operated bridge mechanism as listed in `PLAN.md`. `atticWeightMoved` can be satisfied by gravity moving the ball and does not establish that the bicycle pushed it or that it changed route access. Similarly, the inverted ball in map 8 is demonstrative scenery rather than a required puzzle interaction. Preserve these as simplified mechanics in the delivery report unless mechanism necessity is implemented and tested.

4. **P3 user-facing mismatch:** Newton’s Attic's hint says “loose box,” but `attic-weight` has `shape: 'ball'`. Its mechanic says the weight and bridge “change the route” although the bridge never changes. Use accurate ball/static-bridge language. Level 2's mechanic claims a pivot that the evidence explicitly leaves unproved; describe it as a suggested experiment or simplify the advertised mechanic.

## Assessment

The completion assertions are meaningful, not fake schema substitutes. Wall/ceiling routes in 5 and 7 and the combined route in 9 run through real physics. Replay names and docs should not imply that a gap-position check proves swing contact or that `brakeApplied` proves a pivot. Map 4's passing controller rolls continuously through both swings, so timing their different periods is not currently necessary. The remaining ambitious mechanics are design acceptance gaps, not reasons to deny the demonstrated playable routes. Visual and physical-device validation remain separate, as correctly stated in the map documentation.

Requested cycle-1 fixes: correct geometry checks and inaccurate hints; explicitly document simplified Attic and optional timing/weight mechanics. If the original transfer ambition cannot be achieved within the two-cycle limit, keep it visible as an unresolved limitation.
