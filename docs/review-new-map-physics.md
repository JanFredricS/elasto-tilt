# Fresh review: appended map physics

Reviewed the four new level definitions, pilots, campaign ordering, route tests, real-input tests, and browser evidence harness. Final follow-up independently reran the four targeted test files: **69 tests passed**, including all 31 spiral startup delays, both 60 Hz phone input runs, and the two new scaffold slower-control tests.

After the input-proof correction below, independently reran the changed input file: **5/5 passed**. The two additional button-route cases bring the targeted suite to 71 tests; the unchanged files were not needlessly rerun.

## Findings

No geometry or physics implementation defect found in the reviewed scope. No implementation changes made by this review.

**Closed evidence finding:** the initial scaffold test passed fractional pilot values straight into `setTouchTilt`, unlike the visible direction buttons. The corrected test converts those proposals into only -1, 0, or +1 using an error accumulator, passes those discrete commands through the actual input controller at 60 Hz, and holds each resulting control over two physics steps. Independent runs complete maps 11, 12, and 13 in 31.28, 91.98, and 114.95 seconds respectively. This proves completion through the discrete direction-button control path with smoothing. The automated pulse cadence can change every rendered frame; it does not establish human timing tolerance or validate DOM key-event wiring.

Map 14 still lacks a successful slower-control route. Its successful phone route uses the 2.5 rad/s angle-target path. A failed translation of that pilot does not establish that the map is impossible on keys. Physical phone hardware remains untested.

## What the evidence proves

- Map 11 uses one solid strip with a rounded exposed nose. Independent wheel-position and chassis-angle checks establish top support, nose traversal, and inverted underside support; the apples are collected in authored order.
- Map 12 is a circular inward spiral beyond two turns, with two genuinely missing sections. Tests check wheel clearance against every actual collider during both gaps, subsequent contact, inward progress, and centre completion. The route survives 0–30 startup frames, a small spawn-height change, and 60 Hz physics.
- Map 13 leaves the vertical wall, rotates more than five radians during a continuous free flight, then settles with both wheels above the horizontal landing tier. This checks the requested top landing rather than merely completion or an inverted ceiling contact.
- Map 14 checks both long airborne chasm crossings and wheel-supported descent on both opposing walls. The final follow-up relocates all six apples before the escape: the final pickup is on the last wall, and the test proves it is collected last, more than 30 seconds before upward release. It independently checks inverted release, a rise over 45 metres, upward gravity during that rise, inverted hidden-ledge support, and return to the starting door.
- Phone tests pass synthetic orientation events through the actual input controller, including smoothing, 60 Hz sampling, a 180-degree/second bank-change ceiling, braking, and pause/resume-equivalent recentering. Physics bodies are not teleported or directly rotated by the pilots.
- Geometry tests validate oriented surface corners, finite bounds, apple and exit sensors, and the entire initial bike assembly. The initialAngle field sets gravity, not initial body orientation, so the unrotated spawn-assembly test matches the implementation.
- The original ten IDs and ordering are preserved, and the existing numeric unlock save remains readable. A previously capped ten-map save still requires completing map 10 to unlock map 11; no original access is lost.

## Limits of this review

The constant-input tests reject the sampled easy shortcuts; they are not an exhaustive proof that every alternative route is impossible. Browser replay passes direct pilot controls, so it is rendered-path evidence rather than a second proof of physical phone interaction. Real-input unit tests provide the latter simulation evidence for maps 13–14, not an actual-device usability trial.

The spiral adds roughly 550 fixed surface colliders. Targeted simulations complete quickly, and the browser harness records maximum physics step time, but it has no frame-time acceptance threshold. Do not infer measured low-end-phone performance from the correctness suite. Browser runs and UI review are owned by the coordinating agent and were not repeated here.
