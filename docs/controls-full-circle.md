# Full-circle steering, orientation hold and tilt-button zones

## 1. Full-circle motion steering (`src/input.ts`)

**Symptom.** Turning the phone like a steering wheel through one or more full turns sometimes "locked" part-way round: the world stopped following, or came back short of the turn.

**Root cause.** The flat-phone freeze. In-plane gravity `hypot(gx, gy)` is `sin(tilt)`. The old code froze the bank below sin 10° and resumed above sin 14°. On resuming it re-referenced (`lastDirection = undefined`), throwing away any twist made while frozen. A hand-over-hand turn with the phone held low passes through that band:

- turning on a lap or a table edge;
- the wrist rolling flat at the top of a turn.

Each pass silently lost the twist, so the world stopped or fell short.

Other suspects that were checked and ruled out:

- **`wrap180`.** It is exact for any per-sample step under 180°. At 60 Hz that is 10 800°/s; the tests use 20° steps. ±180 both map to −180, deterministically.
- **Euler representation flips.** Near gamma ±90 the browser can report (β, γ) or (180−β, γ∓180). `deviceGravity` is identical for both, and the tests inject flips on every other sample.
- **Physics `maxRotation` (2.5 rad/s).** This adds lag, not a lock. It is unchanged.
- **Other paths.** `calibrate`, `setSteering`, manual override and blur/visibility resets are unchanged in behaviour.

**Fix.**

- **Freeze only a truly flat phone.** It now freezes below sin 3° and resumes above sin 4° (fix pass 1: a 5° exit could trap a phone held at 4° with sensor noise; the 1° hysteresis still stops chatter). While frozen it keeps `lastDirection`. On leaving flat, the twist made meanwhile is counted by the shortest step. It is no longer dropped.
- **Follow, never hold, between 3° and 10°.** In this band the direction is real but noisier. It goes through a low-pass on a separate `steady` value:
  - `confidence = (planar − sin 3°) / (sin 10° − sin 3°)`;
  - the lag is `.15 s × (1 − confidence)` (`LOW_CONFIDENCE_LAG`, halved from .3 in fix pass 1), so it reaches 0 at 10° and above.

  The low-pass is a convex step toward the measurement, so a monotone twist stays monotone. Above 10°, `steady === raw` exactly.
- **Resets.** `calibrate()` and `setSteering()` re-reference both `baseline` and `steady`.

**Known limit.** A twist of more than 180° made while the phone is within 3° of flat cannot be observed. It is counted as its shortest equivalent.

**Design note: the flat band is the knob.** `FLAT_ENTER` (sin 3°) and `FLAT_EXIT` (sin 4°) in `src/input.ts` are the one tuning point for near-flat play. In simulation (gravity noise σ ≈ .25–.3°) a phone held at 3° stays frozen, one at 3.5° (inside the band) loses about a third of a 1080° turn, and from 4° on it tracks fully. If the 4° exit ever feels sticky on a real phone (a nearly flat phone that will not start turning the world), lower `FLAT_EXIT` to sin 3.5°. Keep at least ½° between the two so sensor noise cannot chatter in and out of flat.

**Reproduce / regression tests.** `tests/input-full-circle.test.ts`:

- **Turns.** 0 → 720° in 3° steps, then back to −720°. This runs for tilts of 90, 60, 30, 12, 6 and 4°, in both `assisted` and `direct` modes, with Euler flips injected. Each run must be monotone and within ±1° at every quarter turn.
- **Fast turns.** 20° per sample up to 1440° at tilts of 60 and 90°.
- **wrap180.** Its edge cases, ±180 included.
- **The reported lock.** A 12° tilt that dips to 1° part-way round.
- **Screen orientation.** A change in `screen.orientation.angle` must not move the target.
- **Nearly flat turns.** A phone at 4° ± .8° of noise turned at 90 and 200°/s is neither trapped nor far behind: it settles within 1° of 1080° and its worst lag stays under a quarter second of rotation. This fails with the old 5° / .3 s constants.

Five of these cases fail against the old input code. `tests/input.test.ts` covers the new hysteresis (still frozen at 3.5°, resumes past 4°) and lag band.

## 2. OS auto-rotate orientation hold (`src/orientation-hold.ts`)

**Problem.** Twisting past about 45–60° makes iOS or Android re-lay the page between portrait and landscape mid-turn. Steering was already measured in fixed device axes, so the angle was unaffected, but the whole UI jumped. Safari cannot lock orientation outside fullscreen.

**How the hold works.**

1. **Arm, then latch.** On the first frame of play it only records the world angle; the layout still follows the OS, so a player who starts in an unusual grip is not held there. Once the world has turned more than `ARM_ANGLE` (.2 rad) from that start, it latches the current OS angle, but only a landscape one (90° or 270°). A portrait angle, or the OS mid-turn, waits for the next landscape report. Leaving play (pause, menu, crash, finish) releases it, and resuming or retrying re-arms from the world angle at that moment. An in-play restart (the HUD ↺ or R) never leaves `playing`, so `load()` calls `hold.reset()` before setting the status: without it the stale latch survived the restart, the level restarted sideways and rotating back gave a 180° glue.
2. While latched and the OS reports a different angle, it counter-rotates `#app`. `holdTransform(held, current, vw, vh)` is pure:
   - the rotation is the negative of the OS delta (a half turn is its own inverse);
   - on a quarter turn, the logical box is the viewport with width and height swapped, centred.
3. The renderer resizes to the logical box (`onLayout → renderer.resize()`).
4. **Safe areas follow the box.** A hidden probe reads `env(safe-area-inset-*)` in physical sides. `remapInsets(rotation, physical)` maps them onto the counter-rotated box's sides; for example a 90° hold puts the physical right inset (the notch) on the logical top. They are written to `--safe-top/right/bottom/left` on `#app`, and every stylesheet `env(safe-area-inset-*)` now reads those variables, which default to `env()` when not held.

**The iOS sign (one on-device check).** `screenAngle()` multiplies the reported angle (`screen.orientation.angle`, else the legacy `window.orientation`) by `OS_ANGLE_SIGN` (1). The convention (90 = a counter-clockwise device turn) is verified in Chromium device emulation only; iOS Safari's sign has not been confirmed on a device. The check: start a motion-steered map, steer, and turn the phone into each landscape direction and back to portrait. If the held layout turns the wrong way on a quarter turn, flip that one constant to −1. Half turns are unaffected (180° is its own inverse).

**When it is active.** `main.ts` turns it on only while `status === 'playing'`, not surveying, and in a motion mode. Menus and pause screens use the normal OS layout.

**Fullscreen.** In fullscreen (`display-mode.ts`), the browser lock `screen.orientation.lock('landscape')` is also attempted. The lock is released when fullscreen exits. While the hold is latched (the `html.orientation-latched` class, `orientationLatched()`), `display-mode.update()` returns early, so the two do not fight. It keys on the latch, not on `html.orientation-held` (set only while a counter-rotation is applied): iOS can fire `resize` before it updates the reported angle, and in that instant the hold is latched but not yet applied, so keying on `orientation-held` let display-mode re-lay the page for one frame.

**Layout follows the held box.** `#app` is a size container (`container: app / size`). Every layout breakpoint is `@container app (…)`, and `100vw` became `100cqw`. Breakpoints therefore follow the counter-rotated logical box, not the physical viewport.

**Tests.** `tests/orientation-hold.test.ts` covers the pure transform for all four deltas, `remapInsets` for every rotation, and a controller with a stubbed window, screen and document: it follows the OS until the player steers, then latches and counter-rotates; it re-arms from the world angle on resume or retry; it latches only a landscape angle; it stays latched (class set) when the resize arrives before the angle update; and `reset()` releases and re-arms. Real-device behaviour is untested.

## 3. Tilt buttons and invisible hit zones (`src/style.css`)

**Visible sizes.**

| Breakpoint | Before | After |
| --- | --- | --- |
| Base | 82×76 | 140×84 |
| `@container` ≤ 760 px wide | 64×62 | `min(108px, (100cqw − 160px)/2)`×68 |
| ≤ 460 px tall landscape | 62×55 | 104×60 |

**Invisible hit zones.** Each button has a `::before` hit zone. Pointer capture and hold logic in `ui.ts` are unchanged.

- **TILT LEFT** reaches the bottom-left screen corner and the left and bottom edges, plus 12 px above.
- **TILT RIGHT** covers half the gap to TILT LEFT, plus 24 px to its right (16 px at ≤ 760 px wide, so it stays clear of the centred utility bar) and 12 px above.
- **BRAKE** reaches the bottom-right corner, plus 14 px above and to its left.

Fix pass 1 trimmed the zones above the buttons from 15 to 12 px and raised the touch utility bar (below), so no hit zone reaches under a utility button at 667×375, 844×390 or 390×844.

A thumb that lands short of a button, or in the corner, still holds it.

**No overlap.** On touch devices (`hover: none` or `pointer: coarse`), the centred utility bar sits 110 px higher, so the wider left pair never sits under it. The breakpoint sizes keep the dock clear of the utility bar and HUD at 667×375 and 390×844. In short landscape (`@container app (max-height: 460px)`) the utility bar now sits in the dock row, between TILT RIGHT's touch zone and BRAKE's, wrapping onto two or three rows (fix pass 2): at its old place under the top-right row it ran under First Lesson's level banner (objective line) at 667×375 and 568×320, and anywhere higher it would cover the road the rider is on. Checked for all 20 levels at 932×430, 844×390, 740×360, 667×375 and 568×320: no utility button overlaps the banner, HUD, horizon gauge, timeline or a tilt/brake zone, and every button centre hit-tests to itself.

**Optional browser check.** `pnpm test:browser` (dev server on port 5183) includes `e2e/display-mode.spec.ts` and the `game.spec.ts` "layout keeps controls within viewport" cases.

## 4. Not verified on a device

Everything above was checked in unit tests, simulation and Chromium device emulation only. Still open:

- **`OS_ANGLE_SIGN`.** The sign of `screen.orientation.angle` on iOS Safari (section 2 has the one-minute check).
- **Event order on iOS Safari.** Whether `resize` arrives before or after the angle update. Both orders are handled and unit-tested (keyed on the latch), but neither has been observed on an iPhone.
- **`screen.orientation.lock('landscape')` in fullscreen.** Whether it succeeds on Android Chrome and how it interacts with the hold.
- **Real safe-area values.** The probe was verified only to read 0 px; the remap for a notch under a held quarter turn has not been seen on a notched phone.
- **Real gravity noise** in the 3°–4° flat band (section 1's design note).
