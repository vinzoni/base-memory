import { BASES } from '../core/bases.js';
import { formatTime } from './hud.js';

function formatDateTime(isoString) {
  const date = new Date(isoString);
  const dateLabel = date.toLocaleDateString('it-IT');
  const timeLabel = date.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' });
  return `${dateLabel} ${timeLabel}`;
}

function buildRow(entry) {
  const row = document.createElement('tr');

  const nameCell = document.createElement('td');
  // textContent, mai innerHTML: il nome è testo inserito dall'utente.
  nameCell.textContent = entry.playerName;

  const scoreCell = document.createElement('td');
  scoreCell.textContent = String(entry.score);

  const dateCell = document.createElement('td');
  dateCell.textContent = formatDateTime(entry.dateTime);

  const basesCell = document.createElement('td');
  basesCell.textContent = entry.selectedBases.map((baseId) => BASES[baseId].label).join(' + ');

  const timeCell = document.createElement('td');
  timeCell.textContent = formatTime(entry.timeTakenSeconds);

  row.append(nameCell, scoreCell, dateCell, basesCell, timeCell);
  return row;
}

function buildTable(scores) {
  const table = document.createElement('table');
  table.className = 'high-scores-screen__table';

  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');
  ['Nome', 'Punteggio', 'Data', 'Basi', 'Tempo'].forEach((label) => {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = label;
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);

  const tbody = document.createElement('tbody');
  scores.forEach((entry) => tbody.appendChild(buildRow(entry)));

  table.append(thead, tbody);
  return table;
}

export function renderHighScoresScreen(container, { scores, onBack, onClear }) {
  const section = document.createElement('section');
  section.className = 'high-scores-screen';

  const heading = document.createElement('h1');
  heading.textContent = 'Classifica';
  section.appendChild(heading);

  if (scores.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'high-scores-screen__empty';
    empty.textContent = 'Nessun punteggio in classifica.';
    section.appendChild(empty);
  } else {
    section.appendChild(buildTable(scores));
  }

  const actions = document.createElement('div');
  actions.className = 'high-scores-screen__actions';

  const backButton = document.createElement('button');
  backButton.type = 'button';
  backButton.className = 'screen-secondary-button';
  backButton.textContent = 'Torna indietro';
  backButton.addEventListener('click', () => onBack());
  actions.appendChild(backButton);

  if (scores.length > 0) {
    const clearButton = document.createElement('button');
    clearButton.type = 'button';
    clearButton.className = 'screen-secondary-button';
    clearButton.textContent = 'Azzerra classifica';
    clearButton.addEventListener('click', () => {
      if (window.confirm("Azzerrare la classifica? L'operazione non è reversibile.")) {
        onClear();
      }
    });
    actions.appendChild(clearButton);
  }

  section.appendChild(actions);
  container.replaceChildren(section);
}
