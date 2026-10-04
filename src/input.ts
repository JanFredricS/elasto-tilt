import type { InputController } from './types';

const clamp = (value: number) => Math.max(-1, Math.min(1, value));
const radians = Math.PI / 180;
const DEAD_ZONE = .75;
const FULL_BANK = 75;

/** Project gravity onto the screen's horizontal axis. Unlike raw Euler angles,
 * this remains continuous when beta/gamma change representation near upright.
 */
export function screenBank(beta: number, gamma: number, screenAngle: number): number {
  const b = beta * radians, g = gamma * radians, s = screenAngle * radians;
  const deviceX = Math.cos(b) * Math.sin(g);
  const deviceY = -Math.sin(b);
  return Math.asin(clamp(deviceX * Math.cos(s) - deviceY * Math.sin(s))) / radians;
}
export function bankOffset(delta: number) {
  if (!Number.isFinite(delta)) return 0;
  const x = Math.min(1, Math.max(0, Math.abs(delta) - DEAD_ZONE) / (FULL_BANK - DEAD_ZONE));
  // Gentle precision near neutral, progressively stronger steering toward a
  // ceiling. This odd, monotonic curve reaches a full turn at 75° of bank.
  return Math.sign(delta) * 2 * Math.PI * (.25 * x + .75 * x * x * x);
}

/** Phone pose controls an angle; held keys/buttons control rotation speed. */
export function createInput(): InputController {
  const keys = new Set<string>();
  let touchBrake = false, touchTilt = 0, smoothedRate = 0;
  let motionEnabled = false, raw: number | undefined, baseline: number | undefined;
  let currentAngle = 0, anchor = 0, smoothedAngle = 0, manualOverride = false;
  let inputMode = 'Keyboard / touch', destroyed = false, motionGeneration = 0;
  const screenAngle = () => window.screen?.orientation?.angle ?? (window as Window & { orientation?: number }).orientation ?? 0;
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
    raw = baseline = undefined;
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
    raw = screenBank(event.beta, event.gamma, screenAngle());
    if (baseline === undefined) baseline = raw;
    inputMode = 'Motion — angle control';
  };
  const screenChange = () => reset();
  const visibility = () => { if (document.hidden) reset(); };
  window.addEventListener('keydown', keydown);
  window.addEventListener('keyup', keyup);
  window.addEventListener('blur', blur);
  window.addEventListener('deviceorientation', orientation);
  window.addEventListener('orientationchange', screenChange);
  window.screen?.orientation?.addEventListener('change', screenChange);
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
        raw = baseline = undefined;
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
      window.removeEventListener('orientationchange', screenChange);
      window.screen?.orientation?.removeEventListener('change', screenChange);
      document.removeEventListener('visibilitychange', visibility);
    },
  };
}
