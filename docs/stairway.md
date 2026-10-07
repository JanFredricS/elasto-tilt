# Stairway to Heaven — map 15

A monumental staircase rises 44 metres over four equal steps. Each step has an 11-metre rise, a 7-metre perfectly vertical face, and a 10-metre horizontal tread. The two-metre local corner fillets let the existing 1.4-metre wheelbase negotiate the concave foot and convex crest. They do not replace the faces with diagonal ramps. The map uses existing pastel stone rendering and sparse route arrows.

There is one apple on every vertical face and one on every tread. The eighth apple marks the summit. The door is at the starting base: collect the summit apple, ease backward, and carefully descend the same four steps. No portal, moving platform, modified gravity strength, or bike physics exception is involved.

## Riding the stairs

1. Roll slowly toward the first foot. Turn gravity toward the wall as the front wheel rises, so the vertical face becomes the bike's floor.
2. Keep both wheels pressed into the face. Approach the exposed crest slowly and reduce the world angle as the bike tips onto the flat tread.
3. Settle horizontally before approaching the next foot. Repeat on all four steps.
4. At the summit, reverse the gentle gravitational bias. Travel backward along the treads and down the faces, easing through every edge until reaching the original door.

`createStairwayPilot` is an observation-only reference route. It estimates forward speed from successive visible bike positions, targets 1.3 m/s in each direction, and issues the ordinary keyboard/touch rotation command. It never mutates bodies, velocities, collision state, or collected apples. Rotation remains subject to the game's normal 0.95 rad/s manual-input limit.

## Evidence

The deterministic Rapier replay finishes all eight apples and the base door in 159.78 seconds. The last apple is collected at 80.19 seconds; descent takes another 79.59 seconds. The bike reaches a frame height of 44.70 metres, and its measured peak speed stays below 1.60 m/s.

The tests independently measure wheel-to-surface clearance. Both wheels maintain contact on every straight face and tread during both ascent and descent. Combined riser support lasts approximately 9.33 seconds per step, with 14.04 seconds on each ordinary tread and 8.25 seconds on the summit tread. Every concave foot and convex crest also has a supported corner interval with substantial frame rotation, proving that the bike physically negotiates the edges. Idle controls, five fixed rotation inputs, and four fixed gravity directions fail to collect all apples or finish.

The separate expansion-input test exercises the real input controller: 60 Hz discrete left/neutral/right button pulses, input smoothing, and two 120 Hz physics steps per rendered frame. It completes the same route. A second integration test completes it through bounded phone-pose events and the actual motion smoothing; this back-and-forth quarter-turn route stays within the phone range and does not require recentering.


## Rendered and integration checks

Chrome completed the final route with all eight apples and the original door in **159.783 s**, travelling **196.53 m**. Gravity varied from −0.30 to 1.58 radians, and the measured route remained supported throughout. The maximum recorded physics step was 1.8 ms on this desktop; it does not establish low-end mobile performance. The menu (then fifteen maps; the campaign now has twenty), instructions, and overview also pass at 390×844.

Screenshots: `evidence/stairway-to-heaven-overview.png`, `evidence/stairway-wall-climb.png` (world rotated 89°, so the vertical map face appears horizontal on screen), and `evidence/stairway-phone-overview.png`.

Fresh Astra-low review: [review-stairway.md](review-stairway.md). Full unit runner: 157 successful cases, comprising 155 acceptance passes and two unchanged expected failures for passive time-platform carry. TypeScript and Pages build pass. Automated button pulses and synthetic phone poses establish input-path feasibility; physical phone feel and human timing tolerance remain untested.
