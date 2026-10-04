# One Wheel Wonder: a useful wheel catch

The previous thin, rigid beam was level with the road. A bicycle could cross with both wheels down, so the obstacle did not teach the promised one-wheel mechanic. Its hidden thorns did not repair that problem.

Map 2 now puts a short gold approach ramp and a 0.20 m wheel stop on the crest. The second apple is at (14.3, 7.2), 2.20 m above the road. Roll just past the stop, brake, and tilt left: the rear tyre catches its vertical face while the front wheel lifts. Counter-tilt right to lower the front wheel, release the brake, then continue through the deep bowl and back home. The title and on-screen instructions describe this action. The level ID, order, six apple IDs, exit, rest of the route and physics engine are unchanged.

The stop uses ordinary fixed colliders and friction. The brake applies the existing finite wheel/frame torque. There are no magnets, animation-driven motion, scripted bike poses, special apple conditions or forced delays. The apple's sensor still accepts normal physical contact, including creative stunt solutions.

## Actual physics evidence

`tests/one-wheel-map.test.ts` uses the real Rapier simulation, 1/120 s steps and normal keyboard-rate tilt/brake inputs. It does not move bodies directly.

- Completes the full map with six apples in **57.73 s**.
- Collects the high apple at **9.825 s** while the brake is held, the rear wheel touches the gold cradle, and the front wheel has **0.621 m** of tyre clearance above the road. The frame is tilted **25.6°** relative to the terrace at collection.
- The same catch contains **186 consecutive steps (1.55 s)** with one supported wheel and **0.666 rad (38.1°)** of frame rotation. The front wheel lands safely before normal riding resumes.
- An ordinary rolling route collects the other five apples, reaches the far bank, and still misses the high apple after 70 s. This rejects the old simply-roll-across behavior for the tested route.
- Removing the brake from the same feedback strategy collects the high apple during an uncontrolled airborne excursion, then crashes at **13.81 s**. This is evidence for the brake's support/recovery role, not proof that every possible brake-free stunt fails.

The three new physics tests and 15 level-geometry checks pass. Browser evidence is independently collected in `e2e/one-wheel.spec.ts`; the rendered pivot is saved at [one-wheel-pivot.png](evidence/one-wheel-pivot.png).

## Limits

The replay establishes physical reachability and a genuine, useful one-wheel move. It is a controlled demonstration, not a phone usability study or a proof that no alternate route exists. Sustained upside-down hanging, a second-wheel swing catch and mobile sensor feel remain separate work. No unrelated map, renderer or core physics changes were made for this correction.
