# Kepler’s Orbit

*Equal areas in equal times.* Campaign map 7 (index 6), difficulty 6.75, between the Pendulum Mill (6.5) and Escher’s Orchard (7). Rose palette. Code: `src/levels/kepler.ts`. Tests: `tests/kepler.test.ts`.

## Idea

A sibling to Newton’s Ouroboros. Again one closed loop ridden on its inside by turning the world with the bike, but egg-shaped and the other way up:

- **Broad end on top (aphelion).** Two 5.5 m corners either side of a 10.2 m roof. Near the apex the roof is broken by the Ouroboros hole: a 4.5 m run, a 10° kicker (radius 3), a 3.3 m gap, and a far lip 0.3 m further out with a 0.5 m bull-nose. Beyond the hole is a small alcove, 2.7 m deep and 2.8 m wide, that holds the door 1.3 m below its far face.
- **Tight end at the bottom (perihelion).** A single 3 m arc. Its foot is cut off by a straight 2.5 m brass spring pad (`kind: 'spring'`, default restitution .9), and the arc meets the pad at 25° on either side. The ride starts on the pad.

The whole ridden face is one chain (`kepler-orbit`). It runs from the alcove’s far wall over the nose, round the broad corner, down the left side, through the tight end and up the right side, along the roof and over the kicker, and then round the alcove back to its far wall. The pad lies over the chain’s own chord at the foot, flush with it. The shape is built the right way up, Ouroboros style (hole in the floor, tight end on top), and turned half a revolution about the origin. Travel stays counter-clockwise and the world angle keeps rising lap after lap. Every piece is an exact arc or straight, so the ring closes by construction.

## Why each end asks for a different speed

**The tight end wants speed.** A fast dive down the left side strikes the pad at the 25° kink with a real normal speed: measured, about 4.8 m/s, of which 3.1 m/s is downward. The pad reflects 0.9 of that normal speed and throws the rider up about 2.7 m/s over the pad. This carries the head through the perihelion apple, which hangs 2.4 m above the pad’s face. A rolling rider there reaches no higher than about 2.0 m over the pad’s middle (measured on a grid of probe points). With plain stone in place of the brass, the dive’s normal speed is simply absorbed: in 60 s and more than three laps the same pilot never reaches the apple.

**The broad roof wants you to stop turning.** Along the roof, the bike is upside down and held up by a world turned about half a revolution. What sorts riders at the hole is the world’s lean, more than raw speed. A rider who keeps turning, with the world well past roof-upright (the pilot holds 1 rad, which crossed at every cruise speed tried from 4 to 9 m/s; 0.7 rad crossed only at the lower speeds), is thrown off the kicker across the hole and lands on the far lip, lap after lap. Its flight stays below the roof line, so it never touches the aphelion apple, which sits 0.8 m into the hole’s mouth. A keyboard rider who simply holds the turn key does this. A rider who stops turning on the roof falls up through the hole at any speed the roof allows (4–9 m/s targets all fall in at a lean of 0.5 rad or less). Falling, that rider takes the aphelion apple and touches the door. The demonstration rights the world, brakes in pulses and creeps over the kicker for a clean, repeatable fall. A keyboard rider who holds the turn key from the start and simply lets go while climbing the right side for the second time, without braking, also completes: 14 of 25 release times from 8.6 to 9.8 s (every 0.05 s), roughly the window 8.75–9.45 s. Letting go earlier leaves the rider alive in the loop; letting go later, with the world already past roof-upright at the hole, flies the rider over it and then off the ceiling. Holding the brake on the roof at that speed tumbles the rider, which is why the hint says to roll in gently rather than to brake. The exit is upward, the opposite of the Ouroboros, which is left by falling down.

**Falling in too early is a crash, not a trap.** The alcove is only 2.7 m deep. A bike that falls into it tumbles. With all three apples it touches the door first, while still falling: the door hangs 1.3 m below the far face, so its 0.8 m sensor reaches down to 0.6 m above the far lip. Without the apples the door stays shut, and within about 0.4 s of entering the head strikes stone. So a player who drops in before the loop apples gets the crash card at once and retries, instead of being stranded alive in a dead end. This is gentler than the Ouroboros, where an early fall leaves the rider alive in the corridor below. It is also what happens to most first attempts: a rider who just follows the bike round, without turning past upside-down over the roof, falls into the hole on the first pass and crashes.

**Either direction.** The far lip is 0.3 m further out than the kicker tip, so a rider going round the other way (clockwise) cannot jump the hole toward the kicker and always falls in. A rider who takes both loop apples and then turns back, riding clockwise round to the far lip, also falls up to the door. This is kept as a feature, not gated (see Residuals): it still needs both loop apples, so the pad’s throw is not skipped, and the aphelion is still taken by falling up through the hole. Reversing inside the loop takes real control: in a sweep of two-key inputs (hold right, then hold left from a chosen moment), only 2 of 37 switch times completed.

## Route (demonstration)

1. Start on the pad and turn the world. Ride up the right side and along the roof (**roof** apple, 7.0 s).
2. Jump the hole at speed: hold the world about 1 rad past roof-upright over it. Come down the far broad corner and the left side, and dive into the tight end. The pad throws the bike up through the **perihelion** apple (11.7 s).
3. Ride up the right side again. Right the world to roof-upright down the last broad corner, brake on the roof, and creep over the kicker. The bike falls up into the alcove through the **aphelion** apple and touches the door (25.7 s).

`createKeplerPilot()` (`keplerPilotFor(track, KEPLER_PILOT)`) observes the snapshot only and outputs tilt and brake. It is the Ouroboros pilot turned half a revolution, and it completes with all three apples:

| Step size | Time | Distance |
| --- | --- | --- |
| 1/120 s | 25.7 s | 89 m |
| 1/60 s | 25.0 s | 89 m |

It also completes with its cruise speed anywhere from 4.5 to 6.5 m/s and its yield creep anywhere from 0.4 to 0.9 m/s. Peak speed is about 12 m/s, coming down the left side after the jump.

## Tests (`tests/kepler.test.ts`)

**Placement.** Index 6, difficulty 6.75, the pilot is at replay index 6, and the palette is rose.

**Geometry.** One contiguous chain. The broad radius is greater than the tight radius, and both are within 2–6 m. There is a hole with a raised far lip, and an alcove more than 2.4 m deep with the door above the roof line. The door is drawn hanging from the alcove’s far face, not a side wall (`exitDoorPose`). There is one default-restitution pad, unchained, across the foot of the tight end, which is the lowest ridden face. The spawn is on the pad.

**Positive.** The pilot completes at both 1/120 and 1/60 s. It takes the roof apple, then the perihelion, then the aphelion. The perihelion comes after more than three quarters of a turn of the world and after a measured pad throw (falling faster than 2 m/s to rising faster than 2 m/s within two steps). The bike finishes above the roof with the world at roof-upright, and stays inside bounds throughout.

**Keyboard rate.** The pilot’s wishes are turned into genuine button states (−1, 0, 1) at 60 Hz and fed through the real input smoothing (`createInput().setTouchTilt`). The world then turns at no more than 0.95 rad/s, and the map still completes. Lap pumping and the world angle’s climb do not depend on phone-rate rotation.

**Spawn.** Idle for 3 s, the bike stays on the pad within 5 cm of its spawn and never rises: no spurious throw.

**Negative.** Idle, held tilt either way, and held tilt with the brake never complete in 40 s. A pilot that never slows orbits for 60 s: three or more passes over the hole, both loop apples taken, never above the roof line, aphelion never taken.

**The hole sorts by turning.** The pilot without its lean over the hole (`hole: 0`), cruising at 4 or 7 m/s, falls into the hole on its first pass, before the perihelion, and crashes less than 1 s later.

**Early entry is a crash.** The yielding pilot, made to believe it already holds both loop apples, falls into the alcove on its first roof pass. At creep speeds of 0.3, 0.6 and 1.3 m/s it crashes less than 1 s after entering, never left alive in the alcove.

**The door wins the race.** The same yielding falls (creep 0.05, 0.6 and 2.2 m/s), with the door kept shut by one extra unreachable apple, crash at least 0.1 s after the armed ride completes. (Measured minimum over eight creeps: 0.175 s; with the earlier 3 m alcove and door 1.1 m down it was 0.042 s.)

**Keyboard exit.** Holding the turn key from the start and letting go at release times from 8.6 to 9.8 s (every 0.05 s), without braking, completes at least 12 times, and no rider crashes holding all three apples. The earlier alcove failed this: of 49 release times, 19 crashed at the mouth holding all three apples and only 10 completed.

**Counterfactual.** The pad is replaced by the chain’s plain stone chord (`buildKepler(…, pad = false)`). The closed-loop pilot rides more than three laps in 60 s without reaching the perihelion apple. The throw detector used by the positive test finds no throw at all over stone, so it measures the pad and nothing else. Replaying the exact inputs of the successful ride over stone does not complete either. A pilot cruising at 4 m/s on the real pad dives too slowly to be thrown and also never takes the perihelion apple.

## Deviations from the brief

**The pad does not add speed.** The brief asked for a spring pad that “adds speed per lap”. A pad’s restitution is at most 1 and is applied only along its normal, so it can never add energy. A rider who rolls tangentially onto a flush pad is not launched at all (`SPRING_MIN_SPEED`). Instead, the pad is set as a chord into the tight arc, so a fast dive strikes it. It preserves 90% of the speed the 25° kink would otherwise swallow, and turns it into the throw that reaches the perihelion apple. Laps themselves are powered, as in the Ouroboros, by leaning gravity ahead of the bike.

**Slowness is needed only at the hole, and it means not turning.** With the world turning to follow the bike, a slow rider can hang anywhere on the roof. Only the hole tells slow from fast, so the “slow” apple is the one in the hole’s mouth. The roof caps speed at about 5–7.5 m/s at the kicker for every rider measured, so the hole tests the lean of the world rather than the speedometer. The hint says so: keep turning to fly over, stop turning to fall in.

## Residuals / known issues

- **Clockwise exit (kept as a feature).** After both loop apples a rider can turn back and ride clockwise to the far lip, which always drops them up to the door. Gating it was weighed and rejected. Reshaping the far lip into a one-way kicker would change the landing of every counter-clockwise jump, which all the proven pilots rely on. Placing the aphelion so only a counter-clockwise fall reaches it does not work either: the alcove is 2.8 m wide and honest counter-clockwise falls already reach the door anywhere from x = −5.9 to −7.7 m, across most of the alcove (measured), so a lopsided apple would turn ordinary exits into crashes at the door. The clockwise route asks for the same lesson (stop turning forward at the hole), and reversing inside the loop is harder than the intended exit, so it is not a shortcut. Unmeasured: whether a reversing rider can also take the perihelion without ever jumping the hole (roof apple, turn back, dive clockwise onto the pad). If so, the jump over the hole is a lesson the map teaches but does not require.
- **Completion happens mid-fall.** The door is touched while the bike is still falling up into the alcove, before it settles. The race against the head meeting stone was the thin part: with the original 3 m alcove and the door 1.1 m below its far face, an armed fall completed as little as 0.042 s (5 steps at 1/120 s) before the same fall with the door shut crashed, and fast keyboard entries clipped the mouth with all three apples (19 of 49 release times). The alcove is now 2.7 m deep with the door 1.3 m down, the deepest that keeps the door drawn on the far face rather than a side wall. The minimum margin is now 0.175 s and no keyboard release crashes armed. Completion is still a mid-fall event, so a rider never sees the bike come to rest at the door.
- **One release grazes the aphelion and falls back out.** Letting go of the turn key at 8.9 s takes the aphelion in the mouth but drops the bike back onto the roof, alive, with the door armed. That rider can ride round and fall in again; it is not a dead end, but the apple counter then reads three before the rider is through.
- **The exit window is short for keyboard riders.** Without braking, letting go of the turn key works over about 0.7 s of the second climb. Pressing the brake hard on the roof at speed tumbles the rider. The hint now says to stop turning on the climb and roll in gently, not to brake.
- **Simulation only.** Human timing on a physical phone, and the feel of the exit window with tilt input, are unmeasured, as for every map.
