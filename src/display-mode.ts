import type { UIState, UICallbacks } from './types';

/** Browser chrome needs a native page scroll on iPhone; it is not the Fullscreen API. */
export function createDisplayMode(host: HTMLElement, callbacks: UICallbacks) {
  const abort = new AbortController();
  const landscape = matchMedia('(orientation: landscape)');
  const desktop = matchMedia('(hover: hover) and (pointer: fine)');
  const standalone = matchMedia('(display-mode: standalone)');
  const iphone = /iPhone|iPod/.test(navigator.userAgent);
  const installed = () => standalone.matches || !!(navigator as Navigator & { standalone?: boolean }).standalone;
  const fullscreenAvailable = () => !!document.fullscreenEnabled && !!document.documentElement.requestFullscreen;
  const button = host.querySelector<HTMLButtonElement>('[data-action="screen"]')!;
  const overlay = document.createElement('section');
  overlay.className = 'screen-guide';
  overlay.hidden = true;
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'screen-guide-title');
  overlay.innerHTML = `<div class="screen-guide-card">
    <span class="screen-swipe" aria-hidden="true">↑</span>
    <h2 id="screen-guide-title">Swipe up for more screen</h2>
    <p data-screen-copy></p>
    <button type="button" class="primary-btn" data-screen-continue>CONTINUE</button>
    <p class="screen-install">For play outside Safari: Share → Add to Home Screen → Open as Web App. Then launch Newton’s Ride from your Home Screen.</p>
  </div>`;
  document.body.append(overlay);
  const proceed = overlay.querySelector<HTMLButtonElement>('button')!;
  const heading = overlay.querySelector('h2')!;
  const copy = overlay.querySelector<HTMLElement>('[data-screen-copy]')!;
  overlay.querySelector<HTMLElement>('.screen-install')!.hidden = !iphone;
  let status: UIState['status'] = 'menu';
  let offered = false;
  let resumeAfter = false;
  let previousFocus: HTMLElement | null = null;
  let startY: number | null = null;

  function setScrollable(enabled: boolean) {
    const wasEnabled = document.documentElement.classList.contains('iphone-screen-scroll');
    document.documentElement.classList.toggle('iphone-screen-scroll', enabled);
    if (wasEnabled && !enabled) window.scrollTo(0, 0);
  }
  function close(resume = true) {
    if (overlay.hidden) return;
    overlay.hidden = true;
    host.inert = false;
    if (resume && resumeAfter && status === 'paused') callbacks.resume();
    resumeAfter = false;
    previousFocus?.focus({ preventScroll: true });
  }
  function open() {
    if (!landscape.matches || !overlay.hidden || installed() || document.fullscreenElement) return;
    offered = true;
    proceed.textContent = 'CONTINUE';
    resumeAfter = status === 'playing';
    previousFocus = document.activeElement as HTMLElement | null;
    if (resumeAfter) {
      callbacks.pause();
      status = 'paused'; // Dismissal can happen before the next animation-frame update.
    }
    heading.textContent = fullscreenAvailable() ? 'Swipe up for full screen' : 'Swipe up for more screen';
    copy.textContent = fullscreenAvailable() ? 'Swipe upward or tap Continue to expand the game.' : 'Swipe upward here to tuck Safari’s bars away, then tap Continue. If the bars stay visible, use Safari’s Hide Toolbar option.';
    setScrollable(iphone && landscape.matches && !installed());
    overlay.hidden = false;
    host.inert = true;
    proceed.focus({ preventScroll: true });
  }
  async function expand() {
    if (fullscreenAvailable() && landscape.matches) {
      try {
        await document.documentElement.requestFullscreen();
        if (!abort.signal.aborted) close();
      } catch {
        if (abort.signal.aborted) return;
        copy.textContent = 'This browser could not enter full screen. You can continue playing with the browser bars visible.';
        // A failed request must not trap the player behind a retry-only button.
        proceed.textContent = 'KEEP PLAYING';
      }
    } else close();
  }
  button.addEventListener('click', open, { signal: abort.signal });
  proceed.addEventListener('click', () => {
    if (proceed.textContent === 'KEEP PLAYING') close();
    else void expand();
  }, { signal: abort.signal });
  // Do not cancel touch scrolling: Safari must receive the native upward gesture.
  overlay.addEventListener('touchstart', e => { startY = e.touches[0]?.clientY ?? null; }, { passive: true, signal: abort.signal });
  overlay.addEventListener('touchend', e => {
    if (startY !== null && startY - (e.changedTouches[0]?.clientY ?? startY) > 45 && fullscreenAvailable()) void expand();
    startY = null;
  }, { passive: true, signal: abort.signal });
  document.addEventListener('keydown', e => {
    if (overlay.hidden) return;
    e.stopImmediatePropagation();
    if (e.code === 'Escape') { e.preventDefault(); close(); }
    if (e.code === 'Tab') { e.preventDefault(); proceed.focus({ preventScroll: true }); }
  }, { capture: true, signal: abort.signal });

  return {
    update(next: UIState['status']) {
      status = next;
      button.hidden = desktop.matches || !landscape.matches || installed() || !(iphone || fullscreenAvailable());
      if (!landscape.matches || installed()) {
        close();
        setScrollable(false);
      } else if (iphone && !offered && status === 'playing' && !installed()) open();
      // The game's status transition normally moves focus; keep it in this modal.
      if (!overlay.hidden && !overlay.contains(document.activeElement)) proceed.focus({ preventScroll: true });
    },
    destroy() {
      close(false);
      abort.abort();
      setScrollable(false);
      overlay.remove();
    },
  };
}
