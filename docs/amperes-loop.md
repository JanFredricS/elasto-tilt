# Ampère’s Loop

*The current circles back.* Campaign map 18 (index 17), difficulty 12.5, between Spiral Sanctuary and Switchback Scaffold. Source: `src/levels/amperes-loop.ts`; tests: `tests/amperes-loop.test.ts`.

## Sketch interpretation

The map is drawn from the player’s pencil sketch, read as follows:

- START is in the bottom-left bowl.
- The rider rides the lower S-curve runway right and climbs a rising curve (the curl).
- From the curl’s lip the rider jumps across a gap into an inner loop, a hanging ring, and rides its inside a full circle.
- The loop’s exit drops the rider onto the backside of the first jump ramp.
- From there the rider rides inverted around the outside of the map, on the undersides of the outer curves, back to the finish beside START.

Sizes follow the sketch notes: the ring’s inner radius is 4 m, the curl’s radius is 4 m and the crown’s radius is 2.5 m.

## Geometry

One stone carries both the ride out and the ride home, on its two faces. Every piece is an exact arc or straight laid end to end by heading (a turtle), so tangents match and the outline closes on itself.

- **Top face:**
  - the bowl, radius 4, with a 2 m straight inner wall;
  - a 1.5 m flat, then an S-curve (radius 4 concave, then radius 3 convex, 30°);
  - a 6 m run;
  - the curl, radius 4, turning to a 1.2 m vertical lip;
  - a 0.4 m rounded nose onto a 10 m flat tower top.
- **Back face:**
  - a radius-2 shoulder down to the tower’s outer face;
  - a radius-2 sweep under onto the runway’s underside, ridden upside down;
  - the S-curve again, from below;
  - the bowl’s radius-4 outer curve;
  - the 3 m outer wall;
  - a radius-2.5 crown over into the bowl.
- **Ring:**
  - It hangs over the lip, ridden counterclockwise on its inside, with 4 m inner radius and 0.7 m thickness.
  - It runs from its landing wall at −30°, round through the roof, to its bottom.
  - A short floor then ends 1.9 m left of the lip and 1.8 m above it.
  - The gap between the floor’s end and the landing wall is the only way in.

Curved ridden runs are single chains: valleys bury their seams and crests are split into convex hulls of at most 30°. The exit is in the start bowl at (−1.6, 1.2), reached only by coming over the crown.

## Route (replay pilot, tilt and brake only)

1. **Runway.** Cruise right at about 7 m/s. Six metres before the curl, turn the world to 80° so that gravity presses the bike into the curl.
2. **Jump.** The straight vertical lip throws the bike straight up through the ring’s opening. With the world still turned, gravity lays the bike on the ring’s landing wall.
3. **Loop.** Follow the ring round its inside at about 5 m/s, a full lap: wall, roof, left wall, bottom. The world can turn only 0.95 rad/s, so a 4 m ring is about as fast as it can be followed.
4. **Drop.** On the ring’s floor, brake while the world turns back past upright. Release, and tip the world 50° forward.
   - The bike rolls off the floor’s end at about 4 m/s with gravity pulling it across the gap.
   - It lands on the tower top, the backside of the jump.
   - Rolling off without the forward tip makes the bike dive nose-first into the tower’s nose. This is the counterfactual test.
5. **Ease.** Lean the world 30° back to bleed speed on the long tower top.
6. **Home.** Creep at about 2.2 m/s, keeping gravity just ahead of the bike so that it clings to every face:
   - over the shoulder and down the outer face;
   - upside down along the underside;
   - round the outer bowl and up the outer wall;
   - over the crown and down into the bowl to the door.

Apples:

- two on the runway;
- two in the ring (roof and left wall);
- one under the runway, ridden inverted;
- one on the outer wall.

Route hints: JUMP and DROP with forward spin arrows, LOOP, then EASE and HOME with backward spin arrows.

Measured replay: about 120 m in 43 s, with all six apples.

## Tests

- **Positive:** the replay completes with every apple. It rides more than 1.5π round the ring, touches the tower top and rides the underside with the world inverted. The campaign replay table drives the map at index 17.
- **Tolerance:** charge 75° and 85°, floor tip 45° and 55°, and a home creep of 1.5 and 2.5 m/s all complete.
- **Negatives:**
  - idle, full tilt either way, and full tilt with the brake held do not complete;
  - holding gravity fixed at the charge angle does not complete.
- **Counterfactuals:**
  - Without the forward tip on the floor (20° instead of 50°), the rider crashes into the tower’s nose.
  - With a 3 m tower top instead of 10 m, the rider is flung off.
  - With the gap closed (the ring 1 m further left), the jump clips the ring.
