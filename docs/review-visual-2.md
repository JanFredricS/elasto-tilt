# Slice B independent review — cycle 2

Reviewed PLAN.md, types, renderer, UI, styles, main and input, and the updated landscape-game, portrait-game and desktop-menu screenshots before reading cycle 1. Root reports all seven browser tests pass; this reviewer did not rerun them. No implementation edits.

## Remaining findings

1. **P2 — Aggregate renderer destruction omits Graphics context destruction.** `src/renderer.ts` calls `app.destroy(true, { children: true })`. Installed Pixi `Graphics.destroy` (`node_modules/pixi.js/lib/scene/graphics/shared/Graphics.mjs:145`) destroys an owned graphics context when called without options, with `true`, or with `context: true`; the passed object satisfies none of these. Children are destroyed but their drawing contexts are not explicitly released. Include `context: true` in aggregate destruction. Per-level cleanup is correct: removed terrain, apple and dynamic graphics call `destroy()` without options and caches are cleared. The previous post-destroy canvas access crash is fixed.

2. **P2 — Clockwork timeline overlaps utilities in narrow landscape.** At a viewport such as 667×375, the <=760px rule puts `.utility-bar` at the right with no transform and auto width. The short landscape rule then puts both it and `.timeline` at `top: 62px`, with right offsets 12px and 10px. Both occupy the same horizontal region, and the later utility element paints over the timeline at equal z-index. This affects the Clockwork map specifically and is not represented by the Orchard screenshots. Give the timeline and utilities separate rows or horizontal regions. This is a CSS finding, not a newly captured browser reproduction.

3. **P3 — Landscape debug HUD covers part of the brand.** The supplied 844×390 screenshot shows PERFORMANCE covering the end of NEWTON’S RIDE. Metrics no longer obscure the rider, apples or terrain, so the prior gameplay obstruction is resolved. Hiding the brand while debug is enabled at intermediate landscape widths would remove the remaining cosmetic overlap.

## Verified improvements and limits

- World transform remains correct: negative vertical scale and positive world rotation yield `(cosθ*x + sinθ*y, sinθ*x - cosθ*y)`, mapping specified gravity screen-down at quarter turns and all other angles.
- Cached body/static graphics are released on level load. Swing-anchor lookup and campaign-button updates are cached appropriately.
- Modal semantics, focus transfer, Tab wrapping and background inertness are implemented. Returning to play focuses the host. Space on normal buttons is no longer swallowed by global input; focused hold buttons implement Space/Enter press/release and release on blur or modal transition.
- New screenshots show readable bicycle/helmet, unobstructed nearby apples, compact portrait metrics and properly contained landscape control labels. Desktop menu is clear.
- No severe remaining gameplay rendering defect identified. The two P2 items above remain after the final permitted review cycle and should be recorded as residuals. Physical-device safe areas, IMU feel, GPU memory measurements and visual full-turn execution were not tested here.
