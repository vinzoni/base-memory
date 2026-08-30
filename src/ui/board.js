import { BASES } from '../core/bases.js';
import { GAME_STATUS } from '../core/gameEngine.js';
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
  return 'default';
}

// grid-template-columns usa repeat() con un intero letterale (vedi style.css): il
// tetto di colonne per gli schermi stretti va quindi risolto qui, non con min()/calc()
// nella regola CSS. Le soglie devono restare sincronizzate con i breakpoint in
// style.css (400px, 640px).
const BOARD_COLUMN_BREAKPOINTS = [
  { maxViewportWidth: 400, maxColumns: 2 },
  { maxViewportWidth: 640, maxColumns: 3 },
];

function maxColumnsForViewport(viewportWidth) {
  const breakpoint = BOARD_COLUMN_BREAKPOINTS.find(
    ({ maxViewportWidth }) => viewportWidth <= maxViewportWidth
  );
  return breakpoint ? breakpoint.maxColumns : 6;
}

function buildTile(tile, tileState, gameOver, onTileClick) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `tile tile--${tileState}`;
  button.dataset.tileId = tile.id;
  // Una tessera risolta non è più selezionabile (SPECIFICHE.md §1); a partita
  // finita disabilitiamo tutto per non lasciare bottoni "vivi" che non fanno nulla.
  button.disabled = tileState === 'resolved' || gameOver;

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
  baseEl.className = 'tile__base';
  baseEl.textContent = baseLabel;
  button.appendChild(baseEl);

  const stateLabel = STATE_LABELS[tileState];
  button.setAttribute(
    'aria-label',
    `Valore ${tile.display}, base ${baseLabel}${stateLabel ? `, ${stateLabel}` : ''}`
  );

  button.addEventListener('click', () => onTileClick(tile.id));

  return button;
}

export function renderBoard(container, state, { onTileClick }) {
  container.replaceChildren();
  // La griglia si dimensiona sul numero effettivo di tessere (SPECIFICHE.md §7),
  // non su un tetto fisso. Il conteggio è già garantito fattorizzabile in un
  // rettangolo accettabile per costruzione (generatePairs ha già scartato, se
  // necessario, una coppia): qui non serve altro fallback.
  const { columns: idealColumns } = findBoardGrid(state.tiles.length);
  const columns = Math.min(idealColumns, maxColumnsForViewport(window.innerWidth));
  container.style.setProperty('--board-columns', columns);
  // Da 6 colonne in poi le tessere ospitano valori binari a 8 cifre (Livelli 6-15):
  // a piena larghezza (board 640px) il testo a dimensione piena non entrerebbe nella cella.
  const WIDE_GRID_COLUMN_THRESHOLD = 6;
  container.classList.toggle('board--tight', columns >= WIDE_GRID_COLUMN_THRESHOLD);
  const gameOver = state.status !== GAME_STATUS.PLAYING;

  state.tiles.forEach((tile) => {
    const tileState = tileStateOf(tile, state);
    container.appendChild(buildTile(tile, tileState, gameOver, onTileClick));
  });
}
