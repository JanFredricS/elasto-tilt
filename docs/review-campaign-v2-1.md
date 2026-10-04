# Campaign redesign review, cycle 1

Reviewed `src/levels/early.ts`, `src/levels/late.ts`, both campaign test files and available campaign documentation on 2026-10-04. No implementation changes made. This is a code and real-physics review; browser rendering and physical phone usability are not certified here.

## Outcome

The replacement maps materially address short, flat routes. All 24 campaign tests passed in 1.86 seconds using the bundled Node runtime and Vitest directly. The late routes completed in 49–81 simulated seconds and covered 74–119 metres. Early replays also passed their travel, elevation, duration and actual wheel/deck proximity assertions. No successful authored replay livelocked or left the playable bounds.

Escher now contains a nested architectural spiral with an outer floor, right wall, ceiling, left wall and elevated inner return. Its collected-apple angles prove a complete 360-degree gravity cycle, exceeding 6 radians before the inner terrace. This is an actual expanded route, although optional interior stairs/rooms remain architectural detail rather than a required second puzzle route.

## Actionable findings

1. **Medium: Attic instructions promise unused rafters and weight pockets.** Its mechanic says to push weights into pockets and return along rafters, but all six apples and the exit sit on the lower ramp corridor. The upper rafters at y=7.2/8.4 are outside the demonstrated route, and the weight assertion only proves horizontal movement. Either author those promised interactions or describe the actual ramp-and-return route. Do not claim that weight displacement opens access.
2. **Medium: Clockwork initial lift lies outside declared bounds.** Its bounds start at y=-5, while the platform starts at y=-6.9 and has thickness .42. Expand the declared bounds to include its full travel. Current runtime crash checks allow a margin, so this does not invalidate the passing replay, but it violates geometry validation and clips a bounds-based overview.
3. **Low: Engine's swing test measures a location rather than contact.** `swingCrossed` only observes bike coordinates over the gap. Add wheel/deck contact evidence comparable to the early suite, ideally a load/displacement observation. Independent removal tests below already establish that the demonstrated route needs its deck.
4. **Documentation integration:** the available `docs/maps.md` and `docs/maps-residuals.md` describe the previous short campaign and include obsolete coordinates and completion times. Supersede them or clearly mark them historical when integrating the redesign. No `docs/campaign-late.md` existed at review start.

## Independent swing removal experiment

A temporary Vitest file ran the unchanged pilots with exactly one deck removed, then was deleted. Every removal prevented completion and caused a crash:

| Removed deck | Apples collected before crash | Crash position |
| --- | ---: | --- |
| Garden | 3 | (30.27, -2.78) |
| Mill short | 1 | (18.26, -0.80) |
| Mill long | 2 | (30.26, -0.81) |
| Engine | 1 | (13.71, -2.79) |

Together with passing normal routes, this is strong route-specific evidence that the compact decks function as traversal support. It is not a proof that no alternative controls can jump a gap. Persist these ablations if regression coverage is desired.

## Residual limitations

The pilots are feedback controllers observing snapshots at 120 Hz. Passing them establishes reachability, not comfortable human or phone control. Visual QA must verify the nested rooms, map overview, moving decks and full rotation remain legible at phone size. Default follow-camera inspection and actual device play remain separate checks.

Wonder's narrow beam does not establish a required one-wheel catch. Mill does not require waiting for different pendulum periods. Attic props and Contrary's inverted weights demonstrate physical rules but their necessity is not established. Clockwork frozen-at-start and no-return experiments apply to the chosen controller, not all possible trajectories. The negative constant-control trials are bounded-duration evidence, not universal impossibility proofs.
