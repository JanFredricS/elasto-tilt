import type { InputController } from './types';

const clamp = (value: number) => Math.max(-1, Math.min(1, value));
const wrap = (degrees: number) => ((degrees + 180) % 360 + 360) % 360 - 180;
/** Neutral holds the world angle; tilt is an angular-velocity command. */
export function createInput(): InputController {
  const keys = new Set<string>();
  let touchBrake = false, touchTilt = 0, smoothed = 0;
  let motionEnabled = false, raw: number | undefined, baseline: number | undefined;
  let inputMode = 'Keyboard / touch', destroyed = false, motionGeneration = 0;
  let lastSample = -Infinity;
  const angle = () => window.screen?.orientation?.angle ?? (window as Window & { orientation?: number }).orientation ?? 0;
  const keydown = (event: KeyboardEvent) => {
    if ((event.target as HTMLElement | null)?.closest?.('input, textarea, select, [contenteditable="true"]')) return;
    if (event.code === 'Space' && (event.target as HTMLElement | null)?.closest?.('button, a, [role="button"]')) return;
    if (['ArrowLeft', 'ArrowRight', 'KeyA', 'KeyD', 'Space'].includes(event.code)) {
      event.preventDefault(); keys.add(event.code);
    }
  };
  const keyup = (event: KeyboardEvent) => { keys.delete(event.code); };
  const reset = () => { keys.clear(); touchBrake = false; touchTilt = 0; smoothed = 0; raw = baseline = undefined; lastSample = -Infinity; };
  const calibrate = () => { baseline = raw; smoothed = 0; };
  const orientation = (event: DeviceOrientationEvent) => {
    if (!motionEnabled || document.hidden || event.beta === null || event.gamma === null || !Number.isFinite(event.beta + event.gamma)) return;
    lastSample = performance.now();
    const radians = angle() * Math.PI / 180;
    raw = wrap(event.gamma * Math.cos(radians) + event.beta * Math.sin(radians));
    if (baseline === undefined) baseline = raw;
    inputMode = 'Motion + touch';
  };
  const screenChange = () => { baseline = raw = undefined; smoothed = 0; };
  const visibility = () => { if (document.hidden) reset(); };
  window.addEventListener('keydown', keydown);
  window.addEventListener('keyup', keyup);
  window.addEventListener('blur', reset);
  window.addEventListener('deviceorientation', orientation);
  window.addEventListener('orientationchange', screenChange);
  window.screen?.orientation?.addEventListener('change', screenChange);
  document.addEventListener('visibilitychange', visibility);
  return {
    read(dt) {
      if (motionEnabled && raw !== undefined && performance.now() - lastSample > 500) {
        raw = baseline = undefined; smoothed = 0;
        inputMode = 'Motion paused — use arrows or touch';
      }
      const keyboard = Number(keys.has('ArrowRight') || keys.has('KeyD')) - Number(keys.has('ArrowLeft') || keys.has('KeyA'));
      let target = keyboard || touchTilt;
      if (!target && motionEnabled && raw !== undefined && baseline !== undefined) {
        const delta = wrap(raw - baseline), magnitude = Math.abs(delta);
        target = magnitude <= 3 ? 0 : Math.sign(delta) * clamp((magnitude - 3) / 22);
      }
      const duration = Number.isFinite(dt) ? Math.max(0, Math.min(dt, .1)) : 0;
      smoothed += (target - smoothed) * (1 - Math.exp(-duration / .065));
      if (Math.abs(smoothed) < .001) smoothed = 0;
      return { tilt: smoothed, brake: touchBrake || keys.has('Space') };
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
        if (destroyed || generation !== motionGeneration) return inputMode;
        motionEnabled = true; baseline = raw = undefined;
        return (inputMode = 'Waiting for motion — arrows / touch ready');
      } catch {
        if (destroyed || generation !== motionGeneration) return inputMode;
        motionEnabled = false; return (inputMode = 'Motion unavailable — use arrows or touch');
      }
    },
    calibrate, setBrake(pressed) { touchBrake = pressed; }, setTouchTilt(value) { touchTilt = Number.isFinite(value) ? clamp(value) : 0; }, reset,
    get mode() { return inputMode; },
    destroy() {
      destroyed = true; motionGeneration++; motionEnabled = false; reset();
      window.removeEventListener('keydown', keydown); window.removeEventListener('keyup', keyup);
      window.removeEventListener('blur', reset); window.removeEventListener('deviceorientation', orientation);
      window.removeEventListener('orientationchange', screenChange);
      window.screen?.orientation?.removeEventListener('change', screenChange);
      document.removeEventListener('visibilitychange', visibility);
    },
  };
}
