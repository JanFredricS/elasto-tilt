# Euler’s Bridges

*Cross each bridge only once.*

Campaign map 18 (index 17), difficulty 12.25, directly after Spiral Sanctuary. It uses the rose palette and a Königsberg river-town theme. Code: `src/levels/eulers-bridges.ts`. Tests: `tests/eulers-bridges.test.ts`. The HUD timeline label reads RIVER.

## How it works

**One clock, seven bridges.** Every bridge is a time platform on the shared route clock. The route axis is x and `timeTravel` T is 34 m: riding east fills the clock and riding west drains it.

- All seven bridges move **vertically only** (`from.x == to.x`). Passive carry therefore never feeds the clock, which sidesteps the known carry defect of horizontal route-clocked platforms.
- Each bridge has its own vertical travel (2.4, 2.2, 2.0, 1.8, 3.6, 3.2, 2.8 m) and its own flush reading (its phase). Every `from` and `to` lies inside the bounds.

**The clock saturates.** Once the clock is full, riding further east drags the whole 34 m window east. Once it is empty, riding west drags it west. So at a bridge with centre m, the reading is (m − L)/T, where L is the window's west end. L only moves while the clock is pinned. Where the rider turns therefore sets every bridge ahead.

**One-way bridges.**

- Each canal bridge (upper town) *rises* as the clock fills. Ridden east, it comes up to meet the rider, so both of its steps are small steps down.
- Each river bridge *sinks* as the clock fills. Ridden west (draining), it rises to meet the rider.
- Ridden the other way, each bridge presents a step up the bike cannot climb, or a drop into the water. Every bridge is therefore crossed exactly once, in its own direction.
- The design lead (`lead` = .5 m of clock travel) keeps the deck a touch low as the front wheel arrives and a touch high as the rear wheel leaves.

## Layout (metres, y up)

- **Upper town:** top 4.6, from a wall at x 0 to x 33. It has four 3 m canals with water (a hazard) at 10.5, 16.5, 22.5 and 28.5. The spawn is at x 7.
- **Chute:** a knee and a 50° slide (chains) to a level lip at about (37.7, 2.4). It is the same construction as the Clockwork Wedge, and it leaves headroom to ride home beneath it.
- **River quay:** top 0, from the door's west wall at −1.4 to a far east wall at 52. It has three 3 m channels at 35.5, 29.5 and 23.5. The river bridges are deep piers, and the thin canal bridges overhead stay clear of a rider on the quay. The door is at x 1.0.
- **Route hints:** EBB (west arrow by the upper wall) and FLOOD (east arrow by the river wall). The camera sees only about ±7.7 m.

## Solution order (designed first, then phased)

1. **EBB.** Ride west from the spawn into the upper wall and stop. The clock is pinned empty with L = 1.04.
   - Set off east from the spawn instead, and L stays at 7. Every canal bridge then reads 6 m of clock too low, and the first one is still down (the "no ebb" test).
2. **Canals.** Ride east over b1–b4 (apples a1–a4). Each bridge comes up flush as the rider arrives.
3. **Drop.** Go down the chute.
   - By then the clock is full, and the flight off the lip drags L east.
   - Tilt the world back (about .3 rad) once past the knee, so the bike flies nose-up and lands on its wheels. With the world held level it pitches over and crashes.
4. **FLOOD.** Ride on east into the far river wall and stop. The clock is pinned full with L = 52 − 1.04 − 34 = 16.96.
5. **Home.** Ride west over b5, b6 and b7 (apples a5–a7). As the clock drains, each rises flush to meet the rider. Then ride on under the upper town to the door.

The pilot (`createEulersBridgesPilot`) runs exactly this sequence with heading-relative tilt and never brakes. It takes about 47 s and about 128 m.

## Tests

- **Static checks:** campaign position and difficulty, the RIVER clock, seven vertical-only lifts with distinct travels and phases, the rose palette, width ≤ 60 m, and the EBB/FLOOD hints.
- **Positive replays:** the pilot, and the campaign replay table at its own index. Both collect all seven apples and complete, without braking.
- **Negative tests:**
  - idle, held right, and held left;
  - no ebb (set off east at once): fails at the canals;
  - braking on the river landing and turning home short of the far wall: the canals are taken, then the route fails at the river bridges.
- **Counterfactual:** with the clock's effect frozen (every lift's `to` = `from`), the same pilot cannot take all seven apples.
