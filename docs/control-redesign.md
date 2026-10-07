# Control and pendulum redesign

Phone motion is an absolute world-angle target. Holding the phone still holds that target, including when sensor events stop. Keyboard and touch arrows remain rotation-rate controls. Gravity changes still wake every dynamic body, including resting props and pendulums.

Screen bank is the phone's steering-wheel angle: the direction of gravity within the screen plane, measured with both in-plane components so it stays continuous through vertical and upside down:

```
gx = cos(β)·sin(γ),  gy = −sin(β)          (device-frame gravity, W3C β/γ)
direction = atan2(gx, −gy)                  (0 = bottom edge down, + = clockwise)
bank += wrap180(direction − previousDirection)   (unwrapped, unbounded)
```

The unwrapped bank is accumulated in fixed device axes. A rotation about the screen normal is the same angle in every screen orientation, so OS auto-rotate (which fires around 45–60° of twist) no longer resets calibration or moves the target. Blur and hidden-page resets are kept. When the phone lies near flat, the in-plane gravity magnitude `hypot(gx, gy)` vanishes and the direction is noise: the bank freezes below sin(10°) and resumes above sin(14°) (hysteresis around 12°), re-referencing so leaving flat never jumps. *(Superseded: the freeze is now 3°/5° with a confidence-weighted lag up to 10°, and the twist made while flat is kept. See [controls-full-circle.md](controls-full-circle.md).)* A flat phone cannot calibrate; motion waits for the first non-flat sample.

For signed bank displacement `b` in degrees from calibration:

```
x = clamp((abs(b) - 0.75) / 74.25, 0, 1)
worldAngleOffset = sign(b) * 2π * (0.25x + 0.75x³)              for abs(b) ≤ 75
worldAngleOffset = sign(b) * (2π + (abs(b) − 75) · 5π / 74.25)   for abs(b) > 75
```

The curve is odd, continuous and strictly increasing outside the 0.75° neutral zone. Its centre slope is approximately 1.21 world degrees per phone degree. Ten degrees of phone bank produces 11.73° of world rotation; 30° produces 51.96°; 45° produces 110.79°; 75° reaches a full 360° turn. Beyond 75° it continues linearly with the curve's end slope (about 12.1 world degrees per phone degree, C¹-continuous) instead of clamping, so a determined twist keeps turning the world for multi-turn routes; physics still limits world rotation to 2.5 rad/s. Calibration chooses the nearest physically flat full turn (`round(currentAngle / 2π) × 2π`), so calibrating after a complete rotation does not command an unwanted reverse revolution. Calibration also restarts smoothing from the actual world angle, avoiding a stale sensor target while the world is catching up. Blur, visibility, reset and manual override behaviour are preserved.

Brakes use equal and opposite wheel/frame torque. The brake captures relative wheel angles, damps relative angular speed according to the effective inertias and timestep, and adds a compliant position correction to prevent slow downhill creep. Maximum torque per wheel is `2 × bike mass × gravity × wheel radius`, approximately 27.7 N·m with this bike, versus the former fixed 4 N·m cap. When torque saturates, the slipping brake updates its contact angle instead of winding up a positional spring. Rapier's installed JavaScript joint API exposes motor velocity/stiffness but no maximum motor-force setting, so a bounded torque controller is used. No wheel is anchored to the world and no world velocity is overwritten. Fast hard braking can still pitch the rider over; braking does not make the bicycle immune to physics.

Pendulums use a seat-centred dynamic body, a fixed anchor, and a revolute joint at local `(0, length)`. The initial seat position is `(anchor.x + length*sin(angle), anchor.y - length*cos(angle))`. This makes both rotated spawn geometry and centre-of-mass placement explicit. The former pivot-origin offset-collider construction was mathematically equivalent in position; it was not sufficient evidence of a broken initial pose. Authored damping now applies to linear seat motion as well as angular motion, so the pendulum's orbital movement actually settles. A narrow seat's own angular inertia alone contributes little damping to its much larger orbital inertia. Seats of width 2.3–3m and suspension length 2.5–4m leave useful bike clearance without becoming broad moving floors.

Validation covers curve shape and endpoints, equivalent sensor representations, calibration/lifecycle behaviour, held-pose stability, steep-slope holds, real stopping distance, relative wheel-angle locking, brake release, the cradle pivot, inversion stability, rotated swing spawn, gravity-driven oscillation, and a compact swing carrying a rider after settling. At 0.6 radians of downhill gravity, a braked stationary bike travels under 7cm over two seconds while its freely rolling counterpart travels over 9m. After 0.2 seconds of downhill rolling, the braked bike travels under 8cm further while remaining upright. Loaded 2.6m seats settle within 1mm drift per second, then carry their rider over 1.5m in either gravity direction. These are controlled component replays, not proof that every authored campaign route is completable.

Focused validation: 45 cases across six input/physics suites (the two existing passive-carry cases are **expected failures**, not acceptance passes). The 21-case input suite includes steering through vertical and upside down, multi-turn unwrapping, screen rotation mid-hold, flat-phone freezing with hysteresis, exact full-turn calibration, nearby tilted calibration and stale-target calibration regressions. The earlier short cradle replay now observes at 0.55 seconds rather than 0.50 seconds because stronger wheel/frame braking changes pivot timing; its original >0.9-radian pivot, captured front-wheel height and joint-distance checks are retained. Sustained inverted hanging followed by swing capture is still outside this component evidence. Physical-device comfort and sensor performance still require phone testing. Existing horizontal/oblique temporal carrying feedback is unchanged and remains documented in `physics-residuals.md`.
