# CLAUDE.md

Istruzioni per Claude Code su questo repository.

## Progetto

**Base Memory** — gioco didattico web per esercitarsi nelle conversioni tra basi
numeriche (decimale, binario, ottale, esadecimale). Meccanica tipo Memory, ma le
tessere si accoppiano quando rappresentano lo **stesso valore in basi diverse**.

Il titolo visibile nel gioco è **«Basi Gemelle»**; il nome del repository e del
pacchetto npm resta `base-memory`.

Le specifiche funzionali complete sono in **`SPECIFICHE.md`**: leggilo prima di
implementare qualsiasi cosa e consideralo la fonte di verità.

**Fase attuale: sviluppo dei livelli multipli.** Il prototipo — Livello 1, punteggio,
classifica persistente, tutte le schermate — è completo e funzionante. Il lavoro in
corso è l'estensione a una progressione di livelli a difficoltà crescente.

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
  main.js               # bootstrap, navigazione, unico punto di accesso a localStorage
  config.js             # costanti: punteggi, basi, chiavi storage, timing UI
  core/
    bases.js            # metadati basi + conversione valore -> stringa
    pairGenerator.js    # generazione coppie, countUsableValues, getPlayablePairCount
    scoring.js          # calcolo punteggio (funzioni pure)
    levels.js           # configurazioni dichiarative dei livelli
    gameEngine.js       # stato partita, transizioni, tempo
  storage/
    highScores.js       # classifica (storage iniettato, mai globale)
  ui/
    screens.js          # navigazione tra schermate
    splashScreen.js     # splash iniziale (titolo, firma, tessera dimostrativa)
    configScreen.js     # selezione basi + anteprima coppie
    board.js            # griglia e tessere
    hud.js              # tempo, punteggio, contatori
    summaryScreen.js    # riepilogo fine partita
    highScoresScreen.js # classifica
  style.css
tests/
```

---

## Regole di implementazione

### Architettura

1. **Separa logica e UI.** `src/core/` e `src/storage/` non toccano mai il DOM: sono
   moduli puri, testabili in isolamento. La UI legge lo stato e ridisegna.
2. **Inietta le dipendenze non deterministiche.** Sorgente di casualità, timestamp e
   storage arrivano sempre come parametro, mai letti dall'interno del modulo. È ciò
   che rende `pairGenerator`, `gameEngine` e `highScores` testabili senza browser né
   timer finti.
3. **Una regola, una implementazione.** Se una formula di dominio serve in due punti,
   estraila in una funzione esportata invece di duplicarla. Due copie sincronizzate a
   mano finiscono per divergere, e la divergenza non la vede nessun test.
4. **Niente numeri magici.** Punteggi, tempi, soglie stanno in `config.js` o nella
   configurazione del livello.
5. **I livelli sono dati, non codice.** Aggiungere un livello deve richiedere solo una
   nuova voce nell'array delle configurazioni.

### Confini da non attraversare senza autorizzazione

- **Non modificare `src/core/` e `src/storage/`** mentre lavori sulla UI. Se ti serve
  una modifica lì, **fermati e chiedi**: la logica non va piegata alle esigenze del
  rendering.
- **Non far conoscere `localStorage` ai moduli di UI.** Solo `main.js` lo tocca, e
  passa alle schermate dati già letti o funzioni già pronte.
- **Il tempo lo calcola l'engine.** La UI chiama `getElapsedSeconds` /
  `getRemainingSeconds`, non ricostruisce il tempo con il proprio orologio.

### Quando fermarsi e segnalare

Se un'istruzione dell'utente contraddice `SPECIFICHE.md` o il codice esistente,
**segnala la contraddizione invece di risolverla per conto tuo**. Vale anche quando
l'istruzione è più recente e più specifica del documento: la contraddizione va portata
alla luce, non arbitrata.

---

## Test

Coprire con test unitari tutta la logica in `src/core/` e `src/storage/`. Per la UI non
sono richiesti test automatici.

In particolare:

- conversioni in tutte e quattro le basi, inclusi i casi limite;
- i vincoli di correttezza di `SPECIFICHE.md` §2 sul generatore di coppie;
- coerenza tra `getPlayablePairCount` e il numero di coppie effettivamente generate;
- calcolo del punteggio, floor a 0, bonus assegnati solo a livello superato;
- lettura della classifica con dati mancanti o malformati.

Esegui `npm test` prima di dichiarare completata un'attività.

### Attenzione ai fallimenti silenziosi

`readHighScores` filtra le voci malformate: una voce salvata senza tutti i campi
richiesti viene scritta senza errori e poi **scartata in silenzio** alla lettura
successiva. Quando scrivi codice che produce dati validati altrove, verifica
rileggendo, non fidandoti dell'assenza di eccezioni.

---

## Verifica nel browser

**La verifica visiva la fa l'utente manualmente.** Non usare strumenti di automazione
del browser (CDP, puppeteer, playwright) se non esplicitamente richiesto: una verifica
programmatica conferma che gli elementi esistono, non che il risultato sia leggibile, e
su modifiche di stile costa più di quanto renda.

Quando hai finito, elenca cosa hai modificato e lascia il collaudo all'utente.

---

## Pianificazione

Prima di modifiche non banali, proponi un piano e attendi conferma.

Nel piano verifica esplicitamente queste tre categorie: sono quelle in cui un piano
scritto bene può essere comunque sbagliato.

1. **Casi limite aritmetici.** Non dare per scontato che una configurazione produca il
   numero di elementi atteso: conta. Esempio reale già occorso — nel range 0–15 la
   combinazione DEC+HEX lascia solo 6 valori utilizzabili anziché 8, perché da 0 a 9 i
   numeri si scrivono identici nelle due basi.
2. **Punti di contatto tra moduli.** Chi assembla un oggetto che un altro modulo
   valida? Chi possiede un'informazione di cui un terzo ha bisogno? È lì che i piani
   ben scritti si scollano.
3. **Fallimenti silenziosi.** Un errore che non solleva eccezioni, non fa fallire i
   test e non si vede a schermo è il più costoso di tutti. Chiediti sempre se un
   difetto in quel punto sarebbe visibile a qualcuno.

---

## Convenzioni di stile

- Identificatori, nomi di file e commenti tecnici in **inglese**.
- Testi mostrati all'utente in **italiano**.
- Nomi descrittivi ed espliciti; evita abbreviazioni criptiche.
- Commenta il *perché*, non il *cosa*: commenta i vincoli di dominio (per esempio
  perché una coppia viene scartata), non le righe ovvie.
- Preferisci moduli piccoli a file monolitici.

### CSS

- **`line-height` sempre senza unità** (`1.45`, non `145%`). Un valore percentuale
  viene risolto in pixel al momento della dichiarazione ed ereditato come valore fisso
  dai figli, che non lo ricalcolano sulla propria `font-size`. Ha già causato la
  sovrapposizione di un titolo mandato a capo.
- Verifica sempre i testi **mandati a capo**, non solo quelli su una riga: i testi
  italiani sono più lunghi dei corrispettivi inglesi e vanno a capo prima.
- Riusa i token di colore e le variabili esistenti; non introdurne di nuovi senza
  motivo.

---

## Workflow

- Un commit per unità di lavoro coerente, messaggio in inglese, formato
  Conventional Commits (`feat:`, `fix:`, `test:`, `refactor:`, `chore:`).
- L'intestazione dice **cosa** cambia (imperativo, sotto i 50 caratteri); il corpo,
  dopo una riga vuota, dice **perché**. Il *cosa* si legge dal diff, il *perché* no.
- Non fare riferimento nel messaggio di commit a piani o sessioni: sono artefatti
  temporanei, mentre la cronologia git sopravvive loro.
- Non fare `git push` e non creare branch senza richiesta esplicita.
- Non committare file temporanei, script scratch o screenshot di verifica.
