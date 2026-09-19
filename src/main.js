import './style.css';
import {
  GAME_STATUS,
  abandonGame,
  acknowledgeMismatch,
  advanceToNextLevel,
  checkTimeout,
  createGame,
  finishGame,
  getRemainingSeconds,
  getTotalElapsedSeconds,
  selectTile,
} from './core/gameEngine.js';
import { LEVELS, getLevelById } from './core/levels.js';
import { AUDIO_ENABLED_BY_DEFAULT, MIN_BASES_FOR_OPERATIVE_PIVOT, STORAGE_KEYS, UI_TIMING } from './config.js';
import { renderBoard } from './ui/board.js';
import { renderHud } from './ui/hud.js';
import { createSoundPlayer } from './ui/sounds.js';
import { createAudioToggle } from './ui/audioToggle.js';
import { renderConfigScreen } from './ui/configScreen.js';
import { renderSplashScreen } from './ui/splashScreen.js';
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
import { reportGameFinished, reportPageOpened } from './stats.js';

const FIRST_LEVEL = getLevelById(1);
// Non deve dipendere dal solo Livello 1: se in futuro il vincolo pivot si spostasse
// su altri livelli, l'avviso in configurazione deve restare corretto.
const HAS_DECIMAL_PIVOT_LEVEL = LEVELS.some((lvl) => lvl.requireDecimalPivot);
const screens = createScreenManager(document.querySelector('#app'));

// Testo unico della conferma di abbandono, condiviso dai due punti in cui il
// pulsante compare (schermata di gioco e schermata di fine livello). Dice le due
// cose che contano: la partita finisce, il punteggio resta valido.
const ABANDON_CONFIRM_MESSAGE =
  'Abbandonare la partita in corso? Il punteggio maturato finora resta valido ed entra in classifica, ma la partita finisce qui.';

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

// La preferenza audio segue lo stesso principio della classifica: solo main.js
// tocca localStorage, i moduli di UI ricevono già funzioni pronte. La logica è
// minima (un booleano) e vive qui invece che in un modulo di storage dedicato.
function readAudioEnabled() {
  let raw;
  try {
    raw = storage.getItem(STORAGE_KEYS.AUDIO_ENABLED);
  } catch {
    return AUDIO_ENABLED_BY_DEFAULT;
  }
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  // Valore assente o malformato: si torna al default (audio spento), scelta
  // sicura per l'uso in aula.
  return AUDIO_ENABLED_BY_DEFAULT;
}
function writeAudioEnabled(isEnabled) {
  try {
    storage.setItem(STORAGE_KEYS.AUDIO_ENABLED, String(isEnabled));
  } catch {
    // Storage non disponibile o quota esaurita: la preferenza non viene
    // persistita ma la sessione corrente resta valida.
  }
}

const sounds = createSoundPlayer();
let audioEnabled = readAudioEnabled();
sounds.setEnabled(audioEnabled);

// L'AudioContext deve nascere da un gesto dell'utente (i browser bloccano
// l'audio prima di un'interazione). Il primo pointerdown/keydown utile lo
// sblocca — di fatto già il clic che salta lo splash.
function unlockAudio() {
  sounds.unlock();
}
document.addEventListener('pointerdown', unlockAudio, { once: true });
document.addEventListener('keydown', unlockAudio, { once: true });

// Unico proprietario dello stato audio: espone la lettura e il cambio, e tiene
// insieme motore sonoro e persistenza. Il pulsante toggle (configurazione e
// partita) lavora solo attraverso questo oggetto.
const audioControl = {
  isEnabled: () => audioEnabled,
  toggle: () => {
    audioEnabled = !audioEnabled;
    sounds.setEnabled(audioEnabled);
    writeAudioEnabled(audioEnabled);
    // Accendere l'audio è a sua volta un gesto valido per creare l'AudioContext,
    // se non è ancora stato sbloccato.
    sounds.unlock();
    return audioEnabled;
  },
};

function renderGameScreen(container, { selectedBases, level, previousState, onLevelComplete, onGameOver }) {
  container.innerHTML = `
    <main class="game-screen">
      <div class="game-screen__toolbar"></div>
      <section id="hud" class="hud"></section>
      <section id="board" class="board"></section>
    </main>
  `;
  const hudEl = container.querySelector('#hud');
  const boardEl = container.querySelector('#board');

  // Barra in alto: toggle audio e pulsante di abbandono. Il toggle si costruisce
  // una volta sola, fuori dal ciclo di renderHud (che fa replaceChildren su #hud
  // a ogni tick e distruggerebbe il pulsante e il focus da tastiera su di esso).
  // Il pulsante di abbandono va dopo il toggle: nell'ordine di tabulazione il
  // primo Tab dall'inizio pagina cade sul toggle (innocuo), non sull'abbandono.
  const toolbar = container.querySelector('.game-screen__toolbar');
  toolbar.appendChild(createAudioToggle(audioControl));
  const abandonButton = document.createElement('button');
  abandonButton.type = 'button';
  abandonButton.className = 'screen-secondary-button game-screen__abandon';
  abandonButton.textContent = 'Abbandona partita';
  toolbar.appendChild(abandonButton);

  let state = previousState
    ? advanceToNextLevel(previousState, { level, selectedBases, startedAt: Date.now() })
    : createGame({ level, selectedBases, startedAt: Date.now() });

  // Il suono di fine partita (vittoria o sconfitta) va emesso una volta sola:
  // la fine può essere rilevata sia da handleTileClick sia dal tick del timer.
  let endSoundPlayed = false;
  function playEndSound(soundName) {
    if (endSoundPlayed) return;
    endSoundPlayed = true;
    sounds.play(soundName);
  }
  // Il suono "tempo agli sgoccioli" si emette una volta sola, al passaggio sotto
  // la soglia di avviso, non a ogni tick.
  let timeLowPlayed = false;

  function renderHudNow() {
    renderHud(hudEl, state, Date.now());
  }

  function renderFullBoard() {
    renderBoard(boardEl, state, { onTileClick: handleTileClick });
  }

  function handleTileClick(tileId) {
    const next = selectTile(state, tileId, Date.now());
    if (next === state) return; // no-op difensivo dell'engine: niente da ridisegnare

    const justResolvedPair = next.resolvedPairIds.length > state.resolvedPairIds.length;
    const justErrored = next.pendingMismatch && !state.pendingMismatch;

    state = next;
    renderFullBoard();
    renderHudNow();

    if (state.status === GAME_STATUS.LEVEL_COMPLETE) {
      const nextLevel = getLevelById(state.levelId + 1);
      if (nextLevel) {
        sounds.play('levelComplete');
        onLevelComplete(state, nextLevel);
      } else {
        playEndSound('gameWon');
        onGameOver(finishGame(state));
      }
      return;
    }

    if (state.status !== GAME_STATUS.PLAYING) {
      // selectTile può chiudere la partita per timeout scoperto proprio al click.
      playEndSound('gameLost');
      onGameOver(state);
      return;
    }

    if (justErrored) {
      sounds.play('pairError');
    } else if (justResolvedPair) {
      sounds.play('pairMatch');
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

    if (state.status === GAME_STATUS.PLAYING && !timeLowPlayed) {
      const remaining = getRemainingSeconds(state, Date.now());
      // remaining > 0: a zero è già scattato il timeout, il suono giusto è
      // gameLost, non l'avviso.
      if (remaining > 0 && remaining < UI_TIMING.TIME_WARNING_THRESHOLD_SECONDS) {
        timeLowPlayed = true;
        sounds.play('timeLow');
      }
    }

    if (state.status !== GAME_STATUS.PLAYING) {
      clearInterval(timerId);
      if (state.status === GAME_STATUS.LOST) playEndSound('gameLost');
      onGameOver(state);
    }
  }, UI_TIMING.TIMER_TICK_INTERVAL_MS);

  // La conferma è la seconda protezione (oltre alla posizione dopo il toggle
  // audio) contro un'attivazione involontaria.
  abandonButton.addEventListener('click', () => {
    if (state.status !== GAME_STATUS.PLAYING) return;
    // `now` letto prima di confirm(): la dialog blocca l'event loop (il timer non
    // scatta finché è aperta) e il tempo speso a decidere non deve contare. Se
    // l'utente annulla, il tick successivo rileva l'eventuale timeout nel modo
    // consueto.
    const now = Date.now();
    if (!window.confirm(ABANDON_CONFIRM_MESSAGE)) return;
    clearInterval(timerId);
    state = abandonGame(state, now);
    onGameOver(state);
  });

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
      onAbandon: () => {
        if (!window.confirm(ABANDON_CONFIRM_MESSAGE)) return;
        // Qui il timer è già fermo e finishedAt fissato al completamento del
        // livello: abandonGame conserva quel valore e ignora l'istante passato.
        showSummaryScreen(selectedBases, abandonGame(state, Date.now()));
      },
    })
  );
}

function showSummaryScreen(selectedBases, state) {
  // Unico punto raggiunto da tutti gli esiti di fine partita (vittoria, timeout,
  // abbandono): garantisce una sola chiamata per partita, non per livello.
  reportGameFinished({ score: state.score, levelReached: state.levelId, selectedBases });

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
      audioControl,
    })
  );
}

function showSplashScreen() {
  screens.show((container) =>
    renderSplashScreen(container, {
      onDismiss: () => {
        // Il gesto che salta lo splash è il primo gesto utile sulla pagina: è
        // qui che l'AudioContext può nascere. I listener {once:true} su document
        // lo farebbero comunque (il gesto risale fin lì e non viene fermato),
        // questa è la garanzia esplicita — sounds.unlock() è idempotente.
        unlockAudio();
        showConfigScreen();
      },
    })
  );
}

reportPageOpened();
showSplashScreen();
