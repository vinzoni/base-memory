import { BASES } from '../core/bases.js';
import { getGridPairCap, getPlayablePairCount } from '../core/pairGenerator.js';
import { DEFAULT_SELECTED_BASES, MIN_SELECTABLE_BASES } from '../config.js';
import { createAudioToggle } from './audioToggle.js';

const BASE_ORDER = Object.keys(BASES);

function computeStatus(selectedBases, level) {
  if (selectedBases.size < MIN_SELECTABLE_BASES) {
    return {
      canStart: false,
      message: `Seleziona almeno ${MIN_SELECTABLE_BASES} basi per iniziare.`,
      showCapExplanation: false,
    };
  }

  const orderedSelection = BASE_ORDER.filter((baseId) => selectedBases.has(baseId));
  const pairCount = getPlayablePairCount(level, orderedSelection);
  // Il tetto del livello non viene raggiunto quando alcune basi selezionate
  // producono la stessa rappresentazione per uno stesso valore (SPECIFICHE.md
  // §2.2): reso esplicito invece di lasciarlo dedurre da un numero che scende,
  // perché è proprio il concetto didattico che il gioco vuole insegnare.
  const showCapExplanation = pairCount < getGridPairCap(level);

  if (pairCount < 2) {
    return {
      canStart: false,
      message: 'Questa combinazione di basi non produce abbastanza coppie diverse: scegline altre.',
      showCapExplanation,
    };
  }

  return {
    canStart: true,
    message: `${pairCount} coppie, ${pairCount * 2} tessere.`,
    showCapExplanation,
  };
}

function buildStatusText(status) {
  if (!status.showCapExplanation) return status.message;
  return `${status.message} Con queste basi alcuni numeri si scrivono allo stesso modo e non formano coppie valide.`;
}

export function renderConfigScreen(
  container,
  { level, hasDecimalPivotLevel, onStart, onShowHighScores, audioControl }
) {
  const selectedBases = new Set(DEFAULT_SELECTED_BASES);

  const section = document.createElement('section');
  section.className = 'config-screen';

  const heading = document.createElement('h1');
  heading.textContent = 'Basi Gemelle';
  section.appendChild(heading);

  const fieldset = document.createElement('fieldset');
  fieldset.className = 'config-screen__bases';
  const legend = document.createElement('legend');
  legend.textContent = 'Basi da includere';
  fieldset.appendChild(legend);

  BASE_ORDER.forEach((baseId) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'config-screen__option';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.id = `base-${baseId}`;
    checkbox.checked = selectedBases.has(baseId);
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) selectedBases.add(baseId);
      else selectedBases.delete(baseId);
      update();
    });

    const label = document.createElement('label');
    label.htmlFor = checkbox.id;
    label.textContent = BASES[baseId].label;

    wrapper.append(checkbox, label);
    fieldset.appendChild(wrapper);
  });

  section.appendChild(fieldset);

  const pivotWarning = document.createElement('p');
  pivotWarning.className = 'pivot-warning';
  pivotWarning.textContent =
    'Senza la base decimale il vincolo del pivot non può essere applicato: fin dai primi livelli potrai incontrare conversioni dirette tra basi non decimali. Una modalità più impegnativa.';
  pivotWarning.hidden = true;
  section.appendChild(pivotWarning);

  const status = document.createElement('p');
  status.className = 'config-screen__status';
  status.setAttribute('role', 'status');
  section.appendChild(status);

  const startButton = document.createElement('button');
  startButton.type = 'button';
  startButton.className = 'config-screen__start';
  startButton.textContent = 'Inizia';
  startButton.addEventListener('click', () => {
    if (startButton.disabled) return;
    onStart(BASE_ORDER.filter((baseId) => selectedBases.has(baseId)));
  });
  section.appendChild(startButton);

  const highScoresButton = document.createElement('button');
  highScoresButton.type = 'button';
  highScoresButton.className = 'screen-secondary-button';
  highScoresButton.textContent = 'Classifica';
  highScoresButton.addEventListener('click', () => onShowHighScores());
  section.appendChild(highScoresButton);

  section.appendChild(createAudioToggle(audioControl));

  function update() {
    const currentStatus = computeStatus(selectedBases, level);
    status.textContent = buildStatusText(currentStatus);
    startButton.disabled = !currentStatus.canStart;
    pivotWarning.hidden = !(hasDecimalPivotLevel && !selectedBases.has('DEC'));
  }

  update();
  container.replaceChildren(section);
}
