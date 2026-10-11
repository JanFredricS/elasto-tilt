# Galileo’s Ramp

Campaign map 3 (index 2), difficulty 1.5, between Newton’s Orchard and One Wheel Wonder. Code: `src/levels/galileos-ramp.ts`. Tests: `tests/galileos-ramp.test.ts`. Palette: jade (the `paletteFor` default).

*All bodies fall alike.* A gentle, hazard-free beginner map that introduces spring pads long before Hooke’s Springboard.

## Mechanic: soft spring pads

Each pad is a `kind: 'spring'` surface with `restitution: .5` (`GALILEO_RESTITUTION`). This is the first campaign map to author a restitution; the Springboard uses the default `SPRING_RESTITUTION = .9`. The pad law is unchanged: on a fresh wheel contact faster than 1.2 m/s along the pad normal, the whole rig leaves with `v − (1+e)(v·n)n` and keeps its spin. At e = .5 the pad hands back half the normal speed: a short, low toss, not a launch.

Each pad is a **kicker**: it rises 18° from the foot of a 22° slide to the next terrace. The rider arrives at about 6 m/s, pitched at the slide’s angle and not spinning, because riding straight down a slide adds no spin. The kicker’s normal is 40° from the slide, so a large part of that speed is normal to it. The pad tosses the pilot up and on at about (3.9, 3.3) m/s. The bike lands still pitched at the slide’s angle (−.36 rad), nose first, and rocks back onto both wheels within about .1 s.

**Why not a drop onto a flat pad.** Measured in development: leaving any lip, even a sag that curls 4° past level, sets the bike spinning nose-down at about 2 rad/s. The pad keeps that spin, so after one or two bounces the bike turns over. A slide straight into the pad gives a spin-free toss.

**Why 22° and not steeper.** The first build used 35° slides into 10° kickers. The pilot levels the world on every incline and completed, but a beginner who simply holds a small tilt crashed. With the world held at .1 rad or more, the steeper nose-first landing (−.6 rad) pitched over the front wheel, or a faster toss overshot the 7 m terrace onto the next knee. With 22° slides, 8 m terraces, a 14 m gallery landing and a 55° catcher, a world held anywhere from .03 to .23 rad down the hill completes.

## Route

| Section | Geometry |
| --- | --- |
| Terrace 1 | Top 0, x −4…3, back wall at −4.3, spawn (0, .72), road apple at (2, .9). The hillside stone continues west to x −7, so the gallery is roofed all the way to its back wall. |
| Stage (×3) | A 3 m incline at 5°, a knee (radius 2) into a 22° slide 2.5 m below the terrace, and a 1.2 m brass kicker rising 18° to the next terrace. Incline, knee and slide share one chain id (an all-convex run, so it collides as one hull). |
| Terraces 2, 3 | 8 m each, at the kicker tops (−2.13, −4.26). |
| Toss apples | .3 m past each kicker’s top end, 2.1 m above it. A rider rolling over a stone kicker at the pilot’s speed does not reach them (the counterfactual test). |
| Gallery drop | Pad 3 sits at the hillside’s edge (x 48.7). Its toss carries the rider out over the gallery, where they fall about 4.4 m onto the gallery floor (y −11), still nose-first, and rock back. |
| Gallery | Runs right 14 m past the hillside to the catcher: a radius-4 bend up to 55°, then a straight 55° run-up to y −5 and an end wall. It never reaches vertical, so tilting left while high on it keeps the rider on its face. The gallery then runs back left beneath the whole hillside (roof −8.2, 2.8 m of headroom). A gallery apple waits under terrace 2. The door is at (.5, −10.2), directly below the spawn. HOME arrows stand before the catcher and under terrace 3. |

`brakeScale` is .1. The brake is never needed here. At this strength, a rider who brakes down a slide slows without pitching over the bars. Braking in the air is different: it locks the spinning wheels to the frame, which tips the nose down before landing. On the 4.4 m gallery fall, holding the brake for .2 s or more early in the fall crashes. A brief tap, or a brake applied at the landing, does not. The hint says “Never brake in the air”.

A missed toss apple cannot be re-attempted by riding back, because the slides cannot be climbed. The hint ends “Missed an apple? Press ↺ to try again.” A rider misses a toss apple only by reaching its pad too slowly to be tossed well, which takes steady braking down the slide. A rider stopped dead at a pad’s foot climbs the brass onto the next terrace by tilting the world right.

## Demonstration and tests

`createGalileoPilot(cruise = 2)` uses observation only. On terraces it holds the cruise speed. From each incline it keeps the world level and lets the slide and the pad do the work, never braking. After the gallery drop it rolls to the catcher, then tilts left (at most .35 rad) and rolls home into the door. It completes with all 5 apples in about 43 s over about 130 m. Peak speed is 10.2 m/s, just after the gallery drop.

Tests:

- **Placement.** Index between Newton’s Orchard and One Wheel Wonder, difficulty 1.5, no hazards. Three pads, each with restitution .5, below the default. `brakeScale` .1, and the hint warns against braking in the air and names the restart button.
- **Geometry.** Gallery headroom ≥ 2.4 m, door within 2 m of the spawn x and under the roof, each terrace at least 2 m below the last, and every angled ground slab chained. The catcher is no steeper than 55°, the west roof is present, and every surface lies inside the bounds.
- **Positive.** The pilot completes with every apple, at least three tosses and zero brake steps. It also completes through the campaign replay table at its own index.
- **Forgiving.** Cruises of 1.4, 2.6 and 3.2 m/s also complete. A rider who holds the world at .05, .12 or .2 rad down the hill, then .15 or .4 rad home, completes with every apple. A rider who brakes down every slide (world held at .1 or .2) completes. Stopped dead at the foot of each slide, tilting right to .45 rad climbs onto the next terrace.
- **Negative.** Idle, tilt +1, tilt −1, the world held at .3 rad, and the world held at .3 rad with brake held never complete.
- **Counterfactual.** With every pad turned into stone (same geometry), the same pilot makes no toss and collects no toss apple. Without the toss, rolling off the bare kicker at the hillside’s edge also pitches the bike nose-over into the gallery.
- **Brake through the toss.** Braking from 30 ms before the first toss to 80 ms after it is ignored (the pad’s .12 s cooldown), and the ride completes.
- **Hint honesty.** Holding the brake for .5 s early in the gallery fall crashes. A .1 s tap, or a brake from 1 s after the toss (the landing), still completes.
