# Taller Natural Philosopher

The game now uses the approved Natural Philosopher art with the original 1.4-metre wheelbase. The ivory curls, smile, teal coat, parallel shoes, coral diamond frame and gold fittings are retained. Wheels stay circular with their original 0.34-metre radius. The frame is fitted to the original axle spacing, and rider height and head size increase by 10% relative to the compact draft. The head centre is (0.126126126, 0.795), with radius 0.231.

The original rigid-body mass, inertia, axles, braking and upper-body apple reach are unchanged. Keeping apple reach prevents the high apple in One Wheel Wonder becoming collectable by ordinary rolling. A Rapier shape query adds lethal contact for the taller visible crown without adding a collider to the original assembly. The original head collider remains as the vulnerable neck/upper-body area. No map, pilot, or existing acceptance assertion was changed.

The renderer rasterizes the vector parts once at four pixels per artwork unit, uses mipmaps at phone scale, follows the real wheel rotations, and disposes all generated textures with the renderer. There is no per-frame image generation.

## Validation

All 161 existing physics/campaign cases pass; a new ceiling-clearance test passes for the taller crown (162 total). TypeScript and the Pages build pass. Browser checks cover all 15 map starts, first-map completion/unlocking, keyboard/touch controls, phone and desktop layouts, and renderer disposal. Sol independently reviewed SVG anchors, wheel/head alignment and texture lifetime in two review passes, and checked gameplay in the browser.

The requested fresh Astra reviewer could not be started because the agent tool returned `agent thread limit reached`. Root performed the physics checks locally and the available Sol agent supplied the independent review. Physical iPhone performance remains a device check; browser phone layouts and synthetic input are the available evidence.

## Start-page illustration options

Four separate 1536 × 1024 illustrations are saved under `docs/design/newton-start/`, with the full built-in image-generator prompts in `prompts.md`. They are review options and are not loaded into the start page yet. White-looking backgrounds contain near-white corner pixels (253–255), so a selected asset may need a background refinement before use on a strictly white page.

The earlier compact-wheelbase draft is superseded by this version. Its experimental map changes are not part of this integration.
