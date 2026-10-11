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

- The rider spawns on the tower floor (top y 0) with the ledger empty. The bridge (7.9 × .42) therefore hangs at its top stop over an 8 m pit with a hazard floor at y −5.
- Each pit edge is the top of a **kerb**: a 4 m rise of .5 m, then a 1.6 m flat top. Full, the ledger parks the bridge flush with the kerb tops (y .5); empty, it hangs 6 m above them.
- Riding straight east drops the rider into the pit. The kerb's half metre is all the ledger holds, so the bridge is still 5.5 m up. This is the negative test.

**The cellar.**

- West of the spawn, the floor rounds over a wide knee (radius 9, so a fast rider barely leaves the ground) into a 20° ramp. The ramp leads down to a cellar floor 6.5 m below, with an apple, and a quarter-pipe (radius 4) up the west wall.
- The ride down is free, because the ledger is already empty.
- The climb back out fills the ledger, a metre below the kerb tops.
- Turning back partway parks the bridge partway. A rider who turns back 3 m down leaves it about 3.5 m high. This is tested.

**Why the kerbs.**

- A saturated ledger forgets height. Once it is full, any height the rider gains and then loses is spent: a hop over the cellar's knee, or the frame pitching up under a hard brake (about .3 m from 5 m/s), raises the bridge by that much.
- On a level approach such a stop left the bridge a .3 m step above the floor, which the wheels cannot climb. The rider was stuck until they rode back down the cellar.
- The kerb makes the last half metre of every approach a climb. Whatever the tower floor cost, up to .5 m, is paid back on the kerb, and the bridge is flush when the rider reaches the top. This is tested with a hard stop from 5 m/s.
- A rider who turns back on the cellar's lowest metre is also covered, but still misses the cellar apple (see the hall).

**The carry defect.**

- The bridge moves only while the rider's altitude changes. Its path is vertical, along the ledger's axis, which is the configuration of the passive-carry defect in `docs/physics-residuals.md`.
- The kerb tops are flat and longer than the wheelbase. So in an ordinary crossing the ledger is settled before either wheel reaches the bridge, and the bridge does not move while a wheel is over it (tested: under 5 cm; measured 0). The bridge is .05 m short of each pit wall, so the wheels do not dip at the joints.
- A rider who makes the bridge move under them, by pivoting on it or arriving with an unpaid ledger, meets negative feedback, not a runaway. Being carried up is compensated, and sinking with it raises it. Stress runs (rocking the world ±.8 rad on the brake, partial ledgers, approaches up to 9 m/s) found no sinking through it (under 2.5 cm of wheel overlap) and the bridge moved no more than the rider's own frame did.

**The corridor and the rising ball.**

- East of the pit, a corridor (floor 0, ceiling 2.6) holds a ball (radius 1.25) that falls UP and rests against the ceiling. It fills the corridor, so the rider has to push it.
- Material: density .3 (1.5 kg), linear damping 4, friction .9.
- **The push.** The front wheel meets the ball below its middle, so the push rolls the ball forward along the stone above it. The pilot pushes it about 9 m in 7 s.
- **The well.** The well is a round pocket up into the ceiling, .1 m wider than the ball. Pushed under it, the ball rises, seats against the pocket's round top (socket: tolerance .06, speed .1) and becomes fixed stone. Seated, it crowns .45 m below the ceiling, the same shallow plug as the Attic's barrel. An upright rider passes under it, and an inverted rider rolls over it.
- **Contrary drift.** Tilting the world moves the ball opposite to the rider: tilt east and it rolls west.
  - Drifting west, it wedges against the east kerb, where there is only 2.1 m under the ceiling. It cannot float away over the pit. In the demonstrated route, the climb out of the cellar rolls it back there (x ≈ 32.9).
  - Tilting west for a while (−.3 to −.6 rad) floats it east into the well before the rider arrives, where it seats just the same.
  - A harder or longer tilt can carry it past the well, as far as the hall's ceiling. It is still enclosed, and any east-down tilt floats it back into the well. A test starts it in the hall: the cellar ride alone brings it back to seat.

**The hall and the ceiling.**

- The corridor ends at a knee and a 22° ramp down into a hall (floor −6.4). The hall's east end is a half loop (radius 4.5) up onto the underside of the corridor's ceiling.
- Upside down, the rider rides the ceiling back west over the seated ball to the last apple and the door, at the corridor's west end.
- The last apple hangs .4 m below the ceiling, out of reach of an upright rider.
- Without the plug, the inverted rider falls up into the open well, whose top is a hazard. This is the second counterfactual.
- Riding through the hall moves the bridge again: down to the hall raises it, the loop lowers it. By then the rider is far east of it.
- **The hall is a second cellar.** Its floor is 6.4 m below the corridor's, deeper than the ledger. A rider back on the corridor floor from the ceiling has spent the 1.2 m between ceiling and floor, so the bridge stands above the kerb.
  - With a hall only 5.4 m deep, the best the east side could do was leave it .6 m high. A rider who had skipped the cellar apple then reached the door with four apples and could never get back west. They were alive but stuck.
  - Now, riding down into the hall and back up fills the ledger from empty, and the bridge is flush again. A test skips the cellar apple, rides the whole route to the door, rides back (ceiling, loop, hall, corridor, bridge), collects it and finishes.

## Apples

There are five apples:

1. On the tower floor east of the spawn.
2. On the cellar floor.
3. In the corridor east of the well.
4. On the hall floor.
5. Against the ceiling west of the well, which only an upside-down rider can reach.

## Validation

`tests/leibniz-counterweight.test.ts` covers:

- **Campaign replay.** It completes in about 84 s, 191 m. It never brakes and is upside down on the ceiling at the end. It checks that:
  - the bridge is flush with the kerb (< 5 cm) when the rider reaches the pit;
  - the bridge holds still while either wheel is over it;
  - the ball seats in the well.
- **Partial cellar.** Turning back 3 m down the cellar leaves the bridge at 6.5 − (altitude climbed).
- **Negative.** Riding straight east with an empty ledger crashes in the pit under the raised bridge.
- **Hard stop.** Braking from 5 m/s on the tower floor pitches the frame up more than .25 m; the kerb pays it back and the rider crosses.
- **No stuck state.** Skipping the cellar apple, riding to the door and back through the hall to collect it completes the map.
- **Lost ball.** A ball started in the hall drifts back and seats, and the route completes.
- **Counterfactuals.** These use the same pilot, which treats a missing ball as already seated:
  - with the bridge frozen at its top stop, the pilot falls into the pit;
  - without the ball, the inverted rider falls into the open well.

The campaign ordering test in `tests/levels.test.ts` includes the map. The Clockwork Wedge's neighbour assertion now expects this map before it.

## Residuals

- The ledger reads the frame centre, so in practice wheel compression and bumps move the bridge a few centimetres. The level floors keep that negligible.
- The ball's damping limits the push to about 2.3 m/s. A loose prop is harmless to the helmet, so the push itself cannot crash the rider.
- Route hints (DESCEND, CLIMB, PUSH, LOOP) have not yet been checked against the LEDGER panel at every screen size, as was done for the Clockwork Wedge.
