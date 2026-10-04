# Visual/UI review history and residuals

The current bicycle and map overview were rebuilt and reviewed in [review-visual-v2-1.md](review-visual-v2-1.md); the repeated-key finding was fixed and verified in [review-v2-fix-cycle.md](review-v2-fix-cycle.md). Wheels now use 64-segment circles and higher-precision curves. The descriptions below record the earlier implementation.

Two independent review cycles examined the renderer and UI. The cycle 1 issues were fixed: debug metrics moved into the HUD, overlay focus and inert behavior were added, renderer destruction no longer accesses its canvas afterward, and compact landscape controls fit their buttons. Circle silhouettes use explicit 40–48 segment paths. The full-screen grain layer was removed.

Cycle 2 findings were fixed: aggregate Pixi destruction now includes `context: true`; Clockwork timeline and utility controls occupy separate rows at 667×375; the brand hides when debug metrics need its space; and programmatic focus on the game host has no browser outline. Targeted Chrome tests confirm Clockwork layout at 667×375 and renderer create/destroy removes its canvas without throwing. TypeScript and the Vite production build pass.

No known severe renderer or UI defect remains from these reviews. Physical-device safe areas, motion-control feel, GPU memory measurement, and a visually inspected full 360° turn remain unverified; browser viewport and lifecycle tests do not establish those device behaviors.

The later independent gameplay pass visually inspected 90° and 180° Escher checkpoints and the raised Clockwork lift. It found one minor residual: rotating terrain can reduce the contrast of a few letters in the upper-left level title. No gameplay geometry or bicycle occlusion was observed at those checkpoints.
