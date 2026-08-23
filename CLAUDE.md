# CLAUDE.md

Istruzioni per Claude Code su questo repository.

## Progetto

**Base Memory** — gioco didattico web per esercitarsi nelle conversioni tra basi
numeriche (decimale, binario, ottale, esadecimale). Meccanica tipo Memory, ma le
tessere si accoppiano quando rappresentano lo **stesso valore in basi diverse**.

Le specifiche funzionali complete sono in **`SPECIFICHE.md`**: leggilo prima di
implementare qualsiasi cosa e considerarlo la fonte di verità. Se una richiesta
contraddice le specifiche, segnalalo invece di procedere in silenzio.

**Fase attuale: prototipo, solo Livello 1.** Non implementare i livelli successivi,
ma progetta il codice perché aggiungerli richieda solo una nuova configurazione.

## Stack

- Vanilla JavaScript (ES modules), nessun framework UI
- Vite come dev server e bundler
- Vitest per i test
- CSS puro (no preprocessori, no Tailwind)
- Persistenza: `localStorage`

Non aggiungere dipendenze senza chiedere prima. L'obiettivo è che il progetto resti
leggibile da uno studente.

## Comandi

```bash
npm run dev       # dev server con hot reload
npm run build     # build di produzione
npm run preview   # anteprima della build
npm test          # test unitari (vitest)
```

## Struttura

```
index.html
src/
  main.js               # bootstrap dell'applicazione
  config.js             # costanti: punteggi, basi supportate, chiavi localStorage
  core/
    bases.js            # metadati basi + conversione valore -> stringa
    pairGenerator.js    # generazione delle coppie di un livello
    scoring.js          # calcolo punteggio (funzioni pure)
    levels.js           # configurazioni dichiarative dei livelli
    gameEngine.js       # stato della partita, transizioni, timer
  storage/
    highScores.js       # lettura/scrittura classifica
  ui/
    screens.js          # navigazione tra schermate
    board.js            # rendering griglia e tessere
    hud.js              # tempo, punteggio, contatori
  style.css
tests/
```

## Regole di implementazione

1. **Separa logica e UI.** Tutto ciò che sta in `src/core/` e `src/storage/` non deve
   toccare il DOM: sono funzioni/moduli testabili in isolamento. La UI osserva il
   motore di gioco e ridisegna.
2. **Funzioni pure dove possibile.** Conversioni, generazione coppie e calcolo
   punteggio devono essere deterministici dato un input (per il generatore, iniettare
   la sorgente di casualità come parametro così è testabile con un seed).
3. **Niente numeri magici.** Punteggi, tempi, soglie stanno in `config.js` o nella
   configurazione del livello.
4. **Vincoli di correttezza in `SPECIFICHE.md` §2** (etichetta della base sempre
   visibile, niente coppie con rappresentazione identica, un valore per livello):
   sono la parte più facile da sbagliare. Vanno coperti da test.
5. **Timer:** usare il tempo reale (`performance.now()` / timestamp), non un contatore
   incrementato a ogni tick, per non accumulare deriva.
6. **Gestione errori difensiva** su `localStorage`: dati corrotti o quota esaurita non
   devono impedire di giocare.

## Test

Coprire con test unitari almeno:

- conversione di valori in tutte e quattro le basi, inclusi i casi limite (0, 15, 255);
- il generatore di coppie: nessuna rappresentazione duplicata, nessun valore ripetuto,
  basi sempre diverse all'interno della coppia, tutte le basi usate appartengono a
  quelle selezionate, numero di tessere corretto;
- il calcolo del punteggio, incluso il floor a 0 e i bonus assegnati solo a livello
  superato;
- lettura della classifica con dati mancanti o malformati.

Esegui `npm test` prima di dichiarare completata un'attività.

## Convenzioni di stile

- Identificatori, nomi di file e commenti tecnici in **inglese**.
- Testi mostrati all'utente in **italiano**.
- Nomi descrittivi ed espliciti; evita abbreviazioni criptiche.
- Commenta il *perché*, non il *cosa*: commenta i vincoli di dominio (es. perché una
  coppia viene scartata), non le righe ovvie.
- Preferisci moduli piccoli a file monolitici.

## Workflow

- Prima di modifiche non banali, proponi un piano e attendi conferma.
- Un commit per unità di lavoro coerente, messaggio in inglese, formato
  Conventional Commits (`feat:`, `fix:`, `test:`, `refactor:`, `chore:`).
- Non fare `git push` e non creare branch senza richiesta esplicita.
