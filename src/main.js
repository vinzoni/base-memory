import './style.css';
import {
  GAME_STATUS,
  acknowledgeMismatch,
  advanceToNextLevel,
  checkTimeout,
  createGame,
  finishGame,
  getTotalElapsedSeconds,
  selectTile,
} from './core/gameEngine.js';
import { LEVELS, getLevelById } from './core/levels.js';
import { MIN_BASES_FOR_OPERATIVE_PIVOT, UI_TIMING } from './config.js';
import { renderBoard } from './ui/board.js';
import { renderHud } from './ui/hud.js';
import { renderConfigScreen } from './ui/configScreen.js';
import { renderSummaryScreen } from './ui/summaryScreen.js';
import { renderLevelCompleteScreen } from './ui/levelCompleteScreen.js';
import { renderHighScoresScreen } from './ui/highScoresScreen.js';
import { createScreenManager } from './ui/screens.js';
import {
  addHighScore,
  clearHighScores,
  qualifiesForHighScore,
  readHighScores,
} from './storage/highScores.js';

const FIRST_LEVEL = getLevelById(1);
// Non deve dipendere dal solo Livello 1: se in futuro il vincolo pivot si spostasse
// su altri livelli, l'avviso in configurazione deve restare corretto.
const HAS_DECIMAL_PIVOT_LEVEL = LEVELS.some((lvl) => lvl.requireDecimalPivot);
const screens = createScreenManager(document.querySelector('#app'));

// Il vincolo pivot decimale restringe davvero la generazione delle coppie solo
// quando DEC è tra le basi selezionate (senza, applyDecimalPivot lo ignora) e le
// basi sono almeno tre (con due, l'unica coppia possibile contiene già entrambe).
// Fuori da questi casi il vincolo non stava togliendo nulla: passare a un livello
// che non lo richiede non cambia niente per il giocatore, e l'avviso sarebbe
// fuorviante.
function decimalPivotWasOperative(selectedBases) {
  return (
    selectedBases.includes('DEC') && selectedBases.length >= MIN_BASES_FOR_OPERATIVE_PIVOT
  );
}

// Unico punto dell'app che tocca localStorage: il resto del codice (schermate incluse)
// riceve solo funzioni già legate allo storage o dati già letti.
const storage = window.localStorage;
function getHighScores() {
  return readHighScores(storage);
}
function saveHighScore(entry) {
  return addHighScore(storage, entry);
}
function resetHighScores() {
  clearHighScores(storage);
}

function renderGameScreen(container, { selectedBases, level, previousState, onLevelComplete, onGameOver }) {
  container.innerHTML = `
    <main class="game-screen">
      <section id="hud" class="hud"></section>
      <section id="board" class="board"></section>
    </main>
  `;
  const hudEl = container.querySelector('#hud');
  const boardEl = container.querySelector('#board');

  let state = previousState
    ? advanceToNextLevel(previousState, { level, selectedBases, startedAt: Date.now() })
    : createGame({ level, selectedBases, startedAt: Date.now() });

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

    if (state.status === GAME_STATUS.LEVEL_COMPLETE) {
      const nextLevel = getLevelById(state.levelId + 1);
      if (nextLevel) {
        onLevelComplete(state, nextLevel);
      } else {
        onGameOver(finishGame(state));
      }
      return;
    }

    if (state.status !== GAME_STATUS.PLAYING) {
      onGameOver(state);
      return;
    }

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
    if (state.status !== GAME_STATUS.PLAYING) {
      clearInterval(timerId);
      onGameOver(state);
    }
  }, UI_TIMING.TIMER_TICK_INTERVAL_MS);

  renderFullBoard();
  renderHudNow();

  return () => clearInterval(timerId);
}

function showLevel(selectedBases, level, previousState) {
  screens.show((container) =>
    renderGameScreen(container, {
      selectedBases,
      level,
      previousState,
      onLevelComplete: (state, nextLevel) => showLevelCompleteScreen(selectedBases, state, nextLevel),
      onGameOver: (state) => showSummaryScreen(selectedBases, state),
    })
  );
}

function showGameScreen(selectedBases) {
  showLevel(selectedBases, FIRST_LEVEL, null);
}

function showLevelCompleteScreen(selectedBases, state, nextLevel) {
  const completedLevel = getLevelById(state.levelId);
  const pivotDropped =
    completedLevel.requireDecimalPivot &&
    !nextLevel.requireDecimalPivot &&
    decimalPivotWasOperative(selectedBases);

  screens.show((container) =>
    renderLevelCompleteScreen(container, {
      state,
      completedLevel,
      nextLevel,
      pivotDropped,
      onContinue: () => showLevel(selectedBases, nextLevel, state),
    })
  );
}

function showSummaryScreen(selectedBases, state) {
  const currentScores = getHighScores();
  const qualifies = qualifiesForHighScore(currentScores, state.score);
  const level = getLevelById(state.levelId);

  screens.show((container) =>
    renderSummaryScreen(container, {
      state,
      level,
      qualifies,
      onSaveScore: (playerName) => {
        const entry = {
          playerName,
          score: state.score,
          dateTime: new Date().toISOString(),
          selectedBases,
          levelReached: state.levelId,
          timeTakenSeconds: getTotalElapsedSeconds(state, Date.now()),
        };
        saveHighScore(entry);
        // isValidEntry in storage/highScores.js scarta in silenzio le voci
        // malformate: senza questa rilettura, un oggetto incompleto mostrerebbe
        // comunque la conferma di salvataggio e sparirebbe alla lettura successiva.
        return getHighScores().some(
          (saved) =>
            saved.playerName === entry.playerName &&
            saved.score === entry.score &&
            saved.dateTime === entry.dateTime
        );
      },
      onPlayAgain: showConfigScreen,
      onShowHighScores: showHighScoresScreen,
    })
  );
}

function showHighScoresScreen() {
  screens.show((container) =>
    renderHighScoresScreen(container, {
      scores: getHighScores(),
      onBack: showConfigScreen,
      onClear: () => {
        resetHighScores();
        showHighScoresScreen();
      },
    })
  );
}

function showConfigScreen() {
  screens.show((container) =>
    renderConfigScreen(container, {
      level: FIRST_LEVEL,
      hasDecimalPivotLevel: HAS_DECIMAL_PIVOT_LEVEL,
      onStart: showGameScreen,
      onShowHighScores: showHighScoresScreen,
    })
  );
}

showConfigScreen();
