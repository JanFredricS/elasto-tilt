import { createDisplayMode } from './display-mode';
import welcomeIllustration from './assets/newton-welcome.jpg';
import type { GameUI, Level, UICallbacks, UIState } from './types';

const safe = (value: number, fallback = 0) => Number.isFinite(value) ? value : fallback;
const timeText = (seconds: number) => {
  const whole = Math.floor(Math.max(0, safe(seconds)));
  return `${String(Math.floor(whole / 60)).padStart(2, '0')}:${String(whole % 60).padStart(2, '0')}`;
};

// Fixed protractor marks; the coloured diameter follows the rendered world.
const horizonTicks = Array.from({ length: 36 }, (_, i) => {
  const major = i % 3 === 0;
  return `<line x1="50" y1="${major ? 9 : 12}" x2="50" y2="16" transform="rotate(${i * 10} 50 50)" />`;
}).join('');

export function createUI(host: HTMLElement, levels: Level[], callbacks: UICallbacks): GameUI {
  host.classList.add('game-ui');
  host.innerHTML = `
    <div class="ui-grain" aria-hidden="true"></div>
    <header class="hud" aria-label="Game status">
      <div class="hud-brand"><span class="hud-brand-mark" aria-hidden="true">✳</span><span>NEWTON’S <b>RIDE</b></span></div>
      <div class="hud-stats">
        <div class="hud-stat"><span class="hud-stat-label">APPLES</span><strong data-ui="apples">0 / 0</strong></div>
        <div class="hud-stat"><span class="hud-stat-label">TIME</span><strong data-ui="time">00:00</strong></div>
        <div class="hud-stat hud-angle"><span class="hud-stat-label">WORLD</span><strong data-ui="angle">0°</strong></div>
      </div>
      <div class="hud-actions">
        <button class="icon-btn" type="button" data-action="restart" aria-label="Restart level" title="Restart level">↺</button>
        <button class="icon-btn" type="button" data-action="pause" aria-label="Pause game" title="Pause game">Ⅱ</button>
      </div>
      <div class="debug-panel" data-ui="debug-panel" hidden><b>PERFORMANCE</b><span data-ui="debug-fps"></span><span data-ui="debug-frame"></span><span data-ui="debug-physics"></span><span data-ui="debug-input"></span></div>
    </header>

    <div class="horizon-gauge" data-ui="horizon" role="img" aria-label="World level, 0 degrees">
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <circle class="horizon-face" cx="50" cy="50" r="47" />
        <g class="horizon-ticks">${horizonTicks}</g>
        <path class="horizon-reference" d="M 7 50 H 93" />
        <g data-ui="horizon-needle">
          <path class="horizon-ground" d="M 20 50 A 30 30 0 0 0 80 50 Z" />
          <path class="horizon-line" d="M 19 50 H 81" />
          <path class="horizon-up" d="M 50 23 L 46 30 H 54 Z" />
        </g>
        <circle class="horizon-pivot" cx="50" cy="50" r="2.5" />
      </svg>
      <strong data-ui="horizon-angle">0°</strong>
      <span data-ui="horizon-label">LEVEL</span>
    </div>

    <div class="level-banner" aria-live="polite">
      <span class="level-banner-index" data-ui="level-number">01 / ${String(levels.length).padStart(2, '0')}</span>
      <span class="level-banner-name" data-ui="level-name">Newton’s Orchard</span>
      <span class="level-banner-mechanic" data-ui="mechanic"></span>
    </div>

    <div class="timeline" data-ui="timeline-wrap" aria-label="Time platform position" hidden>
      <span class="timeline-label">CLOCKWORK</span>
      <div class="timeline-track"><div class="timeline-fill" data-ui="timeline-fill"></div><i class="timeline-needle" data-ui="timeline-needle"></i></div>
      <span class="timeline-direction" data-ui="timeline-direction">—</span>
    </div>

    <div class="control-dock" data-ui="controls">
      <div class="tilt-control">
        <button class="control-button tilt-button" type="button" data-hold="left" aria-label="Tilt world left"><span class="control-arrow">↶</span><small>TILT LEFT</small></button>
        <button class="control-button tilt-button" type="button" data-hold="right" aria-label="Tilt world right"><span class="control-arrow">↷</span><small>TILT RIGHT</small></button>
      </div>
      <button class="control-button brake-button" type="button" data-hold="brake" aria-label="Hold to brake"><span class="brake-glyph" aria-hidden="true">◎</span><span>BRAKE</span><small>HOLD</small></button>
    </div>

    <div class="utility-bar" data-ui="utility">
      <span class="control-hint">A / D <i>tilt</i> · SPACE <i>brake</i> · M <i>map</i></span>
      <div class="utility-buttons">
        <button type="button" class="text-btn" data-action="survey" aria-label="View whole map" aria-pressed="false">MAP</button>
        <button type="button" class="text-btn" data-action="motion">ENABLE MOTION</button>
        <button type="button" class="text-btn" data-action="calibrate">CALIBRATE</button>
        <button type="button" class="text-btn" data-action="screen" hidden>SCREEN</button>
        <button type="button" class="text-btn debug-toggle" data-action="debug">FPS</button>
      </div>
    </div>
    <div class="mode-toast" data-ui="mode-toast" role="status" aria-live="polite" hidden></div>
    <section class="menu-overlay" data-ui="menu" role="dialog" aria-modal="true" aria-labelledby="menu-title">
      <div class="menu-card">
        <div class="menu-main">
          <div class="menu-hero">
            <div class="menu-intro">
              <h1 id="menu-title">Newton’s<br><em>Ride.</em></h1>
              <p class="menu-lead">Tilt the world. Gather every apple. Ride home.</p>
              <button type="button" class="primary-btn" data-action="start"><span>LET’S RIDE</span><span aria-hidden="true">↗</span></button>
            </div>
            <div class="menu-art-wrap"><img class="menu-art" src="${welcomeIllustration}" width="1280" height="714" alt="Newton sits beside his fallen bicycle and looks up at a falling apple." /></div>
          </div>
          <div class="campaign">
            <div class="campaign-heading"><span>CHOOSE A MAP</span><span data-ui="progress-label">01 / ${String(levels.length).padStart(2, '0')} OPEN</span></div>
            <div class="campaign-grid" data-ui="campaign-grid"></div>
          </div>
        </div>
      </div>
    </section>

    <section class="state-overlay" data-ui="state-overlay" role="dialog" aria-modal="true" aria-labelledby="state-title" hidden aria-live="polite">
      <div class="state-card">
        <p class="eyebrow" data-ui="state-eyebrow">TAKE A BREATH</p>
        <h2 id="state-title" data-ui="state-title">Paused.</h2>
        <p class="state-copy" data-ui="state-copy"></p>
        <div class="state-actions">
          <button type="button" class="primary-btn" data-action="state-primary"><span data-ui="state-primary-label">KEEP RIDING</span><span aria-hidden="true">↗</span></button>
          <button type="button" class="secondary-btn" data-action="state-secondary">RESTART ROOM</button>
          <button type="button" class="secondary-btn" data-action="menu">CHOOSE MAP</button>
        </div>
      </div>
    </section>
  `;

  const displayMode = createDisplayMode(host, callbacks);
  const get = (name: string) => host.querySelector<HTMLElement>(`[data-ui="${name}"]`)!;
  const menu = get('menu');
  const stateOverlay = get('state-overlay');
  const horizon = get('horizon');
  const horizonNeedle = host.querySelector<SVGGElement>('[data-ui="horizon-needle"]')!;
  const campaignGrid = get('campaign-grid');
  const levelButtons: HTMLButtonElement[] = [];
  levels.forEach((level, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'level-tile';
    button.dataset.level = String(index);
    button.innerHTML = `<span class="tile-number">${String(index + 1).padStart(2, '0')}</span><span class="tile-label"></span><span class="tile-mark" aria-hidden="true">↗</span>`;
    button.querySelector<HTMLElement>('.tile-label')!.textContent = level.name;
    button.addEventListener('click', () => callbacks.selectLevel(index));
    campaignGrid.appendChild(button);
    levelButtons.push(button);
  });

  const abort = new AbortController();
  const on = (target: EventTarget, type: string, handler: EventListenerOrEventListenerObject) =>
    target.addEventListener(type, handler, { signal: abort.signal });
  let current: UIState | undefined;
  let lastStatus: UIState['status'] | undefined;
  let lastCampaignKey = '';
  let primaryAction: (() => void) | undefined;
  let toastTimer = 0;
  const toast = (message: string) => {
    const element = get('mode-toast');
    element.textContent = message;
    element.hidden = false;
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => { element.hidden = true; }, 3400);
  };

  on(host, 'click', (event: Event) => {
    const button = (event.target as Element).closest<HTMLButtonElement>('[data-action]');
    if (!button) return;
    switch (button.dataset.action) {
      case 'start': callbacks.start(); break;
      case 'restart': callbacks.restart(); break;
      case 'pause': callbacks.pause(); break;
      case 'calibrate': callbacks.calibrate(); toast('Set. This is your level horizon.'); break;
      case 'debug': callbacks.debug(!current?.debug); break;
      case 'survey': callbacks.survey(); break;
      case 'state-primary': primaryAction?.(); break;
      case 'state-secondary': callbacks.restart(); break;
      case 'menu': callbacks.menu(); break;
      case 'motion': {
        button.textContent = 'CONNECTING…';
        button.setAttribute('aria-busy', 'true');
        void callbacks.enableMotion().then(message => {
          toast(message || 'Motion controls are ready.');
        }).catch(() => {
          toast('Motion could not be enabled. Use the tilt buttons or A / D.');
        }).finally(() => {
          button.textContent = 'ENABLE MOTION';
          button.removeAttribute('aria-busy');
        });
        break;
      }
    }
  });

  const held = { left: new Set<number>(), right: new Set<number>(), brake: new Set<number>() };
  const keyboardHeld = { left: false, right: false, brake: false };
  type Hold = keyof typeof held;
  const activeTilt = () => (held.right.size || keyboardHeld.right ? 1 : 0) - (held.left.size || keyboardHeld.left ? 1 : 0);
  const syncHold = () => {
    callbacks.tilt(activeTilt());
    callbacks.brake(held.brake.size > 0 || keyboardHeld.brake);
    for (const key of Object.keys(held) as Hold[]) {
      host.querySelector(`[data-hold="${key}"]`)?.classList.toggle('pressed', held[key].size > 0 || keyboardHeld[key]);
    }
  };
  const release = (button: HTMLButtonElement, event: PointerEvent) => {
    const key = button.dataset.hold as Hold;
    if (!key || !held[key].delete(event.pointerId)) return;
    if (button.hasPointerCapture(event.pointerId)) button.releasePointerCapture(event.pointerId);
    syncHold();
  };
  for (const button of host.querySelectorAll<HTMLButtonElement>('[data-hold]')) {
    on(button, 'pointerdown', (event: Event) => {
      const pointer = event as PointerEvent;
      if (pointer.pointerType === 'mouse' && pointer.button !== 0) return;
      pointer.preventDefault();
      button.setPointerCapture(pointer.pointerId);
      held[button.dataset.hold as Hold].add(pointer.pointerId);
      syncHold();
    });
    for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) {
      on(button, name, (event: Event) => release(button, event as PointerEvent));
    }
    on(button, 'contextmenu', (event: Event) => event.preventDefault());
    on(button, 'keydown', (event: Event) => {
      const key = event as KeyboardEvent;
      if (key.code !== 'Space' && key.code !== 'Enter') return;
      key.preventDefault();
      keyboardHeld[button.dataset.hold as Hold] = true;
      syncHold();
    });
    on(button, 'keyup', (event: Event) => {
      const key = event as KeyboardEvent;
      if (key.code !== 'Space' && key.code !== 'Enter') return;
      key.preventDefault();
      keyboardHeld[button.dataset.hold as Hold] = false;
      syncHold();
    });
    on(button, 'blur', () => {
      keyboardHeld[button.dataset.hold as Hold] = false;
      syncHold();
    });
  }
  const releaseAll = () => {
    for (const key of Object.keys(held) as Hold[]) held[key].clear();
    for (const key of Object.keys(keyboardHeld) as Hold[]) keyboardHeld[key] = false;
    syncHold();
  };
  on(window, 'blur', releaseAll);
  on(document, 'visibilitychange', () => { if (document.hidden) releaseAll(); });

  host.tabIndex = -1;
  const background = ['.hud', '.horizon-gauge', '.level-banner', '.timeline', '.control-dock', '.utility-bar', '.debug-panel']
    .map(selector => host.querySelector<HTMLElement>(selector)!).filter(Boolean);
  const focusable = (overlay: HTMLElement) => Array.from(overlay.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'))
    .filter(button => !button.hidden);
  for (const overlay of [menu, stateOverlay]) {
    on(overlay, 'keydown', (event: Event) => {
      const key = event as KeyboardEvent;
      if (key.code !== 'Tab') return;
      const candidates = focusable(overlay);
      if (!candidates.length) return;
      const first = candidates[0], last = candidates[candidates.length - 1];
      if (key.shiftKey && (document.activeElement === first || !overlay.contains(document.activeElement))) {
        key.preventDefault(); last.focus();
      } else if (!key.shiftKey && (document.activeElement === last || !overlay.contains(document.activeElement))) {
        key.preventDefault(); first.focus();
      }
    });
  }

  const text = (name: string, value: string) => {
    const element = get(name);
    if (element.textContent !== value) element.textContent = value;
  };

  function update(state: UIState): void {
    current = state;
    const playing = state.status === 'playing';
    const selected = levels[state.levelIndex];
    menu.hidden = state.status !== 'menu';
    stateOverlay.hidden = state.status === 'menu' || playing;
    get('controls').hidden = !playing || state.surveying;
    get('utility').hidden = state.status === 'menu';
    host.classList.toggle('is-playing', playing);
    host.classList.toggle('is-menu', state.status === 'menu');
    host.classList.toggle('debug-on', state.debug);
    const blocked = !playing;
    for (const element of background) {
      element.inert = blocked;
      element.setAttribute('aria-hidden', String(blocked));
    }
    menu.inert = state.status !== 'menu';
    stateOverlay.inert = state.status === 'menu' || playing;

    text('apples', `${state.apples} / ${state.totalApples}`);
    text('time', timeText(state.elapsed));
    text('angle', `${Math.round(((safe(state.worldAngle) * 180 / Math.PI) % 360 + 360) % 360)}°`);
    const degrees = safe(state.worldAngle) * 180 / Math.PI;
    const signedDegrees = Math.round(((degrees + 180) % 360 + 360) % 360 - 180) || 0;
    const horizonValue = `${signedDegrees > 0 ? '+' : ''}${signedDegrees}°`;
    horizonNeedle.setAttribute('transform', `rotate(${degrees % 360} 50 50)`);
    text('horizon-angle', horizonValue);
    text('horizon-label', state.surveying ? 'WORLD TILT' : signedDegrees === 0 ? 'LEVEL' : 'WORLD TILT');
    horizon.classList.toggle('is-level', signedDegrees === 0);
    horizon.setAttribute('aria-label', `World tilt ${signedDegrees} degrees from level. Shaded half is ground; triangle points up.`);
    text('level-number', `${String(state.levelIndex + 1).padStart(2, '0')} / ${String(levels.length).padStart(2, '0')}`);
    text('level-name', selected?.name ?? 'Newton’s Ride');
    const allApples = state.totalApples > 0 && state.apples >= state.totalApples;
    const showObjective = state.elapsed < 8 || allApples || state.surveying;
    get('mechanic').classList.toggle('is-objective', showObjective);
    text('mechanic', allApples ? 'All apples collected! Return to the door to finish.'
      : showObjective ? 'Collect every apple, then return to the door to finish.' : selected?.mechanic ?? '');
    const survey = host.querySelector<HTMLButtonElement>('[data-action="survey"]')!;
    const surveyLabel = state.surveying ? 'RIDE' : 'MAP';
    if (survey.textContent !== surveyLabel) survey.textContent = surveyLabel;
    survey.setAttribute('aria-pressed', String(state.surveying));
    survey.setAttribute('aria-label', state.surveying ? 'Return to riding' : 'View whole map');

    const timeMap = !!selected?.timePlatforms?.length;
    get('timeline-wrap').hidden = !timeMap || state.status === 'menu' || state.surveying;
    if (timeMap) {
      const value = Math.max(0, Math.min(1, safe(state.timeline)));
      get('timeline-fill').style.width = `${value * 100}%`;
      get('timeline-needle').style.left = `${value * 100}%`;
      text('timeline-direction', state.timeDirection > .01 ? '→' : state.timeDirection < -.01 ? '←' : '•');
    }

    const unlockedCount = Math.max(1, Math.min(levels.length, state.unlocked));
    text('progress-label', `${String(unlockedCount).padStart(2, '0')} / ${String(levels.length).padStart(2, '0')} OPEN`);
    const campaignKey = `${unlockedCount}:${state.levelIndex}`;
    if (campaignKey !== lastCampaignKey) {
      lastCampaignKey = campaignKey;
      levelButtons.forEach((button, index) => {
        const locked = index >= unlockedCount;
        button.disabled = locked;
        button.classList.toggle('locked', locked);
        button.classList.toggle('current', index === state.levelIndex);
        button.setAttribute('aria-label', locked ? `${levels[index].name}, locked` : `Play ${levels[index].name}`);
        button.querySelector<HTMLElement>('.tile-mark')!.textContent = locked ? '⌁' : index === state.levelIndex ? '●' : '↗';
      });
    }

    if (!stateOverlay.hidden) {
      let eyebrow = 'TAKE A BREATH';
      let title = 'Paused.';
      let copy = `Collect every apple, then return to the door to finish. ${selected?.hint ?? ''}`.trim();
      let action = 'KEEP RIDING';
      primaryAction = callbacks.resume;
      if (state.status === 'crashed') {
        eyebrow = 'ONE MORE GO';
        title = 'Mind your head.';
        copy = selected?.hint ?? 'Shift the world and give that ledge another try.';
        action = 'TRY AGAIN';
        primaryAction = callbacks.restart;
      } else if (state.status === 'complete') {
        eyebrow = 'ROOM COMPLETE';
        title = 'Beautifully done.';
        copy = `${state.apples} of ${state.totalApples} apples gathered in ${timeText(state.elapsed)}.`;
        const next = state.levelIndex + 1;
        if (next < levels.length) {
          action = 'NEXT ROOM';
          primaryAction = () => callbacks.selectLevel(next);
        } else {
          action = 'RIDE AGAIN';
          primaryAction = callbacks.restart;
        }
      }
      text('state-eyebrow', eyebrow);
      text('state-title', title);
      text('state-copy', copy);
      text('state-primary-label', action);
    }

    get('debug-panel').hidden = !state.debug;
    host.querySelector('[data-action="debug"]')?.classList.toggle('selected', state.debug);
    if (state.debug) {
      text('debug-fps', `FPS ${safe(state.fps).toFixed(0)}`);
      text('debug-frame', `FRAME ${safe(state.frameMs).toFixed(1)} ms`);
      text('debug-physics', `PHYSICS ${safe(state.physicsMs).toFixed(2)} ms`);
      text('debug-input', `INPUT ${state.inputMode}`);
    }
    if (state.status !== lastStatus) {
      lastStatus = state.status;
      releaseAll();
      if (state.status === 'menu') host.querySelector<HTMLButtonElement>('[data-action="start"]')?.focus();
      else if (!playing) host.querySelector<HTMLButtonElement>('[data-action="state-primary"]')?.focus();
      else host.focus();
    }
    displayMode.update(state.status);
  }

  return {
    update,
    destroy() {
      displayMode.destroy();
      releaseAll();
      abort.abort();
      window.clearTimeout(toastTimer);
      host.innerHTML = '';
      host.classList.remove('game-ui', 'is-playing', 'is-menu');
    },
  };
}
