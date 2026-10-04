# Newton’s Ride — prototype delivery

Public repository: https://github.com/JanFredricS/elasto-tilt

Live game: https://janfredrics.github.io/elasto-tilt/

## Implemented

- TypeScript/Vite frontend, PixiJS rendering and Rapier 2D simulation. No backend required.
- Bicycle with constrained wheels, finite braking, helmet collision, apples and exits.
- World rotation through 360°, gravity-reactive swings and loose objects, inverted props.
- Ten playable authored maps, including the wall-and-ceiling Escher route and reversible Clockwork lift.
- Phone permission/calibration and keyboard/touch fallback; pause/retry, local progress saves, campaign selection and FPS/frame/physics debug HUD.
- Clear vector graphics, quiet backgrounds, responsive landscape/portrait layouts and keyboard-accessible overlays.

## Verification

- TypeScript check and production build pass.
- Vitest runner reports 58 successful cases: **56 passing test cases and 2 explicitly expected failures documenting the known passive-carry bug**. Those expected failures are not acceptance passes.
- All ten maps complete with every apple through deterministic scripted controllers running actual Rapier physics.
- Clockwork completes with forward/reverse travel. Freezing its lift and removing the backward leg each prevent the tested controller from completing; this is route evidence, not a proof about all possible solutions.
- **All 16 Chrome browser tests pass** after the mobile gravity fix (about 1.9 minutes). They cover startup, actual movement, pause/reset, all spawns, completion/unlocking/save reload, menus/pointer cancellation, responsive layout, representative puzzle playthroughs and renderer teardown. The new phone regression waits ten seconds before tilting, verifies bicycle motion and a steady world angle, then returns to level using synthetic orientation events.
- Independent Sol browser validation completes Clockwork, Escher, Hanging Garden, Pendulum Mill and Gravity Engine. The Escher browser route turns through approximately 180°; a full 360° visual/phone run is not claimed.
- Repeated 120-frame desktop Chrome landscape samples measured median/p95 frame intervals of 16.7 ms, approximately 60 FPS; the maximum observed physics step in the final run was 1.1 ms. These are short desktop samples, not a phone performance guarantee.
- The production bundle does not contain the development `__NEWTON__` control hook.

## Review process

The advance review used available Sol 6 because requested Sol 6.1 was unavailable. Astra implemented physics/controls; Sol implemented graphics/maps and independently tested gameplay. Each slice received two fresh-context Astra-low reviews and at most two bounded fix cycles. Review documents and exact dispositions are in [implementation-log.md](implementation-log.md).

## Remaining work

1. **Signature hanging transfer:** a wheel-catch/pivot fixture passes, but sustained upside-down hanging and brake-assisted release/free-wheel capture of a swing are not yet demonstrated.
2. **Horizontal/oblique time-platform carrying:** passive carry can incorrectly advance time along the route axis. Reproducing expected-failing tests and restrictions are in [physics-residuals.md](physics-residuals.md). The campaign’s vertical lift avoids that case.
3. **Deeper mechanism puzzles:** Attic has a static bridge and loose ball; inverted objects and differing pendulum periods are demonstrated but not mandatory solutions. See [maps-residuals.md](maps-residuals.md).
4. **Physical phone QA:** actual iOS/Android permission behavior, IMU calibration/latency, safe areas and sustained device frame pacing remain untested. Motion requires HTTPS; the local HTTP preview supports keyboard/touch.
5. **Timeline semantics:** platforms may finish bounded catchup after the bicycle stops. This is authored reversible motion, not arbitrary backwards physics.
6. **Minor presentation issue:** rotating terrain can pass behind and reduce the contrast of the upper-left level title in Escher. The bicycle and colliders remain readable in the inspected screenshots.

## Run

`pnpm install`, then `pnpm dev`. Use A/D or arrow keys to tilt, Space to brake, R to restart, Escape to pause and F for FPS. The on-screen controls support touch. Run `pnpm test`, `pnpm build` and (with the dev server running) `pnpm test:browser`.

The user subsequently authorized public visibility and GitHub Pages hosting. The game now deploys from `main` through `.github/workflows/pages.yml` after its tests and build succeed. No cloud gameplay backend is required.
