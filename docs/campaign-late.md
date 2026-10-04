# Late campaign route verification

The final five saved IDs, names and order are preserved. Coordinates remain metres in the fixed map. Geometry uses rigid surfaces, ordinary/inverted gravity, a jointed swing and the existing reversible distance clock. There are no teleport shortcuts, artificial delays or automatic bike rotations.

| Map | Required route | Apples | Replay distance | Replay time |
| --- | --- | ---: | ---: | ---: |
| Newton’s Attic | Two ramps and the high ridge; reverse from the far pocket, pass the door to the left storage pocket, reverse again to finish | 6 | 102.4 m | 69.0 s |
| Escher’s Orchard | Lower gallery → east wall → roof → west wall → upper face of the entry ceiling → inner pocket → reverse to inner door | 8 | 110.8 m | 75.4 s |
| Contrary Conservatory | Lower greenhouse → end wall → roof orchard → far roof pocket → reverse while inverted | 7 | 101.6 m | 68.1 s |
| Gravity Engine | Compact hanging bridge → lower engine hall → rounded end wall → overhead gallery | 7 | 83.5 m | 55.7 s |
| Clockwork Apple | Long approach winds the lift upward; high apple on the lift; return unwinds the lift and reaches the original door | 5 | 74.5 m | 49.3 s |

These times are deterministic 120 Hz Rapier runs at a controlled target speed of 1.6 m/s, not minimum completion times. The controller observes the frame's tangent and speed and supplies normal keyboard tilt values. It does not reposition the bike, modify velocity, collect apples directly, rotate the body or alter the map.

## Escher's topology

The entry's overhead slab is also the floor of the final room. To reach its upper face, the rider must pass through four gravity orientations around a nested spiral, returning through the same horizontal region four metres higher. A continuous inner lining follows all four bends, keeping the ceiling visible while the world rotates. The outer roof is at 14 m; the entry slab underside is at 2.4 m and its upper terrace remains at 4 m. Apples on each outer face require the whole circuit; the inner pocket and reversed final leg make continually holding rotate insufficient. The west return joins the shared slab with a four-metre concave bend. The tunnel retains approximately 2.4 metres of clearance, including the bends. Escher alone uses a 10% wider riding camera and a small downward rider offset; the whole-map view remains independent of this framing.

## Mechanic evidence

`tests/campaign-late.test.ts` runs all five actual physics solutions and checks every apple, completion, more than 60 metres travelled and 45–100 seconds of controlled play. Additional checks cover:

- The Attic's loose weight actually moving and the Conservatory's marked weight actually rising.
- Escher collecting successive apples near 0°, 90°, 180°, 270° and 360° gravity, then finishing above the entrance.
- The Engine's 2.7 m seat on a 3.12 m pendulum, and crossing its unsupported gap.
- Clockwork exceeding 90% phase, collecting its high apple above 1.5 m, reversing time, lowering its lift below −5 m and returning below 10% phase.
- The Clockwork solution failing when its lift is frozen, and failing without its backward journey.
- Six constant rotation inputs and four fixed gravity directions failing to complete any late map within 35 seconds.

Run with `npm test -- tests/campaign-late.test.ts`.
