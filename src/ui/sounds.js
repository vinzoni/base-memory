// Sintesi degli effetti sonori via Web Audio API: nessun file audio, nessuna
// dipendenza, nessun problema di licenza. È un modulo di presentazione — non
// conosce lo stato di gioco né `localStorage`. È `main.js`, che già osserva le
// transizioni di stato, a decidere quando chiamare `play()` e a tenere la
// preferenza attivo/disattivato (persistita).

// Volume generale, tenuto basso di proposito: il gioco si usa in aule con molte
// postazioni vicine. È più basso della somma di picco di un accordo con la
// seconda voce e la coda del riverbero; il compressore a valle raccoglie i
// transienti residui.
const MASTER_GAIN = 0.09;

// Inviluppo comune a ogni nota. Attacco lineare breve ma non istantaneo (un
// fronte netto a volume pieno è udibile come schiocco). Rilascio esponenziale
// lungo via setTargetAtTime: la nota sfuma invece di essere troncata di netto —
// è la causa principale della durezza percepita quando la coda è cortissima.
const ATTACK_SECONDS = 0.018;
const RELEASE_TIME_CONSTANT = 0.11; // la coda udibile dura circa 4-5 volte tanto
const TAIL_SECONDS = 0.5; // margine oltre la coda udibile prima di fermare l'oscillatore

// Seconda voce sovrapposta a ogni nota, un'ottava sopra e a volume ridotto: dà
// spessore al timbro senza cambiare la nota percepita.
const OCTAVE_MIX = 0.28;

// Riverbero: convolutore con impulso sintetico. Discreto (mix basso, coda
// filtrata in alto per un ambiente caldo), così i suoni sembrano in uno spazio
// senza invadere l'aula.
const REVERB_WET = 0.18;
const REVERB_LOWPASS_HZ = 3500;
const IMPULSE_SECONDS = 1.1;
const IMPULSE_DECAY = 3.2;

// Ogni evento è un piccolo accordo: note con attacchi ravvicinati e durate che
// si accavallano, così suonano insieme invece che in fila. `frequency` in Hz;
// `startAt` e `duration` (sostegno prima del rilascio) in secondi; `gain`
// opzionale (0-1) abbassa la singola nota; `releaseScale` opzionale accorcia la
// coda di quella nota. Il carattere resta ascendente per gli eventi positivi e
// discendente per quelli negativi. Nessun suono supera circa un secondo, coda
// del riverbero inclusa, tranne `gameWon` (fanfara di partita vinta).
const SOUND_SEQUENCES = {
  // Triade maggiore Do-Mi-Sol con attacchi in salita: le tre note restano a
  // suonare insieme in un accordo pieno e consonante (terza + quinta).
  pairMatch: [
    { frequency: 523.25, type: 'triangle', startAt: 0, duration: 0.36 },
    { frequency: 659.25, type: 'triangle', startAt: 0.05, duration: 0.34 },
    { frequency: 783.99, type: 'triangle', startAt: 0.1, duration: 0.38 },
  ],
  // Terza discendente Si2->Sol2, sinusoide morbida a volume ridotto e coda
  // accorciata: è il suono che si sente più spesso mentre si impara, deve
  // restare il più contenuto e non diventare fastidioso alla quinta volta.
  pairError: [
    { frequency: 246.94, type: 'sine', startAt: 0, duration: 0.14, gain: 0.5, releaseScale: 0.5 },
    { frequency: 196.0, type: 'sine', startAt: 0.06, duration: 0.18, gain: 0.5, releaseScale: 0.5 },
  ],
  // Arpeggio ascendente Do-Mi-Sol-Do che si chiude restando a suonare come
  // accordo.
  levelComplete: [
    { frequency: 523.25, type: 'triangle', startAt: 0, duration: 0.26 },
    { frequency: 659.25, type: 'triangle', startAt: 0.08, duration: 0.3 },
    { frequency: 783.99, type: 'triangle', startAt: 0.16, duration: 0.34 },
    { frequency: 1046.5, type: 'triangle', startAt: 0.24, duration: 0.4 },
  ],
  // Due rintocchi di quinta (Sol + Do) sovrapposti: riconoscibile come allerta,
  // ma senza intervalli aspri. `main.js` lo emette una volta sola, al passaggio
  // sotto la soglia di avviso.
  timeLow: [
    { frequency: 783.99, type: 'triangle', startAt: 0, duration: 0.13, gain: 0.7 },
    { frequency: 1046.5, type: 'triangle', startAt: 0, duration: 0.13, gain: 0.45 },
    { frequency: 783.99, type: 'triangle', startAt: 0.2, duration: 0.15, gain: 0.7 },
    { frequency: 1046.5, type: 'triangle', startAt: 0.2, duration: 0.15, gain: 0.45 },
  ],
  // Fanfara ascendente Do-Mi-Sol-Do che si risolve su una triade tenuta.
  gameWon: [
    { frequency: 523.25, type: 'triangle', startAt: 0, duration: 0.16 },
    { frequency: 659.25, type: 'triangle', startAt: 0.12, duration: 0.16 },
    { frequency: 783.99, type: 'triangle', startAt: 0.24, duration: 0.16 },
    { frequency: 1046.5, type: 'triangle', startAt: 0.36, duration: 0.5 },
    { frequency: 659.25, type: 'triangle', startAt: 0.36, duration: 0.5, gain: 0.55 },
    { frequency: 523.25, type: 'triangle', startAt: 0.36, duration: 0.5, gain: 0.45 },
  ],
  // Tre note discendenti La-Fa-Do sovrapposte, sinusoide: risoluzione morbida,
  // carattere calante senza dissonanze.
  gameLost: [
    { frequency: 440.0, type: 'sine', startAt: 0, duration: 0.24, gain: 0.7 },
    { frequency: 349.23, type: 'sine', startAt: 0.1, duration: 0.28, gain: 0.7 },
    { frequency: 261.63, type: 'sine', startAt: 0.2, duration: 0.4, gain: 0.7 },
  ],
};

// Impulso di riverbero sintetico: rumore bianco stereo che decade in modo
// esponenziale. Serve come risposta all'impulso del convolutore, non va
// ascoltato da solo.
function createImpulseResponse(context) {
  const length = Math.floor(context.sampleRate * IMPULSE_SECONDS);
  const impulse = context.createBuffer(2, length, context.sampleRate);
  for (let channel = 0; channel < impulse.numberOfChannels; channel += 1) {
    const samples = impulse.getChannelData(channel);
    for (let i = 0; i < length; i += 1) {
      const remaining = 1 - i / length;
      samples[i] = (Math.random() * 2 - 1) * remaining ** IMPULSE_DECAY;
    }
  }
  return impulse;
}

export function createSoundPlayer({ audioContextFactory } = {}) {
  const createContext =
    audioContextFactory ??
    (() => {
      const AudioContextCtor = window.AudioContext ?? window.webkitAudioContext;
      return AudioContextCtor ? new AudioContextCtor() : null;
    });

  let context = null;
  let masterGain = null;
  let compressor = null;
  let convolver = null; // opzionale: se il riverbero non si crea, resta null
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

        // Rete di sicurezza contro il clipping: accordo + seconda voce + coda
        // del riverbero sommano più segnale di una nota singola.
        compressor = context.createDynamicsCompressor();
        compressor.threshold.value = -18;
        compressor.ratio.value = 3;
        compressor.attack.value = 0.003;
        compressor.release.value = 0.25;
        compressor.connect(context.destination);

        masterGain = context.createGain();
        masterGain.gain.value = MASTER_GAIN;
        masterGain.connect(compressor);

        // Il riverbero è un di più: se qualcosa qui fallisce, il segnale
        // asciutto deve continuare a funzionare.
        try {
          const convolverNode = context.createConvolver();
          convolverNode.buffer = createImpulseResponse(context);
          const wetLowpass = context.createBiquadFilter();
          wetLowpass.type = 'lowpass';
          wetLowpass.frequency.value = REVERB_LOWPASS_HZ;
          const wetGain = context.createGain();
          wetGain.gain.value = REVERB_WET;
          convolverNode.connect(wetLowpass);
          wetLowpass.connect(wetGain);
          wetGain.connect(masterGain);
          convolver = convolverNode;
        } catch {
          convolver = null;
        }
      }
      if (context.state === 'suspended') {
        context.resume();
      }
    } catch {
      // Web Audio non disponibile o bloccato: il player resta un no-op
      // silenzioso, il gioco continua senza suoni.
      context = null;
      masterGain = null;
      compressor = null;
      convolver = null;
    }
  }

  function setEnabled(nextEnabled) {
    enabled = Boolean(nextEnabled);
  }

  function scheduleVoice(oscillatorType, frequency, envelope, startTime, stopTime, voiceGain) {
    const oscillator = context.createOscillator();
    oscillator.type = oscillatorType;
    oscillator.frequency.value = frequency;
    if (voiceGain === 1) {
      oscillator.connect(envelope);
    } else {
      const gainNode = context.createGain();
      gainNode.gain.value = voiceGain;
      oscillator.connect(gainNode);
      gainNode.connect(envelope);
    }
    oscillator.start(startTime);
    oscillator.stop(stopTime);
  }

  function scheduleNote(note, noteStartTime) {
    const peak = note.gain ?? 1;
    const releaseScale = note.releaseScale ?? 1;
    const releaseStart = noteStartTime + note.duration;
    const stopTime = releaseStart + TAIL_SECONDS * releaseScale;

    const envelope = context.createGain();
    envelope.gain.setValueAtTime(0.0001, noteStartTime);
    envelope.gain.linearRampToValueAtTime(peak, noteStartTime + ATTACK_SECONDS);
    envelope.gain.setValueAtTime(peak, releaseStart);
    // setTargetAtTime tende a 0 in modo asintotico (esponenziale): la coda
    // sfuma, l'oscillatore si ferma molto dopo che è diventata inudibile.
    envelope.gain.setTargetAtTime(0, releaseStart, RELEASE_TIME_CONSTANT * releaseScale);
    envelope.connect(masterGain);
    if (convolver) envelope.connect(convolver);

    scheduleVoice(note.type, note.frequency, envelope, noteStartTime, stopTime, 1);
    scheduleVoice(note.type, note.frequency * 2, envelope, noteStartTime, stopTime, OCTAVE_MIX);
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
