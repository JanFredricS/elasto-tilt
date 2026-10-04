# Four gravity journeys — implementation plan

Append maps 11–14; preserve all existing campaign IDs, ordering and saves. Keep the established pastel architecture and clear side-view collision edges.

| Map | Owner | Required move |
| --- | --- | --- |
| The Other Side | Astra flip_spiral_maps | Ride the top, turn around the exposed end, and ride underneath the same structure. |
| Spiral Sanctuary | Astra flip_spiral_maps | Follow a large circular spiral inward toward the central door, steering gravity during real gap crossings. |
| Switchback Scaffold | Astra tower_chasm_maps | Climb walls between tiers, leave the surface and reorient for wheels-first horizontal landings. |
| The Hidden Way Home | Astra tower_chasm_maps | Edge over the initial drop, chain wall/ramp jumps, collect the final wall apple, launch inverted from a half-loop, float upward to the hidden return route, then descend to the starting door. |

Sol owns optional map-space arrow/label rendering and dynamic campaign text. Root owns campaign aggregation, replay dispatch, browser validation and publishing. Arrow markers explain the airborne gravity changes without looking like physical terrain.

Acceptance uses real Rapier controls only: no body repositioning, fake collection events or hidden movement assists. Each map needs a successful all-apple route, concrete evidence of its distinctive move, and tests rejecting trivial idle/held inputs. Geometry must be within bounds, with no initial bicycle overlap. Browser runs validate rendered completion, map overview, phone layout and frame samples. Fresh Astra-low reviews get at most two fix cycles; remaining limitations must be recorded honestly. Physical-phone input tolerance is distinct from automated feasibility.

Publication: full unit suite, TypeScript/Pages build, appropriate browser checks, then push main and verify GitHub Pages revision.
