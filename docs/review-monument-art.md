# Monumental architecture art review

Reviewed 2026-10-04: `src/art-direction.ts`, the renderer/CSS diff, and desktop Orchard, Escher overview, portrait phone, and menu captures supplied in `/tmp/monument-*.png`.

## Finding — P2: brake label contrast

The normal brake button pairs `#fffdf7` text with `#cf766d` (3.19:1); its HOLD label uses `#fff7ee` (3.06:1). The pressed background `#b65f5a` provides 4.32:1 against the main text. All fall below the 4.5:1 normal-text threshold. The desktop BRAKE label is 18px bold, just below the 18.67px large-text threshold, and the small HOLD label requires 4.5:1 regardless.

Change normal and pressed brake labels to sufficiently dark ink, or darken both backgrounds until every label reaches 4.5:1. Preserve the distinct coral treatment and visible pressed state. Check portrait sizing as well as desktop.

## Passed observations

- The bicycle's dark outline and coral frame separate cleanly from pastel terrain; orange apples remain distinct at riding scale and legible in the Escher overview.
- Terrain front rims follow the physical rectangle boundaries. Backward extrusion is drawn in the architecture layer behind terrain, bicycle, and collectibles; it does not cover the actual contact plane. The soft upper face reads as depth in the supplied captures.
- The gateway remains visually distinct from solid terrain. Escher's staircase and internal galleries remain separable.
- Mobile HUD and controls fit the supplied 390px portrait capture without overlap. Menu hierarchy, selected action focus ring, and enabled/disabled tile differentiation are clear.
- Architecture is generated on level load, not per frame. Reload clears geometry and destroys old terrain, dynamic, and collectible children; renderer teardown still disconnects its observer and destroys child/context resources. No new frame-loop allocation or lifecycle leak is apparent in this diff.
- Hazard geometry retains its red fill and diagonal marks and is excluded from decorative depth. No hazard capture was supplied, so this is a code inspection observation rather than a visual sign-off of a hazard scene.

This is a visual/code review. Runtime FPS, navigation lifecycle, and browser interaction checks are being performed separately by the parent agent. No physics, map, or input changes were reviewed or requested.

## Fix cycle 1 verification

Verified the changed CSS backgrounds `#b25954` (normal) and `#974941` (pressed). Main text now passes at 4.64:1 and 6.17:1. HOLD passes when pressed (5.92:1), but its normal contrast is still 4.45:1. Set the small label to `#fffdf7`, matching the main label, to obtain 4.64:1 and 6.17:1 in both label sizes. The finding remains open pending that final color adjustment.

The parent agent reports 13/13 browser tests passing and frame times of 16.7ms at both median and p95; these results were not independently rerun during this visual review.

## Fix cycle 2 — contrast resolved

Confirmed `.brake-button small` now uses `#fffdf7`. Both labels pass at 4.64:1 normal and 6.17:1 pressed, including the smaller mobile labels. The accessibility finding is closed after two fix cycles.

Residual evidence limitation: the supplied final `docs/evidence/monument-mobile.png` shows a second HUD strip beginning near y=758 and obscures the bottom controls. The earlier `/tmp/monument-mobile.png` viewport was clean. Parent agent notified to replace this capture or determine whether this is an actual rendering issue before using it as final evidence. Hazard scenes still have code-inspection coverage only; full route replays were outside this visual-only review.

## Final evidence closure

Independently inspected the refreshed `docs/evidence/monument-mobile.png` and `docs/evidence/monument-escher.png`. The mobile capture now has one HUD, fully visible tilt/brake controls, and no overlap; the previous capture limitation is closed. Escher's continuous arc shading removes the repeated decorative fins and leaves the physical front outline and internal staircase readable. The revised depth drawing remains confined to level-load geometry behind the physics plane.

Final result: PASS for the reviewed visual changes, with no open actionable findings. Remaining coverage limits are unchanged: hazard scenes were checked in code rather than captures, full route replays were outside this visual-only review, and runtime test/FPS results are parent-reported.
