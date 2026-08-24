# Base Memory — Specifiche funzionali

Gioco didattico web per esercitarsi nelle conversioni tra basi numeriche.
Struttura ispirata al Memory: una griglia di tessere da accoppiare due a due.

> **Stato attuale del progetto: PROTOTIPO.**
> In questa fase va implementato **solo il Livello 1**. Completato il livello, il gioco
> termina mostrando il riepilogo e l'eventuale inserimento in classifica.
> I livelli successivi sono descritti qui **solo** per garantire che l'architettura
> sia estendibile: non vanno implementati ora.

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
Allo scadere del tempo il livello è fallito.

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
   selezionate dal giocatore.
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

Un livello è descritto da un oggetto di configurazione **dichiarativo**, non da codice
sparso. I parametri che definiscono la difficoltà sono tre:

| Parametro | Effetto |
|---|---|
| `valueRange` | intervallo dei valori sorteggiati: più ampio = più difficile |
| `timeLimitSeconds` | tempo a disposizione: più basso = più difficile |
| `coveredRatio` | frazione di tessere inizialmente coperte (0 = tutte visibili) |

### Livello 1 (unico da implementare ora)

```js
{
  id: 1,
  name: 'Livello 1',
  maxPairCount: 8,         // tetto massimo, 16 tessere in griglia 4x4 nel caso migliore
  valueRange: { min: 0, max: 15 },
  timeLimitSeconds: 180,
  coveredRatio: 0,         // tutte le tessere visibili fin dall'inizio
}
```

`maxPairCount` è un **tetto massimo**, non un numero garantito di coppie. Il numero effettivo
dipende da quante coppie di basi, tra quelle selezionate dal giocatore, producono
rappresentazioni diverse per ciascun valore del `valueRange` (vedi vincolo §2.2: le coppie
"gratis" vanno scartate). Con il Livello 1 (`valueRange` 0–15):

- DEC+BIN produce le 8 coppie del tetto (16 tessere);
- DEC+HEX ne produce solo 6 (12 tessere), perché 0–9 hanno la stessa rappresentazione in
  entrambe le basi.

La griglia si dimensiona sul numero di tessere effettivamente generato, non su un valore fisso.

> **Limite noto (da rivedere nei livelli successivi, non nel prototipo):** con DEC+OCT e con
> OCT+HEX il range 0–15 lascia esattamente 8 valori utilizzabili (8–15): ogni partita userà
> sempre gli stessi numeri e varierà solo l'assegnazione delle basi tra le tessere.

Nota didattica: al livello 1 le tessere sono **tutte scoperte**. Individuare le coppie
leggendo i numeri è già un esercizio sufficientemente impegnativo per uno studente
alle prime armi; la memoria non deve aggiungere carico cognitivo.

### Livelli successivi (NON implementare — solo per estendibilità)

Progressione indicativa: range crescente (0–31, 0–63, 0–255…), tempo decrescente
(150s, 120s, 90s…), `coveredRatio` che resta 0 fino al livello 3 e poi cresce
gradualmente (0.25, 0.5, 1.0). Aggiungere un livello deve richiedere **solo** una nuova
voce nell'array delle configurazioni, senza toccare la logica di gioco.

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
- A fine partita, se il punteggio entra in classifica, viene chiesto il nome
  (max 20 caratteri, input sanificato prima della visualizzazione).
- La lettura deve essere difensiva: dati assenti, corrotti o non parsabili non devono
  far crashare l'app, ma ripartire da classifica vuota.
- Deve esistere una funzione per azzerare la classifica.

---

## 7. Interfaccia

Schermate: **Configurazione → Partita → Riepilogo fine partita**, più una vista
**Classifica** raggiungibile dalla configurazione.

Durante la partita sono sempre visibili: tempo rimanente, punteggio corrente,
coppie risolte su totale, numero di errori.

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
  contano errori multipli.

> **Limite noto (da rivedere):** `:root` dichiara `font: 18px/145%`, e una
> `line-height` percentuale viene risolta in pixel ed ereditata come valore
> fisso dai figli, non ricalcolata sulla loro `font-size`. Ogni elemento con
> `font-size` diversa dal corpo del testo e senza una propria `line-height` è
> quindi esposto allo stesso difetto già corretto su `h1` (titolo che si
> sovrapponeva andando a capo). Sostituire `145%` con `1.45` risolverebbe alla
> radice, ma va fatto rivedendo la spaziatura di tutte le schermate.

---

## 8. Fuori perimetro (prototipo)

- Backend, account, classifica online.
- Livelli successivi al primo.
- Audio, animazioni elaborate, temi grafici multipli.
- Internazionalizzazione: la UI è in italiano.
