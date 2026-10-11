# Euler’s Bridges

*Cross each bridge only once.*

Campaign map 18 (index 17), difficulty 12.25, directly after Spiral Sanctuary. It uses the rose palette and a Königsberg river-town theme. Code: `src/levels/eulers-bridges.ts`. Tests: `tests/eulers-bridges.test.ts`. The HUD timeline label reads RIVER.

## How it works

**One clock, seven bridges.** Every bridge is a time platform on the shared route clock. The route axis is x and `timeTravel` T is 34 m: riding east fills the clock and riding west drains it.

- All seven bridges move **vertically only** (`from.x == to.x`). Passive carry therefore never feeds the clock, which sidesteps the known carry defect of horizontal route-clocked platforms.
- Each bridge has its own vertical travel (3.4, 2.2, 2.0, 1.8, 4.2, 3.2, 2.8 m; b1 and b5 are the most sensitive, because they gate the ebb and the flood) and its own flush reading (its phase). Every `from` and `to` lies inside the bounds.

**The clock saturates.** Once the clock is full, riding further east drags the whole 34 m window east. Once it is empty, riding west drags it west. So at a bridge with centre m, the reading is (m − L)/T, where L is the window's west end. L only moves while the clock is pinned. Where the rider turns therefore sets every bridge ahead.

**One-way bridges.**

- Each canal bridge (upper town) *rises* as the clock fills. Ridden east, it comes up to meet the rider, so both of its steps are small steps down.
- Each river bridge *sinks* as the clock fills. Ridden west (draining), it rises to meet the rider.
- Ridden back the other way, each exit edge is a step up of up to about .3 m. This is a *soft* one-way: a fast rider can sometimes climb back over a bridge (the audit rode back west over b2). That is harmless, because riding back and forth never moves L, so the route ahead is unchanged. The route crosses each bridge once.
- The design lead (`lead` = .5 m of clock travel) keeps the deck a touch low as the front wheel arrives and a touch high as the rear wheel leaves.
- **Riding a bridge moves it.** The clock advances while the rider crosses a deck, so the deck keeps rising under them. Over one crossing (first wheel on to last wheel off), the measured steps are all down steps: upper .17 m on and .31 m off (b1), .09–.11 m on and .16–.20 m off (b2–b4); river .21 m on and .38 m off (b5), .14–.16 m on and .25–.29 m off (b6, b7). The steps depend only on position (the clock is position-driven), so they are the same at 2.5 and 4 m/s. No up-lip opens at the far bank.

**Shallow water, no stuck states.** The water lies .4 m below the banks. A bridge that has not come up far enough is therefore still *under* the water, and riding onto it is a splash: a crash card with the hint. Earlier the water was .75 m down, so a rider who set off without ebbing came to rest alive on a sunken b1 deck that no input could leave. That was a silent soft-lock on the most natural first attempt.

- Pinned as designed, every deck is at least about .2 m clear of the water as the rider reaches it (b5, the tightest, .19 m).
- **Ebb tolerance:** the ebb works when it reaches within about 2–3 m of the upper wall (measured: a stop at x 2.7 completes; a stop at x 4.3 splashes at b1). It used to work from x ≈ 5, only 2 m from the spawn, which let an aimless wobble solve the puzzle.
- **Flood tolerance:** the flood works when it pins within about 2 m of the far wall (measured: turning home at x 48.9–49.5 completes; at 48.3–48.8, 2.1–2.6 m short, b5 splashes). b5's travel (4.2 m, was 3.6) sets this; at 3.6 a turn 2.7 m short still completed.

**Canal apples cannot be skipped.** Every apple hangs .9 m above its bridge's centre, in the bike's path. The only way past a canal or channel is over its deck, so the bridge's apple is always collected. There is no state in which the rider is below the upper town with a canal apple missed but still alive.

## Layout (metres, y up)

- **Upper town:** top 4.6, from a wall at x 0 to x 33. It has four 3 m canals with water (a hazard) at 10.5, 16.5, 22.5 and 28.5. The spawn is at x 7.
- **Chute:** a 3 m knee, a 50° slide and a tight 1.1 m bend (chains) that launches the rider at about (36.5, 2.4) while still heading .2 rad down, with no flat table. It grew from the Clockwork Wedge's knee-and-slide, and it leaves headroom to ride home beneath it.
- **River quay:** top 0, from the door's west wall at −1.4 to a far east wall at 52. The water in every canal and channel is .4 m below the banks. It has three 3 m channels at 35.5, 29.5 and 23.5. The river bridges are deep piers, and the thin canal bridges overhead stay clear of a rider on the quay. The door is at x 1.0.
- **Route hints:** EBB (west arrow by the upper wall) and FLOOD (east arrow by the river wall). The camera sees only about ±7.7 m.

## Solution order (designed first, then phased)

1. **EBB.** Ride west from the spawn into the upper wall and stop. The clock is pinned empty with L = 1.04.
   - Set off east from the spawn instead, and L stays at 7. Every canal bridge then reads 6 m of clock too low, and the first one is still down (the "no ebb" test).
2. **Canals.** Ride east over b1–b4 (apples a1–a4). Each bridge comes up flush as the rider arrives.
3. **Drop.** Go down the chute.
   - By then the clock is full, and the flight off the lip drags L east.
   - Any world angle from level to about .6 rad right lands (see "Landing window" below). Tilting the world back (left) can still pitch a slow rider over, so the hint says to drop without tilting back.
4. **FLOOD.** Ride on east into the far river wall, gently, and stop. The clock is pinned full with L = 52 − 1.04 − 34 = 16.96.
   - **This is now a real step.** The new launch touches down earlier (x ≈ 39–41) and keeps less speed. A rider who tilts the world back on landing and turns home at once stops 2–7 m short of the wall (x 43.6–48.8), and b5 is still under water: a splash (tested at chute leans 0 and .3). Before the second audit, the drop's momentum carried every surviving rider into the wall, so FLOOD was only a direction.
   - It is softer than the ebb. A rider who leans forward off the chute lands faster, and with no input that momentum alone nearly reaches the wall. Only a deliberate early turn fails.
   - Slamming into the wall with the world held .3 rad right crashes; rolling in with the world level does not. Hence "gently" in the hint.
5. **Home.** Ride west over b5, b6 and b7 (apples a5–a7). As the clock drains, each rises flush to meet the rider. Then ride on under the upper town to the door.

The pilot (`createEulersBridgesPilot`) runs exactly this sequence with heading-relative tilt and never brakes. It takes about 47 s and about 128 m. Its `canalSpeed` and `chuteLean` options sweep the landing.

## Landing window (second audit)

The first audit measured survivable leans of .18–.20 and .24–.40, with .22 crashing in between. The cause was the level table at the lip. The front wheel dropped off the edge while the rear wheel was still on the table, and that tip pitched the bike about 1 rad nose down by touchdown, whatever the lean. Every landing was a front-wheel stoppie at about 60°, so survival depended on how the stoppie happened to fall. The outcome flickered with the lean, and it got worse at other canal speeds.

The fix is in the chute alone. A wider knee (3 m, was 1.5) keeps a fast rider low over the slide. The rider now leaves straight off a tight bend (1.1 m, was 2) while still heading .2 rad down, with no table. The bend's nose-up spin carries into the flight and cancels the tip. Touchdown pitch is now about −.9 to +.9 rad, and a tail-first landing is common.

The probe used the pilot's own post-landing control. Survivors per speed, for leans −.2 to .6 in .02 steps (41 per speed):

| Canal speed (m/s) | 1 | 1.5 | 2 | 2.5 | 3 | 4 | 5 | 6 |
|---|---|---|---|---|---|---|---|---|
| Old chute | 10 | 9 | 12 | 11 | 12 | 0 | 8 | 31 |
| New chute | 32 | 30 | 33 | 36 | 34 | 41 | 41 | 41 |

- **New chute, leans from level to .6:** 245 of 248 survive. The three isolated failures are .12 and .14 at 3 m/s, and .22 at 1.5 m/s.
- **Tilting back:** the remaining failures are leans of −.04 to −.2 at canal speeds of 3 m/s or less.
- **World held level after landing:** at 2.5 m/s, 35 of 41 survive. Only leans of −.1 or less fail.
- **Old chute:** a rider who crossed the canals briskly (4 m/s) crashed on landing at every lean.
- **Regression test:** it rides leans 0, .1, .2, .22, .3, .4 and .5 at 2, 2.5, 4 and 5 m/s, and every ride must complete.

## Tests

- **Static checks:** campaign position and difficulty, the RIVER clock, seven vertical-only lifts with distinct travels and phases, and all 14 lift ends inside the bounds. Also the rose palette, width ≤ 60 m, and the EBB/FLOOD hints.
- **Water check:** pinned as designed, every bridge is clear of the water on arrival. With no ebb, b1 is under water. Turning home 2.2 m short of the far-wall pin leaves b5 under water.
- **Positive replays:** the pilot, and the campaign replay table at its own index. Both collect all seven apples and complete, without braking.
- **Landing window:** 28 full rides (canal speed 2, 2.5, 4 and 5 m/s × chute lean 0, .1, .2, .22, .3, .4 and .5), every one complete with seven apples.
- **Rendered campaign:** `e2e/expansion.spec.ts` drives the replay pilot through the rendered game and saves `docs/evidence/eulers-bridges-overview.png`.
- **Negative tests:**
  - idle, held right, and held left;
  - no ebb (set off east at once): splashes at b1, with no apples and the status crashed (not stuck).
- **Turning home on landing splashes at b5** (chute lean 0 and .3): the rider tilts the world a full radian back on landing and turns home. It stops more than 2 m short of the wall, collects only the four canal apples, and crashes in b5's channel. This replaces the first audit's "flood is automatic" test, which documented a weakness the new launch removed.
- **Counterfactual:** with the clock's effect frozen (every lift's `to` = `from`), the same pilot cannot take all seven apples. It splashes at b1.

## Residuals / known issues

- **FLOOD is a real step, but a soft one.** A rider who turns home on landing splashes at b5. A rider who leans forward off the chute and does nothing still rolls to within about 2 m of the wall. So the step mostly catches a deliberate early turn. Making it bite harder would need b5's travel above about 4.6 m (a tolerance of about 1.5 m), at the cost of a stricter wall touch. That was left alone.
- **Difficulty 12.25 holds** (after Spiral Sanctuary at 12, before Switchback Scaffold at 13). The map has two gated clock reads: the ebb (within about 2.7 m of the wall) and the flood (within about 2 m). It also has seven step-down bridge crossings, and a drop that no longer needs a hidden lean. Its execution load is below Spiral Sanctuary's two airborne gap crossings. Its conceptual load is the campaign's highest so far: a saturating shared clock, whose pinned window is set by where you turn. On balance the slot and value fit. The value was not changed, to keep cross-branch ordering stable.
- **Landing window:** see the table above. Three isolated lean/speed failures remain between level and .6 (.12 and .14 at 3 m/s, .22 at 1.5 m/s). Tilting back at slow canal speeds can still pitch over. The hint says to drop without tilting back.
- **Readability of a sunken bridge.** Time platforms draw in the dynamic layer, above the terrain layer that holds the red water hazard. A deck above the water's top therefore hides the red band, and the rider can ride it. A deck below the water's top leaves the red hatched band showing above the deck, so it reads as under water. This was checked in the rendered game for the no-ebb approach to b1 and an early turn at b5.
- **Cosmetic overlap.** Near the clock's empty reading, b5 is raised (top 2.35 m). There its deck overlaps the underside of the chute's launch (about 2.13–2.39 m over x 35.8–36.5) by up to .22 m. This happens only at the start and the finish, when the camera is about 30 m away, so only the whole-map view shows it. The lift is kinematic and the chute is fixed, so they never collide.
- **The river half is execution.** After the flood, the three river bridges come up to meet a rider who simply rides home. No partial clock value is marked, and the clock depends on position, not speed, so a pacing apple could not ask for a slower crossing. No cheap, honest decision was found to add there.
- **Phone feel is untested.** All the data comes from simulated input at 120 Hz: button-rate tilt and heading-relative world angles. The chute drop, the gentle wall touch and the ebb stop have not been tried by hand on a phone.
