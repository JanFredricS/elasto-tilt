import { afterEach, describe, expect, it, vi } from 'vitest';
import { ARM_ANGLE, createOrientationHold, HELD_CLASS, holdTransform, LATCHED_CLASS, orientationHeld, orientationLatched, remapInsets } from '../src/orientation-hold';

describe('holdTransform', () => {
  it('is the identity when the OS has not rotated', () => {
    for (const angle of [0, 90, 180, 270]) expect(holdTransform(angle, angle, 844, 390)).toEqual({ rotation: 0, width: 844, height: 390, left: 0, top: 0 });
    expect(holdTransform(270, -90, 844, 390).rotation).toBe(0); // window.orientation reports -90 for 270
  });

  it('undoes a quarter turn with swapped, centred logical size', () => {
    // Held in landscape (90), the OS re-laid the page in portrait (0): 390×844.
    const t = holdTransform(90, 0, 390, 844);
    expect(t).toEqual({ rotation: 90, width: 844, height: 390, left: (390 - 844) / 2, top: (844 - 390) / 2 });
    // Rotating the 844×390 box by 90° about its centre covers the viewport exactly.
    const cx = t.left + t.width / 2, cy = t.top + t.height / 2;
    expect([cx, cy]).toEqual([195, 422]);
    expect([t.height, t.width]).toEqual([390, 844]);
    expect(holdTransform(270, 0, 390, 844).rotation).toBe(-90);
    expect(holdTransform(0, 90, 844, 390)).toMatchObject({ rotation: -90, width: 390, height: 844 });
    expect(holdTransform(0, 270, 844, 390)).toMatchObject({ rotation: 90, width: 390, height: 844 });
  });

  it('turns a half turn without swapping', () => {
    expect(holdTransform(90, 270, 844, 390)).toEqual({ rotation: 180, width: 844, height: 390, left: 0, top: 0 });
    expect(holdTransform(270, 90, 844, 390).rotation).toBe(180);
  });

  it('composes: rotation always cancels the OS delta modulo a full turn', () => {
    for (const held of [0, 90, 180, 270]) for (const current of [0, 90, 180, 270, -90]) {
      const { rotation } = holdTransform(held, current, 400, 800);
      expect((((current - held + rotation) % 360) + 360) % 360).toBe(0);
    }
  });
});

describe('remapInsets', () => {
  const physical = { top: 47, right: 0, bottom: 34, left: 0 }; // portrait iPhone
  it('maps each logical edge to the physical edge it lies along', () => {
    expect(remapInsets(0, physical)).toEqual(physical);
    // rotate(90deg): logical top is the physical right edge, logical left the physical top.
    expect(remapInsets(90, physical)).toEqual({ top: 0, right: 34, bottom: 0, left: 47 });
    expect(remapInsets(-90, physical)).toEqual({ top: 0, right: 47, bottom: 0, left: 34 });
    expect(remapInsets(180, physical)).toEqual({ top: 34, right: 0, bottom: 47, left: 0 });
  });
});

describe('createOrientationHold', () => {
  afterEach(() => vi.unstubAllGlobals());
  function setup() {
    const orientation = Object.assign(new EventTarget(), { angle: 90 });
    const win = Object.assign(new EventTarget(), { innerWidth: 844, innerHeight: 390 });
    const classes = new Set<string>();
    const documentElement = { classList: { toggle: (name: string, on: boolean) => on ? classes.add(name) : classes.delete(name), contains: (name: string) => classes.has(name) } };
    vi.stubGlobal('window', win); vi.stubGlobal('screen', { orientation }); vi.stubGlobal('document', { documentElement });
    const values = new Map<string, string>();
    const style = new Proxy({ removeProperty: (name: string) => values.delete(name.replace(/-(\w)/g, (_, c) => c.toUpperCase())) } as Record<string, unknown>, {
      set: (_, key, value) => { values.set(String(key), value); return true; },
      get: (target, key) => key === 'removeProperty' ? target.removeProperty : values.get(String(key)),
    });
    const layouts = vi.fn();
    const hold = createOrientationHold({ style } as unknown as HTMLElement, layouts);
    const rotate = (angle: number, w: number, h: number) => { orientation.angle = angle; win.innerWidth = w; win.innerHeight = h; orientation.dispatchEvent(new Event('change')); };
    /** iOS ordering B: the viewport resizes (resize event) before the reported angle changes. */
    const resizeThenTurn = (angle: number, w: number, h: number) => {
      win.innerWidth = w; win.innerHeight = h; win.dispatchEvent(new Event('resize'));
      const between = { latched: hold.latched, held: orientationHeld(), latchedClass: orientationLatched(), transform: values.get('transform') };
      orientation.angle = angle; orientation.dispatchEvent(new Event('change'));
      return between;
    };
    return { hold, values, layouts, rotate, resizeThenTurn, win };
  }

  it('follows the OS until the player steers, then latches and counter-rotates', () => {
    const { hold, values, layouts, rotate } = setup();
    hold.update(true, 0);
    expect(hold.held).toBe(90); expect(hold.latched).toBe(false);
    // Not steering yet: the phone is being settled, the page lays out normally.
    rotate(0, 390, 844);
    expect(hold.held).toBe(0); expect(values.get('transform')).toBeUndefined(); expect(orientationHeld()).toBe(false);
    rotate(90, 844, 390);
    hold.update(true, ARM_ANGLE / 2); expect(hold.latched).toBe(false);
    hold.update(true, ARM_ANGLE + .05); // steering: latch the landscape angle
    expect(hold.latched).toBe(true); expect(hold.held).toBe(90);
    expect(orientationHeld()).toBe(false); // nothing applied yet
    rotate(0, 390, 844);
    expect(values.get('transform')).toBe('rotate(90deg)');
    expect([values.get('width'), values.get('height')]).toEqual(['844px', '390px']);
    expect(orientationHeld()).toBe(true); // display-mode backs off only now
    expect(layouts).toHaveBeenCalledTimes(1);
    hold.update(true, 3); expect(hold.held).toBe(90); // frozen while latched
    rotate(90, 844, 390); // back to the held orientation: identity again
    expect(values.get('transform')).toBeUndefined(); expect(orientationHeld()).toBe(false);
    rotate(0, 390, 844);
    hold.update(false); // pause/menu/motion off: the OS layout returns
    expect(values.get('transform')).toBeUndefined(); expect(orientationHeld()).toBe(false);
    hold.destroy();
  });

  it('re-arms from the world angle at resume or retry, so a mid-turn pause cannot glue a half turn', () => {
    const { hold, values, rotate } = setup();
    hold.update(true, 0); hold.update(true, 1); expect(hold.latched).toBe(true);
    rotate(270, 844, 390); expect(values.get('transform')).toBe('rotate(180deg)');
    hold.update(false); expect(values.get('transform')).toBeUndefined();
    // Resume mid-turn (world at π) in the OS's new 270; the player turns back.
    hold.update(true, Math.PI); expect(hold.latched).toBe(false);
    rotate(90, 844, 390); hold.update(true, Math.PI + .05);
    expect(hold.held).toBe(90); expect(values.get('transform')).toBeUndefined();
    hold.update(true, Math.PI + .3); expect(hold.latched).toBe(true); expect(hold.held).toBe(90);
    hold.destroy();
  });

  it('latches only a landscape angle: a portrait start latches once the OS reaches landscape', () => {
    const { hold, values, rotate } = setup();
    rotate(0, 390, 844);
    hold.update(true, 0); hold.update(true, 1);
    expect(hold.latched).toBe(false); expect(hold.held).toBe(0);
    rotate(270, 844, 390); hold.update(true, 1.2);
    expect(hold.latched).toBe(true); expect(hold.held).toBe(270);
    rotate(0, 390, 844); expect(values.get('transform')).toBe('rotate(-90deg)');
    hold.destroy();
  });

  it('stays latched (and display-mode stays off) when iOS resizes the viewport before it reports the new angle', () => {
    const { hold, values, resizeThenTurn } = setup();
    hold.update(true, 0); hold.update(true, ARM_ANGLE + .05);
    expect(hold.latched).toBe(true); expect(orientationLatched()).toBe(true);
    expect(orientationHeld()).toBe(false); // latched, but nothing to undo yet
    const between = resizeThenTurn(0, 390, 844);
    // Between the two events no transform applies (the angle still matches), yet the hold is latched.
    expect(between).toEqual({ latched: true, held: false, latchedClass: true, transform: undefined });
    expect(values.get('transform')).toBe('rotate(90deg)'); expect(orientationHeld()).toBe(true);
    expect(hold.held).toBe(90);
    // And back: resize to landscape first, then the angle.
    const back = resizeThenTurn(90, 844, 390);
    expect(back.latched).toBe(true); expect(back.latchedClass).toBe(true);
    expect(values.get('transform')).toBeUndefined();
    hold.update(false);
    expect(orientationLatched()).toBe(false); expect(document.documentElement.classList.contains(LATCHED_CLASS)).toBe(false);
    hold.destroy();
  });

  it('reset() (an in-play restart) releases the hold and re-arms from the next update', () => {
    const { hold, values, rotate } = setup();
    hold.update(true, 0); hold.update(true, 1); expect(hold.latched).toBe(true);
    rotate(270, 844, 390); expect(values.get('transform')).toBe('rotate(180deg)');
    hold.reset();
    expect(hold.latched).toBe(false); expect(hold.held).toBeUndefined();
    expect(values.get('transform')).toBeUndefined(); expect(orientationLatched()).toBe(false); expect(orientationHeld()).toBe(false);
    // The restarted level starts at world angle 0 in the OS's current 270: it follows the OS until the player steers again.
    hold.update(true, 0); expect(hold.held).toBe(270); expect(hold.latched).toBe(false);
    hold.update(true, ARM_ANGLE + .05); expect(hold.latched).toBe(true); expect(hold.held).toBe(270);
    hold.destroy();
    expect(orientationLatched()).toBe(false);
  });

  it('does not hold when never activated', () => {
    const { values, rotate } = setup();
    rotate(0, 390, 844);
    expect(values.get('transform')).toBeUndefined();
    expect(document.documentElement.classList.contains(HELD_CLASS)).toBe(false);
  });
});
