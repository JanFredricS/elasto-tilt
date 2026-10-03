import './style.css';
import { createPhysics } from './physics';
import { createInput } from './input';
import { createRenderer } from './renderer';
import { createUI } from './ui';
import { levels } from './levels';
import type { Snapshot, UIState } from './types';

const FIXED_DT = 1 / 120;
const SAVE_KEY = 'newtons-ride.progress.v1';
const root = document.querySelector<HTMLElement>('#app')!;

async function boot() {
  const [physics, renderer] = await Promise.all([
    createPhysics(), createRenderer(document.querySelector<HTMLElement>('#game')!),
  ]);
  const input = createInput();
  let levelIndex = 0;
  let unlocked = 1;
  try {
    const saved = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
    if (saved && Number.isInteger(saved.unlocked)) unlocked = Math.max(1, Math.min(levels.length, saved.unlocked));
  } catch { /* Private mode or malformed saves should not prevent play. */ }
  let status: UIState['status'] = 'menu';
  let debug = new URLSearchParams(location.search).has('debug');
  let accumulator = 0;
  let last = performance.now();
  let frameMs = 16.67;
  let renderState: Snapshot;
  let ui: ReturnType<typeof createUI>;

  function load(index: number, nextStatus: UIState['status'] = 'playing') {
    levelIndex = Math.max(0, Math.min(levels.length - 1, index));
    input.reset();
    physics.load(levels[levelIndex]);
    renderer.load(levels[levelIndex]);
    renderState = physics.snapshot();
    status = nextStatus;
    accumulator = 0;
    last = performance.now();
  }
  function pause() {
    if (status === 'playing') {
      status = 'paused';
      input.reset();
      accumulator = 0;
    }
  }
  function resume() {
    if (status !== 'paused') return;
    status = 'playing';
    input.reset();
    last = performance.now();
  }
  ui = createUI(document.querySelector<HTMLElement>('#ui')!, levels, {
    start: () => load(levelIndex),
    selectLevel: index => { if (index >= 0 && index < unlocked) load(index); },
    restart: () => load(levelIndex),
    menu: () => { status = 'menu'; input.reset(); accumulator = 0; },
    pause, resume,
    enableMotion: async () => input.enableMotion(),
    calibrate: () => input.calibrate(),
    brake: pressed => input.setBrake(status === 'playing' && pressed),
    tilt: value => input.setTouchTilt(status === 'playing' ? value : 0),
    debug: enabled => { debug = enabled; },
  });
  load(0, 'menu');
  document.querySelector('#loading')?.remove();
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
  window.addEventListener('blur', pause);
  window.addEventListener('resize', () => renderer.resize());
  window.addEventListener('keydown', event => {
    if ((event.target as HTMLElement)?.closest('input, textarea, select')) return;
    if (event.code === 'Escape') { event.preventDefault(); status === 'paused' ? resume() : pause(); }
    if (event.code === 'KeyR' && status !== 'menu') load(levelIndex);
    if (event.code === 'KeyF') debug = !debug;
  });

  function frame(now: number) {
    const elapsed = Math.max(0, Math.min((now - last) / 1000, 0.1));
    last = now;
    if (elapsed > 0 && elapsed < 0.1) frameMs += (elapsed * 1000 - frameMs) * 0.08;
    const controls = input.read(elapsed);
    if (status === 'playing') {
      accumulator = Math.min(accumulator + elapsed, FIXED_DT * 8);
      while (accumulator >= FIXED_DT) {
        renderState = physics.step(FIXED_DT, controls);
        accumulator -= FIXED_DT;
        if (renderState.status !== 'playing') {
          status = renderState.status;
          input.reset();
          accumulator = 0;
          if (status === 'complete') {
            unlocked = Math.max(unlocked, Math.min(levels.length, levelIndex + 2));
            try { localStorage.setItem(SAVE_KEY, JSON.stringify({ unlocked })); } catch { /* Saves are optional. */ }
          }
          break;
        }
      }
    }
    renderer.render(renderState, elapsed);
    ui.update({
      levelIndex, unlocked, apples: renderState.collected.length,
      totalApples: levels[levelIndex].apples.length, elapsed: renderState.elapsed,
      status, fps: Math.round(1000 / frameMs), frameMs, physicsMs: renderState.physicsMs,
      worldAngle: renderState.worldAngle, timeline: renderState.timeline,
      timeDirection: renderState.timeDirection, inputMode: input.mode, debug,
    });
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // Read-only diagnostics and explicit development actions support repeatable gameplay QA.
  if (import.meta.env.DEV) {
    Object.assign(window, { __NEWTON__: {
      snapshot: () => structuredClone(renderState),
      state: () => ({ status, levelIndex, unlocked }),
      load: (index: number) => load(index),
      tilt: (value: number) => input.setTouchTilt(value),
      brake: (value: boolean) => input.setBrake(value),
      pause, resume,
    } });
  }
}

boot().catch(error => {
  console.error(error);
  root.innerHTML = '<section class="boot-error"><h1>The ride could not start</h1><p>Please reload in a browser with WebGL enabled.</p><button onclick="location.reload()">Try again</button></section>';
});
