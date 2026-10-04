# Natural Philosopher integration

**Draft only — not published.** The shorter wheelbase regresses advanced route validation on Spiral Sanctuary, Switchback Scaffold and The Hidden Way Home. The requested two correction cycles are exhausted. Keep this change off `main` until those routes pass without removing their puzzle requirements. The live game remains unchanged.

The approved compact Natural Philosopher replaces the previous helmeted rider in this draft. The source of the proposed art is `src/assets/natural-philosopher.svg`: coral diamond frame, short teal coat, ivory curls, parallel shoes and the selected smile.

`src/rider-art.ts` splits that same SVG into a body, a head and two wheels. The browser rasterizes those vectors once at four pixels per artwork unit, with mipmaps for small phone sizes. The renderer then moves the cached parts with their actual rigid bodies; it does not rebuild paths every frame. All textures are disposed with the renderer.

The physical wheelbase is 1.11 metres, down from 1.4. Wheel radius remains 0.34 metres, and the head retains its existing position and 0.21-metre collision radius. The chassis collision hull is narrower. The mass distribution preserves total mass and rotational inertia while lowering the centre of mass to retain the previous support-width-to-mass-height ratio. This keeps the compact bike usable under hard braking without adding an anchor or corrective force.

The one-wheel fixture now positions its cradle under the actual front axle. Map 2 still requires rear-wheel support, an airborne front wheel, over half a metre of front-wheel clearance at apple collection, sustained braking and full completion. Its supported pivot range is about 0.425 radians with this chassis; the minimum is now 0.4 radians following independent review. Rolling through misses the high apple, and removing the brake loses the recovery.

## Review and validation

A fresh Astra review checked artwork fidelity, coordinate conversion, wheel/head alignment, texture lifetime and the mass/inertia calculation. Desktop and portrait-phone rendering were inspected. Browser checks cover all 15 map starts, controls, pause/restart, responsive layouts, renderer disposal, first-map completion and persistent unlocking.

An independent gameplay agent also inspected the braked map-2 wheelie, its landing and map-11 underside riding. Parts stayed aligned and neither browser run produced page errors. A 120-frame warm desktop Chrome sample had a 16.8 ms p95 frame interval. Screenshots are saved in `docs/evidence/natural-philosopher-*.png`.

## Remaining route regressions

- Spiral Sanctuary: the original pilot completes its standard route and smoothed button route, but fails after 18, 22, 23 or 29 idle frames and at a 60 Hz physics step. Changing launch lift, gravity-restoration timing and airborne brake conditions moved the failures rather than eliminating them. Those experimental changes were discarded, and no assertions were weakened or disabled.
- Switchback Scaffold: the original normal and keyboard/button routes fail, including the required single-flight somersault and wheels-on-tier landing. Its original synthetic phone route passes. A longer launch pulse completed the normal route but did not restore the somersault and regressed the phone route, so that experiment was discarded.
- The Hidden Way Home: normal and synthetic phone routes fail at the large jumps. Experimental brake pulses and phase-relative gravity targets reached five of six apples and the return ascent, but missed the arrival apple and crashed before the door. Those incomplete pilot changes were discarded. Further work must preserve both chasm crossings, wall support, the last wall apple, half-loop release and hidden return.
- Two pre-existing expected failures for horizontal/oblique time-platform carrying remain unrelated to this integration.

Actual phone hardware remains untested; browser phone layouts and synthetic motion input are the available evidence.

Final native suite: 146/159 runner cases pass, including the two pre-existing expected failures; 13 route checks fail, with no skipped tests. TypeScript and the GitHub Pages production build pass. Nine standard browser checks pass; the separate gameplay-agent run covers the wheelie, landing and underside.
