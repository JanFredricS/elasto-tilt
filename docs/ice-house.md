# The Ice House

*Without friction, only gravity steers.*

Campaign map 11 (index 10), difficulty 8.5, between The Contrary Conservatory (8) and The Gravity Engine (9). Palette: blue. Code: `src/levels/ice-house.ts`. Tests: `tests/ice-house.test.ts`.

## Mechanic: ice and a soft brake

The map uses only existing schema fields. No physics change was needed.

- **Ice.** Every ridden run except the mats is authored with `friction: ICE_FRICTION` (.1). Physics combines an authored stone friction with the tyres' 1.5 using the `Min` rule, so the contact really is .1.
- **Soft brake.** `brakeScale: .4`. A locked wheel on ice can only scrub about .1 g. On a mat (default friction 1.1) the soft pad still holds a parked bike with the world tilted .25 rad.
- **Gold mats.** These are the only stopping points: six level runs with default friction and `kind: 'cradle'`. The gold stripe is signage only and has no physics of its own.
- **Tilt is the throttle.** With almost no grip, a bike on a slope accelerates at about g·sin(world angle − slope), whatever the brake does. Speed is set by matching the world tilt to the slope: lean a little past it to speed up, hold a little short of it to slow down. The hint says this directly: brakes are weak on ice, tilt is your throttle.
- **Vaults.** Low ice vaults hang over every crest and lip, with 2.6 m clearance along the face normal (2.4 m over the roller). A rider who reaches a crest too fast leaves the ice, rises, and hits the vault with the helmet. There are no `kind: 'hazard'` surfaces anywhere; the map tests control, not traps.

## Route

The whole ridden floor is one chain (`ice-house`), built from a corner list (`ICE_CORNERS`). Each corner is rounded with a sampled fillet of radius 2–5 m, at most 5° per segment. The straight run that leaves a corner marked `mat` becomes a mat. Every mat lies between valley (concave) joints or at an end of the chain, so no ice/mat seam is a collinear joint that could bump a wheel.

| Section | Geometry |
| --- | --- |
| Spawn mat | y 0, x −4.5 to about 6, with the back wall at −4.8. |
| Shelf 1 | A 40° ice face, 3 m tall (r 3 toe, r 3 crest), under vault 1. Then an ice shelf tilted 8° back down into a level mat at y 2.2. One apple low over the shelf, just past the crest. |
| Shelf 2 | The same shape again: face, crest, apple, and a mat at y 4.4. |
| Shelf 3 | The same shape again: face, crest, apple, and a mat at y 6.6. |
| Roof | A slick 12° gable (r 5) up to a ridge at y 8, then a 9.5° fall to the slide head. One long vault covers it, and one apple sits on the ridge. |
| Slide | 24° down into an ice roller: a 30° kicker (r 2.5 / r 2) under a 2.4 m vault, with an apple on its rise. Then 40° off the roller's back onto the mid-slide mat (y 3). Over its lip (r 4, vaulted, with an apple just past it), 22° down to the door mat (y −1). |
| Door and kicker | The door is at (85.2, −.2) on the floor mat. Past it, a 2° ice run-out leads to a 37° kicker against the end wall, with the last apple on it. Ride up, collect it, and roll back onto the door mat. |

There are seven apples. Each hangs .55 m off the ice face, so a rider who stays on the ice collects it. The kicker apple is the only one that needs a reversal, so a fixed tilt cannot finish the map.

## Rocking up the shelves

Each face is 40°, so the world has to swing well forward (≈ .5–.6 rad) to keep the bike climbing. It then has to swing back to about −.1 as the bike crests onto the back-tilted shelf; otherwise the shelf becomes a steep downhill and the bike arrives at the next face far too fast. That rock forward and back, three times over, is the climb. The keyboard rate (.95 rad/s) is enough because the crests are taken slowly (about 1.3 m/s on a 3 m radius, ≈ .45 rad/s of heading change).

## Demonstration pilot

`createIceHousePilot()` (replay index 10) uses observation only and works at any step size. It holds an along-track speed using tilt:

`target = heading ahead + clamp((cruise − v) · .25, ±.35)`

- The look-ahead is ½ s of travel.
- Cruise is 2.2 m/s, dropping to 1.3 m/s within 2.2 m of any crest or lip and to 1 m/s on the kicker.
- It brakes only on a mat, and only when it is .4 m/s over its cruise speed.
- After the kicker apple it cruises home at up to −1.5 m/s, easing to −.3 m/s as it reaches the door.

It completes at 1/120 s and 1/60 s steps in about 68 s and roughly 110 m. The world angle stays inside ±1 rad: it peaks above .45 on the faces and drops below −.35 on the slide.

## Tests (`tests/ice-house.test.ts`)

- **Placement.** The map sits between contrary-conservatory and gravity-engine at difficulty 8.5. The hint names weak brakes and tilt as throttle.
- **Materials.** Every non-mat run is .08–.15 friction. All six mats are level, default-friction `cradle` runs. Brake scale is .4, there are no hazards, and fillets are 2–6 m. There are three 40° faces, mats sit at 0 / 2.2 / 4.4 / 6.6, vault headroom is ≥ 2.4 m, and every apple is low.
- **Positive.** The replay table's pilot (120 Hz) and the map pilot (60 Hz) both collect every apple and reach the door. The tests also check that the bike climbed above y 8.4, went at least 6 m past the door, and rocked the world both ways.
- **Negative.** An idle rider never moves. Held tilts of .2, .3 and .5 never complete; .5 crashes into a vault.
- **Counterfactual 1: friction is what stops you.** Brake held, world turned to .25 rad, starting on the spawn mat: the bike creeps less than .2 m. On an all-ice twin (mats polished too) it slides more than 1.5 m, and still does with a full-strength brake (`brakeScale: 1`). The grip is in the mat, not the pad.
- **Counterfactual 2: the ice gates the grippy-map habit.** A "brake rider" leans .35 rad into the slope and brakes whenever it is over the cruise speed. On a grippy twin (default friction, `brakeScale: 1`) it rides the whole route and stays under 3 m/s. On the Ice House the same inputs run away down the slide and crash into the roller's vault. The tilt-throttle pilot still completes the all-ice twin: the mats are where a *player* can safely stop and rethink. The demonstrated route does not need them.

## Residuals

- In-browser and phone feel are unverified beyond one rendered overview check. The route was tuned for the keyboard rate.
- The shelves stack as a rising staircase of three tilted shelves. A true switchback stack (shelves overhanging each other) would need a jump or a gravity U-turn in 2D. That was left to the Escher-type maps.
