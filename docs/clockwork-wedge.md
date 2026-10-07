# The Clockwork Wedge

Campaign map 14 (index 13), difficulty 10.5. It is the second time map, directly after The Clockwork Apple. Code: `src/levels/clockwork-wedge.ts`. Tests: `tests/clockwork-wedge.test.ts`. The HUD timeline label reads COUNTERWEIGHT (`Level.timeLabel`).

Redesigned in fix pass 1 (review items M2, M3, M4a, M4b, M7 and the wedge-escape risk). The old layout let a fast rider reach the door before the weight seated, let the wedge be shoved the wrong way from the spawn, and needed the brake for the final drop. Reworked again in fix pass 2: the bend (a head-crash trap over the crossing) is gone and the finale is the catch the design asked for; the wedge holds still under a held tilt but pushes easily; the door bay can no longer strand a rider. Fix pass 3 rebuilt the catch itself so a rider can stop turning anywhere on the way round, moved the wayfinding marks out from under the COUNTERWEIGHT panel, and measured the limits of charging the wedge.

## How it works

**The deck.** The rider starts on a deck (top y = 5, x −20 … 5) above the floor (y = 0).

- Its east end curls into a tall quarter-pipe. From the deck the door can be seen but not reached.
- A rider who holds the world tilted right, even at a full radian, just rocks in the curl without crashing.

**The counterweight.** A 3×2.5 brass weight is a time platform. Its path is bent through a `via` point (`TimePlatform.via`): it runs from (46, 5.4) to (40, 4.6), then straight down onto the door at (40, 1.25).

- Rightward travel lowers it, and leftward travel lifts it. `timeTravel` is 16 m.
- `Level.timeSpeed` (m/s along the path; the default 2 keeps every other map unchanged) is 4 here.
- Its path stays east of the wedge's post. It clears the one-way wall's top on the way up and stays above a rider on the ramp. It also stays below an inverted rider's helmet on the roof and under the catch's recess ceiling. When raised, it is off the drop line (M7).

**The wedge.** A wooden wedge (◢, 5 m long: a 2.5 m slope over a .35 m vertical toe) sits on the floor UNDER the deck, west of the spawn (the PUSH hint marks it).

- Material: friction .75, density .15 (light), linear damping 5 (`Prop.damping`, new; default .12).
- **Threshold.** With the world held at ≤ .6 rad for 20 s the wedge does not move at all (tested at .3, .45, .6: < .3 m). On its own it starts to creep only from ≈ .7 rad (≈ .5 m in 20 s), and at .8 rad it crawls ≈ 1.5 m in 20 s.
- **Pushing.** A rider behind it adds their own weight to the push, so a held .3 rad already moves it. The damping caps the pushing speed: ≈ 1.1 m/s at .3 rad (≈ 38 s to the post), ≈ 2.5 m/s at .5, ≈ 5 m/s at .8. Plain held pushes at .3, .4, .5 and .8 rad seat it without crashing (tested).
- **The bumper.** The toe is faced with a frictionless plate (`Prop.toe`, new). The front tyre presses on it and pushes, instead of being braked by the face or climbing the slope.
- **The seat.** At the weight's west face is a stone post (38.2 … 38.5, as tall as the slope). In front of it, the floor has a recess as deep as the toe and .3 m longer than the wedge, so the wedge drops in level. It seats (socket, which now also requires the prop to be level within .03 rad, `socket.angle`) and becomes fixed stone with its slope flush with the floor.
- To fetch it, ride west along the deck, down the knee-and-slide at the deck's west end, and off a level lip 2.4 m up. That leaves headroom to come back under the deck. Turn in the west quarter-pipe and roll back east under the deck, then tilt the world right behind the wedge.
- The post keeps a loose wedge out of the door bay at any tilt.

**Why the weight always wins the race (M3).** The only way to the floor is the trip west. The ride back east is ≥ 40 m of floor, and the weight needs 16 m of travel plus at most 2.4 s to seat. So it is on the door long before any rider, however fast, reaches it.

**The crossing and the one-way drop (M2).** From the weight's top (an apple) the only way on is east. The rider drops over a thin wall (top 2.4) onto a down-ramp whose top is 1.3 m high.

- The wall's eave slopes down east to a hand's breadth (.25 m) above the ramp, so a slow roll off the weight steps down onto the ramp instead of nose-diving.
- Ridden back west, the ramp ends under the eave at the wall's face. With the door open and no apples needed, riders holding the world at −.3, −.6, −1 and −1.2 rad never get west of the wall.
- Nothing hangs lower than y 8 over the crossing (≥ 3.3 m above the weight's top), so a rider can cross at any speed: cruises at 3, 6, 8 and 10 m/s from x 14 over the seated wedge and weight never crash.

**The loop, the roof and the catch.**

- The ramp leads to a half-pipe (radius 4.5, centre (52, 4.5)). It turns the rider up and over, inverted, onto the underside of a roof at y = 9.
- Riding west along the roof lifts the weight.
- **The catch.** West of the door (from x 33) the roof's underside steps up into a recess ceiling .5 m above the roof, ending at a slick stone stop (east face x 39.2). Riding west upside down, the rider's front wheel runs onto a short grippy cup along the stop's foot and presses against the stop; the frame's rear rests on a frictionless tooth under its east end. A rider who does not turn the world stays caught (tested for 70 s).
- **The hold is static all the way round.** Because the wheel is wedged between the stop and the cup's corner and the tooth only carries the frame's rear, the rider stays caught at any world angle in [π, 2π]: stop turning anywhere, for as long as you like, and nothing moves (tested with 3 s pauses every .2 rad from 3.3 to 6.2 rad at all three turning rates, 5 s pauses in the harness, and pauses at the hold's edge, 5.95–6.12 rad).
- **Turn the world.** Turn the world on round the same way (π → 2π) and hold it level. Only when gravity points straight back down (≈ 2π) does the wheel roll off the cup's corner: the frame slides a hand's breadth east on the slick tooth, tips nose-down about the tooth's west edge (the rear wheel rises into a dip in the ceiling east of the recess, so it never jams), drifts ≈ 1 m/s west and lands wheels first on the door at x ≈ 39.4–39.6. It completes at button rate (.95 rad/s) and with a phone's worldAngle turning at 1.5 and 2.5 rad/s, never braking, landing upright (|frame angle| < 1) with the weight clear of the drop line.
- **Marks.** The COUNTERWEIGHT panel sits top right on a landscape screen (top left in portrait). Along the pilot's whole ride at the riding camera, at 1280×800, 1024×768 and 667×375, it never covers UNDER (−24, 1) and PUSH (−18, 1) at floor level under the deck, LOOP (46, 1) at the foot of the down-ramp, or LIFT (52.5, 5.8) in the half-pipe's eye (checked against the renderer's label placement and the panel's CSS box). TURN stays west of the catch, where the panel does not cover it during the ride over the weight.

**The door bay.** Its floor is a thin hazard strip. The door (the exit sensor) is reached in the air on the way down, so a rider with every apple finishes before touching it. A rider who drops in without every apple crashes instead of being stranded between the post and the wall.

## Demonstration and tests

**Demonstration.** `createClockworkWedgePilot({ turnRate? })` uses tilt only and never brakes; its tilt is clamped to the buttons' rate. It pushes the wedge feathered to ≈ 2 m/s. Under the roof it rides into the catch, waits until still, then turns the world to a full turn at button rate (or, with `turnRate`, as a phone does).

- It completes with all 6 apples in about 91 s. The wedge seats at about 49 s; the turn starts at about 84 s and the rider drops at a full turn.

**Tests** (`tests/clockwork-wedge.test.ts`, 48):

- Placement and the wedge's material (friction .7–.8, density ≤ .2, damping ≥ 4, toe .35 flush with the seat), the PUSH hint.
- Full completions, never braking, at button rate and with worldAngle turning at 1.5 and 2.5 rad/s: wedge seated, push speed < 3 m/s, inverted world ending at a full turn, landing |frame angle| < 1, weight clear of the drop line.
- A rider caught at the stop who does not turn the world stays caught.
- Hesitating at the catch: for each turning rate (.95, 1.5, 2.5 rad/s) and every pause angle from 3.3 to 6.2 rad in .2 rad steps, a 3 s pause then turning on completes without a crash, touching down between the post and the wall, upright.
- A naive ride right stays on the deck and does not move the wedge.
- With the world held at .6 and 1 rad from the spawn, the rider rocks in the curl uncrashed.
- A fast floor rider (world held at .6 and 1 rad) finds the weight already seated.
- With the world held at −.3, −.6, −1 and −1.2 rad, the door cannot be entered from the east.
- Riding left lifts the weight clear of the drop line, and riding right lowers it onto the door again.
- The weight's path, sampled, clears the seated wedge, the wall, the ramp rider, the roof rider and the rider hanging under the catch's recess ceiling; no stone lower than 3.3 m above the weight's top over the crossing.
- Crossing at 3, 6, 8 and 10 m/s; slow rolls off the weight's top (held .05–.15 rad).
- The wedge stays put (< .3 m) with the world held at .3, .45, .6 rad for 20 s; loosed at .8 or 1 rad it never passes the post or tumbles.
- Plain held pushes at .3/.4/.5 (from 3 m behind), .3/.5 (from 8 m) and .8 rad (from 3, 8 and 10 m) seat it without crashing.
- Charging from the west quarter-pipe (the pilot's fetch, then .3 rad held from the turn all the way in) seats it without crashing.
- A rider dropped into the door bay without every apple crashes.
- Fixed controls never complete.

`tests/physics-time.test.ts` covers `pathPoint` / `pathLength` for the bent path.

## Known limits

- **Over-rotating at the catch.** The hold releases at a full turn; the hint says to turn back to level and hold. Turning on past level (the world angle is unbounded, so a phone or a held button can) by more than ≈ .25 rad before the drop slides the bike east off the tooth, and it lands on the lifted weight or the eave instead of the door (a crash). Up to ≈ .25 rad past level it still completes. The pilot stops exactly at 2π.
- **Charging the wedge.** A rider who hits the wedge's bumper at ≳ 11 m/s pitches over the bars whatever the wedge is made of (the impulse acts at axle height, below the rider's centre of mass). Measured: held .8 rad pushes from 3, 8 and 10 m behind (hitting at ≈ 4.6, 9 and 10.3 m/s) seat it; from 12 m and beyond (≥ 11.3 m/s) they crash. Rolling in from the west quarter-pipe with the world held at .8 rad arrives at ≈ 17 m/s and crashes; at .3 rad it seats (tested). Changing the wedge's damping, density, bumper height or the seat's friction does not change this; it is a physics limit, so the hint says to tilt gently. Holding .5 rad from the pipe (≈ 13.7 m/s) does not crash but can beach the wedge on the recess's west lip (west end on the floor, east end in the recess, tilted −.05 rad, so it never seats): a stall, not a crash — restart.
- **Slow pushes.** At .3 rad the push takes ≈ 38 s; more tilt is faster and still safe up to .8 from ≤ 10 m behind.
- **Steep tilts at the wall.** A world held past ≈ 1.3 rad can still bounce a rider off the one-way wall, though it crashes rather than entering the door.
- **Marks on very wide or portrait screens.** At 1920×1080 the panel brushes LOOP and LIFT for ≈ .2 s while the rider hangs in the catch far away; in portrait (390×844, panel top left) it covers PUSH for ≈ .2 s as the rider passes it. No roof-side position for LIFT is clear of the panel at every viewport, because the loop and the crossing sweep the whole roof past it.
- **Visual overlap.** Kinematic bodies do not collide with fixed stone. The weight's path was chosen so that it never visibly overlaps any stone.
