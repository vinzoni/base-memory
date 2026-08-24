import { GAME_STATUS, getElapsedSeconds } from '../core/gameEngine.js';
import { formatTime } from './hud.js';
import { MAX_PLAYER_NAME_LENGTH } from '../config.js';

function buildStat(label, value) {
  const wrapper = document.createElement('div');
  wrapper.className = 'summary-screen__stat';

  const dt = document.createElement('dt');
  dt.textContent = label;

  const dd = document.createElement('dd');
  dd.textContent = value;

  wrapper.append(dt, dd);
  return wrapper;
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

export function renderSummaryScreen(container, { state, qualifies, onSaveScore, onPlayAgain, onShowHighScores }) {
  const section = document.createElement('section');
  section.className = 'summary-screen';

  const heading = document.createElement('h1');
  heading.textContent = state.status === GAME_STATUS.WON ? 'Livello completato' : 'Tempo scaduto';
  section.appendChild(heading);

  const totalPairCount = state.tiles.length / 2;
  const stats = document.createElement('dl');
  stats.className = 'summary-screen__stats';
  stats.append(
    buildStat('Punteggio finale', String(state.score)),
    buildStat('Tempo impiegato', formatTime(getElapsedSeconds(state, Date.now()))),
    buildStat('Coppie risolte', `${state.resolvedPairIds.length}/${totalPairCount}`),
    buildStat('Errori', String(state.errorCount))
  );
  section.appendChild(stats);

  if (qualifies) {
    section.appendChild(buildHighScoreForm(state, onSaveScore));
  }

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
