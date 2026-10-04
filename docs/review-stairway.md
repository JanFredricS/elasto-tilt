# Stairway to Heaven review

Reviewed the final map geometry, reference pilot, native replay assertions, campaign/replay/art integration, real-input tests, and browser-test changes. No outstanding actionable findings. One minor mobile visual finding was resolved in fix cycle 1 and visually rechecked.

## Independently verified

- All 32 relevant tests pass: five stairway tests, seven expansion-input tests, and twenty campaign geometry/order tests. TypeScript validation also passes.
- The native route completes with all eight apples and returns to the original door. Its pilot only reads snapshots and supplies normal tilt controls; it cannot move bodies or grant apples.
- Both wheels remain near the collision surface on each of the four vertical faces and four horizontal treads, on ascent and descent. Face checks require wheels on the exposed side and a vertical frame; tread checks require wheels above the surface and a horizontal frame. These geometric contact measurements are independent of the pilot.
- Every ascending concave foot and convex crest has a sustained interval with both wheels near its collider segments and substantial frame rotation. The map has seven-metre straight vertical faces and ten-metre straight treads; two-metre corner fillets are local transitions, not diagonal ramps replacing the walls.
- The real input controller completes the route using smoothed discrete direction pulses and separately with synthetic device-orientation events. These exercise frame cadence and input smoothing, without body manipulation.
- Geometry is finite, inside bounds, uniquely identified, and free of initial bike overlap. Existing campaign IDs and ordering remain unchanged with map 15 appended. Nine constant-input trials do not complete the map.
- Inspected the final refreshed desktop overview image: all four ascending steps and eight apples are visible, and UP, EASE OVER, and SUMMIT · HOME labels are readable.
- Independently inspected `stairway-wall-climb.png`: at 89° world rotation both bike wheels visibly rest on the straight wall, with the wall appearing horizontal under the rotated camera.
- Independently inspected the final `stairway-phone-overview.png`: title, objectives, all three route labels, and controls fit the viewport without label overlap.

## Resolved visual finding

- **P3 — CLIMB and UP overlapped in the phone overview. Resolved.** Fix cycle 1 removed the redundant CLIMB marker while retaining UP. Independently rechecked both refreshed desktop and 390-pixel phone images: labels are separated and readable. Geometry and controls were unchanged; the root task reports the phone test passing and build rerun.

## Root-task validation

The root task reports the full rendered route passed in 159.783 seconds, travelling 196.53 metres and collecting all eight apples, with no measured airborne interval and a 1.8 ms peak physics step. It also reports both rendered campaign/phone tests passing, all 157 unit tests passing, and the production build passing. These were reported by the root task rather than independently rerun by this reviewer.

## Evidence limits

The contact assertions measure wheel/collider clearance, not Rapier contact-force reports. They establish sustained physical traversal together with the unmodified physics replay; they do not claim measured tire loads. Automated control completion establishes reachability, not human ease or physical-phone comfort. Physical-device handling and human corner timing remain untested.
