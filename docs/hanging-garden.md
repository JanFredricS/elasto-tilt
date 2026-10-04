# Hanging Garden: a travelling cradle

The opening runs from x=27 to x=34: 7 m wide, with a 7 m pendulum. Both increased from 3 m together. The 2.8 m deck occupies only 40% of the opening, so it must travel between banks. Initial placement clears the bank; physical edge contacts act as docking stops. The lower hazard spans the opening.

## Slower boarding response

Map 3 uses damping 10 instead of 8, retaining mass 20, the same geometry, and normal tilt/brake physics. Other maps keep their existing settings. In a browser simulation through the phone orientation input and smoothing, a held +0.3 rad target moves the empty cradle its first metre in 2.14 seconds instead of 1.77, and three metres in 9.06 seconds instead of 7.31. This provides about 20–24% more reaction time. Pendulums stay awake so the damped empty cradle reaches the bank rather than freezing midway.

Stop at the edge and tilt toward your bank to call the cradle. Roll aboard gently, hold brake and tilt toward the opposite bank, then release to ride off. Repeat on the return and bring all five apples to the starting door.

The reference pilot now eases aboard with speed feedback instead of fixed boarding angles that built up excessive speed. It levels before releasing the bank-side brake, then targets 2 m/s before holding brake for the loaded swing. It uses only ordinary tilt and brake inputs; it never changes poses, attaches the bicycle to the deck or bypasses head collisions.

## Validation

The final normal-control route completes in 70.358 seconds with all five apples returned home. Continuous both-wheel supported travel measures 3.549 m outward and 3.400 m on the return, with 13.492 seconds of braking aboard. Existing acceptance thresholds remain unchanged: over 3 m continuous supported travel separately in each direction, full completion, and counterfactual failures when the same recorded successful inputs run with the deck fixed or removed.

All 18 targeted checks pass. Diagnostic boarding targets from 1.8 through 2.2 m/s also complete and satisfy both support thresholds. Changing the brake engagement position by ±0.1 m still completes; braking earlier can briefly lift a wheel and reduce continuous support, so this is a valid slower route rather than a claim that arbitrary boarding timing is safe.

Fresh Astra review found no blocking issues. Actual handling on a physical handset remains unverified; the phone-response measurements use simulated orientation events through the real input controller.

Final release checks: 161 physics/unit tests pass across 17 files; the rendered browser round trip reproduces the final route and support measurements without page errors; TypeScript and the GitHub Pages production build pass. The updated screenshot is in `docs/evidence/garden-swing-crossing.png`.
