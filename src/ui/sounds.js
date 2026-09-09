// Sintesi degli effetti sonori via Web Audio API: nessun file audio, nessuna
// dipendenza, nessun problema di licenza. È un modulo di presentazione — non
// conosce lo stato di gioco né `localStorage`. È `main.js`, che già osserva le
// transizioni di stato, a decidere quando chiamare `play()` e a tenere la
// preferenza attivo/disattivato (persistita).

// Volume generale, tenuto basso di proposito: il gioco si usa in aule con molte
// postazioni vicine.
const MASTER_GAIN = 0.14;

// Inviluppo comune a ogni nota: attacco e rilascio brevi ma non nulli, così la
// nota non parte e non termina con un "click" (la discontinuità netta del
// segnale a volume pieno è udibile come schiocco).
const ATTACK_SECONDS = 0.008;
const RELEASE_SECONDS = 0.06;

// Ogni evento è una sequenza di note arcade, brevi e pulite. Frequenze in Hz;
// `startAt` e `duration` in secondi. Nessuna sequenza supera il mezzo secondo
// tranne `gameWon`, l'unica eccezione ammessa (fanfara di partita vinta).
// `gain` opzionale (0–1) abbassa la singola nota sotto il volume pieno.
const SOUND_SEQUENCES = {
  // Due note ascendenti veloci: conferma nitida e positiva.
  pairMatch: [
    { frequency: 659.25, type: 'triangle', startAt: 0, duration: 0.07 },
    { frequency: 987.77, type: 'triangle', startAt: 0.055, duration: 0.1 },
  ],
  // Due note discendenti ravvicinate, sinusoide morbida e volume ridotto:
  // riconoscibile come "negativo" senza essere aspra o punitiva — il pubblico
  // sono studenti che stanno imparando.
  pairError: [
    { frequency: 329.63, type: 'sine', startAt: 0, duration: 0.12, gain: 0.7 },
    { frequency: 261.63, type: 'sine', startAt: 0.1, duration: 0.14, gain: 0.7 },
  ],
  // Arpeggio di tre note ascendenti: livello superato.
  levelComplete: [
    { frequency: 523.25, type: 'triangle', startAt: 0, duration: 0.1 },
    { frequency: 659.25, type: 'triangle', startAt: 0.09, duration: 0.1 },
    { frequency: 783.99, type: 'triangle', startAt: 0.18, duration: 0.16 },
  ],
  // Due blip uguali, tipo sveglia: il tempo sta per scadere. `main.js` lo emette
  // una volta sola, al passaggio sotto la soglia di avviso.
  timeLow: [
    { frequency: 880, type: 'triangle', startAt: 0, duration: 0.08 },
    { frequency: 880, type: 'triangle', startAt: 0.12, duration: 0.08 },
  ],
  // Fanfara ascendente di partita vinta: l'unico suono che può superare il
  // mezzo secondo.
  gameWon: [
    { frequency: 523.25, type: 'triangle', startAt: 0, duration: 0.12 },
    { frequency: 659.25, type: 'triangle', startAt: 0.11, duration: 0.12 },
    { frequency: 783.99, type: 'triangle', startAt: 0.22, duration: 0.12 },
    { frequency: 1046.5, type: 'triangle', startAt: 0.33, duration: 0.26 },
  ],
  // Tre note discendenti dolci: partita persa. Volume ridotto, niente asprezza.
  gameLost: [
    { frequency: 440, type: 'sine', startAt: 0, duration: 0.14, gain: 0.8 },
    { frequency: 349.23, type: 'sine', startAt: 0.13, duration: 0.14, gain: 0.8 },
    { frequency: 261.63, type: 'sine', startAt: 0.26, duration: 0.2, gain: 0.8 },
  ],
};

export function createSoundPlayer({ audioContextFactory } = {}) {
  const createContext =
    audioContextFactory ??
    (() => {
      const AudioContextCtor = window.AudioContext ?? window.webkitAudioContext;
      return AudioContextCtor ? new AudioContextCtor() : null;
    });

  let context = null;
  let masterGain = null;
  let enabled = false;

  // L'AudioContext va creato alla prima interazione dell'utente, non al
  // caricamento della pagina: i browser bloccano l'audio prima di un gesto
  // dell'utente e un context creato troppo presto resta "suspended". Va anche
  // richiamata a ogni gesto utile, perché il context può tornare sospeso (cambio
  // scheda, politiche del browser). Idempotente.
  function unlock() {
    try {
      if (!context) {
        context = createContext();
        if (!context) return;
        masterGain = context.createGain();
        masterGain.gain.value = MASTER_GAIN;
        masterGain.connect(context.destination);
      }
      if (context.state === 'suspended') {
        context.resume();
      }
    } catch {
      // Web Audio non disponibile o bloccato: il player resta un no-op
      // silenzioso, il gioco continua senza suoni.
      context = null;
      masterGain = null;
    }
  }

  function setEnabled(nextEnabled) {
    enabled = Boolean(nextEnabled);
  }

  function scheduleNote(note, noteStartTime) {
    const oscillator = context.createOscillator();
    oscillator.type = note.type;
    oscillator.frequency.value = note.frequency;

    const noteGain = context.createGain();
    const peak = note.gain ?? 1;
    // Rampe lineari in attacco e rilascio attorno a una fase di sostegno piatta.
    const releaseStart = noteStartTime + note.duration;
    const end = releaseStart + RELEASE_SECONDS;
    noteGain.gain.setValueAtTime(0, noteStartTime);
    noteGain.gain.linearRampToValueAtTime(peak, noteStartTime + ATTACK_SECONDS);
    noteGain.gain.setValueAtTime(peak, releaseStart);
    noteGain.gain.linearRampToValueAtTime(0, end);

    oscillator.connect(noteGain);
    noteGain.connect(masterGain);
    oscillator.start(noteStartTime);
    oscillator.stop(end);
  }

  function play(soundName) {
    if (!enabled || !context || !masterGain) return;
    const sequence = SOUND_SEQUENCES[soundName];
    if (!sequence) return;
    try {
      if (context.state === 'suspended') context.resume();
      const startTime = context.currentTime;
      for (const note of sequence) {
        scheduleNote(note, startTime + note.startAt);
      }
    } catch {
      // Una singola riproduzione fallita non deve propagare errori al gioco.
    }
  }

  return { unlock, setEnabled, play };
}
