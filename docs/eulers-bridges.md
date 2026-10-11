# Euler’s Bridges

*Cross each bridge only once.*

Campaign map 18 (index 17), difficulty 12.25, directly after Spiral Sanctuary. It uses the rose palette and a Königsberg river-town theme. Code: `src/levels/eulers-bridges.ts`. Tests: `tests/eulers-bridges.test.ts`. The HUD timeline label reads RIVER.

## How it works

**One clock, seven bridges.** Every bridge is a time platform on the shared route clock. The route axis is x and `timeTravel` T is 34 m: riding east fills the clock and riding west drains it.

- All seven bridges move **vertically only** (`from.x == to.x`). Passive carry therefore never feeds the clock, which sidesteps the known carry defect of horizontal route-clocked platforms.
- Each bridge has its own vertical travel (3.4, 2.2, 2.0, 1.8, 3.6, 3.2, 2.8 m; b1 is the most sensitive, because it gates the ebb) and its own flush reading (its phase). Every `from` and `to` lies inside the bounds.

**The clock saturates.** Once the clock is full, riding further east drags the whole 34 m window east. Once it is empty, riding west drags it west. So at a bridge with centre m, the reading is (m − L)/T, where L is the window's west end. L only moves while the clock is pinned. Where the rider turns therefore sets every bridge ahead.

**One-way bridges.**

- Each canal bridge (upper town) *rises* as the clock fills. Ridden east, it comes up to meet the rider, so both of its steps are small steps down.
- Each river bridge *sinks* as the clock fills. Ridden west (draining), it rises to meet the rider.
- Ridden back the other way, each exit edge is a step up of up to about .3 m. This is a *soft* one-way: a fast rider can sometimes climb back over a bridge (the audit rode back west over b2). That is harmless, because riding back and forth never moves L, so the route ahead is unchanged. The route crosses each bridge once.
- The design lead (`lead` = .5 m of clock travel) keeps the deck a touch low as the front wheel arrives and a touch high as the rear wheel leaves.
- **Riding a bridge moves it.** The clock advances while the rider crosses a deck, so the deck keeps rising under them. Over one crossing (wheel on to wheel off, about 4.4 m of clock), the measured steps are all down steps: upper .17 m on and .28 m off (b1), .09–.11 m on and .14–.18 m off (b2–b4); river .14–.18 m on and .23–.29 m off. No up-lip opens at the far bank.

**Shallow water, no stuck states.** The water lies .4 m below the banks. A bridge that has not come up far enough is therefore still *under* the water, and riding onto it is a splash: a crash card with the hint. Earlier the water was .75 m down, so a rider who set off without ebbing came to rest alive on a sunken b1 deck that no input could leave. That was a silent soft-lock on the most natural first attempt.

- Pinned as designed, every deck is at least .2 m clear of the water as the rider reaches it.
- **Ebb tolerance:** the ebb works when it reaches within about 2–3 m of the upper wall (measured: a stop at x 2.7 completes; a stop at x 4.3 splashes at b1). It used to work from x ≈ 5, only 2 m from the spawn, which let an aimless wobble solve the puzzle.
- **Flood tolerance:** the flood works when it pins within about 2 m of the far wall.

**Canal apples cannot be skipped.** Every apple hangs .9 m above its bridge's centre, in the bike's path. The only way past a canal or channel is over its deck, so the bridge's apple is always collected. There is no state in which the rider is below the upper town with a canal apple missed but still alive.

## Layout (metres, y up)

- **Upper town:** top 4.6, from a wall at x 0 to x 33. It has four 3 m canals with water (a hazard) at 10.5, 16.5, 22.5 and 28.5. The spawn is at x 7.
- **Chute:** a knee and a 50° slide (chains) to a level lip at about (37.7, 2.4). It is the same construction as the Clockwork Wedge, and it leaves headroom to ride home beneath it.
- **River quay:** top 0, from the door's west wall at −1.4 to a far east wall at 52. The water in every canal and channel is .4 m below the banks. It has three 3 m channels at 35.5, 29.5 and 23.5. The river bridges are deep piers, and the thin canal bridges overhead stay clear of a rider on the quay. The door is at x 1.0.
- **Route hints:** EBB (west arrow by the upper wall) and FLOOD (east arrow by the river wall). The camera sees only about ±7.7 m.

## Solution order (designed first, then phased)

1. **EBB.** Ride west from the spawn into the upper wall and stop. The clock is pinned empty with L = 1.04.
   - Set off east from the spawn instead, and L stays at 7. Every canal bridge then reads 6 m of clock too low, and the first one is still down (the "no ebb" test).
2. **Canals.** Ride east over b1–b4 (apples a1–a4). Each bridge comes up flush as the rider arrives.
3. **Drop.** Go down the chute.
   - By then the clock is full, and the flight off the lip drags L east.
   - Lean the world right (forward, about .3 rad, as on Hooke's Springboard) once past the knee, so the bike lands on its wheels. With the world held level it pitches over and crashes.
   - Measured window (lean held through the flight, then the pilot's control): .18–.20 and .24–.40 survive; .15, .22 and .45 crash. Holding the world level after landing narrows this to about .3–.35, because a fast landing at .4 hits the far wall hard enough to crash.
4. **FLOOD.** Ride on east into the far river wall and stop. The clock is pinned full with L = 52 − 1.04 − 34 = 16.96.
   - **Known weakness: this step is not a decision.** The drop touches down at x ≈ 42–43 at 7–9 m/s. The momentum carries the rider into the far wall even when the world is tilted a full radian back on landing (a test checks this). Braking at that speed pitches the bike over. So no surviving rider can turn home short, and the FLOOD arrow only marks a direction. What the step does demand is easing off before the wall.
   - The audit tried a ramp before the wall to soak up the momentum, with the river bridges moved east to keep their phases. It failed for two reasons. The landing speed would need a ramp more than 3 m high to stop, and the touchdown zone (x 42–43) leaves no room to move b5 east. Making FLOOD a real choice therefore needs a slower drop, or a river half laid out differently. That is left for a later cycle.
5. **Home.** Ride west over b5, b6 and b7 (apples a5–a7). As the clock drains, each rises flush to meet the rider. Then ride on under the upper town to the door.

The pilot (`createEulersBridgesPilot`) runs exactly this sequence with heading-relative tilt and never brakes. It takes about 47 s and about 128 m.

## Tests

- **Static checks:** campaign position and difficulty, the RIVER clock, seven vertical-only lifts with distinct travels and phases, and all 14 lift ends inside the bounds. Also the rose palette, width ≤ 60 m, and the EBB/FLOOD hints.
- **Water check:** pinned as designed, every bridge is clear of the water on arrival. With no ebb, b1 is under water. Turning home 3 m short of the far-wall pin leaves b5 under water.
- **Positive replays:** the pilot, and the campaign replay table at its own index. Both collect all seven apples and complete, without braking.
- **Negative tests:**
  - idle, held right, and held left;
  - no ebb (set off east at once): splashes at b1, with no apples and the status crashed (not stuck).
- **Flood is automatic:** the rider tilts the world a full radian back on landing, then turns home. It still reaches the far wall and completes. This test documents the known weakness. It replaces an earlier "brake on landing and turn home short" negative, which in fact crashed by pitching over on landing and never reached the river bridges.
- **Counterfactual:** with the clock's effect frozen (every lift's `to` = `from`), the same pilot cannot take all seven apples. It splashes at b1.
