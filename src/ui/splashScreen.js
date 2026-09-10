import { BASES, formatValueInBase } from '../core/bases.js';
import { UI_TIMING } from '../config.js';

// Numero mostrato dalla tessera dello splash. Le sue quattro rappresentazioni —
// 26 / 11010 / 32 / 1A — sono nettamente diverse tra loro (lunghezze 2/5/2/2,
// nessuna cifra in comune, una lettera nell'esadecimale): su un'animazione di
// pochi secondi il cambio di base si legge come un'idea, non come un glitch. Il
// valore resta nel range di gioco (0-31).
const DEMO_VALUE = 26;
const DEMO_BASE_SEQUENCE = ['DEC', 'BIN', 'OCT', 'HEX'];
// Stato iniziale e di riposo della tessera: la rappresentazione più familiare.
const DEMO_REST_BASE = 'DEC';

// Mezzo giro sull'asse Y a ogni cambio di base: richiama le tessere di gioco che
// si girano. Deve stare comodo dentro SPLASH_BASE_CYCLE_MS.
const FLIP_DURATION_MS = 780;

export function renderSplashScreen(container, { onDismiss }) {
  // Lo stato di riposo definito nel CSS è già quello finale: con questa
  // preferenza attiva lo splash si vede completo e immobile, mai vuoto.
  const reducedMotion =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const section = document.createElement('section');
  section.className = 'splash-screen';

  // Spazio riservato per un futuro logo + nome di una scuola (non implementati):
  // il contenitore esiste già, con un'altezza minima nel CSS, così aggiungerli
  // non sposterà il titolo e la firma.
  const institution = document.createElement('div');
  institution.className = 'splash-screen__institution';
  institution.setAttribute('aria-hidden', 'true');

  // Tessera dimostrativa: puramente decorativa, l'informazione è nel titolo e
  // nella firma. aria-hidden per non farla leggere (e rileggere a ogni cambio).
  const demo = document.createElement('div');
  demo.className = 'splash-screen__demo';
  demo.setAttribute('aria-hidden', 'true');
  const tile = document.createElement('div');
  tile.className = 'splash-screen__tile';
  const valueEl = document.createElement('span');
  valueEl.className = 'splash-screen__tile-value';
  const pillEl = document.createElement('span');
  tile.append(valueEl, pillEl);
  demo.appendChild(tile);

  const title = document.createElement('h1');
  title.className = 'splash-screen__title';
  title.textContent = 'Basi Gemelle';

  const byline = document.createElement('p');
  byline.className = 'splash-screen__byline';
  byline.textContent = 'di Andrea Vinzoni';

  const credit = document.createElement('p');
  credit.className = 'splash-screen__credit';
  credit.textContent = 'sviluppato con Claude (Anthropic)';

  const hint = document.createElement('p');
  hint.className = 'splash-screen__hint';
  hint.textContent = 'Tocca lo schermo o premi un tasto per iniziare';

  section.append(institution, demo, title, byline, credit, hint);
  container.replaceChildren(section);

  function showRep(baseId) {
    valueEl.textContent = formatValueInBase(DEMO_VALUE, baseId);
    pillEl.textContent = BASES[baseId].label;
    pillEl.className = `tile__base tile__base--${baseId}`;
  }

  function flip() {
    // Web Animations API: se manca, il cambio di base resta comunque visibile
    // (testo e colore della pill), solo senza il mezzo giro.
    if (typeof tile.animate !== 'function') return;
    tile.animate(
      [
        { transform: 'rotateY(-78deg)', opacity: 0.35 },
        { transform: 'none', opacity: 1 },
      ],
      { duration: FLIP_DURATION_MS, easing: 'ease-out' }
    );
  }

  showRep(DEMO_REST_BASE);

  let cycleId = null;
  if (!reducedMotion) {
    let stepIndex = 0;
    cycleId = setInterval(() => {
      stepIndex += 1;
      if (stepIndex >= DEMO_BASE_SEQUENCE.length) {
        // Giro completato: torna al riposo e ferma il ciclo (niente loop
        // infinito su uno splash, che comunque prosegue da solo).
        showRep(DEMO_REST_BASE);
        flip();
        clearInterval(cycleId);
        cycleId = null;
        return;
      }
      showRep(DEMO_BASE_SEQUENCE[stepIndex]);
      flip();
    }, UI_TIMING.SPLASH_BASE_CYCLE_MS);
  }

  let dismissed = false;
  const autoAdvanceId = setTimeout(dismiss, UI_TIMING.SPLASH_AUTO_ADVANCE_MS);
  // Niente stopPropagation: lo stesso gesto deve risalire fino a `document`, dove
  // main.js tiene il listener che sblocca l'AudioContext.
  window.addEventListener('pointerdown', dismiss);
  window.addEventListener('keydown', dismiss);

  function cleanup() {
    clearTimeout(autoAdvanceId);
    if (cycleId !== null) clearInterval(cycleId);
    window.removeEventListener('pointerdown', dismiss);
    window.removeEventListener('keydown', dismiss);
  }

  function dismiss() {
    // Il primo tra avanzamento automatico e gesto dell'utente vince; l'altro
    // diventa un no-op, altrimenti si passerebbe due volte alla configurazione.
    if (dismissed) return;
    dismissed = true;
    cleanup();
    onDismiss();
  }

  return cleanup;
}
