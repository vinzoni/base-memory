import { createIcon } from './icons.js';

// Pulsante interruttore dell'audio, condiviso da schermata di configurazione e
// schermata di gioco (serve poterlo spegnere durante la partita, non solo dalla
// configurazione). Lo stato attivo/disattivato e la sua persistenza sono di
// `main.js`: qui arrivano solo `isEnabled()` per leggere e `toggle()` per
// cambiare.
//
// L'etichetta visibile descrive l'AZIONE del click ("Attiva audio" /
// "Disattiva audio"), non lo stato corrente: `aria-pressed` comunica già lo
// stato a un lettore di schermo, e un'etichetta di stato ripeterebbe la stessa
// informazione. L'icona (altoparlante barrato o con onde) porta il segnale
// visivo, così non è affidato al solo colore.
export function createAudioToggle({ isEnabled, toggle }) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'screen-secondary-button audio-toggle';

  const iconSlot = document.createElement('span');
  iconSlot.className = 'audio-toggle__icon';
  iconSlot.setAttribute('aria-hidden', 'true');

  const labelEl = document.createElement('span');

  button.append(iconSlot, labelEl);

  function render() {
    const on = isEnabled();
    button.setAttribute('aria-pressed', String(on));
    labelEl.textContent = on ? 'Disattiva audio' : 'Attiva audio';
    iconSlot.replaceChildren(createIcon(on ? 'soundOn' : 'soundOff'));
  }

  button.addEventListener('click', () => {
    toggle();
    render();
  });

  render();
  return button;
}
