# Galileo’s Ramp

Campaign map 3 (index 2), difficulty 1.5, between Newton’s Orchard and One Wheel Wonder. Code: `src/levels/galileos-ramp.ts`. Tests: `tests/galileos-ramp.test.ts`. Palette: jade (the `paletteFor` default).

*All bodies fall alike.* A gentle, crash-free beginner map that introduces spring pads long before Hooke’s Springboard. It has no hazards anywhere.

## Mechanic: soft spring pads

Each pad is a `kind: 'spring'` surface with `restitution: .5` (`GALILEO_RESTITUTION`). This is the first campaign map to author a restitution; the Springboard uses the default `SPRING_RESTITUTION = .9`. The pad law is unchanged: on a fresh wheel contact faster than 1.2 m/s along the pad normal, the whole rig leaves with `v − (1+e)(v·n)n` and keeps its spin. At e = .5 the pad hands back half the normal speed: a short, low toss, not a launch.

Each pad is a **kicker**: it rises 10° from the foot of a 35° slide to the next terrace. The rider arrives at about 5–6 m/s, pitched at the slide’s angle and not spinning, because riding straight down a slide adds no spin. The kicker’s normal is 45° from the slide, so most of that speed is normal to it. The pad tosses the rider up and on at about (3.8, 2.7) m/s. The bike lands still pitched at the slide’s angle (−.6 rad), nose first, and rocks back onto both wheels within about .2 s.

**Why not a drop onto a flat pad.** Measured in development: leaving any lip, even a sag that curls 4° past level, sets the bike spinning nose-down at about 2 rad/s. The pad keeps that spin, so after one or two bounces the bike turns over. A slide straight into the pad gives a spin-free toss.

## Route

| Section | Geometry |
| --- | --- |
| Terrace 1 | Top 0, x −4…3, back wall at −4.3, spawn (0, .72), road apple at (2, .9). |
| Stage (×3) | A 3 m incline at 5°, a knee (radius 2) into a 35° slide 2.5 m below the terrace, and a 1.2 m brass kicker rising 10° to the next terrace. Incline, knee and slide share one chain id (an all-convex run, so it collides as one hull). |
| Terraces 2, 3 | 7 m each, at the kicker tops (−2.29, −4.58). |
| Toss apples | .3 m past each kicker’s top end, 2.1 m above it. The toss lifts the helmet to about 1.76 m above the kicker top; a rider rolling on the terrace reaches only 1.39, out of the apple’s .61 m reach. |
| Gallery drop | Pad 3 sits at the hillside’s edge (x 40.5). Its toss carries the rider out over the gallery, where they fall about 4 m onto the gallery floor (y −11), still nose-first, and rock back. |
| Gallery | Runs right to a quarter-pipe (radius 3) and an end wall, then back left beneath the whole hillside (roof −8.2, 2.8 m of headroom). A gallery apple waits under terrace 2; the door is at (.5, −10.2), directly below the spawn. |

`brakeScale` is .6. The hint teaches “Don’t brake on the brass”: the brake does nothing for .12 s after a toss, but a rider who holds it into the nose-first landing goes over the bars.

## Demonstration and tests

`createGalileoPilot(cruise = 2)` uses observation only. On terraces it holds the cruise speed. From each incline it keeps the world level and lets the slide and the pad do the work, never braking. After the gallery drop it rides up the quarter-pipe, then tilts left (at most .35 rad) and rolls home into the door. It completes with all 5 apples in about 35 s over about 105 m. Peak speed is 9.7 m/s, during the gallery drop.

Tests:

- **Placement.** Index between Newton’s Orchard and One Wheel Wonder, difficulty 1.5, no hazards. Three pads, each with restitution .5, below the default. `brakeScale` .6, and the hint warns against braking on the brass.
- **Geometry.** Gallery headroom ≥ 2.4 m, door within 2 m of the spawn x and under the roof, each terrace at least 2 m below the last, and every angled ground slab chained.
- **Positive.** The pilot completes with every apple, at least three tosses and zero brake steps. It also completes through the campaign replay table at its own index.
- **Forgiving.** Cruises of 1.4, 2.6 and 3.2 m/s also complete. No precise aim is needed.
- **Negative.** Idle, tilt +1, tilt −1, the world held at .3 rad, and the world held at .3 rad with brake held never complete.
- **Counterfactual.** With every pad turned into stone (same geometry), the same pilot makes no toss and collects no toss apple. Without the toss, rolling off the bare kicker at the hillside’s edge also pitches the bike nose-over into the gallery.
- **Brake through the toss.** Braking from 30 ms before the first toss to 80 ms after it is ignored, and the ride completes.
