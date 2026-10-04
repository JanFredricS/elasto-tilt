# Hanging Garden: a travelling cradle

The old 2.8 m deck occupied almost the entire 3 m opening, allowing a straight ride across. The revised opening runs from x=27 to x=34: 7 m wide. The pendulum length also increases from 3 to 7 m, preserving the same enlargement factor. The deck remains 2.8 m wide, so it occupies only 40% of the opening and cannot form a stationary bridge between the banks.

The raised anchor and initial deck angle provide a clear starting pose. Contacts at the bank edges serve as docking stops; the deck must be able to depart under changed gravity. The lower hazard spans the widened opening. The cradle has more mass (20 versus the default 3) and stronger damping (8), so boarding does not shove it away and players have time to control the crossing. Other maps keep their mass and damping. Pendulums remain awake: Rapier otherwise froze the damped empty cradle midway toward a bank. Bicycle geometry is unchanged.

The intended route is to board, hold the brake and tilt to move the loaded cradle, then release the brake to ride off onto the opposite bank. On the return journey, stop on the right bank and call the cradle back before boarding. All five apples still need to return to the original door.

The reference pilot uses only the same tilt and brake controls as the player. It does not move rigid bodies, attach the bicycle to the deck, lock progression to a scripted checkpoint or bypass head collisions.

Validation measures loaded cradle travel independently on the outward and return legs. Oscillating at one bank must not count as crossing twice. Counterfactual tests replay the exact successful controls with the deck fixed or removed. This tests the missing physical movement rather than a controller waiting for a missing object identifier.

## Validation and review

The normal-control route completes in 64.66 seconds, collecting all five apples and returning to the door. Independent contiguous both-wheel support measurements show 3.161 m of outward travel and 3.143 m on the return; brake is held for 10.275 seconds while aboard. Total deck travel between docks is about 4.23 m. The rendered desktop browser journey reproduces these results without page errors. Portrait layout was also inspected at 390×844.

Astra review caught the original bank penetration and a removed-deck test that had become dependent on observing the missing deck. Both were corrected. Residual: the reference route proves a valid normal-control solution, but physical phone handling has not been retested on an actual handset in this change. Boarding still requires slowing down and waiting for the cradle; it is intentionally a timing puzzle.

Final release checks: 161 unit/physics tests pass across 17 files; the rendered full-route browser test passes; TypeScript and the GitHub Pages production build pass. Astra final review reports no blocking findings.
