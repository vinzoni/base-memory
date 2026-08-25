import { getRemainingSeconds } from '../core/gameEngine.js';
import { UI_TIMING } from '../config.js';

export function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function buildItem(className, text) {
  const item = document.createElement('div');
  item.className = className;
  item.textContent = text;
  return item;
}

export function renderHud(container, state, now) {
  const remainingSeconds = getRemainingSeconds(state, now);
  const totalPairCount = state.tiles.length / 2;
  const isTimeLow = remainingSeconds < UI_TIMING.TIME_WARNING_THRESHOLD_SECONDS;

  container.replaceChildren(
    buildItem('hud__item', `Livello: ${state.levelId}`),
    buildItem(
      `hud__item hud__time${isTimeLow ? ' hud__time--warning' : ''}`,
      `${isTimeLow ? '⚠ ' : ''}Tempo: ${formatTime(remainingSeconds)}`
    ),
    buildItem('hud__item', `Punteggio: ${state.score}`),
    buildItem('hud__item', `Coppie: ${state.resolvedPairIds.length}/${totalPairCount}`),
    buildItem('hud__item', `Errori: ${state.errorCount}`)
  );
}
