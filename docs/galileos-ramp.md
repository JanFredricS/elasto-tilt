# Galileo’s Ramp

Campaign map 3 (index 2), difficulty 1.5, between Newton’s Orchard and One Wheel Wonder. Code: `src/levels/galileos-ramp.ts`. Tests: `tests/galileos-ramp.test.ts`. Palette: jade (the `paletteFor` default).

*All bodies fall alike.* A gentle, hazard-free beginner map that introduces spring pads long before Hooke’s Springboard.

## Mechanic: soft spring pads

Each pad is a `kind: 'spring'` surface with `restitution: .5` (`GALILEO_RESTITUTION`). This is the first campaign map to author a restitution; the Springboard uses the default `SPRING_RESTITUTION = .9`. The pad law is unchanged: on a fresh wheel contact faster than 1.2 m/s along the pad normal, the whole rig leaves with `v − (1+e)(v·n)n` and keeps its spin. At e = .5 the pad hands back half the normal speed: a short, low toss, not a launch.

Each pad is a **kicker**: it rises 18° from the foot of a 22° slide to the next terrace. The rider arrives at about 6 m/s, pitched at the slide’s angle and not spinning, because riding straight down a slide adds no spin. The kicker’s normal is 40° from the slide, so a large part of that speed is normal to it. The pad tosses the pilot up and on at about (3.9, 3.3) m/s. The bike lands still pitched at the slide’s angle (−.36 rad), nose first, and rocks back onto both wheels within about .1 s.

**Why not a drop onto a flat pad.** Measured in development: leaving any lip, even a sag that curls 4° past level, sets the bike spinning nose-down at about 2 rad/s. The pad keeps that spin, so after one or two bounces the bike turns over. A slide straight into the pad gives a spin-free toss.

**Why 22° and not steeper.** The first build used 35° slides into 10° kickers. The pilot levels the world on every incline and completed, but a beginner who simply holds a small tilt crashed. With the world held at .1 rad or more, the steeper nose-first landing (−.6 rad) pitched over the front wheel, or a faster toss overshot the 7 m terrace onto the next knee. With 22° slides, 8 m terraces, a 20 m gallery landing and a 9 m tall 55° catcher, a world held anywhere from .02 to .30 rad down the hill completes, with one narrow exception near .22 rad (see Residuals).

## Route

| Section | Geometry |
| --- | --- |
| Terrace 1 | Top 0, x −4…3, back wall at −4.3, spawn (0, .72), road apple at (2, .9). The hillside stone continues west to x −7, so the gallery is roofed all the way to its back wall. |
| Stage (×3) | A 3 m incline at 5°, a knee (radius 2) into a 22° slide 2.5 m below the terrace, and a 1.2 m brass kicker rising 18° to the next terrace. Incline, knee and slide share one chain id (an all-convex run, so it collides as one hull). |
| Terraces 2, 3 | 8 m each, at the kicker tops (−2.13, −4.26). |
| Toss apples | .3 m past each kicker’s top end, 2.1 m above it. A rider who levels the world on the slides and rolls over a stone kicker does not reach them (the counterfactual test). A faster rider can (see Residuals). |
| Gallery drop | Pad 3 sits at the hillside’s edge (x 48.7). Its toss carries the rider out over the gallery, where they fall about 4.4 m onto the gallery floor (y −11), still nose-first, and rock back. |
| Gallery | Runs right 20 m past the hillside to the catcher: a radius-4 bend up to 55°, then a straight 55° run-up to y −2 (9 m above the floor) and an end wall. The long landing and tall catcher are for the over-tilted rider, who leaves pad 3 at up to 12 m/s: on the cycle-1 layout (14 m, 6 m tall) such a rider landed on the catcher’s bend or flew off its top. It never reaches vertical, so tilting left while high on it keeps the rider on its face. The gallery then runs back left beneath the whole hillside (roof −8.2, 2.8 m of headroom). A gallery apple waits under terrace 2. The door is at (.5, −10.2), directly below the spawn. HOME arrows stand before the catcher and under terrace 3. |

`brakeScale` is .1. The brake is never needed here. At this strength, a rider who brakes down a slide slows without pitching over the bars. Braking in the air is different: it locks the spinning wheels to the frame, which tips the nose down before landing. On the 4.4 m gallery fall, holding the brake for .2 s or more early in the fall crashes. A brief tap, or a brake applied at the landing, does not. The hint says “Never brake in the air”.

A missed toss apple cannot be re-attempted by riding back, because the slides cannot be climbed. The hint ends “Missed an apple? Press ↺ to restart the room.” The ↺ is the HUD’s restart button (also the R key), and the pause card, where the hint is shown, labels the same action RESTART ROOM. A rider misses a toss apple only by reaching its pad too slowly to be tossed well, which takes steady braking down the slide. A rider stopped dead at a pad’s foot climbs the brass onto the next terrace by tilting the world right.

## Demonstration and tests

`createGalileoPilot(cruise = 2)` uses observation only. On terraces it holds the cruise speed. From each incline it keeps the world level and lets the slide and the pad do the work, never braking. After the gallery drop it rolls to the catcher, then tilts left (at most .35 rad) and rolls home into the door. It completes with all 5 apples in about 46 s over about 141 m. Peak speed is 10.2 m/s, just after the gallery drop.

Tests:

- **Placement.** Index between Newton’s Orchard and One Wheel Wonder, difficulty 1.5, no hazards. Three pads, each with restitution .5, below the default. `brakeScale` .1, and the hint warns against braking in the air and names the restart button.
- **Geometry.** Gallery headroom ≥ 2.4 m, door within 2 m of the spawn x and under the roof, each terrace at least 2 m below the last, and every angled ground slab chained. The catcher is no steeper than 55°, the west roof is present, the landing is at least 20 m and the catcher at least 9 m tall, and every surface lies inside the bounds.
- **Positive.** The pilot completes with every apple, at least three tosses and zero brake steps. It also completes through the campaign replay table at its own index.
- **Forgiving.** Cruises of 1.4, 2.6 and 3.2 m/s also complete. A rider who holds the world at .05, .12, .2, .26, .28 or .3 rad down the hill, then .15 or .4 rad home, completes with every apple. A rider who brakes down every slide (world held at .1 or .2) completes. Stopped dead at the foot of each slide, tilting right to .45 rad climbs onto the next terrace.
- **Negative.** Idle, tilt +1, tilt −1, the world held at .3 rad, and the world held at .3 rad with brake held never complete.
- **Counterfactual.** With every pad turned into stone (same geometry), the same pilot at cruises of 2, 3.2 and 5 m/s makes no toss and collects no toss apple. Without the toss, rolling off the bare kicker at the hillside’s edge also pitches the bike nose-over into the gallery.
- **Brake through the toss.** Braking from 30 ms before the first toss to 80 ms after it is ignored (the pad’s .12 s cooldown), and the ride completes.
- **Hint honesty.** Holding the brake for .5 s early in the gallery fall crashes. A .1 s tap, or a brake from 1 s after the toss (the landing), still completes.

## Residuals / known issues

Measured in the second audit with the `holder` rider from the tests (world held at a fixed lean down the hill, then tilted home 1 s after the gallery drop), on a .01 rad grid from .02 to .34.

- **Lean ceiling.** Completes for every held lean from .02 to .30 rad except .22, and fails at .31 and .32. Before this audit (14 m landing, 6 m catcher) it failed at .22, .25, .26 and .30, and at every lean from .38 up. Two failure modes were geometric and are fixed: landing straight onto the catcher’s bend, and running off the top of a 6 m catcher at 11 m/s. The remaining ones are not. At .22 the rider leaves pad 3 already spinning nose-down and lands at about −1.2 rad, which pitches over on any floor. At .31 or more the toss reaches the catcher’s bend again. Verdict: acceptable for difficulty 1.5. Newton’s Orchard (1) also crashes a rider who holds .35 throughout, and .30 rad is 17°, about a third of a second of held arrow key. Pushing the ceiling to .35 would need a longer gallery still (L = 22 and 24 m were tried and broke the envelope elsewhere by over-running the catcher) or a different gallery entry.
- **Air brake.** Holding the brake for .2 s or more early in the 4.4 m gallery fall still crashes. It is kept on purpose: this is the map that teaches “never brake in the air”, and the hint says so. The fall cannot be shortened much anyway: the gallery needs about 2.8 m of headroom under stage 3’s stone, so the floor can rise by at most about .4 m. A .1 s panic tap, or braking from the landing on, completes.
- **Length.** About 46 s and 141 m for the pilot, against Newton’s Orchard (difficulty 1) at about 45 s. That is long for the map between Orchard and One Wheel Wonder, but most of it is free rolling. The 1.5 rating is unchanged (coordinated across branches). Human playtesting should confirm it.
- **Stone counterfactual is speed-limited.** The brass is necessary only at the speed of a rider who levels the world on the slides (about 6 m/s at the foot). On bare stone, a rider who holds .1 to .4 rad down the hill reaches two or three toss apples off the kickers alone, and a stone ride still crashes before the door. So the test proves the pads are the demonstrated solution, not the only way to the apples.
- **Toss spin is sensitive to approach.** The pad keeps the rider’s spin. Small changes in the approach (the .22 case above) can leave a pad with enough nose-down spin to land badly. No layout fix was found that removes this without retuning all three stages.
- **Hollow under the slides.** The stone fill under each stage stops .55 m below the slide’s foot, so the overview shows a light triangular void under each knee and slide. It is sealed and unreachable, so it is cosmetic only.
- **Phone feel untested.** All envelopes are Rapier replays with keyboard-style tilt. Direct-mode phone steering, the low-confidence lag and real reaction times have not been tried on hardware.
