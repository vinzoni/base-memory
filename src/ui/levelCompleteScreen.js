export function renderLevelCompleteScreen(
  container,
  { state, completedLevel, nextLevel, pivotDropped, onContinue }
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

  container.replaceChildren(section);
}
