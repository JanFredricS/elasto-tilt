# The Other Side and Spiral Sanctuary

The maps append at campaign positions 11 and 12. Their IDs are `underside-return` and `spiral-sanctuary`. The original ten entries remain in their existing order.

## The Other Side

One continuous, eight-metre-thick strip runs from x = −2 to x = 24. Its top is y = 4; its underside is y = −4. A four-metre convex nose rounds the exposed right end. The player starts above the strip, collects two top apples, rotates clockwise around the outside of the nose, collects two underside apples, and returns below the entrance to the door. This is an outside turn around the same stone, not another ceiling in an enclosing room.

The radius accommodates the full bicycle and rider. Rolling contact supplies the bicycle’s rotation; gravity must turn into the convex nose to retain contact. The route is about 60 metres and the control-only reference ride takes approximately 31 seconds. Route arrows distinguish the outbound top, nose and underside return.

## Spiral Sanctuary

An Archimedean ribbon winds inward for 14 radians, from radius 26 metres to radius 2.9 metres. More than two circular revolutions remain playable before the central door. The spiral has approximately ten metres of separation between successive turns. Nine apples establish the full outside-to-inside route.

Two actual gaps, approximately 2.7 and 3.1 metres long, interrupt the outer and middle circuits. No invisible bridge, portal or collision substitute spans them. Rising physical lips finish with a steady incline to supply a controllable launch angle: the current physics has no automatic airborne bicycle orientation torque. Players begin turning gravity before the gap, ease it forward during the crossing, then restore it toward the landing. “TURN EARLY” and “EASE · TURN” arrows mark the approaches. The inner circuit is continuous and requires progressively more precise rotation toward the centre.

The reference ride takes approximately 95 seconds. Both pilots emit only `tilt` and `brake`, with rotation limited by the existing 0.95 rad/s keyboard/touch rate. They read public snapshots, estimate speed, and recognize visible gap positions. They never position bodies, write velocity, apply impulses, teleport, or change physics. The spiral pilot starts turning about six metres before each gap, restores gravity toward the actual landing surface, and slows for the continuous inner circuit. A normal gravity controller that merely follows the bicycle frame falls off the first gap.

For phone motion, pause after each full circuit, hold the phone comfortably, then resume to recenter. This preserves the current world orientation while making a new comfortable phone pose its reference. The on-map hint explains pause/resume recentering for the two-turn journey.

## Verification and limits

`tests/flip-spiral.test.ts` runs the actual Rapier world. It requires every apple and the exit; wheel contact on both faces of the same strip; a physically rotated bike around the nose; more than two turns through the circular spiral; both wheels fully clear of every surface for each hole; and a subsequent landing after each hole. It also rejects idle, full-tilt and fixed-gravity shortcuts. The flight-free rolling controller is explicitly required to fail the spiral.

The final spiral pilot completes after every initial delay from zero through 30 simulation frames (0–0.25 seconds), from a slightly higher release, and at both 120 Hz and 60 Hz. Every production-rate startup test explicitly rejects use of the faster absolute phone-angle API. The game normally simulates at a fixed 120 Hz.

These are late-campaign skill puzzles. The gaps need early rotation and deliberate landing control; automated completion establishes physical solvability and measured startup tolerance, not a replacement for human phone playtesting.

The final real-input integration test converts both steering proposals into discrete −1/0/+1 button pulses at 60 Hz, applies actual smoothing, and holds each command across two fixed physics steps. It completes The Other Side in 31.28 s and Spiral Sanctuary in 91.98 s. These automated frame-cadence pulses establish discrete-input feasibility, not comfortable human timing.
