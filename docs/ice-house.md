# The Ice House

*Without friction, only gravity steers.*

Campaign map 11 (index 10), difficulty 8.5, between The Contrary Conservatory (8) and The Gravity Engine (9). Palette: blue. Code: `src/levels/ice-house.ts`. Tests: `tests/ice-house.test.ts`.

## Mechanic: ice and a soft brake

The map uses only existing schema fields. No physics change was needed.

- **Ice.** Every ridden run except the mats is authored with `friction: ICE_FRICTION` (.1). Physics combines an authored stone friction with the tyres' 1.5 using the `Min` rule, so the contact really is .1.
- **Soft brake.** `brakeScale: .4`. A locked wheel on ice can only scrub about .1 g, so a braked bike slides on any ice slope steeper than about 6°. On a mat (default friction 1.1) the soft pad still holds a parked bike with the world turned up to about .7 rad (measured: under 5 cm of creep at .7, a backward somersault at .85). On ice the brake scale makes no difference: the grip, not the pad, is the limit.
- **Gold mats.** These are the only places a braked bike stays put: six level runs with default friction and `kind: 'cradle'`. The gold stripe is signage only and has no physics of its own. The mats are rest stops, not a requirement. Tilt alone can hold the bike still on any slope (turn the world until the slope is level), and the demonstration pilot completes a twin with every mat polished to ice. In this physics a stop the brake alone can provide is needed only where the world must turn faster than the bike can follow, and 2–5 m fillets never ask for that.
- **Tilt is the throttle.** With almost no grip, a bike on a slope accelerates at about g·sin(world angle − slope), whatever the brake does. Speed is set by matching the world tilt to the slope: lean a little past it to speed up, hold a little short of it to slow down. The hint says this directly: brakes are weak on ice, tilt is your throttle.
- **Vaults.** Low ice vaults hang over every crest and lip, with 2.6 m clearance along the face normal (2.4 m over the roller). A rider who reaches a crest too fast leaves the ice and hits the vault with the helmet. With the 2.4 m minimum the helmet has about .65 m of air, so this only bites well above 5 m/s (measured: a speed-holding pilot survives every crest at 6 m/s and crashes at 7–8). The real speed check is the slide's last kicker: a bike that reaches it far too fast is thrown off and lands nose-first on the door mat. There are no `kind: 'hazard'` surfaces anywhere; the map tests control, not traps.

## Route

The whole ridden floor is one chain (`ice-house`), built from a corner list (`ICE_CORNERS`). Each corner is rounded with a sampled fillet of radius 2–5 m, at most 5° per segment. The straight run that leaves a corner marked `mat` becomes a mat. Mats and ice are boxes of the same chain, so an ice/mat seam is handled like any other. No two neighbouring runs are collinear (a fillet's last chord meets the straight run at up to 2.5°), so the chain buries every valley seam. Convex seams (the crests, the mid-slide lip and the 1.9° run-out past the door) meet flush and are not buried.

| Section | Geometry |
| --- | --- |
| Spawn mat | y 0, x −4.5 to about 6, with the back wall at −4.8. |
| Shelf 1 | A 40° ice face, 3 m tall (r 3 toe, r 3 crest), under vault 1. Then an ice shelf tilted 8° back down into a level mat at y 2.2. One apple low over the shelf, just past the crest. |
| Shelf 2 | The same shape again: face, crest, apple, and a mat at y 4.4. |
| Shelf 3 | The same shape again: face, crest, apple, and a mat at y 6.6. |
| Roof | A slick 12° gable (r 5) up to a ridge at y 8, then a 9.5° fall to the slide head. One long vault covers it, and one apple sits on the ridge. |
| Slide | 24° down into an ice roller: a 30° kicker (r 2.5 / r 2) under a 2.4 m vault, with an apple on its rise. Then 40° off the roller's back onto the mid-slide mat (y 3). Over its lip (r 4, vaulted, with an apple just past it), 30° down for 7.5 m into a second kicker (26° up, r 2.5 / r 2, vaulted, with an apple on its crest), then 46° off its back onto the door mat (y −2.2). A second HOLD BACK sign stands over this slide. |
| Door and kicker | The door is at (88.2, −1.4) on the floor mat. Past it, a 2° ice run-out leads to a 37° kicker against the end wall, with the last apple on it. Ride up, collect it, and roll back onto the door mat. |

There are eight apples. Each hangs .55 m off the ice face, so a rider who stays on the ice collects it. The kicker apple is the only one that needs a reversal, so a fixed tilt cannot finish the map.

## Rocking up the shelves

Each face is 40°, so the world has to swing well forward (≈ .5–.6 rad) to keep the bike climbing. It then has to swing back to about −.1 as the bike crests onto the back-tilted shelf; otherwise the shelf becomes a steep downhill and the bike arrives at the next face far too fast. That rock forward and back, three times over, is the climb. The keyboard rate (.95 rad/s) is enough because the crests are taken slowly (about 1.3 m/s on a 3 m radius, ≈ .45 rad/s of heading change).

This is not pendulum pumping. Turning the world .7 rad makes a 40° face level, so the bike simply rolls up it; friction plays no part while the wheels roll freely. Ice changes only what the brake can do.

## Demonstration pilot

`createIceHousePilot()` (replay index 10) uses observation only and works at any step size. It holds an along-track speed using tilt:

`target = heading ahead + clamp((cruise − v) · .25, ±.35)`

- The look-ahead is ½ s of travel.
- Cruise is 2.2 m/s, dropping to 1.3 m/s within 2.2 m of any crest or lip (both kickers included) and to 1 m/s on the end kicker.
- It brakes only on a mat, and only when it is .4 m/s over its cruise speed.
- After the kicker apple it cruises home at up to −1.5 m/s, easing to −.3 m/s as it reaches the door.

It completes at 1/120 s and 1/60 s steps in about 75 s and 108 m. The world angle stays inside ±1 rad: it peaks at about .6 on the faces and drops to about −.66 on the slide. It also completes at 90 and 144 Hz, from spawns moved ±.4 m, with its tilt scaled by .9 or 1.1, with ±.3 random tilt noise, and with its observations delayed by up to .3 s.

## Tests (`tests/ice-house.test.ts`)

- **Placement.** The map sits between contrary-conservatory and gravity-engine at difficulty 8.5. The hint names weak brakes and tilt as throttle.
- **Materials.** Every non-mat run is .08–.15 friction. All six mats are level, default-friction `cradle` runs. Brake scale is .4, there are no hazards, and fillets are 2–6 m. There are three 40° faces, mats sit at 0 / 2.2 / 4.4 / 6.6, vault headroom is ≥ 2.4 m, and every apple is low.
- **Positive.** The replay table's pilot (120 Hz) and the map pilot (60 Hz) both collect every apple and reach the door. The tests also check that the bike climbed above y 8.4, went at least 6 m past the door, and rocked the world both ways.
- **Negative.** An idle rider never moves. Held tilts of .2, .3 and .5 never complete; .5 is thrown off the second shelf's crest.
- **Counterfactual 1: friction is what stops you.** Brake held, world turned to .25 and to .6 rad, starting on the spawn mat: the bike creeps less than .2 m. On an all-ice twin (mats polished too) it slides more than 5 m, and still does with a full-strength brake (`brakeScale: 1`). The grip is in the mat, not the pad.
- **Counterfactual 2: the ice gates the grippy-map habit.** A "brake rider" leans .35 rad into the slope and brakes whenever it is over the cruise speed. On a grippy twin (default friction, `brakeScale: 1`) it rides the whole route and stays under 3 m/s. On the Ice House the same inputs run away down the slide and crash. The tilt-throttle pilot still completes the all-ice twin: the mats are where a *player* can safely stop and rethink. The demonstrated route does not need them.
- **Counterfactual 3: the slide needs the world tilted back.** A gentler habit rider leans only .15 rad into climbs, never turns the world back past level, and brakes whenever it is too fast. It completes the grippy twin. On the Ice House it collects the last slide apple, is thrown off the door kicker and crashes before reaching the door. The same rider allowed to tilt back .2 rad on descents completes. Without the 30° final slide and its kicker (the first layout), this rider completed the Ice House too.

## Residuals / known issues

Recorded by the second audit cycle (final). Measurements are from Rapier probes run against commit 4a4e729.

- **Difficulty is probably over-rated at 8.5; about 7.5–8 fits better.** The rating and slot were left alone because the campaign order is coordinated across branches. The maintainer can re-rate after merge. Evidence:
  - Careful tilt play has wide margins. The pilot completes at 60/120/144 Hz, from spawns moved ±.4 m, and with ±.3 random tilt noise (four seeds). A keyboard-only model (tilt only −1, 0 or +1) completes with a .2 s reaction delay even when it holds twice the pilot's cruise speed (peaks of 7.5–7.9 m/s).
  - Six rest stops and the absence of hazards keep the cost of a mistake low.
  - Two things argue against going as low as 7. First, the kicker on the final slide now really punishes a rider who keeps the world level and brakes. Second, the map is sensitive to reaction time. The same keyboard model crashes in 5 of 6 runs at a .35 s delay and in all runs at .5 s. Most of those crashes come from overshooting a shelf face or a crest.
  - A cross-map check wrapped each replay pilot in .1–.4 s of input delay and ±.3–.9 tilt noise. It did not separate the Ice House from its neighbours: the Conservatory (8), the Ice House and the Gravity Engine (9) all completed every case. That check therefore says nothing for or against 8.5.
- **The tilt-back lesson is narrow.** A rider who keeps the world level and brakes (`brakeRider(lean, 0)`) crashes past the final kicker in 13 of 15 combinations of lean (.05–.25) and rate (60/120/144 Hz). The two that survive are lean .1 at 60 Hz and at 144 Hz. Tilting the world back only .1 rad on the descents is enough to complete with almost every lean. So the map enforces "tilt back a little", not "tilt back a lot". The unit test uses lean .15, which crashes at all three rates.
- **Mats are rest stops, not requirements.** The tilt-throttle pilot completes an all-ice twin. The mats only matter to a player who wants to stop and think, and the brake's weakness on ice is taught by speed, not by a forced stop.
- **The vault speed check is soft.** At the 2.4 m roller vault the helmet has about .65 m of air, so a vault bites only well above 5 m/s. The keyboard model completed at speed peaks of 7.9 m/s, so vault strikes in practice need a large overshoot.
- **Feel on a phone is unverified.** The route was tuned for the keyboard rate (.95 rad/s). Motion-tilt latency and the progressive tilt curve have not been tried on hardware, and the latency sensitivity above suggests that a phone may feel harder than the keyboard.
- **Hints were checked in a rendered browser at 1280×800 only.** Screenshots were taken while the pilot rode past x 44, 49, 60, 72 and 80. Every hint is readable when it is needed. EASE (y 11.6, above the roof vault) comes into view from about x 44, but it sits right at the top edge, touching the header bar. On a short landscape phone (about 390 px tall) it may be off-screen or under the header. Narrow and portrait viewports were not checked.
- **Thin light slivers show at fillet seams.** The rendered floor shows thin light slivers between the sampled fillet slabs, most visibly in the valleys. The collision chain is seamless (worst top-face gap 3e-14 m). This is cosmetic and comes from how the renderer draws box chains, not from the physics.
- **The shelves are a staircase, not a switchback.** The shelves stack as a rising staircase of three tilted shelves. A true switchback stack, with shelves overhanging each other, would need a jump or a gravity U-turn in 2D. That was left to the Escher-type maps.
- **The README map line is stale (pre-existing).** The README still says "Map 15 — Stairway to Heaven". The Stairway is now campaign map 23 (index 22). The README also does not list the later inserted maps (Huygens' Return, Piston Works, Hooke's Springboard, The Ice House). This was left for a separate README pass.
