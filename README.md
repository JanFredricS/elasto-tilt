# Newton’s Ride

A mobile-first bicycle physics puzzle. Tilt the world, brake to pivot, collect Newton’s apples, and ride walls and ceilings. Built with TypeScript, PixiJS and Rapier 2D.

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

## Controls

- **Phone:** enable motion from the interface and calibrate while holding the device comfortably. Tilt adjusts the world’s rotation speed; neutral holds its current angle.
- **Keyboard:** left/right arrows or A/D tilt; Space brakes; R restarts; Escape pauses/resumes; F toggles the FPS overlay.
- **Touch fallback:** hold the direction buttons to rotate the world; hold Brake to resist wheel rotation.
- Collect every apple before reaching the exit. A helmet hit ends the attempt.

Progress saves locally on the current browser. There is no account or server requirement. The game pauses when the tab loses focus. The development build exposes `window.__NEWTON__` for diagnostics and map testing; production builds do not expose it.

## Design and implementation records

- [Plan and parallel ownership](PLAN.md)
- [Advance adversarial review](docs/advance-review.md)
- [Map routes and validation](docs/maps.md)
- Slice reviews and residual issues are recorded in `docs/`.

The Escher map uses readable planar collision geometry. Selected final-map objects follow a reversible authored timeline while the bicycle remains live. This is not arbitrary backwards rigid-body simulation.

## Performance

Physics runs at fixed 120 Hz, with a maximum of eight catch-up steps per display frame. The overlay reports FPS, smoothed frame time, and physics timing. Desktop results do not establish actual phone performance; sensor response and frame pacing need physical-device validation.

## Repository

This project uses a local Git repository. Remote publication status is recorded in the final delivery report; do not assume a GitHub remote exists if authentication was unavailable.
