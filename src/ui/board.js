import { BASES } from '../core/bases.js';
import { GAME_STATUS } from '../core/gameEngine.js';

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
  // non su un tetto fisso: colonne = lato del quadrato più piccolo che le contiene.
  container.style.setProperty('--board-columns', Math.ceil(Math.sqrt(state.tiles.length)));
  const gameOver = state.status !== GAME_STATUS.PLAYING;

  state.tiles.forEach((tile) => {
    const tileState = tileStateOf(tile, state);
    container.appendChild(buildTile(tile, tileState, gameOver, onTileClick));
  });
}
