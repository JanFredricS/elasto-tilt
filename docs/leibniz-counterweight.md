# Leibniz’s Counterweight

Campaign map 14 (index 13), difficulty 10.25, between The Clockwork Apple (10) and The Clockwork Wedge (10.5). Subtitle: *Every action has its reckoning.* Palette: sand. Code: `src/levels/leibniz-counterweight.ts`. Tests: `tests/leibniz-counterweight.test.ts`. The HUD timeline label reads LEDGER (`Level.timeLabel`).

## What is new

- **First vertical route axis.** `timeAxis` is (0, 1). The route clock therefore reads the rider's altitude (frame centre y), not their distance along x.
- **First counterweight.** The bridge's path is vertical and exactly as long as `timeTravel` (6 m). So it moves one metre for every metre the rider climbs or descends:
  - climbing lowers it;
  - descending raises it.
- **Saturation is the puzzle.** The clock stores no displacement beyond its ends (`RouteClock`). So the ledger cannot go below empty or above full:
  - descending with an empty ledger costs nothing;
  - climbing with a full ledger earns nothing.
- **First inverted prop that seats.** The rising ball (`inverted: true`, gravity scale −1) has a `socket`. The socket loop in `src/physics.ts` checks only position, speed and spin, not the sign of gravity. So the ball seats into a ceiling pocket exactly as Newton's Attic's barrel seats into a floor well.

## How it works

**The tower and the bridge.**

- The rider spawns on the tower floor (top y 0) with the ledger empty. The bridge (7.9 × .42) therefore hangs at its top stop, 6 m above the floor, over an 8 m pit with a hazard floor at y −5.
- Riding straight east drops the rider into the pit. This is the negative test.

**The cellar.**

- West of the spawn, the floor rounds over a knee (radius 3) into a 20° ramp. The ramp leads down to a cellar floor 6.5 m below, with an apple, and a quarter-pipe (radius 4) up the west wall.
- The ride down is free, because the ledger is already empty.
- The climb back out fills the ledger. It is full .5 m below the crest, because the cellar is deeper than the ledger. So a rider back on the tower floor has parked the bridge exactly flush, however they rode the cellar.
- Turning back partway parks the bridge partway. A rider who turns back 3 m down leaves it about 3 m high. This is tested.
- The floor from the crest to the pit is level, because any net descent there would spend the ledger again.

**The carry defect.**

- The bridge moves only while the rider's altitude changes. The floors on both sides of the pit are level, so the bridge is parked before the rider reaches it, and the rider never rides it while it moves.
- In the demonstrated route its y does not change at all while the rider is over the pit (tested: under 5 cm; measured 0). The bridge is .05 m short of each pit wall, so the wheels do not dip at the joints.
- This keeps the route clear of the known passive-carry defect in `docs/physics-residuals.md`. In that defect, a platform carrying a rider along the route axis feeds the clock.

**The corridor and the rising ball.**

- East of the pit, a corridor (floor 0, ceiling 2.6) holds a ball (radius 1.25) that falls UP and rests against the ceiling. It fills the corridor, so the rider has to push it.
- Material: density .3 (1.5 kg), linear damping 4, friction .9.
- **The push.** The front wheel meets the ball below its middle, so the push rolls the ball forward along the stone above it. The pilot pushes it at about .6 m/s.
- **The well.** The well is a round pocket up into the ceiling, .1 m wider than the ball. Pushed under it, the ball rises, seats against the pocket's round top (socket: tolerance .06, speed .1) and becomes fixed stone. Seated, it crowns .45 m below the ceiling, the same shallow plug as the Attic's barrel. An upright rider passes under it, and an inverted rider rolls over it.
- **Contrary drift.** Tilting the world moves the ball opposite to the rider: tilt east and it rolls west. A lintel (bottom 2.1) at the corridor's west end stops a drifting ball from floating away over the pit. In the demonstrated route, the climb out of the cellar rolls it back against the lintel, and the rider pushes it from there, about 12 m.
- A player who tilts hard west for long can roll it east into the well before arriving. This is harmless: it seats there just the same.

**The hall and the ceiling.**

- The corridor ends at a knee and a 22° ramp down into a hall (floor −5.4). The hall's east end is a half loop (radius 4) up onto the underside of the corridor's ceiling.
- Upside down, the rider rides the ceiling back west over the seated ball to the last apple and the door, at the corridor's west end.
- The last apple hangs .4 m below the ceiling, out of reach of an upright rider.
- Without the plug, the inverted rider falls up into the open well, whose top is a hazard. This is the second counterfactual.
- Riding through the hall moves the bridge again (down to the hall raises it, the loop lowers it). By then the rider is far east of it.

## Apples

There are five apples:

1. On the tower floor east of the spawn.
2. On the cellar floor.
3. In the corridor east of the well.
4. On the hall floor.
5. Against the ceiling west of the well, which only an upside-down rider can reach.

## Validation

`tests/leibniz-counterweight.test.ts` covers:

- **Campaign replay.** It completes in about 94 s, 182 m. It never brakes and is upside down on the ceiling at the end. It checks that:
  - the bridge is flush (< 5 cm) when the rider reaches the pit;
  - the bridge holds still while the rider is over it;
  - the ball seats in the well.
- **Partial cellar.** Turning back 3 m down the cellar leaves the bridge at 6 − (altitude climbed).
- **Negative.** Riding straight east with an empty ledger crashes in the pit under the raised bridge.
- **Counterfactuals.** These use the same pilot, which treats a missing ball as already seated:
  - with the bridge frozen at its top stop, the pilot falls into the pit;
  - without the ball, the inverted rider falls into the open well.

The campaign ordering test in `tests/levels.test.ts` includes the map. The Clockwork Wedge's neighbour assertion now expects this map before it.

## Residuals

- The ledger reads the frame centre, so in practice wheel compression and bumps move the bridge a few centimetres. The level floors keep that negligible.
- The ball's damping makes the push slow (about 20 s in the demonstration). Pushing it faster has not been measured. A loose prop is harmless to the helmet, so the push itself cannot crash the rider.
- Route hints (DESCEND, CLIMB, PUSH, LOOP) have not yet been checked against the LEDGER panel at every screen size, as was done for the Clockwork Wedge.
