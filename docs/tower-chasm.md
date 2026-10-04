# Maps 13–14: scaffold and chasm routes

These are additional campaign entries, not replacements for the original ten. `towerChasmLevels` exports difficulties 13 and 14; `createTowerChasmPilot(0 | 1)` supplies ordinary phone-angle and brake inputs to the unchanged Rapier simulation. Neither level contains portals, body-position changes, scripted transport, or airborne attitude forces.

## 13 · Switchback Scaffold

The original scaffold architecture has three horizontal storeys and rounded ends. The rider crosses the ground approach, climbs the right wall, and rolls into a short release lip. A brief gravity pulse lifts the rider clear of the lip. Existing clockwise momentum carries a somersault across an open gap to the **top** of the middle-height landing tier. The upper gallery, left turnaround, and final out-and-back platform complete the apple route.

The reference replay completes in **108.30 seconds**. Its substantial flight has **1.44 seconds** of continuous clearance, travels **9.94 metres** horizontally, and rotates the frame **5.50 radians clockwise while both wheels are airborne**. After contact, the frame settles to its original horizontal orientation with both wheels above the landing surface. This is not a supported pivot disguised as a jump: the test computes each wheel's separation from every oriented terrain rectangle and requires more than 6 cm clearance throughout the measured flight.

## 14 · The Hidden Way Home

The opening floor ends in a rounded cliff lip leading immediately to a vertical descent. The first small curved ramp launches across the chasm onto the opposite wall. The rider settles wheels-first, descends backward, and uses the next ramp to cross back to the final apple wall. A lower approach joins the large half-loop. Its straight release shelf gives the rider a stable upside-down attitude before the unsupported return ascent. The sixth and final apple is on the final wall; all apples have already been collected before the half-loop and escape ascent.

The final maneuver first releases both wheels together, then rotates gravity upward. The rider rises through the open shaft beside the starting platform, uses the brake to settle its angular momentum, catches the hidden ledge from underneath, and follows its left semicircular bend down to the original door. The ROTATE arrow sits above the final wall; the UP arrow identifies the upper catch. All six apples are needed to complete at the starting door.

The reference replay completes in **about 132 seconds**. Its measured unsupported segments are:

| Segment | Both wheels airborne | Displacement |
| --- | ---: | ---: |
| First chasm | 2.92 s | 58.52 m right |
| Return chasm | 2.59 s | 48.35 m left |
| Upside-down return ascent | 5.74 s | 52.46 m up |

The wide chasms allow actual ramp-generated rotation to finish before wall contact. The free bike does not automatically align when gravity changes. The half-loop and return shelf likewise establish orientation physically; the brake transfers angular momentum between the wheels and frame.

## Validation and limits

`tests/tower-chasm.test.ts` verifies completion, every apple, true terrain clearance, airborne rotation, the two opposing wheel-supported wall descents, the normal horizontal scaffold landing, the inverted upper catch, and return to the starting door. It also rejects idle, constant left/right tilt, and fixed-gravity shortcuts. Eight tests pass.

The integration phone-input replay uses the real `createInput`, 60 Hz orientation events, the input smoothing curve, two 120 Hz physics steps per input sample, a 180°/s limit on synthetic phone-pose movement, and pause/resume recentering to stay within the phone bank range. It completes map 13 in **103.01 seconds** with one recenter and map 14 in **about 132 seconds** with three recenters. These differ from the direct reference replays because the input layer filters the requested pose.

A separately tuned `createScaffoldKeyboardPilot()` supplies a rate-limited steering proposal. The integration test converts it into discrete −1/0/+1 direction-button pulses at 60 Hz before applying the real input smoothing. It completes map 13 in **114.95 seconds**, with all six apples, using only button states and brake. This establishes discrete-input feasibility; automated frame-cadence pulses are not evidence of comfortable human timing.

Map 14 keyboard completion remains **unproved**. Bounded early-rotation experiments crossed the first chasm successfully, but the second crossing dropped into the upper half-loop in the tested configurations. This is a limitation of the tested routes, not a claim of physical impossibility. Phone-input completion is demonstrated for both maps. The steep aerial maneuvers are intentionally late-campaign difficulty, and neither an input-only pilot nor deterministic replay proves broad human usability.
