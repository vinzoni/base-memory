# Base Memory — Specifiche funzionali

Gioco didattico web per esercitarsi nelle conversioni tra basi numeriche.
Struttura ispirata al Memory: una griglia di tessere da accoppiare due a due,
su una progressione di 8 livelli a difficoltà crescente.

---

## 1. Concetto di gioco

Le tessere non si accoppiano perché identiche, ma perché **rappresentano lo stesso
valore numerico in basi diverse**.

Esempio di coppia valida: `4` (DEC) ↔ `100` (BIN).

Il giocatore seleziona due tessere:

- se rappresentano lo stesso valore → coppia risolta, le tessere restano visibili
  in stato "risolto" (non più selezionabili);
- altrimenti → errore, le tessere tornano allo stato precedente dopo un breve
  feedback visivo.

Il livello è superato quando **tutte** le coppie sono risolte **entro il tempo limite**.
Allo scadere del tempo il livello è fallito e la partita termina (si veda §4,
"Progressione tra livelli").

---

## 2. Vincoli di correttezza (critici)

Questi punti sono la parte difficile del gioco e vanno rispettati alla lettera.

1. **La base va sempre mostrata sulla tessera.** Ogni tessera espone il valore
   formattato *e* un'etichetta della base (`DEC`, `BIN`, `OCT`, `HEX`).
   Senza etichetta il gioco è ambiguo: la stringa `100` è 100 in decimale, 4 in
   binario, 64 in ottale e 256 in esadecimale.
2. **Niente coppie "gratis".** Va scartata ogni coppia in cui le due rappresentazioni
   producono la stessa stringa. Esempi da evitare: `5` DEC ↔ `5` OCT, `12` DEC ↔ `12` HEX,
   `0` e `1` in qualsiasi combinazione di basi.
3. **Un valore compare una sola volta per livello.** Non devono esistere due coppie
   che condividono lo stesso valore numerico, per evitare accoppiamenti multipli validi.
4. **Le due basi di una coppia sono sempre diverse** e appartengono entrambe alle basi
   selezionate dal giocatore. Alcuni livelli aggiungono un vincolo ulteriore su quale
   coppia di basi è ammessa — si veda `requireDecimalPivot` in §4.
5. **Servono almeno 2 basi selezionate** per poter iniziare una partita: la UI deve
   impedire l'avvio con meno di 2.
6. Le cifre esadecimali sono maiuscole (`A`–`F`). Nessun prefisso tipo `0x` o `0b`:
   la base è comunicata dall'etichetta.

---

## 3. Configurazione di inizio partita

Schermata iniziale con:

- selezione multipla delle basi da includere: decimale, binario, ottale, esadecimale
  (minimo 2, default: decimale + binario);
- pulsante "Inizia";
- accesso alla classifica (high score).

La configurazione scelta viene salvata insieme al punteggio in classifica, perché
un punteggio ottenuto con 4 basi non è confrontabile con uno ottenuto con 2.

---

## 4. Livelli

Un livello è descritto da un oggetto di configurazione **dichiarativo** in
`core/levels.js`, non da codice sparso. I parametri che definiscono la difficoltà
sono:

| Parametro | Effetto |
|---|---|
| `grid: { columns, rows }` | dimensione obiettivo della griglia: il tetto di coppie è `columns × rows / 2` |
| `valueRange` | intervallo dei valori sorteggiati: più ampio = più difficile |
| `timeLimitSeconds` | tempo a disposizione per il livello: più basso = più difficile |
| `coveredRatio` | frazione di tessere da coprire inizialmente (0 = tutte visibili) — **dichiarato ma non ancora implementato**, si veda §8 |
| `requireDecimalPivot` | vincolo di accoppiamento aggiuntivo, si veda sotto |

### Numero di coppie effettivo

Il tetto (`grid.columns × grid.rows / 2`) non è un numero garantito. Il numero
giocabile è il minimo tra quel tetto e quanti valori del `valueRange` ammettono
almeno una coppia di basi, tra quelle selezionate dal giocatore, che produce
rappresentazioni diverse — le coppie "gratis" del vincolo §2.2 vengono scartate. La
griglia effettivamente disegnata viene poi ricalcolata sul conteggio finale di
tessere, scegliendo il rettangolo più vicino al quadrato entro il rapporto lato
lungo/lato corto massimo consentito (oggi 2): `grid` in configurazione è quindi un
obiettivo, non una garanzia.

Esempio (Livello 1, `valueRange` 0–15):

- DEC+BIN raggiunge il tetto di 8 coppie (16 tessere);
- DEC+HEX ne produce solo 6 (12 tessere), perché 0–9 hanno la stessa
  rappresentazione in entrambe le basi.

### Vincolo pivot decimale (`requireDecimalPivot`)

Un secondo asse di difficoltà, indipendente da `valueRange`/`timeLimitSeconds`:
quando è attivo, ogni coppia generata deve includere DEC (niente conversioni
dirette BIN↔HEX, BIN↔OCT, OCT↔HEX), per non sommare due difficoltà insieme nei
primi livelli.

Se il giocatore non seleziona DEC tra le basi, il vincolo diventa insoddisfacibile
e viene **ignorato silenziosamente** in fase di generazione — è una scelta
deliberata del giocatore, non un errore. La UI lo segnala in due punti:

- in configurazione, se DEC non è selezionato e almeno un livello della
  progressione richiede il vincolo, un avviso spiega che si sta scegliendo una
  modalità più impegnativa;
- nella schermata di fine livello, quando il livello appena concluso richiedeva il
  vincolo e quello successivo no, un avviso spiega che da quel momento le coppie
  possono richiedere conversioni dirette tra basi non decimali.

### Tabella livelli

| # | Nome | Griglia | Tetto coppie | Valori | Tempo | Copertura | Pivot decimale |
|---|------|---------|:---:|:---:|:---:|:---:|:---:|
| 1 | Livello 1 | 4×4 | 8  | 0–15  | 180s | 0   | sì |
| 2 | Livello 2 | 4×4 | 8  | 0–31  | 180s | 0   | sì |
| 3 | Livello 3 | 4×4 | 8  | 0–31  | 120s | 0   | sì |
| 4 | Livello 4 | 5×4 | 10 | 0–63  | 120s | 0   | sì |
| 5 | Livello 5 | 5×4 | 10 | 0–63  | 120s | 0   | no |
| 6 | Livello 6 | 6×4 | 12 | 0–255 | 90s  | 0.5 | no |
| 7 | Livello 7 | 6×5 | 15 | 0–255 | 90s  | 0.5 | no |
| 8 | Livello 8 | 6×6 | 18 | 0–255 | 75s  | 1   | no |

Aggiungere un livello deve richiedere **solo** una nuova voce in questo array,
senza toccare la logica di gioco.

> **Limite noto:** con `valueRange` 0–15 (Livello 1), DEC+OCT e OCT+HEX lasciano
> esattamente 8 valori utilizzabili (8–15): ogni partita userà sempre gli stessi
> numeri e varierà solo l'assegnazione delle basi tra le tessere.

Nota didattica: al Livello 1 le tessere sono **tutte scoperte** (`coveredRatio: 0`).
Individuare le coppie leggendo i numeri è già un esercizio sufficientemente
impegnativo per uno studente alle prime armi; la memoria non deve aggiungere carico
cognitivo in questa fase.

### Progressione tra livelli

Al superamento di un livello (tutte le coppie risolte entro il tempo) si passa
automaticamente al successivo tramite una schermata intermedia di riepilogo del
livello appena concluso. Su quella transizione:

- **punteggio ed errori sono cumulativi** su tutta la partita: non vengono
  azzerati al cambio di livello;
- **il tempo a disposizione riparte da zero** a ogni livello, con il
  `timeLimitSeconds` del nuovo livello;
- il **tempo totale** mostrato in riepilogo e salvato in classifica è la somma dei
  tempi impiegati sui livelli completati più quello in corso, **al netto** del
  tempo passato sulla schermata intermedia tra un livello e l'altro (non
  l'orologio di parete).

Un fallimento (tempo scaduto) in un livello qualsiasi termina subito la partita,
senza passare al successivo. Dopo l'ultimo livello, la partita termina in vittoria.

---

## 5. Punteggio

| Evento | Punti |
|---|---|
| Coppia individuata | `+100` |
| Errore (due tessere non accoppiabili) | `-25` |
| Bonus completamento livello | `+500` |
| Bonus velocità | `secondiRimanenti × 10` |

Regole:

- il bonus velocità e il bonus di completamento si assegnano **solo** se il livello
  viene superato entro il tempo;
- il punteggio non può scendere sotto `0` durante la partita;
- i valori sopra sono costanti centralizzate in un unico modulo di configurazione,
  non "numeri magici" sparsi nel codice.

---

## 6. Classifica persistente

- Persistenza tramite `localStorage` del browser.
- Vengono conservati i **10 migliori punteggi**, ordinati per punteggio decrescente.
- Ogni voce contiene: nome giocatore, punteggio, data/ora, basi utilizzate, livello
  raggiunto, tempo impiegato.
  - "Livello raggiunto" è l'id dell'ultimo livello **avviato**, non necessariamente
    completato: su una sconfitta è il livello in cui il tempo è scaduto. Con un
    solo livello (fase di prototipo) la distinzione non contava; con 8 livelli sì.
- A fine partita, se il punteggio entra in classifica, viene chiesto il nome
  (max 20 caratteri, input sanificato prima della visualizzazione).
- La lettura deve essere difensiva: dati assenti, corrotti o non parsabili non devono
  far crashare l'app, ma ripartire da classifica vuota.
- Deve esistere una funzione per azzerare la classifica.

---

## 7. Interfaccia

Schermate: **Configurazione → Partita → (schermata intermedia di fine livello, se
ce n'è un altro) → Riepilogo fine partita**, più una vista **Classifica**
raggiungibile dalla configurazione.

Durante la partita sono sempre visibili: livello corrente, tempo rimanente,
punteggio corrente, coppie risolte su totale, numero di errori.

Requisiti minimi di qualità:

- griglia responsive, giocabile anche su schermo stretto;
- feedback visivo distinto e immediato per: tessera selezionata, coppia corretta,
  coppia errata, tessera risolta;
- il feedback non deve basarsi **solo** sul colore (aggiungere icona o bordo),
  per accessibilità;
- tessere raggiungibili da tastiera (`Tab` + `Invio`/`Spazio`) con `aria-label`
  che includa valore e base;
- avviso visivo quando il tempo scende sotto i 30 secondi;
- durante l'animazione di errore l'input è bloccato, per evitare doppi click che
  contano errori multipli;
- avviso in configurazione se DEC non è selezionato e il vincolo pivot decimale è
  quindi ignorato (si veda §4);
- avviso alla transizione tra livelli quando il vincolo pivot decimale decade
  (si veda §4).

> **Limite noto:** `:root` dichiara `font: 18px/145%`, e una
> `line-height` percentuale viene risolta in pixel ed ereditata come valore
> fisso dai figli, non ricalcolata sulla loro `font-size`. Ogni elemento con
> `font-size` diversa dal corpo del testo e senza una propria `line-height` è
> quindi esposto allo stesso difetto già corretto su `h1` (titolo che si
> sovrapponeva andando a capo). Sostituire `145%` con `1.45` risolverebbe alla
> radice, ma va fatto rivedendo la spaziatura di tutte le schermate.

> **Limite noto:** alle griglie a 6 colonne (Livelli 6-8) una colonna risulta più
> stretta delle altre e le sue tessere hanno aspect ratio diversa; due tentativi
> di correzione non hanno risolto e la causa non è ancora individuata.

---

## 8. Fuori perimetro

- Backend, account, classifica online.
- Copertura iniziale delle tessere (`coveredRatio`): il campo è dichiarato nella
  configurazione di ogni livello (0 nei Livelli 1-5, 0.5 nei Livelli 6-7, 1
  nell'8) ma non ha alcuna implementazione — nessun modulo lo legge per
  coprire/nascondere tessere. È un dato riservato per un meccanico non ancora
  costruito, non un limite da ignorare.
- Audio, animazioni elaborate, temi grafici multipli.
- Internazionalizzazione: la UI è in italiano.
