# Map review and remaining design work

Independent map review ran twice. [Cycle 1](review-maps-1.md) confirmed deterministic physics routes for levels 1–9, then requested rotation-aware geometry checks and honest mechanic descriptions. Those checks now cover all transformed terrain corners, the entire bike spawn, and initial prop, swing, and time-platform extents. The Attic and brake hints now describe the implemented objects. [Cycle 2](review-maps-2.md) found no new blocking route defect and confirmed all ten maps complete with every apple in the physics replays. The focused suite passed 27 tests across the map and Clockwork files. The final cycle’s two wording mismatches were corrected: Clockwork’s documented final phase matches the test threshold of 0.15, and the Gravity Engine test names its wall apple correctly.

Passing routes establish reachability under deterministic scripted controls. They do not establish all of the originally planned puzzle interactions:

- The campaign does not yet force or replay a sustained one-wheel catch, upside-down hang, or brake-assisted release onto a swing. Level 2 applies the brake near its lip, and the swing levels cross their gaps, but neither observation proves that transfer sequence.
- Newton’s Attic uses a movable ball and a static bridge. The replay moves the ball but does not show a weight-operated bridge or that moving the ball is required to finish.
- The Contrary Conservatory’s inverted ball rises as designed; the successful route does not depend on it. The Pendulum Mill’s two swing lengths differ, but its passing route does not require waiting for their different periods.
- Clockwork’s successful replay raises and reverses its single lift. Freezing it at the start blocks the high apple for that controller, and omitting the backward leg blocks that replay’s exit. These are route-specific ablations, not a proof against every possible alternative control sequence.

Browser visual checks and physical-device motion and performance checks are tracked separately in [maps.md](maps.md) and the delivery report. These remaining mechanic gaps should be treated as future design work, even though all ten authored routes pass simulation.
