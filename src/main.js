import './style.css';
import {
  GAME_STATUS,
  acknowledgeMismatch,
  checkTimeout,
  createGame,
  selectTile,
} from './core/gameEngine.js';
import { getLevelById } from './core/levels.js';
import { UI_TIMING } from './config.js';
import { renderBoard } from './ui/board.js';
import { renderHud } from './ui/hud.js';
import { renderConfigScreen } from './ui/configScreen.js';
import { createScreenManager } from './ui/screens.js';

const level = getLevelById(1);
const screens = createScreenManager(document.querySelector('#app'));

function renderGameScreen(container, selectedBases) {
  container.innerHTML = `
    <main class="game-screen">
      <section id="hud" class="hud"></section>
      <section id="board" class="board"></section>
    </main>
  `;
  const hudEl = container.querySelector('#hud');
  const boardEl = container.querySelector('#board');

  let state = createGame({ level, selectedBases, startedAt: Date.now() });

  function renderHudNow() {
    renderHud(hudEl, state, Date.now());
  }

  function renderFullBoard() {
    renderBoard(boardEl, state, { onTileClick: handleTileClick });
  }

  function handleTileClick(tileId) {
    const next = selectTile(state, tileId, Date.now());
    if (next === state) return; // no-op difensivo dell'engine: niente da ridisegnare
    state = next;
    renderFullBoard();
    renderHudNow();

    if (state.pendingMismatch) {
      setTimeout(() => {
        state = acknowledgeMismatch(state);
        renderFullBoard();
        renderHudNow();
      }, UI_TIMING.MISMATCH_FEEDBACK_MS);
    }
  }

  // La griglia si ridisegna solo quando lo stato delle tessere cambia davvero (click
  // risolto, fine feedback d'errore, timeout): ridisegnarla a ogni tick del timer
  // sposterebbe il focus da tastiera fuori dalla tessera su cui l'utente sta
  // navigando con Tab, rompendo la navigazione richiesta da SPECIFICHE.md §7.
  const timerId = setInterval(() => {
    if (state.status === GAME_STATUS.PLAYING) {
      const next = checkTimeout(state, Date.now());
      if (next !== state) {
        state = next;
        renderFullBoard();
      }
    }
    renderHudNow();
    if (state.status !== GAME_STATUS.PLAYING) clearInterval(timerId);
  }, UI_TIMING.TIMER_TICK_INTERVAL_MS);

  renderFullBoard();
  renderHudNow();

  return () => clearInterval(timerId);
}

function showGameScreen(selectedBases) {
  screens.show((container) => renderGameScreen(container, selectedBases));
}

function showConfigScreen() {
  screens.show((container) =>
    renderConfigScreen(container, { level, onStart: showGameScreen })
  );
}

showConfigScreen();
