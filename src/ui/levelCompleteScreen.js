export function renderLevelCompleteScreen(
  container,
  { state, completedLevel, nextLevel, pivotDropped, onContinue, onAbandon }
) {
  const section = document.createElement('section');
  section.className = 'config-screen';

  const heading = document.createElement('h1');
  heading.textContent = `${completedLevel.name} superato!`;
  section.appendChild(heading);

  const summary = document.createElement('p');
  summary.textContent = `Punteggio totale: ${state.score}.`;
  section.appendChild(summary);

  if (pivotDropped) {
    const pivotWarning = document.createElement('p');
    pivotWarning.className = 'pivot-warning';
    pivotWarning.textContent =
      'Da questo livello alcune coppie richiederanno una conversione diretta tra due basi non decimali, senza passare dal valore intermedio.';
    section.appendChild(pivotWarning);
  }

  const continueButton = document.createElement('button');
  continueButton.type = 'button';
  continueButton.className = 'config-screen__start';
  continueButton.textContent = `Continua con ${nextLevel.name}`;
  continueButton.addEventListener('click', () => onContinue());
  section.appendChild(continueButton);

  // Secondo, dopo "Continua" nell'ordine di tabulazione: l'azione sicura resta
  // la prima. Chi deve smettere prima della fine (in aula la lezione finisce a
  // orario fisso) esce da qui senza aspettare il livello successivo.
  const abandonButton = document.createElement('button');
  abandonButton.type = 'button';
  abandonButton.className = 'screen-secondary-button';
  abandonButton.textContent = 'Abbandona partita';
  abandonButton.addEventListener('click', () => onAbandon());
  section.appendChild(abandonButton);

  container.replaceChildren(section);
}
