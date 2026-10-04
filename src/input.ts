import type { InputController } from './types';

const clamp = (value: number) => Math.max(-1, Math.min(1, value));
const radians = Math.PI / 180;
const DEAD_ZONE = .75;
const FULL_BANK = 75;
// Beyond FULL_BANK the curve continues linearly with its end slope
// (d/dx of 2π(.25x + .75x³) at x = 1 is 5π per curve unit), so a determined
// twist keeps turning the world instead of saturating.
const END_SLOPE = 5 * Math.PI / (FULL_BANK - DEAD_ZONE);
// Near flat, the screen-plane gravity vector vanishes and its direction is
// noise. Freeze below sin(10°), resume above sin(14°) (hysteresis around 12°).
const FLAT_ENTER = Math.sin(10 * radians);
const FLAT_EXIT = Math.sin(14 * radians);

/** Gravity's down direction in device x/y (W3C DeviceOrientation, Z-X'-Y''). */
function deviceGravity(beta: number, gamma: number) {
  const b = beta * radians, g = gamma * radians;
  return { x: Math.cos(b) * Math.sin(g), y: -Math.sin(b) };
}
const wrap180 = (degrees: number) => degrees - 360 * Math.round(degrees / 360);

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
  // full turn at 75° of bank and continuing linearly (C¹) beyond it.
  if (magnitude > FULL_BANK) return Math.sign(delta) * (2 * Math.PI + (magnitude - FULL_BANK) * END_SLOPE);
  const x = Math.max(0, magnitude - DEAD_ZONE) / (FULL_BANK - DEAD_ZONE);
  return Math.sign(delta) * 2 * Math.PI * (.25 * x + .75 * x * x * x);
}

/** Phone pose controls an angle; held keys/buttons control rotation speed. */
export function createInput(): InputController {
  const keys = new Set<string>();
  let touchBrake = false, touchTilt = 0, smoothedRate = 0;
  let motionEnabled = false, raw: number | undefined, baseline: number | undefined;
  let currentAngle = 0, anchor = 0, smoothedAngle = 0, manualOverride = false;
  let inputMode = 'Keyboard / touch', destroyed = false, motionGeneration = 0;
  // Unwrapped steering angle (degrees) is accumulated from wrapped per-sample
  // deltas so it is continuous across any number of turns. It is measured in
  // fixed device axes: a rotation about the screen normal is the same angle in
  // every screen orientation, so OS auto-rotate cannot move the target.
  let lastDirection: number | undefined, flat = false;
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
    raw = baseline = lastDirection = undefined; flat = false;
    currentAngle = anchor = smoothedAngle = Number.isFinite(worldAngle) ? worldAngle : 0;
  };
  const blur = () => reset();
  const calibrate = () => {
    baseline = raw;
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
    if (flat) {
      // Hold the last bank; resume from the next well-defined direction
      // without counting the unobservable change made while flat.
      lastDirection = undefined;
      return;
    }
    const direction = Math.atan2(gravity.x, -gravity.y) / radians;
    raw = raw === undefined ? direction : lastDirection === undefined ? raw : raw + wrap180(direction - lastDirection);
    lastDirection = direction;
    if (baseline === undefined) baseline = raw;
    inputMode = 'Motion — angle control';
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
        const offset = bankOffset(raw - baseline);
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
        raw = baseline = lastDirection = undefined; flat = false;
        anchor = smoothedAngle = currentAngle;
        return (inputMode = 'Waiting for motion — hold comfortably, then tilt');
      } catch {
        if (destroyed || generation !== motionGeneration) return inputMode;
        motionEnabled = false; return (inputMode = 'Motion unavailable — use arrows or touch');
      }
    },
    calibrate,
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
