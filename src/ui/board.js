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
  // La griglia si dimensiona sul numero effettivo di tessere (SPECIFICHE.md §7),
  // non su un tetto fisso. Il conteggio è già garantito fattorizzabile in un
  // rettangolo accettabile per costruzione (generatePairs ha già scartato, se
  // necessario, una coppia): qui non serve altro fallback.
  const { columns: idealColumns } = findBoardGrid(state.tiles.length);
  const columns = Math.min(idealColumns, maxColumnsForViewport(window.innerWidth));
  container.style.setProperty('--board-columns', columns);
  // Il font si riduce da 6 colonne in poi (Livelli 3-8 e 11-18): con range fino
  // a 0-255 le tessere potevano mostrare binari a 8 cifre, che a piena larghezza
  // (board 640px) non entravano nella cella. Il range massimo è ora 0-31 (5
  // cifre) e il difetto non si manifesta più, ma la causa non è mai stata
  // individuata (SPECIFICHE.md §7): tornerebbe alzando di nuovo il range.
  const WIDE_GRID_COLUMN_THRESHOLD = 6;
  container.classList.toggle('board--tight', columns >= WIDE_GRID_COLUMN_THRESHOLD);
  const gameOver = state.status !== GAME_STATUS.PLAYING;

  state.tiles.forEach((tile) => {
    const tileState = tileStateOf(tile, state);
    container.appendChild(buildTile(tile, tileState, gameOver, onTileClick));
  });
}
