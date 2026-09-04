// SVG inline per HUD e righe di statistiche. Due scelte deliberate:
//
// - lo stroke è `currentColor`: l'icona eredita il colore del testo che la
//   circonda e quindi segue il tema, senza ridichiarare qui alcun valore di
//   palette;
// - la dimensione non è fissata con gli attributi width/height sul tag <svg>,
//   ma lasciata al CSS (`.icon`), così la stessa icona si adatta ai contesti
//   con font-size diversa (HUD compatto, righe di riepilogo più grandi).
//
// Costruzione via createElementNS, mai innerHTML: coerente con la disciplina
// del resto della UI, che non interpreta mai stringhe come markup.

const SVG_NS = 'http://www.w3.org/2000/svg';

// Ogni voce è la lista dei path che compongono l'icona, su una griglia 24×24.
const ICON_PATHS = {
  // Barre crescenti: la progressione tra i livelli.
  level: ['M5 20V13M12 20V8M19 20V4'],
  // Quadrante con lancette.
  time: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z', 'M12 7v5l3 2'],
  // Triangolo d'allarme: il tempo sta per scadere. Sostituisce l'icona `time`
  // sotto la soglia di 30s, così l'avviso non è affidato al solo colore.
  timeWarning: ['M12 3.5 2.5 20h19L12 3.5Z', 'M12 10v4', 'M12 17.5v.01'],
  // Stella a cinque punte.
  score: ['M12 3.5l2.6 5.27 5.82.85-4.21 4.1.99 5.78L12 16.77l-5.2 2.73.99-5.78-4.21-4.1 5.82-.85L12 3.5Z'],
  // Due tessere accostate: la coppia.
  pairs: ['M4 8a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8Z', 'M10 4h8a2 2 0 0 1 2 2v10'],
  // Cerchio con una croce: l'errore.
  errors: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z', 'M9 9l6 6M15 9l-6 6'],
};

export function createIcon(name) {
  const paths = ICON_PATHS[name];
  if (!paths) {
    throw new Error(`Icona sconosciuta: ${name}`);
  }

  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.75');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  // Icona puramente decorativa: l'informazione è nel testo accanto e
  // nell'aria-label del contenitore.
  svg.setAttribute('aria-hidden', 'true');
  svg.classList.add('icon');

  for (const d of paths) {
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', d);
    svg.appendChild(path);
  }

  return svg;
}
