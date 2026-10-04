# Visual v2 review — first pass

Reviewed the uncommitted changes in `src/renderer.ts`, `src/ui.ts`, `src/main.ts`, `src/types.ts`, and `src/style.css`, including adjacent input and physics code. Inspected `/tmp/newtons-bike-redesign.png` and `/tmp/newtons-escher-redesign.png`. No implementation edits were made.

## Finding

- **P2 — Ignore keyboard repeat for the map toggle (`src/main.ts:92`).** Holding M emits repeated `keydown` events, and every event calls `survey()`. After the first repeat the ride resumes; subsequent repeats alternate between riding and overview, causing flicker and allowing simulation time and bike motion to advance during a held map shortcut. Guard this toggle with `!event.repeat`. A regression should enter overview with one ordinary M keydown, dispatch repeated M keydowns, and verify that overview remains active and the physics snapshot stays unchanged until a fresh press.

## Other observations

- The supplied bike screenshot shows a clear frame, detailed wheels, jersey, articulated limbs, and helmet; the supplied Escher overview makes its route and collectible placement readable.
- Overview stops physics stepping, clears the accumulator and input on transitions, and resets on load/pause. Renderer resizing fits the declared unrotated level bounds; normal camera tracking is restored on exit.
- The control-dock pointer-events change retains pointer events on descendant buttons and removes the transparent central interception area.
- Wheel graphics are built once and subsequently transformed. Rider graphics are rebuilt each frame as before, with more geometry in this change. No measured performance regression was established by this review.
- This pass used source inspection and the supplied screenshots, not a fresh browser or device run. Phone pointer behavior, runtime performance, and overview regression tests remain covered by the parent task's browser checks.
