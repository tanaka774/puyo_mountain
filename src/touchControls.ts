import lang from "../locales";

// on-screen buttons for phones/tablets. each button replays the keyboard event
// of the key it stands for, so the existing keyboard handlers (DAS, soft drop,
// quick turn by double tap, V puyo, pause) work unchanged.

const TOUCH_MEDIA = '(pointer: coarse), (max-width: 768px)';

export function isTouchMode(): boolean {
  return window.matchMedia(TOUCH_MEDIA).matches;
}

type PadButton = { key: string; code: string; label: string; cls: string; title: string };

const LEFT_TOP: PadButton[] = [
  { key: 'p', code: 'KeyP', label: 'II', cls: 'pad-small', title: lang.pause },
];
const LEFT_MAIN: PadButton[] = [
  { key: 'ArrowLeft', code: 'ArrowLeft', label: '◀', cls: 'pad-big', title: '←' },
  { key: 'ArrowDown', code: 'ArrowDown', label: '▼', cls: 'pad-big', title: '↓' },
  { key: 'ArrowRight', code: 'ArrowRight', label: '▶', cls: 'pad-big', title: '→' },
];
const RIGHT_TOP: PadButton[] = [
  { key: 'c', code: 'KeyC', label: lang.touchChangeVPuyoColor, cls: 'pad-small', title: lang.changeVPuyoColor },
  { key: 'v', code: 'KeyV', label: lang.touchUseVPuyo, cls: 'pad-small', title: lang.useVPuyo },
];
const RIGHT_MAIN: PadButton[] = [
  { key: 'z', code: 'KeyZ', label: '⟲', cls: 'pad-big pad-rotate', title: lang.rotate },
  { key: 'x', code: 'KeyX', label: '⟳', cls: 'pad-big pad-rotate', title: lang.rotate },
];

function sendKey(type: 'keydown' | 'keyup', key: string, code: string) {
  document.dispatchEvent(new KeyboardEvent(type, { key, code, bubbles: true, cancelable: true }));
}

function createButton(def: PadButton): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = def.cls;
  btn.textContent = def.label;
  btn.setAttribute('aria-label', def.title);
  btn.tabIndex = -1; // never take focus: Enter/Space must not press it again

  let pressed = false;
  const release = () => {
    if (!pressed) return;
    pressed = false;
    btn.classList.remove('pressed');
    sendKey('keyup', def.key, def.code);
  };

  btn.addEventListener('pointerdown', e => {
    e.preventDefault();
    if (pressed) return;
    pressed = true;
    btn.setPointerCapture(e.pointerId);
    btn.classList.add('pressed');
    if (navigator.vibrate) navigator.vibrate(8);
    sendKey('keydown', def.key, def.code);
  });
  btn.addEventListener('pointerup', release);
  btn.addEventListener('pointercancel', release);
  btn.addEventListener('lostpointercapture', release);
  btn.addEventListener('contextmenu', e => e.preventDefault());
  return btn;
}

function createCluster(side: string, top: PadButton[], main: PadButton[]): HTMLElement {
  const cluster = document.createElement('div');
  cluster.className = `pad-cluster pad-${side}`;
  const topRow = document.createElement('div');
  topRow.className = 'pad-row pad-row-top';
  top.forEach(def => topRow.appendChild(createButton(def)));
  const mainRow = document.createElement('div');
  mainRow.className = 'pad-row pad-row-main';
  main.forEach(def => mainRow.appendChild(createButton(def)));
  cluster.append(topRow, mainRow);
  return cluster;
}

export function setupTouchControls(): HTMLElement {
  const pad = document.createElement('div');
  pad.className = 'touch-controls';
  pad.id = 'touchControls';
  pad.append(
    createCluster('left', LEFT_TOP, LEFT_MAIN),
    createCluster('right', RIGHT_TOP, RIGHT_MAIN),
  );
  document.body.appendChild(pad);

  const applyMode = () => document.body.classList.toggle('touch-mode', isTouchMode());
  applyMode();
  window.matchMedia(TOUCH_MEDIA).addEventListener('change', applyMode);

  return pad;
}
