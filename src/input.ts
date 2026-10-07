import type { InputController, SteeringMode } from './types';

const clamp = (value: number) => Math.max(-1, Math.min(1, value));
const radians = Math.PI / 180;
const DEAD_ZONE = .75;
const FULL_BANK = 75;
// Within ±FULL_BANK the cubic is precision steering for ordinary maps: a full
// world turn in a comfortable wrist twist. Past it the player is physically
// turning the phone hand-over-hand like a steering wheel (spiral maps need
// 2+ world turns), so the gain should drop to ≈1 and stay steady: at the
// cubic's own end slope (d/dx of 2π(.25x + .75x³) at x = 1 is 5π per curve
// unit ≈ 12 world°/phone°) hand tremor would become ±10° world wobble.
// CRUISE_GAIN 1.25 world°/phone° keeps a little assist while staying tremor-
// tolerant; Spiral Sanctuary's ~802° then needs ≈376° of phone twist (about
// one physical turn). Over BLEND_WIDTH the slope eases from the cubic's end
// slope to the cruise slope along a smoothstep, so the knee is C¹ (no notch)
// and the cruise join is C². 12° is short enough to reach cruise quickly yet
// long enough that the deceleration is not felt as a detent.
const END_SLOPE = 5 * Math.PI / (FULL_BANK - DEAD_ZONE);
const CRUISE_GAIN = 1.25;
const CRUISE_SLOPE = CRUISE_GAIN * radians;
const BLEND_WIDTH = 12;
const BLEND_END = 2 * Math.PI + BLEND_WIDTH * (END_SLOPE + CRUISE_SLOPE) / 2;
// Near flat, the screen-plane gravity vector vanishes and its direction is
// noise. Only a phone within 3° of flat is truly unobservable: freeze below
// sin(3°), resume above sin(4°) (a 5° exit could trap a phone held at 4° with
// sensor noise of a degree: once it dipped under 3° it never got back out). The old 10°/14° freeze also discarded the
// twist made while frozen, so a hand-over-hand turn with the phone held low
// (lap, table edge) silently lost or "locked" its angle part-way round.
// Between 3° and 10° the direction is real but noisier (sensor noise / sin
// of the tilt), so instead of a hold it is followed through an extra low-pass
// whose lag grows as confidence falls (to at most .15 s, so a fast turn
// near flat trails by < 30° at 200°/s); above 10° it is followed exactly.
const FLAT_ENTER = Math.sin(3 * radians);
const FLAT_EXIT = Math.sin(4 * radians);
const CONFIDENT = Math.sin(10 * radians);
const LOW_CONFIDENCE_LAG = .15;

/** Gravity's down direction in device x/y (W3C DeviceOrientation, Z-X'-Y''). */
function deviceGravity(beta: number, gamma: number) {
  const b = beta * radians, g = gamma * radians;
  return { x: Math.cos(b) * Math.sin(g), y: -Math.sin(b) };
}
/** Shortest signed equivalent of an angle step, in [-180, 180). Math.round
 * sends both ±180 to -180, so an exact half-turn step is deterministic; at
 * 60 Hz any real twist rate below 10 800°/s stays well inside the range. */
export const wrap180 = (degrees: number) => degrees - 360 * Math.round(degrees / 360);

/** Steering-wheel angle of the screen: direction of gravity within the screen
 * plane, 0 when the screen's bottom edge points down, positive as the phone
 * turns clockwise (right edge down), range [-180, 180). Using atan2 of both
 * in-plane components keeps it continuous through 90° and upside down; it depends only on the
 * gravity vector, so equivalent Euler representations agree. Rotating the
 * screen content by `screenAngle` adds exactly that angle.
 */
export function screenBank(beta: number, gamma: number, screenAngle: number): number {
  const { x, y } = deviceGravity(beta, gamma);
  return wrap180(Math.atan2(x, -y) / radians + screenAngle);
}
export function bankOffset(delta: number) {
  if (!Number.isFinite(delta)) return 0;
  const magnitude = Math.abs(delta);
  // Gentle precision near neutral, progressively stronger steering, reaching a
  // full turn at 75° of bank, then easing (C¹) to a steady ~1:1 cruise.
  if (magnitude >= FULL_BANK + BLEND_WIDTH) {
    return Math.sign(delta) * (BLEND_END + (magnitude - FULL_BANK - BLEND_WIDTH) * CRUISE_SLOPE);
  }
  if (magnitude > FULL_BANK) {
    // slope(t) = CRUISE + (END − CRUISE)(1 − 3t² + 2t³), integrated over t.
    const t = (magnitude - FULL_BANK) / BLEND_WIDTH;
    const eased = t - t * t * t + t * t * t * t / 2;
    return Math.sign(delta) * (2 * Math.PI + BLEND_WIDTH * (CRUISE_SLOPE * t + (END_SLOPE - CRUISE_SLOPE) * eased));
  }
  const x = Math.max(0, magnitude - DEAD_ZONE) / (FULL_BANK - DEAD_ZONE);
  return Math.sign(delta) * 2 * Math.PI * (.25 * x + .75 * x * x * x);
}

/** Steering-mode command offset in radians for `delta` degrees of phone twist.
 * 'direct' is exact 1:1 (no dead zone, curve or gain): the world turns
 * precisely as far as the phone does. 'assisted' is the eased `bankOffset`. */
export function steeringOffset(mode: SteeringMode, delta: number) {
  if (mode !== 'direct') return bankOffset(delta);
  return Number.isFinite(delta) ? delta * radians : 0;
}

export const STEERING_KEY = 'newtons-ride.steering.v1';
export const parseSteeringMode = (value: unknown): SteeringMode => value === 'direct' ? 'direct' : 'assisted';
/** Stored steering preference; private mode or blocked storage fall back to assisted. */
export function loadSteeringMode(storage: Pick<Storage, 'getItem'> | undefined): SteeringMode {
  try { return parseSteeringMode(storage?.getItem(STEERING_KEY)); } catch { return 'assisted'; }
}
export function saveSteeringMode(storage: Pick<Storage, 'setItem'> | undefined, mode: SteeringMode) {
  try { storage?.setItem(STEERING_KEY, parseSteeringMode(mode)); } catch { /* Preferences are optional. */ }
}
const motionLabel = (mode: SteeringMode) => mode === 'direct' ? 'Motion — 1:1 steering' : 'Motion — angle control';

/** Phone pose controls an angle; held keys/buttons control rotation speed. */
export function createInput(initialSteering: SteeringMode = 'assisted'): InputController {
  let steering = parseSteeringMode(initialSteering);
  const keys = new Set<string>();
  let touchBrake = false, touchTilt = 0, smoothedRate = 0;
  let motionEnabled = false, raw: number | undefined, baseline: number | undefined;
  let currentAngle = 0, anchor = 0, smoothedAngle = 0, manualOverride = false;
  let inputMode = 'Keyboard / touch', destroyed = false, motionGeneration = 0;
  // Unwrapped steering angle (degrees) is accumulated from wrapped per-sample
  // deltas so it is continuous across any number of turns. It is measured in
  // fixed device axes: a rotation about the screen normal is the same angle in
  // every screen orientation, so OS auto-rotate cannot move the target.
  // `raw` is the measured unwrapped twist; `steady` follows it, exactly when
  // the phone is well off flat and through a confidence-weighted lag near flat.
  // `lastDirection` survives a freeze so the unwrap stays continuous across it.
  let lastDirection: number | undefined, flat = false, confidence = 1, steady: number | undefined;
  const keydown = (event: KeyboardEvent) => {
    if ((event.target as HTMLElement | null)?.closest?.('input, textarea, select, [contenteditable="true"]')) return;
    if (event.code === 'Space' && (event.target as HTMLElement | null)?.closest?.('button, a, [role="button"]')) return;
    if (['ArrowLeft', 'ArrowRight', 'KeyA', 'KeyD', 'Space'].includes(event.code)) {
      event.preventDefault(); keys.add(event.code);
    }
  };
  const keyup = (event: KeyboardEvent) => { keys.delete(event.code); };
  const reset = (worldAngle = currentAngle) => {
    keys.clear(); touchBrake = false; touchTilt = 0; smoothedRate = 0; manualOverride = false;
    raw = baseline = lastDirection = steady = undefined; flat = false; confidence = 1;
    currentAngle = anchor = smoothedAngle = Number.isFinite(worldAngle) ? worldAngle : 0;
  };
  const blur = () => reset();
  const calibrate = () => {
    baseline = steady = raw;
    // Flatten by the nearest equivalent turn, preserving full-turn progress.
    // Start smoothing at the actual pose, not a sensor target still catching up.
    anchor = Math.round(currentAngle / (2 * Math.PI)) * 2 * Math.PI;
    smoothedAngle = currentAngle;
    smoothedRate = 0;
    manualOverride = false;
  };
  const orientation = (event: DeviceOrientationEvent) => {
    if (!motionEnabled || document.hidden || event.beta === null || event.gamma === null || !Number.isFinite(event.beta + event.gamma)) return;
    const gravity = deviceGravity(event.beta, event.gamma);
    const planar = Math.hypot(gravity.x, gravity.y);
    flat = planar < (flat ? FLAT_EXIT : FLAT_ENTER);
    // Hold the last bank while flat, but keep `lastDirection`: on leaving flat
    // the twist made meanwhile is counted by the shortest step, not dropped.
    if (flat) return;
    confidence = Math.min(1, (planar - FLAT_ENTER) / (CONFIDENT - FLAT_ENTER));
    const direction = Math.atan2(gravity.x, -gravity.y) / radians;
    raw = raw === undefined || lastDirection === undefined ? raw ?? direction : raw + wrap180(direction - lastDirection);
    lastDirection = direction;
    if (steady === undefined) steady = raw;
    if (baseline === undefined) baseline = raw;
    inputMode = motionLabel(steering);
  };
  const visibility = () => { if (document.hidden) reset(); };
  window.addEventListener('keydown', keydown);
  window.addEventListener('keyup', keyup);
  window.addEventListener('blur', blur);
  window.addEventListener('deviceorientation', orientation);
  document.addEventListener('visibilitychange', visibility);
  return {
    read(dt, worldAngle) {
      if (worldAngle !== undefined && Number.isFinite(worldAngle)) currentAngle = worldAngle;
      const keyboard = Number(keys.has('ArrowRight') || keys.has('KeyD')) - Number(keys.has('ArrowLeft') || keys.has('KeyA'));
      const manual = keyboard || touchTilt;
      const duration = Number.isFinite(dt) ? Math.max(0, Math.min(dt, .1)) : 0;
      const smoothing = 1 - Math.exp(-duration / .065);
      const brake = touchBrake || keys.has('Space');
      if (!manual && motionEnabled && raw !== undefined && baseline !== undefined) {
        // Confidence 1 → no lag (exactly raw); towards 3° the lag reaches .15 s.
        // A convex step toward raw keeps a monotone twist monotone.
        const lag = LOW_CONFIDENCE_LAG * (1 - confidence);
        steady = steady === undefined || lag <= 0 ? raw : steady + (raw - steady) * (1 - Math.exp(-duration / lag));
        const offset = steeringOffset(steering, steady - baseline);
        if (manualOverride) {
          // Touch/keyboard can reposition the room without fighting the sensor
          // or snapping back when the button is released.
          anchor = currentAngle - offset;
          smoothedAngle = currentAngle;
          manualOverride = false;
        }
        smoothedRate = 0;
        smoothedAngle += (anchor + offset - smoothedAngle) * smoothing;
        // Keep the last pose if events stop. An absolute target cannot run away;
        // automatically recalibrating a still phone would cause a later jump.
        return { tilt: 0, brake, worldAngle: smoothedAngle };
      }
      if (manual) manualOverride = true;
      smoothedRate += (manual - smoothedRate) * smoothing;
      if (Math.abs(smoothedRate) < .001) smoothedRate = 0;
      return { tilt: smoothedRate, brake };
    },
    async enableMotion() {
      const constructor = window.DeviceOrientationEvent as typeof DeviceOrientationEvent & { requestPermission?: () => Promise<string> };
      const generation = ++motionGeneration;
      if (!constructor) return (inputMode = 'Motion unavailable — use arrows or touch');
      try {
        const permission = constructor.requestPermission ? await constructor.requestPermission() : 'granted';
        if (destroyed || generation !== motionGeneration) return inputMode;
        if (permission !== 'granted') {
          motionEnabled = false; return (inputMode = 'Motion denied — use arrows or touch');
        }
        motionEnabled = true;
        raw = baseline = lastDirection = steady = undefined; flat = false; confidence = 1;
        anchor = smoothedAngle = currentAngle;
        return (inputMode = 'Waiting for motion — hold comfortably, then tilt');
      } catch {
        if (destroyed || generation !== motionGeneration) return inputMode;
        motionEnabled = false; return (inputMode = 'Motion unavailable — use arrows or touch');
      }
    },
    calibrate,
    setSteering(mode) {
      const next = parseSteeringMode(mode);
      if (next === steering) return;
      steering = next;
      // Re-reference at the actual world pose: the current phone twist now
      // commands exactly the current world angle, and further twist proceeds
      // in the new mapping. Unlike calibrate(), no snap to a flat turn.
      baseline = steady = raw;
      anchor = smoothedAngle = currentAngle;
      smoothedRate = 0;
      manualOverride = false;
      if (inputMode.startsWith('Motion — ')) inputMode = motionLabel(steering);
    },
    get steering() { return steering; },
    setBrake(pressed) { touchBrake = pressed; },
    setTouchTilt(value) { touchTilt = Number.isFinite(value) ? clamp(value) : 0; },
    reset,
    get mode() { return inputMode; },
    destroy() {
      destroyed = true; motionGeneration++; motionEnabled = false; reset();
      window.removeEventListener('keydown', keydown); window.removeEventListener('keyup', keyup);
      window.removeEventListener('blur', blur); window.removeEventListener('deviceorientation', orientation);
      document.removeEventListener('visibilitychange', visibility);
    },
  };
}
