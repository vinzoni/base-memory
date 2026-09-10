# Base Memory — Specifiche funzionali

Gioco didattico web per esercitarsi nelle conversioni tra basi numeriche.
Struttura ispirata al Memory: una griglia di tessere da accoppiare due a due,
su una progressione di 16 livelli organizzata in due cicli di difficoltà
crescente (si veda §4, "Struttura a cicli").

Il titolo visibile nel gioco (splash, `<title>` della pagina, intestazione della
configurazione) è **«Basi Gemelle»**. Il nome del repository e del pacchetto npm
resta `base-memory`.

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
7. **Una tessera coperta non ancora selezionata non deve esporre valore o base nel
   DOM**: né nel testo, né nell'`aria-label`, né in attributi `data-*`. Il gioco
   sarebbe altrimenti aggirabile ispezionando la pagina o con un lettore di
   schermo. Si veda `coveredRatio` in §4.

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
| `coveredRatio` | frazione di tessere coperte all'inizio del livello (0 = tutte visibili), si veda sotto |
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
  modalità più impegnativa. Qui basta l'assenza di DEC: senza DEC *ogni* coppia
  di *ogni* livello è per forza tra basi non decimali, a prescindere da quante
  basi siano selezionate;
- nella schermata di fine livello, quando il livello appena concluso richiedeva il
  vincolo e quello successivo no, un avviso spiega che da quel momento le coppie
  possono richiedere conversioni dirette tra basi non decimali. Questo avviso
  compare **solo se il vincolo era effettivamente operante** sul livello concluso:
  serve DEC selezionato (altrimenti era già ignorato) **e** almeno tre basi
  selezionate (con due, l'unica coppia di basi possibile contiene già entrambe e
  il vincolo non restringe nulla). Fuori da questi casi la transizione non cambia
  niente per il giocatore e l'avviso sarebbe fuorviante.

### Copertura iniziale delle tessere (`coveredRatio`)

Un terzo asse di difficoltà, indipendente da `valueRange`/`timeLimitSeconds`/
`requireDecimalPivot`: alla creazione del livello, una frazione `coveredRatio`
delle tessere viene scelta a caso e messa a faccia in giù. Le altre restano
visibili per tutta la durata del livello.

I valori di `coveredRatio` in uso nella progressione sono **0, 0.5 e 1**. La
copertura parziale è un solo gradino, al 50%, ed è accompagnata da un taglio di
tempo: a frazioni più basse girare una tessera coperta trova quasi sempre il
partner già scoperto, quindi la memoria non entra in gioco e il gradino non si
sente. La copertura totale non va oltre la griglia 4×4 (si veda "Struttura a
cicli").

- la scelta è **individuale**, non a coppie: è legittimo che di una coppia una
  tessera sia coperta e l'altra scoperta;
- il conteggio (`tiles.length × coveredRatio`) è arrotondato all'intero più
  vicino. Con le tessere sempre generate in coppie e i valori 0/0.5/1 oggi in
  uso, il conteggio è sempre un intero esatto; la regola di arrotondamento nel
  codice resta comunque, per non dare per scontato che frazioni future si
  comportino così;
- cliccando una tessera coperta, questa si scopre e resta visibile finché non
  viene selezionata la seconda tessera;
- se le due non si accoppiano, le tessere coperte tornano a faccia in giù dopo
  il feedback di errore, come nel Memory classico;
- una coppia risolta resta visibile per sempre, anche se una o entrambe le
  tessere erano coperte;
- quali tessere sono coperte è deciso una sola volta, alla creazione del
  livello, con lo stesso generatore casuale iniettato usato per generare le
  coppie: non cambia ridisegnando la schermata.

> **Limite noto:** la posizione di una tessera coperta nel DOM coincide sempre
> con il suo indice nell'elenco delle tessere del livello ed è stabile per
> tutta la sua durata. Anche se valore e base non sono mai esposti (si veda
> §2.7), chi ispeziona deliberatamente la struttura della pagina può comunque
> dedurre informazioni su una tessera coperta correlando la sua posizione nel
> tempo. Non risolto di proposito: riguarda solo chi vuole barare
> deliberatamente, non l'uso normale né l'accessibilità.

### Struttura a cicli

I 16 livelli sono organizzati in **due cicli da 8**: la stessa sequenza di
gradini di difficoltà (tempo, griglia, vincolo pivot, copertura) si ripete
identica, ma a un `valueRange` via via più ampio. Il giocatore rivede lo
stesso tipo di progressione con numeri più grandi, invece di vedere ogni asse
di difficoltà salire una volta sola lungo tutta la partita.

Il tetto di griglia raggiungibile in un ciclo dipende da quanti valori del suo
`valueRange` sono utilizzabili (si veda "Numero di coppie effettivo" sopra),
**non** è una scelta arbitraria:

- **primo ciclo** (`valueRange` 0–15, Livelli 1–8): anche con la combinazione di
  basi migliore (DEC+BIN, DEC+BIN+HEX o tutte e quattro) restano solo 14 valori
  utilizzabili su 16 — 0 e 1 si scrivono uguali in ogni base (vincolo §2.2).
  14 non basta a riempire un tetto di 18 coppie (griglia 6×6): il ciclo non
  supera quindi la griglia 6×4 (12 coppie);
- **secondo ciclo** (`valueRange` 0–31, Livelli 9–16): 30 valori utilizzabili
  sbloccano comodamente il tetto 6×6 (18 coppie).

La copertura totale (`coveredRatio` 1) resta però sulla griglia 4×4 in entrambi
i cicli: su griglie più grandi, con tutte le tessere coperte, il livello diventa
un esercizio di memoria pura, fuori dallo scopo didattico del gioco.

> **Limite noto:** con `valueRange` 0–15 (Livelli 1–8), DEC+HEX lascia solo 6
> valori utilizzabili (10–15: 0–9 hanno la stessa rappresentazione in DEC ed
> HEX) — sotto il tetto di ogni livello del primo ciclo. DEC+OCT e OCT+HEX ne
> lasciano 8 (8–15): ogni partita con queste combinazioni userà sempre gli
> stessi numeri e varierà solo l'assegnazione delle basi tra le tessere.
>
> Conseguenza sui livelli a copertura totale: con DEC+HEX i Livelli 6–8
> diventano un Memory a 6 coppie interamente coperte con conversione
> esadecimale, in 150/120/90 secondi; con DEC+OCT e OCT+HEX sono 8 coppie
> coperte. Tecnicamente giocabile, ma probabilmente oltre il fattibile: **da
> rivalutare dopo il collaudo con quelle combinazioni** — possibili interventi:
> disattivare la copertura totale quando le coppie giocabili scendono sotto una
> soglia, oppure alzare il tempo.

### Tabella livelli

| # | Nome | Griglia | Tetto coppie | Valori | Tempo | Copertura | Pivot decimale |
|---|------|---------|:---:|:---:|:---:|:---:|:---:|
| 1  | Livello 1  | 4×4 | 8  | 0–15 | 180s | 0   | sì |
| 2  | Livello 2  | 4×4 | 8  | 0–15 | 120s | 0   | sì |
| 3  | Livello 3  | 6×4 | 12 | 0–15 | 120s | 0   | sì |
| 4  | Livello 4  | 6×4 | 12 | 0–15 | 120s | 0   | no |
| 5  | Livello 5  | 6×4 | 12 | 0–15 | 90s  | 0.5 | no |
| 6  | Livello 6  | 4×4 | 8  | 0–15 | 150s | 1   | no |
| 7  | Livello 7  | 4×4 | 8  | 0–15 | 120s | 1   | no |
| 8  | Livello 8  | 4×4 | 8  | 0–15 | 90s  | 1   | no |
| 9  | Livello 9  | 4×4 | 8  | 0–31 | 180s | 0   | sì |
| 10 | Livello 10 | 4×4 | 8  | 0–31 | 120s | 0   | sì |
| 11 | Livello 11 | 6×6 | 18 | 0–31 | 120s | 0   | sì |
| 12 | Livello 12 | 6×6 | 18 | 0–31 | 120s | 0   | no |
| 13 | Livello 13 | 6×6 | 18 | 0–31 | 90s  | 0.5 | no |
| 14 | Livello 14 | 4×4 | 8  | 0–31 | 150s | 1   | no |
| 15 | Livello 15 | 4×4 | 8  | 0–31 | 120s | 1   | no |
| 16 | Livello 16 | 4×4 | 8  | 0–31 | 90s  | 1   | no |

Aggiungere un livello (o un ciclo) deve richiedere **solo** una nuova voce in
questo array, senza toccare la logica di gioco.

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

### Abbandono della partita

Una partita in corso può essere **abbandonata** dal giocatore, sia durante un
livello sia dalla schermata intermedia di fine livello: una lezione in aula
finisce a orario fisso e chi deve smettere non può aspettare la fine del livello.

- l'abbandono chiede **conferma** prima di avere effetto: un clic o un tasto
  premuto per sbaglio non deve buttare via una partita;
- porta alla schermata di riepilogo con il punteggio maturato e il livello
  raggiunto fino a quel momento;
- il punteggio non viene toccato dall'abbandono: nessun bonus per il livello non
  completato, nessuna penalità. Interrompere fa solo rinunciare ai punti dei
  livelli successivi. Trattarlo diversamente premierebbe chi resta fermo ad
  aspettare lo scadere del tempo invece di chiudere;
- il punteggio di una partita abbandonata entra in classifica **come gli altri**,
  senza contrassegni;
- il **tempo totale** si ferma all'abbandono, con la stessa regola delle altre
  fini partita (al netto del tempo passato sulla schermata intermedia);
- nel riepilogo il titolo distingue l'esito "abbandonata" da quello di una
  vittoria e da quello di una sconfitta per tempo scaduto.

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
- l'abbandono volontario (si veda §4) non modifica il punteggio: né bonus né
  penalità, resta quello maturato fino a quel momento;
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
    solo livello (fase di prototipo) la distinzione non contava; con 16 livelli sì.
- A fine partita, se il punteggio entra in classifica, viene chiesto il nome
  (max 20 caratteri, input sanificato prima della visualizzazione).
- La lettura deve essere difensiva: dati assenti, corrotti o non parsabili non devono
  far crashare l'app, ma ripartire da classifica vuota.
- Deve esistere una funzione per azzerare la classifica.

> **Nota di progetto:** la classifica è locale al singolo browser (`localStorage`),
> non è condivisa fra giocatori né esiste un server. Azzerarla e scegliere il nome
> riguardano quindi solo i dati di chi compie l'azione: non servono protezioni —
> né una password sull'azzeramento, né un filtro sui nomi inseriti (la
> sanificazione all'inserimento serve solo a non interpretare il nome come markup,
> non a moderarlo). Servirebbero solo con una classifica condivisa lato server, che
> oggi non esiste.

---

## 7. Interfaccia

Schermate: **Splash → Configurazione → Partita → (schermata intermedia di fine
livello, se ce n'è un altro) → Riepilogo fine partita**, più una vista
**Classifica** raggiungibile dalla configurazione. Dalla partita e dalla schermata
intermedia si può anche uscire in anticipo abbandonando (si veda §4), arrivando
comunque al riepilogo.

### Splash iniziale

Compare **a ogni apertura**, prima della configurazione (nessuna preferenza
persistente: non va saltato "per sempre").

- riporta il titolo del gioco («Basi Gemelle») e la firma su due righe: "di
  Andrea Vinzoni" e, sotto, "sviluppato con Claude (Anthropic)";
- si salta in qualunque momento con un clic, un tocco o un tasto — uno studente
  riapre il gioco più volte in un'ora e un'animazione non saltabile diventa un
  ostacolo dalla seconda volta in poi;
- se non viene saltato prosegue da solo alla configurazione
  (`UI_TIMING.SPLASH_AUTO_ADVANCE_MS`), lasciando qualche istante di quiete dopo
  il ciclo della tessera;
- il gesto che lo salta è anche il primo gesto utile della pagina: è il momento
  in cui l'AudioContext viene sbloccato (si veda l'unlock in `main.js`);
- animazione: una tessera, con l'estetica di quelle di gioco, mostra lo stesso
  numero cambiando base (decimale → binario → ottale → esadecimale) e torna al
  riposo — la conversione mostrata senza spiegarla, con i colori già in uso;
- rispetta `prefers-reduced-motion`: con la preferenza attiva il contenuto si
  vede completo e immobile (titolo, firma, tessera a riposo), non uno splash
  vuoto;
- il layout riserva uno spazio in alto per un futuro logo + nome di una scuola,
  non ancora implementati.

Durante la partita sono sempre visibili: livello corrente, tempo rimanente,
punteggio corrente, coppie risolte su totale, numero di errori.

Requisiti minimi di qualità:

- griglia responsive, giocabile anche su schermo stretto;
- feedback visivo distinto e immediato per: tessera selezionata, coppia corretta,
  coppia errata, tessera risolta;
- il feedback non deve basarsi **solo** sul colore (aggiungere icona o bordo),
  per accessibilità;
- tessere raggiungibili da tastiera (`Tab` + `Invio`/`Spazio`) con `aria-label`
  che includa valore e base — tranne le tessere coperte (`coveredRatio`, si
  veda §4), il cui `aria-label` deve indicare solo che sono coperte;
- il dorso delle tessere coperte è uniforme (stessa resa per tutte,
  indipendentemente da valore o base) e distinguibile a colpo d'occhio da una
  tessera scoperta;
- avviso visivo quando il tempo scende sotto i 30 secondi;
- durante l'animazione di errore l'input è bloccato, per evitare doppi click che
  contano errori multipli;
- avviso in configurazione se DEC non è selezionato e il vincolo pivot decimale è
  quindi ignorato (si veda §4);
- avviso alla transizione tra livelli quando il vincolo pivot decimale decade
  (si veda §4);
- pulsante per abbandonare la partita (si veda §4), presente sia nella schermata
  di gioco sia in quella intermedia di fine livello, con conferma prima di avere
  effetto. Nella schermata di gioco sta nella barra in alto accanto al controllo
  dell'audio, dopo di esso nell'ordine di tabulazione; in quella intermedia viene
  dopo il pulsante per continuare, così l'azione sicura resta la prima;
- il riepilogo di fine partita distingue dal titolo i tre esiti possibili:
  vittoria, sconfitta per tempo scaduto, abbandono;
- effetti sonori sintetici (Web Audio, nessun file audio) per: coppia corretta,
  errore, livello completato, tempo sceso sotto i 30 secondi (emesso una sola
  volta), fine partita con vittoria e sconfitta distinte. Suoni brevi, di tipo
  arcade; quello dell'errore è riconoscibile come negativo senza essere
  punitivo. L'abbandono **non** ha un suono: è un'azione da menu dietro una
  conferma, non un evento di gioco;
- interruttore per silenziare l'audio, raggiungibile sia dalla configurazione
  sia durante la partita. La preferenza è persistente ed è ricordata per
  macchina; l'audio parte **disattivato**, perché in aula molte postazioni
  vicine che suonano insieme diventano rumore.

> **Limite noto:** `:root` dichiara `font: 18px/145%`, e una
> `line-height` percentuale viene risolta in pixel ed ereditata come valore
> fisso dai figli, non ricalcolata sulla loro `font-size`. Ogni elemento con
> `font-size` diversa dal corpo del testo e senza una propria `line-height` è
> quindi esposto allo stesso difetto già corretto su `h1` (titolo che si
> sovrapponeva andando a capo). Sostituire `145%` con `1.45` risolverebbe alla
> radice, ma va fatto rivedendo la spaziatura di tutte le schermate.

> **Limite noto:** alle griglie a 6 colonne (Livelli 3–5 e 11–13) una colonna
> poteva risultare più stretta delle altre, con le sue tessere ad aspect ratio
> diversa; due tentativi di correzione non hanno risolto e la causa non è mai
> stata individuata. Il difetto non si manifesta più da quando il range
> massimo è sceso a 0–31 (secondo ciclo, Livello 13 incluso): un valore
> binario a 5 cifre entra nella cella senza che nessuna tessera reclami spazio
> extra. Tornerebbe se un livello o un ciclo futuro alzasse di nuovo il range.

> **Limite noto:** su una griglia 6x6 (Livelli 11–13), sotto i ~340px di
> larghezza dello schermo, i numeri delle tessere scendono sotto i 14px. È il
> limite di leggibilità che il layout mobile non sacrifica: sotto quella soglia
> il tavolo resta tutto visibile senza scorrimento, ma i numeri del 6x6
> diventano troppo piccoli. Le griglie più piccole e gli schermi più larghi non
> sono interessati. Su un telefono comune (~390px) i numeri del 6x6 stanno
> intorno ai 15–16px.

---

## 8. Fuori perimetro

- Backend, account, classifica online.
- Animazioni elaborate, temi grafici multipli.
- Internazionalizzazione: la UI è in italiano.
