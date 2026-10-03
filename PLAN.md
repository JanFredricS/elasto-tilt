# Newton’s Ride — implementation plan

## Product
A mobile-first, side-view bicycle physics puzzle game. Tilt the visible world through 360 degrees so walls and ceilings become ground. All ordinary dynamic objects share gravity. Collect Newton’s apples and reach the exit; helmet collisions restart the attempt. Hold one brake button to stop wheel rotation, pivot on ledges, hang, and transfer onto swings. Physics and puzzle readability are the centerpiece: crisp bicycle and collision silhouettes, restrained backgrounds, clear apples and hazards.

## Controls and simulation contract
- Landscape-first, responsive portrait fallback. Phone orientation permission through a deliberate button, calibration, dead zone, smoothing, keyboard and touch fallback.
- Tilt commands angular world velocity; neutral holds the current angle. Gentle input is precise, stronger sustained input permits complete rotation without inverting the phone.
- Stable map-space terrain, rotating gravity and matching rendered world transform. HUD remains upright. This is gravity manipulation, not centrifugal physics.
- Fixed physics timestep, bounded catch-up, pause on hidden tab, bounded pixel ratio, FPS/frame-time/physics debug overlay.
- Bicycle chassis, two jointed wheels, explicit vulnerable helmet, credible wheel braking. No automatic attachment to arbitrary surfaces. Designed lips/cradles support wheel catches.
- Swings use constraints; lengths and damping vary response. Mass alone is not the explanation for different swing periods.
- Time puzzle uses explicit route-space travel, not screen direction or wheel spin. Bicycle remains live, selected environment objects follow reversible trajectories. Apples persist. Time controlled kinematic colliders are intentionally authored rather than arbitrary negative-time physics.
- Reviewed temporal implementation keeps a reversible target separate from bounded collider motion: platforms may finish catching up after the rider stops. This deliberate safety tradeoff avoids discarding travel at high rider speed. Saturated endpoints do not store excess travel.

## Campaign
1. Newton’s Orchard: gentle gravity steering, brakes, apples, exit.
2. One Wheel Wonder: lips, pivots, helmet clearance.
3. The Hanging Garden: swing approach and wheel transfer.
4. The Pendulum Mill: short/long swings and timing.
5. The Room on Its Side: quarter/full turns and ceiling routes.
6. Newton’s Attic: movable weights and bridge mechanisms.
7. Escher’s Orchard: clear playable geometry inside impossible stair imagery, rotated room connections.
8. The Contrary Conservatory: visually marked inverted gravity objects/zones.
9. The Gravity Engine: compound gravity, swing, and ledge challenges.
10. The Clockwork Apple: forward/backward travel advances/reverses selected moving platforms; temporal motion must be required to reach an apple/exit.

## Stack
TypeScript, Vite, PixiJS rendering, Rapier 2D physics. HTML/CSS UI. Local persistence and data-driven maps. No backend needed for offline gameplay; Supabase is a later optional cloud-save/account service. Server validation is required before competitive leaderboards.

## Parallel work and ownership
### Accepted advance-review corrections
The independent review is saved in docs/advance-review.md. The frozen API is src/types.ts. It uses y-UP coordinates (rather than the review’s illustrative y-down convention): map gravity = (g sin theta, -g cos theta), rendered screen delta = (cos theta*x + sin theta*y, sin theta*x - cos theta*y). Thus map gravity always renders screen-down. Verify quarter turns. Units are metres and radians. Root uses fixed 1/120 s steps with a maximum of eight catch-up steps and drops excess tab backlog. Internal bicycle collisions must be filtered without filtering wheel/terrain or helmet/environment contact. Brake is bounded resistance relative to chassis, not forced zero world velocity. Escher initially uses continuous planar geometry and clear impossible-looking art; portals are deferred. Time objects use bounded phase from travel along a named static route axis, with carrying/jitter safeguards. Ten maps can be implemented, but validation status must distinguish authored, replay-passed, visually checked, and physical-device checked. The wheel-transfer prototype and actual routes, not static schema tests, are the key validation gates. Residual severe defects prevent a full-completion claim even after two cycles.

### Frozen module exports
- src/physics.ts exports async createPhysics(): Promise<PhysicsGame>.
- src/input.ts exports createInput(): InputController.
- src/renderer.ts exports async createRenderer(host: HTMLElement): Promise<GameRenderer>.
- src/ui.ts exports createUI(host: HTMLElement, levels: Level[], callbacks: UICallbacks): GameUI.
- src/levels.ts exports levels: Level[].
- Root owns src/main.ts. Authors may add private helper modules/tests within their slice and must coordinate schema changes first.

Root owns scaffold, shared types/API, integration, documentation, Git, verification and final residual report. Shared types are frozen before implementation; changes are coordinated through root.

Slice A — Astra: physics and controller core in src/physics.ts and src/input.ts; fixed stepping, bike joints, brakes, gravity, collisions, swings, temporal platforms, sensor and fallback controls. Add focused tests for actual simulation invariants.

Slice B — Sol 6: crisp graphics and user interface in src/renderer.ts, src/ui.ts, src/style.css; world rotation and camera, clear gameplay objects, minimal decoration, accessible menus, calibration status, map selection, pause/retry, FPS overlay UI.

Slice C — Sol 6: maps and gameplay verification in src/levels.ts and tests/levels*; craft progressive maps with visible intended solutions, include Escher and Clockwork; avoid marking an unplayed map as validated. Root wires game lifecycle and persistence.

## Review protocol
Advance independent adversarial review by Sol 6 (requested Sol 6.1 is unavailable). Adjust this plan before implementers start. After each slice, a new context Astra-low agent reviews files and tests without implementation history. Findings go to owner; allow two fix/review cycles maximum, then record remaining issues explicitly and proceed. Do not conceal unresolved defects. Separate Sol gameplay tester exercises actual built game and map routes, with automation where possible. A device simulator cannot prove physical IMU feel or actual phone performance.

## Acceptance and evidence
- Build and typecheck pass; meaningful physics and map tests pass.
- Desktop keyboard/touch controls work; phone permission failure gives useful fallback.
- Retry, pause, completion, apples, saved progression, map selection work.
- No explosive joints, NaNs, or unbounded elapsed-time catchup in test runs.
- Debug toggle displays FPS and frame-time/physics metrics.
- Render review at mobile landscape, portrait, desktop; avoid unreadable bike, occluded controls, background clutter.
- Record each map’s mechanic, intended route, actual validation status and remaining design work.
- Record two review/fix cycles per slice or explicitly note clean review/no further fix required.

## Delivery
Playable local web app and saved source, plan, review records, map validation, README. Initialize Git and create/push a private GitHub repository if authenticated. Current gh authentication is invalid; continue all local work and attempt authorized alternate GitHub access without exposing credentials. Do not claim remote repository exists without confirmation.
