import { getRemainingSeconds } from '../core/gameEngine.js';
import { UI_TIMING } from '../config.js';
import { createIcon } from './icons.js';

export function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function buildItem(iconName, label, value, extraClass = '') {
  const item = document.createElement('div');
  item.className = `hud__item${extraClass ? ` ${extraClass}` : ''}`;
  // L'informazione completa sta nell'aria-label: l'icona è decorativa e
  // l'etichetta a schermo è abbreviata rispetto a quello che leggerebbe un
  // lettore di schermo.
  item.setAttribute('aria-label', `${label} ${value}`);

  const text = document.createElement('span');
  text.className = 'hud__item-text';

  const labelEl = document.createElement('span');
  labelEl.className = 'hud__item-label';
  labelEl.textContent = label;

  const valueEl = document.createElement('span');
  valueEl.className = 'hud__item-value';
  valueEl.textContent = value;

  text.append(labelEl, valueEl);
  item.append(createIcon(iconName), text);
  return item;
}

export function renderHud(container, state, now) {
  const remainingSeconds = getRemainingSeconds(state, now);
  const totalPairCount = state.tiles.length / 2;
  const isTimeLow = remainingSeconds < UI_TIMING.TIME_WARNING_THRESHOLD_SECONDS;

  container.replaceChildren(
    buildItem('level', 'Livello', String(state.levelId)),
    buildItem(
      isTimeLow ? 'timeWarning' : 'time',
      'Tempo',
      formatTime(remainingSeconds),
      isTimeLow ? 'hud__item--time-warning' : ''
    ),
    buildItem('score', 'Punteggio', String(state.score)),
    buildItem('pairs', 'Coppie', `${state.resolvedPairIds.length}/${totalPairCount}`),
    buildItem('errors', 'Errori', String(state.errorCount))
  );
}
