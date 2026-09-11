import { GAME_STATUS, getTotalElapsedSeconds } from '../core/gameEngine.js';
import { formatTime } from './hud.js';
import { createIcon } from './icons.js';
import { MAX_PLAYER_NAME_LENGTH } from '../config.js';

// I tre esiti possibili di una partita conclusa: il titolo è l'unico segnale che
// li distingue (come già avveniva per vittoria e sconfitta).
const SUMMARY_HEADINGS = {
  [GAME_STATUS.WON]: 'Tutti i livelli completati!',
  [GAME_STATUS.LOST]: 'Tempo scaduto',
  [GAME_STATUS.ABANDONED]: 'Partita abbandonata',
};

function buildStat(iconName, label, value) {
  const wrapper = document.createElement('div');
  wrapper.className = 'summary-screen__stat';

  const text = document.createElement('span');
  text.className = 'summary-screen__stat-text';

  const dt = document.createElement('dt');
  dt.textContent = label;

  const dd = document.createElement('dd');
  dd.textContent = value;

  text.append(dt, dd);
  wrapper.append(createIcon(iconName), text);
  return wrapper;
}

// Riga leggera, non il riquadro con icona di buildStat: prima del modulo
// nome serve solo il dato che decide se registrarsi, non l'intero pannello
// (SPECIFICHE.md e verifica su telefono in orizzontale — il pannello intero
// spingerebbe il modulo sotto la piega).
function buildScorePreview(score) {
  const preview = document.createElement('p');
  preview.className = 'summary-screen__score-preview';

  const value = document.createElement('strong');
  value.textContent = String(score);

  preview.append('Punteggio finale: ', value);
  return preview;
}

function buildHighScoreForm(state, onSaveScore) {
  const form = document.createElement('form');
  form.className = 'summary-screen__highscore-form';

  const label = document.createElement('label');
  label.htmlFor = 'summary-player-name';
  label.textContent = 'Il punteggio entra in classifica! Inserisci il tuo nome:';

  const input = document.createElement('input');
  input.type = 'text';
  input.id = 'summary-player-name';
  input.maxLength = MAX_PLAYER_NAME_LENGTH;
  input.required = true;
  input.autocomplete = 'off';

  const saveButton = document.createElement('button');
  saveButton.type = 'submit';
  saveButton.className = 'screen-secondary-button';
  saveButton.textContent = 'Salva';

  form.append(label, input, saveButton);

  form.addEventListener('submit', (event) => {
    // Senza preventDefault il browser navigherebbe ricaricando la pagina, perdendo
    // lo stato della partita appena conclusa.
    event.preventDefault();
    const playerName = input.value.trim();
    if (!playerName) return;

    const saved = onSaveScore(playerName);
    const confirmation = document.createElement('p');
    confirmation.className = 'summary-screen__save-confirmation';
    // textContent, mai innerHTML: il nome del giocatore è testo inserito
    // dall'utente e non va mai interpretato come markup.
    confirmation.textContent = saved
      ? `Punteggio salvato in classifica come "${playerName}".`
      : 'Il salvataggio non è riuscito: il punteggio resta comunque visibile qui sopra.';
    form.replaceWith(confirmation);
  });

  return form;
}

export function renderSummaryScreen(container, { state, level, qualifies, onSaveScore, onPlayAgain, onShowHighScores }) {
  const section = document.createElement('section');
  section.className = 'summary-screen';

  const heading = document.createElement('h1');
  heading.textContent = SUMMARY_HEADINGS[state.status] ?? SUMMARY_HEADINGS[GAME_STATUS.LOST];
  section.appendChild(heading);

  const totalPairCount = state.tiles.length / 2;
  const otherStats = [
    buildStat('level', 'Livello raggiunto', level.name),
    buildStat('time', 'Tempo impiegato', formatTime(getTotalElapsedSeconds(state, Date.now()))),
    buildStat('pairs', 'Coppie risolte', `${state.resolvedPairIds.length}/${totalPairCount}`),
    buildStat('errors', 'Errori', String(state.errorCount)),
  ];

  const stats = document.createElement('dl');
  stats.className = 'summary-screen__stats';

  if (qualifies) {
    // Il punteggio è già anticipato sopra il modulo: qui non va duplicato.
    section.appendChild(buildScorePreview(state.score));
    section.appendChild(buildHighScoreForm(state, onSaveScore));
    stats.append(...otherStats);
  } else {
    stats.append(buildStat('score', 'Punteggio finale', String(state.score)), ...otherStats);
  }

  section.appendChild(stats);

  const actions = document.createElement('div');
  actions.className = 'summary-screen__actions';

  const playAgainButton = document.createElement('button');
  playAgainButton.type = 'button';
  playAgainButton.className = 'config-screen__start';
  playAgainButton.textContent = 'Gioca ancora';
  playAgainButton.addEventListener('click', () => onPlayAgain());

  const highScoresButton = document.createElement('button');
  highScoresButton.type = 'button';
  highScoresButton.className = 'screen-secondary-button';
  highScoresButton.textContent = 'Classifica';
  highScoresButton.addEventListener('click', () => onShowHighScores());

  actions.append(playAgainButton, highScoresButton);
  section.appendChild(actions);

  container.replaceChildren(section);
}
