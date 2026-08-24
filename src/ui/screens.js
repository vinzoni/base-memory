// Non conosce i nomi delle schermate (configurazione, partita, ...): aggiungerne
// una nuova (riepilogo, classifica) è responsabilità di chi chiama show(), non di
// questo modulo.
export function createScreenManager(rootElement) {
  let cleanupActiveScreen = null;

  function show(renderScreen) {
    cleanupActiveScreen?.();
    rootElement.replaceChildren();
    cleanupActiveScreen = renderScreen(rootElement) ?? null;
  }

  return { show };
}
