# Expansion UI and route guidance review

Reviewed 2026-10-04. Scope: the uncommitted changes to `src/types.ts`, `src/renderer.ts`, and `src/ui.ts` for the 14-map expansion. New map physics and route feasibility are excluded.

## Code review

One actionable visual finding below; remaining code checks pass.

- Label orientation correctly accounts for the world's mirrored Y scale. The world rotation, Y reflection, matching local rotation, and local Y reflection cancel, leaving text upright at arbitrary world angles. Overview uses zero rotation consistently.
- Arrow directions remain in map coordinates and turn with terrain. Their open strokes and separate labels do not introduce a filled platform-like badge.
- Arrows and text are constructed only on level load. Reload destroys their old children and replaces both tracking arrays; renderer teardown destroys the complete scene. Frame updates only adjust transforms for the small hint collection, with no new text generation or geometry construction per frame.
- Optional `routeHints` preserves existing level compatibility. Nonfinite hint coordinates/angles are skipped and empty labels are omitted.
- All four changed menu/banner count strings derive from the supplied campaign length, matching the existing runtime progress and selected-level counter logic.
- Save loading still clamps the saved unlocked count against campaign length. Appending levels preserves old index-based progress; an existing fully unlocked ten-map save can unlock map 11 by completing map 10. This diff does not change the save format or persistence behavior.

## Visual verification

Inspected `/tmp/new-map-11.png` through `/tmp/new-map-14.png`. These are provisional geometry captures, used only to assess the scoped UI renderer changes.

### P2 — keep labels clear of arrows at overview scale

`src/renderer.ts` positions each label only `.48` map units above its arrow, while keeping label text about 10 screen pixels high and enlarging arrows at low zoom. At the overview scale of map 14, this gives approximately four screen pixels of offset: `UP` covers its arrow tip and `ROTATE` intersects the nearby stroke. Map 12's `INWARD` and `CENTRE` labels also cross arrow strokes. The directions are harder to read precisely where the route overview should explain the route.

Provide screen-space separation accounting for the arrow's projected extent and label height, including world rotation, rather than relying on a constant map-space offset. Verify the long-map overview and tilted riding views after the change. This is the first requested fix cycle.

The map 11 overview otherwise shows clear guidance and the correct `11 / 14` count. Phone menu fit and a rotated riding capture remain pending. Browser interaction, runtime performance sampling, and save compatibility checks are owned by the parent task.

## Fix cycle 1

Inspected the revised renderer and `/tmp/wayfinding-12-fixed.png`, `/tmp/wayfinding-14-fixed.png`, and `/tmp/wayfinding-rotated-fixed.png`. The original P2 finding is closed. Labels now clear the arrow strokes in both overviews, and `OUTWARD` remains upright and separate from its downward-pointing arrow during actual 90-degree riding.

The clearance calculation correctly projects the upright text bounds onto the arrow's screen-space normal and includes its stroke extent plus a pixel gap. Terrain-side selection and text measurement occur on load. Per-frame work remains a small bounded set of transforms and arithmetic; no new geometry or text construction is introduced. No further actionable code finding was identified.

Parent reports three passing phone/menu/hint browser tests and renderer creation/destruction checks; these were not independently rerun. The supplied `docs/evidence/hidden-way-phone-overview.png` has no readable hint labels and appears to predate the fixed desktop captures. Parent was asked to refresh this evidence. Phone visual evidence remains a coverage limitation until refreshed; the verified code and desktop fix do not require a second fix cycle.

## Refreshed phone evidence — cycle 2 request

The refreshed phone overview contains the current labels. `EDGE`, both `TURN` labels, and `UP` are readable. `ROTATE` crosses the final vertical wall: the letters and physical edge intersect. This is a narrow P2 placement issue at phone overview scale, separate from the resolved arrow-stroke overlap.

Use an authored placement fix: move the `ROTATE` hint above the wall top, for example from `(31, -19)` to `(31, -12)` (wall top is `-16`). Verify the resulting phone and desktop overview. No general renderer redesign or physics change is requested. This is the second and final requested fix cycle.

## Fix cycle 2 — closed

Confirmed the authored `ROTATE` marker moved to `(31, -12)`. Independently inspected the final `docs/evidence/the-hidden-way-home-overview.png` and refreshed `docs/evidence/hidden-way-phone-overview.png`. The label and arrow now sit above the final wall with clear separation on both desktop and the 390px phone view. All five phone route hints remain readable, and the physical wall edge is unobscured. Both P2 findings are closed after two fix cycles.

Final scoped result: PASS, with no open actionable UI or renderer findings. Parent reports the final map-14 rendered replay and 14-map phone menu checks passed; those runtime checks were not independently rerun. Full route physics and physical-phone playability remain outside this review's scope.
