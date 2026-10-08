# Newton’s Ride

A mobile-first bicycle physics puzzle. Tilt the world, brake to pivot, collect Newton’s apples, and ride walls and ceilings. Built with TypeScript, PixiJS and Rapier 2D.

**[Play live on GitHub Pages](https://janfredrics.github.io/elasto-tilt/)**

Every push to `main` runs the physics/campaign tests, builds the game, and deploys it over HTTPS. Deployment status is available in [GitHub Actions](https://github.com/JanFredricS/elasto-tilt/actions/workflows/pages.yml). A failed test or build leaves the previous deployment live. The workflow can also be run manually.

This is a playable prototype with twenty-two scripted, physics-validated routes. Advanced hanging transfers and some mechanism puzzles remain design work. Physical phone testing is still required. See [delivery and residuals](docs/DELIVERY.md).

## Run

With Node.js 22+ and pnpm installed:

```sh
pnpm install
pnpm dev
```

Open the local URL printed by Vite. Phone motion sensors require HTTPS; a plain HTTP LAN URL supports the touch controls but generally cannot enable motion. Serve the production build over HTTPS to test actual sensors.

```sh
pnpm test
pnpm build
pnpm preview
```

With the development server running, use `pnpm test:browser` for the Chrome/Chromium gameplay checks. On machines without the standard macOS Chrome installation, first run `pnpm exec playwright install chromium`, or set `PLAYWRIGHT_CHROMIUM_EXECUTABLE` to a browser executable.

## Controls

- **Phone:** enable motion while holding the device comfortably. Your bank angle sets the world angle: hold the phone still and the world stops rotating. A progressive curve gives gentle precision near neutral and stronger rotation farther out: about 12° of world rotation at 10° of phone bank, 52° at 30°, a ceiling at about 56°, and a full turn at 75°. Calibrate sets the current holding position to a flat world. Keyboard/touch buttons still rotate while held.
- **Keyboard:** left/right arrows or A/D tilt; Space brakes; R restarts; Escape pauses/resumes; F toggles the FPS overlay; M opens the whole-map view and pauses the ride.
- **Touch fallback:** hold the direction buttons to rotate the world; hold Brake to lock the wheels relative to the frame. Hard braking at speed can pitch the bike.
- **Multiple phone turns:** pause, hold the phone in a comfortable pose, and resume to reanchor motion while preserving the world angle. Advanced routes explain this in their pause hints.
- **MAP:** inspect the complete route, remaining apples, and your position while physics is paused; tap RIDE to continue.
- Collect every apple before reaching the exit. Touching an obstacle with Newton’s head ends the attempt.

Progress saves locally on the current browser. There is no account or server requirement. The game pauses when the tab loses focus. The development build exposes `window.__NEWTON__` for diagnostics and map testing; production builds do not expose it.

## Design and implementation records

- [Plan and parallel ownership](PLAN.md)
- [Advance adversarial review](docs/advance-review.md)
- [Map routes and validation](docs/maps.md)
- [Implementation and review record](docs/implementation-log.md)
- [Independent gameplay validation](docs/gameplay-v2.md)
- Slice reviews and residual issues are recorded in `docs/`.

The first ten redesigned routes span 74–119 metres in successful controlled replays, lasting roughly 45–81 seconds. They include rolling terraces, return detours, compact pendulums, and nested galleries. The Escher map turns through all four gravity faces and returns onto the floor that was previously the entry ceiling, using readable planar collision geometry. Selected final-map objects follow a reversible authored timeline while the bicycle remains live. This is not arbitrary backwards rigid-body simulation.

Four additional routes ride around the same platform onto its underside, wind inward through a circular spiral with two real gaps, somersault between scaffold tiers, and chain opposing wall jumps into an inverted ascent back to the starting door. Their rendered demonstrations take about 31–132 seconds. See [expansion gameplay evidence](docs/expansion-gameplay.md).

**Map 15 — Stairway to Heaven** adds four 11-metre steps. Ride each vertical face, ease over the 90° crest, gather eight apples and descend to the starting door. Its demonstrated route takes about 2 minutes 40 seconds. See [stairway evidence](docs/stairway.md).

Time platforms have a reversible target and a speed-limited physical position. After fast travel, a platform may briefly continue catching up when the bicycle stops. The clock saturates at its endpoints.

## Performance

Physics runs at fixed 120 Hz, with a maximum of eight catch-up steps per display frame. The overlay reports FPS, smoothed frame time, and physics timing. Desktop results do not establish actual phone performance; sensor response and frame pacing need physical-device validation.

## Repository

The [repository](https://github.com/JanFredricS/elasto-tilt) is public. GitHub Pages publishes only the generated `dist` directory. `pnpm build:pages` sets asset URLs to `/elasto-tilt/`; the ordinary local build and development server keep their root paths.
