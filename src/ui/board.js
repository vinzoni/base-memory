import { BASES } from '../core/bases.js';
import { GAME_STATUS, isTileCovered } from '../core/gameEngine.js';
import { findBoardGrid } from '../core/pairGenerator.js';

const STATE_LABELS = {
  resolved: 'risolta',
  error: 'coppia errata',
  selected: 'selezionata',
  default: '',
};

const STATE_ICONS = {
  resolved: '✓',
  error: '✕',
};

function tileStateOf(tile, state) {
  if (state.resolvedPairIds.includes(tile.pairId)) return 'resolved';
  if (state.selectedTileIds.includes(tile.id)) {
    return state.pendingMismatch ? 'error' : 'selected';
  }
  if (isTileCovered(state, tile.id)) return 'covered';
  return 'default';
}

function buildTile(tile, tileState, gameOver, onTileClick) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `tile tile--${tileState}`;
  // Una tessera risolta non è più selezionabile (SPECIFICHE.md §1); a partita
  // finita disabilitiamo tutto per non lasciare bottoni "vivi" che non fanno nulla.
  button.disabled = tileState === 'resolved' || gameOver;
  // Il listener chiude su tile.id via closure (valore JS, non letto dal DOM):
  // vale identico per il ramo coperto, che non deve esporre nient'altro.
  button.addEventListener('click', () => onTileClick(tile.id));

  if (tileState === 'covered') {
    // Niente valore, base o dataset.tileId nel DOM (SPECIFICHE.md §2): il
    // formato di tile.id ("pairId-baseId", vedi pairGenerator.js) rivelerebbe
    // la base della tessera anche a partita ferma, solo ispezionando la pagina.
    const coverIcon = document.createElement('span');
    coverIcon.className = 'tile__cover-icon';
    coverIcon.setAttribute('aria-hidden', 'true');
    coverIcon.textContent = '?';
    button.appendChild(coverIcon);
    button.setAttribute('aria-label', 'Tessera coperta');
    return button;
  }

  button.dataset.tileId = tile.id;

  const icon = STATE_ICONS[tileState];
  if (icon) {
    const iconEl = document.createElement('span');
    iconEl.className = 'tile__icon';
    iconEl.setAttribute('aria-hidden', 'true');
    iconEl.textContent = icon;
    button.appendChild(iconEl);
  }

  const valueEl = document.createElement('span');
  valueEl.className = 'tile__value';
  valueEl.textContent = tile.display;
  button.appendChild(valueEl);

  const baseLabel = BASES[tile.baseId].label;
  const baseEl = document.createElement('span');
  // La classe modificatrice porta solo la tinta per base (style.css). È una
  // class, non un data-*, e il ramo "coperta" esce prima di qui: nessuna base
  // finisce nel DOM di una tessera coperta (SPECIFICHE.md §2.7).
  baseEl.className = `tile__base tile__base--${tile.baseId}`;
  baseEl.textContent = baseLabel;
  button.appendChild(baseEl);

  const stateLabel = STATE_LABELS[tileState];
  button.setAttribute(
    'aria-label',
    `Valore ${tile.display}, base ${baseLabel}${stateLabel ? `, ${stateLabel}` : ''}`
  );

  return button;
}

export function renderBoard(container, state, { onTileClick }) {
  container.replaceChildren();
  // La griglia usa sempre il numero di colonne "ideale" per il conteggio di
  // tessere (SPECIFICHE.md §7). Su schermo stretto sono le tessere a
  // rimpicciolirsi — via minmax(0, 1fr) e i media query in style.css — non le
  // colonne a ridursi: un tavolo di Memory va visto tutto insieme. Il conteggio
  // è già garantito fattorizzabile in un rettangolo accettabile per costruzione
  // (generatePairs ha già scartato, se necessario, una coppia).
  const { columns } = findBoardGrid(state.tiles.length);
  container.style.setProperty('--board-columns', columns);
  // Da 6 colonne in su (griglie 6x4 e 6x6) il font delle tessere si riduce: a
  // piena larghezza desktop la cella è stretta. Su telefono ci pensano i
  // container query in style.css, indipendenti dal numero di colonne.
  const WIDE_GRID_COLUMN_THRESHOLD = 6;
  container.classList.toggle('board--tight', columns >= WIDE_GRID_COLUMN_THRESHOLD);
  const gameOver = state.status !== GAME_STATUS.PLAYING;

  state.tiles.forEach((tile) => {
    const tileState = tileStateOf(tile, state);
    container.appendChild(buildTile(tile, tileState, gameOver, onTileClick));
  });
}
