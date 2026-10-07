# Hooke’s Springboard

Campaign map 19 (index 18), difficulty 14.5, between The Hidden Way Home and Stairway to Heaven. Code: `src/levels/springboard.ts`. Tests: `tests/springboard.test.ts`.

## Mechanic: spring pads (`kind: 'spring'`)

A surface with `kind: 'spring'` is a brass pad. It has an optional `restitution`, which defaults to `SPRING_RESTITUTION = .9`.

**What happens on a landing.** After the physics step, the game checks for a new wheel contact with a pad. If the rig approached faster than `SPRING_MIN_SPEED` (1.2 m/s) along the pad normal:

- the whole rig (frame and both wheels) leaves with `v − (1+e)(v·n)n`;
- the frame keeps its pre-impact spin;
- a .12 s re-arm guard prevents double triggers;
- the brake is ignored for that same .12 s (fix pass 2): a rider still holding it as the pad throws them leaves with free wheels, not wheels locked to the frame. The hint adds: don't brake on the pads or in the air, because locked wheels pitch you over on landing.

**Why it is not Rapier restitution.** Rapier restitution acts on the tyres alone. Each wheel bounces separately, which cartwheels the rider. The uniform reflection keeps a level landing level.

**How high it bounces.** A straight 4 m drop rebounds to about e²h. The test checks the first apex is above .8·e²·h and below h, with pitch staying under .1 rad.

Slower contacts behave as ordinary ground, so a dying bounce settles. The renderer draws pads as a brass plate over a row of coils.

## Route

| Section | Geometry |
| --- | --- |
| Plateau | y = 0 to x = 6; one apple. A knee (radius 1.5) rounds it into a 50° slide down to pad 1 (y −5, foot of the slide to x 15). |
| Pit 1 | Spikes x 15…19 (4 m); an apple in the air at (17, −1.2). |
| Ledge 1 | Top −3.5, x 19…34 (15 m: room to land a long throw and scrub the speed); one apple. The same knee and slide lead down to pad 2 (y −8.5, to x 43). |
| Pit 2 | Spikes x 43…49 (6 m, as before); an apple in the air at (45, −4.9). |
| Door ledge | Top −7, x 49…59, door at (54, −6.2). It ends in a catching quarter-pipe and wall. |

**Why the pits are entered by a slide.** A square edge this deep pivots the bike nose-over. Measured flight spin off any edge or kicker was 2–4.5 rad/s, nose down. Riding straight down a slide adds no spin. The rider meets the pad at the slide's own 50° pitch, is thrown at about (6.4, 6.8) m/s, and rocks back onto both wheels on landing.

**Why the lean matters.** With the world level, the throw comes down at x ≈ 17.6, in the spikes. Leaning gravity forward (gravity = g·(sin a, −cos a)) carries it over. The lean must start on the slide, because the world turns at most .95 rad/s. The landing on ledge 1 is fast (up to about 13 m/s). The rider must lean the world back and feather the brake before the second slide, because a hard brake at speed pitches the rider over the bars.

## Demonstration and tests

**Demonstration.** `createSpringboardPilot(lean = .6, cruise = 2.5, secondLean = lean)` observes the snapshot only and outputs tilt and brake. It completes with all 4 apples in about 11.5 s over about 59 m.

Fix pass 1 (review item M5) made the first jump the forgiving one that teaches the move: pit 1 narrowed from 5 to 4 m and ledge 1 grew to 15 m. Pit 2 keeps its 6 m gap, so the second jump stays tight. Measured with the other pit's lean held at .6 / .55:

| Lean (rad) | First jump | Second jump |
| --- | --- | --- |
| 0, .3 | Crashes in pit 1 | — |
| .35 … .8 | Lands on ledge 1 (x ≈ 20 … 26); completes | .35, .45: falls into pit 2 |
| ≥ .5 | — | Completes |

**Tests.**

- Campaign placement and difficulty ordering.
- The pad rebound law.
- A full completion with two pad throws and a lean above .45 rad.
- Lean 0 and .3 crash before ledge 1.
- The first jump tolerates leans of .35, .45, .55, .65, .7 and .8 (each lands on ledge 1 and completes).
- The second jump stays tighter: .35 and .45 fall into pit 2.
- Fixed tilt −1, 0 and +1 never complete.
- A level-world rider never reaches ledge 1.
- Brake pressed 20 ms before the first throw and held 100 ms into the air is ignored: the ride completes at the same time as a clean run.

## Known limits

- **Not on a real phone.** The route has not been tuned on a real phone; the margins come from the pilot only.
- **Sensitivity.** The second jump is sensitive to lean timing, which is intended at difficulty 14.5; the first is deliberately generous.
- **Braking around the pads.** Only the .12 s throw window ignores the brake. Braking down the slide before the pad (it slows the throw and stops the wheels spinning) or holding it on into the flight still crashes on ledge 1.
- **The catching quarter-pipe has no tuning of its own.** It is only there to stop a rider who reaches the door with an apple missing.
