# Slice B independent review — cycle 1

Reviewed PLAN.md, shared types, renderer/UI/styles, main integration, input interactions, and the three gameplay screenshots. Existing five browser tests reportedly pass; this review did not rerun them. Those tests check viewport containment, not overlap or keyboard focus. No implementation changes made.

## Findings

1. **P1 — Debug panel obscures the vulnerable helmet and route on phones.** `src/style.css:92`, `:159`, `:192` place an opaque 173px-wide panel at y178 on a 390×844 screen. `test-results/portrait-game.png` shows it covering the rider's forward helmet edge and the first apple; the landscape screenshot also covers an apple and terrain. Move phone metrics into a compact reserved HUD/footer region, or provide a collapsed single-line readout. Verify that the full helmet and nearby collision geometry remain visible in portrait and landscape with debug enabled. Merely keeping the panel inside the viewport does not satisfy this.

2. **P2 — Overlay states leave background buttons keyboard accessible.** `src/ui.ts:198-203` only hides controls and menu; HUD/utility buttons stay focusable behind the pause/crash/completion overlay. The overlay at `:79` has no dialog semantics, focus transfer, or focus containment. A keyboard user can Tab to and activate Restart behind the modal, and opening an overlay leaves focus on its obscured trigger. Add modal semantics, move focus on state transitions, make background controls inert while an overlay is active, and restore sensible focus afterward. Test Tab/Shift+Tab and Enter on pause, crash, completion, and map menu. Coordinate with input owner: `src/input.ts:13-15` prevents Space on all buttons, so normal Space activation is swallowed; focused hold buttons also lack keyboard hold handlers (`src/ui.ts:168-180`).

3. **P2 — Renderer destroy throws after destroying the application.** `src/renderer.ts:330-331` calls `app.destroy(true, ...)` then accesses `app.canvas.remove()`. Installed Pixi `Application.destroy()` destroys and nulls `renderer`; its canvas getter reads `this.renderer.canvas`. The first call already removes the canvas. Remove the second access or retain a canvas reference before destruction. Verify create/destroy succeeds and the observer/canvas are removed. This is dormant in current one-shot main but breaks the required public lifecycle method.

4. **P3 — Landscape controls overflow their own buttons.** At 844×390, the short-height rule shrinks tilt/brake buttons (`src/style.css:202-203`) but keeps desktop glyph/font sizes because the <=760px typography rules do not apply. `landscape-game.png` shows tilt arrows protruding above buttons and split labels pressed against the lower edge. Apply the corresponding compact glyph, label, and spacing rules for short landscape screens as well; inspect button contents, not just bounding boxes.

## Other review notes

- World transform is correct by inspection: negative y scale plus positive rotation yields `(cosθ*x + sinθ*y, sinθ*x - cosθ*y)`, matching the frozen gravity contract, including quarter turns.
- Terrain rectangles and helmet centre/radius match the current physics values. Wheel artwork is slightly larger (.345 versus .34) but not materially misleading. The tiny map-space curves tessellate visibly into polygons in desktop screenshots; optional visual polish could use higher curve precision.
- Static geometry and body graphics are cached; dynamic ropes/bicycle are rebuilt each frame. UI repeatedly queries and updates all campaign buttons even while hidden (`src/ui.ts:223-230`), and dynamic drawing rebuilds a swing map each frame (`src/renderer.ts:201`). These are modest avoidable costs, not a demonstrated performance failure. No device performance claim is justified by screenshots.
- Pointer capture, cancellation, blur, and visibility release handling are present. No new severe pointer-release defect found by inspection.
- No full-turn visual, safe-area device, or physical motion test was performed in this review. Browser screenshots establish initial layouts only.
