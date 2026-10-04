# Monument Valley inspired visual direction

The reference is the quiet architectural composition of [Monument Valley](https://ustwo.com/blog/monument-valley-out-now/): restrained pastel masses, depth, light and spacious scenes. All game geometry and vector artwork here are original.

Four coordinated palettes give the campaign jade, rose, blue and sandstone worlds. Terrain has ivory lit faces, shaded depth and a fine dark outline at the exact physics plane. Recessed windows sit inside tall solid walls. A warm arch marks the exit. The smooth bicycle and coral apples remain the strongest small silhouettes. Backgrounds use only soft gradients so landings and moving objects stay readable.

Architecture is generated once when a map loads. It uses flat vector fills with no lighting engine, full-scene blur or new background particle work. Joined curved faces share continuous shading. The physics, routes, gravity controls and camera's side view are unchanged. Map-view pivot and scale now update together to avoid a transient zoomed frame.

Validation: 13 targeted Chrome checks passed for three viewport layouts, all-map loading, actual movement, pause/retry, touch controls, FPS, whole-map navigation and Graphics cleanup. A warm desktop sample measured median/p95 16.7 ms, maximum sampled physics step 0.2 ms. These results do not establish physical-phone frame pacing. TypeScript and the Pages build pass. Fresh Astra-low visual review and two bounded contrast fixes are recorded in [review-monument-art.md](review-monument-art.md).

Evidence: [phone](evidence/monument-mobile.png), [Orchard](evidence/monument-orchard.png), [Escher](evidence/monument-escher.png), [menu](evidence/monument-menu.png). A screenshot taken immediately after resizing Chrome was replaced with a clean capture from a new phone-sized page.

The visual direction adds architectural depth; Escher remains the documented planar gravity spiral, without impossible topology or portals. Hazard styling was checked in code but has no new dedicated visual capture in this pass.
