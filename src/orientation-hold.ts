/** Orientation hold: while a motion-steered level is being played, the OS
 * auto-rotate is the enemy. Turning the phone like a steering wheel past ~45°
 * makes iOS re-lay the page in portrait (and back), a visible jerk with a
 * different layout mid-turn. Safari cannot lock orientation outside full
 * screen, so the hold undoes the OS rotation instead: once the player starts
 * steering it remembers the (landscape) screen angle and counter-rotates #app
 * by any later difference, keeping the game glued to the device exactly as an
 * orientation lock would. */
export const HELD_CLASS = 'orientation-held';
/** On the root element for as long as the hold is latched (the player is steering),
 * whether or not a counter-rotation is applied at this instant. */
export const LATCHED_CLASS = 'orientation-latched';
const normalize = (degrees: number) => ((Math.round(degrees / 90) * 90) % 360 + 360) % 360;

export interface HoldTransform {
  /** CSS rotation (degrees, clockwise) applied about the box centre. */
  rotation: number;
  /** Logical layout box: what the renderer and UI lay out in. */
  width: number; height: number;
  /** Box offset in the viewport so its centre is the viewport centre. */
  left: number; top: number;
}

/** Pure: transform that keeps content laid out for `heldAngle` while the OS
 * reports `currentAngle` (screen.orientation.angle, counter-clockwise device
 * turn) and a `viewportWidth × viewportHeight` viewport. The OS turned the
 * content by −delta relative to the device; rotating by −delta undoes it. For
 * a quarter turn the logical box is the viewport with width/height swapped,
 * centred so the rotated box covers the viewport exactly. */
export function holdTransform(heldAngle: number, currentAngle: number, viewportWidth: number, viewportHeight: number): HoldTransform {
  const delta = normalize(currentAngle - heldAngle); // 0, 90, 180, 270
  const signed = delta > 180 ? delta - 360 : delta; // 0, 90, 180, -90
  const rotation = signed === 0 || signed === 180 ? signed : -signed; // a half turn is its own inverse
  const quarter = delta === 90 || delta === 270;
  const width = quarter ? viewportHeight : viewportWidth, height = quarter ? viewportWidth : viewportHeight;
  return { rotation, width, height, left: (viewportWidth - width) / 2, top: (viewportHeight - height) / 2 };
}

/** Sign of the OS screen angle relative to this module's convention
 * (screen.orientation.angle = counter-clockwise device turn: 90 = landscape
 * with the top edge to the left). Verified in Chromium device emulation only;
 * if a real iPhone shows the held layout turned the wrong way in a quarter
 * turn (portrait <-> landscape), flip this single constant to -1. Half turns
 * are unaffected (180 is its own inverse). See docs/controls-full-circle.md. */
export const OS_ANGLE_SIGN: 1 | -1 = 1;
/** World-angle change (radians) since the hold activated that counts as the
 * player actually steering. Below it the hold follows the OS so a phone being
 * settled into landscape after a menu, pause or retry lays out normally. */
export const ARM_ANGLE = .2;

export function screenAngle(): number {
  const angle = globalThis.screen?.orientation?.angle ?? (globalThis as { orientation?: number }).orientation ?? 0;
  return normalize(Number.isFinite(angle) ? OS_ANGLE_SIGN * angle : 0);
}
const landscape = (angle: number) => angle === 90 || angle === 270;
/** True only while a counter-rotation is actually applied to #app; while the
 * hold merely follows the OS, ordinary display-mode handling stays on. */
export const orientationHeld = () => typeof document !== 'undefined' && document.documentElement.classList.contains(HELD_CLASS);
/** True for as long as the hold is latched, including the moment an OS
 * rotation has resized the viewport but not yet updated the reported angle
 * (iOS may fire resize first): display-mode keys on this, not orientationHeld(). */
export const orientationLatched = () => typeof document !== 'undefined' && document.documentElement.classList.contains(LATCHED_CLASS);

export interface SafeInsets { top: number; right: number; bottom: number; left: number }
/** Pure: the safe-area insets seen by a box rotated `rotation` degrees
 * clockwise. Under rotate(90deg) the box's top edge lies along the physical
 * right edge, so its top inset is the physical right inset, and so on. */
export function remapInsets(rotation: number, physical: SafeInsets): SafeInsets {
  const { top, right, bottom, left } = physical;
  switch (normalize(rotation)) {
    case 90: return { top: right, right: bottom, bottom: left, left: top };
    case 180: return { top: bottom, right: left, bottom: top, left: right };
    case 270: return { top: left, right: top, bottom: right, left: bottom };
    default: return { ...physical };
  }
}
const SIDES = ['top', 'right', 'bottom', 'left'] as const;
/** Physical env(safe-area-inset-*) values, read through a hidden probe. */
function physicalInsets(probe: HTMLElement | undefined): SafeInsets {
  const zero = { top: 0, right: 0, bottom: 0, left: 0 };
  if (!probe || typeof getComputedStyle !== 'function') return zero;
  const style = getComputedStyle(probe);
  return Object.fromEntries(SIDES.map(side => [side, parseFloat(style.getPropertyValue(`padding-${side}`)) || 0])) as unknown as SafeInsets;
}

/** Applies the hold to `root`. `update(active, worldAngle)` is called every
 * frame. Active but not yet armed (the world has not turned ARM_ANGLE since
 * activation), it follows the OS orientation, so turning the phone into
 * landscape after a menu, pause or retry re-lays the page as usual. Once the
 * player steers, it latches the current orientation, but only a landscape
 * one (the game is a landscape game; a portrait start latches when the OS
 * reaches landscape), and from then on counter-rotates every OS change until
 * `update(false)` releases it. */
export function createOrientationHold(root: HTMLElement, onLayout: () => void) {
  let held: number | undefined;
  let latched = false, activation: number | undefined;
  let applied = '';
  const probe = typeof document !== 'undefined' && typeof document.createElement === 'function' ? document.createElement('div') : undefined;
  if (probe) {
    probe.setAttribute('aria-hidden', 'true');
    probe.style.cssText = 'position:fixed;visibility:hidden;pointer-events:none;width:0;height:0;'
      + SIDES.map(side => `padding-${side}:env(safe-area-inset-${side})`).join(';');
    document.body?.appendChild(probe);
  }
  function apply() {
    if (held !== undefined && !latched) held = screenAngle();
    const active = held !== undefined && screenAngle() !== held;
    const t = active ? holdTransform(held!, screenAngle(), window.innerWidth, window.innerHeight) : undefined;
    const insets = t ? remapInsets(t.rotation, physicalInsets(probe)) : undefined;
    const key = t ? `${t.rotation}|${t.width}|${t.height}|${SIDES.map(side => insets![side]).join(',')}` : '';
    document.documentElement.classList.toggle(HELD_CLASS, key !== '');
    document.documentElement.classList.toggle(LATCHED_CLASS, latched);
    if (key === applied) return;
    applied = key;
    const style = root.style;
    if (t) {
      Object.assign(style, {
        position: 'fixed', left: `${t.left}px`, top: `${t.top}px`, width: `${t.width}px`, height: `${t.height}px`,
        transformOrigin: '50% 50%', transform: `rotate(${t.rotation}deg)`,
      });
      for (const side of SIDES) style.setProperty?.(`--safe-${side}`, `${insets![side]}px`);
    } else {
      for (const property of ['position', 'left', 'top', 'width', 'height', 'transform-origin', 'transform', ...SIDES.map(side => `--safe-${side}`)]) style.removeProperty(property);
    }
    onLayout();
  }
  const changed = () => apply();
  const orientation = globalThis.screen?.orientation;
  orientation?.addEventListener?.('change', changed);
  window.addEventListener('orientationchange', changed);
  window.addEventListener('resize', changed);
  return {
    update(active: boolean, worldAngle = 0) {
      if (!active) {
        if (held === undefined) return;
        held = activation = undefined; latched = false;
      } else {
        if (held === undefined) { held = screenAngle(); activation = worldAngle; }
        if (latched) return;
        const armed = Math.abs(worldAngle - activation!) > ARM_ANGLE;
        if (armed && landscape(screenAngle())) { held = screenAngle(); latched = true; }
      }
      apply();
    },
    /** Release and forget (an in-play restart): the next update(true) re-arms from scratch. */
    reset() {
      held = activation = undefined; latched = false; apply();
    },
    get held() { return held; },
    get latched() { return latched; },
    destroy() {
      held = activation = undefined; latched = false; apply();
      probe?.remove();
      orientation?.removeEventListener?.('change', changed);
      window.removeEventListener('orientationchange', changed);
      window.removeEventListener('resize', changed);
    },
  };
}
