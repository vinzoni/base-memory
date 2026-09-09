// Sintesi degli effetti sonori via Web Audio API: nessun file audio, nessuna
// dipendenza, nessun problema di licenza. È un modulo di presentazione — non
// conosce lo stato di gioco né `localStorage`. È `main.js`, che già osserva le
// transizioni di stato, a decidere quando chiamare `play()` e a tenere la
// preferenza attivo/disattivato (persistita).

// Volume generale, tenuto basso di proposito: il gioco si usa in aule con molte
// postazioni vicine. Il compressore a valle raccoglie i transienti residui
// quando le voci di un accordo si sommano.
const MASTER_GAIN = 0.09;

// Inviluppo comune a ogni nota. Attacco lineare breve ma non istantaneo (un
// fronte netto a volume pieno è udibile come schiocco). Rilascio esponenziale
// via setTargetAtTime: la nota sfuma invece di essere troncata di netto.
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

// Silenzio tra il click che chiude il livello e il suono del traguardo: fa da
// respiro, così il traguardo suona come evento deliberato e non si sovrappone
// alla chiusura dell'ultima coppia (il cui riscontro sonoro `main.js` sopprime
// proprio sulla transizione a livello completato). Applicato a levelComplete,
// gameWon e gameLost; schedulato sul clock audio, senza timer JS in sospeso.
const MILESTONE_LEAD_SECONDS = 0.28;
const LEAD_SOUNDS = new Set(['levelComplete', 'gameWon', 'gameLost']);

// Dissolvenza con cui un suono nuovo interrompe un traguardo ancora in coda,
// così non resta appeso quando il giocatore è già passato alla schermata dopo.
const MILESTONE_CANCEL_FADE_SECONDS = 0.04;

// Ogni evento è una sequenza di note: `frequency` in Hz; `startAt` e `duration`
// (sostegno prima del rilascio) in secondi; `gain` opzionale (0-1) abbassa la
// singola nota; `releaseScale` opzionale accorcia la coda di quella nota.
const SOUND_SEQUENCES = {
  // Due note ascendenti rapide, tipo campanella: riscontro leggero e brillante
  // per un evento che ricorre otto o più volte per livello. Volume contenuto,
  // niente accordo — quelli sono riservati ai traguardi. Prende la misura da
  // `pairError`, l'unico suono che al collaudo non risultava fastidioso.
  pairMatch: [
    { frequency: 659.25, type: 'triangle', startAt: 0, duration: 0.06, gain: 0.5, releaseScale: 0.6 },
    { frequency: 880.0, type: 'triangle', startAt: 0.07, duration: 0.12, gain: 0.5, releaseScale: 0.6 },
  ],
  // Due note discendenti ravvicinate, sinusoide morbida a volume ridotto: il
  // suono che si sente più spesso mentre si impara, non deve diventare
  // fastidioso alla quinta volta. È il riferimento di misura per gli altri.
  pairError: [
    { frequency: 246.94, type: 'sine', startAt: 0, duration: 0.14, gain: 0.5, releaseScale: 0.5 },
    { frequency: 196.0, type: 'sine', startAt: 0.06, duration: 0.18, gain: 0.5, releaseScale: 0.5 },
  ],
  // Allarme a tre toni ripetuto: tre impulsi uguali, breve pausa, altri tre. La
  // ripetizione e il ritmo comunicano urgenza; volume medio e onda pulita
  // evitano che spaventi. `main.js` lo emette una volta sola, al passaggio sotto
  // la soglia di avviso.
  timeLow: [
    { frequency: 880.0, type: 'triangle', startAt: 0.0, duration: 0.09, gain: 0.5, releaseScale: 0.3 },
    { frequency: 880.0, type: 'triangle', startAt: 0.15, duration: 0.09, gain: 0.5, releaseScale: 0.3 },
    { frequency: 880.0, type: 'triangle', startAt: 0.3, duration: 0.09, gain: 0.5, releaseScale: 0.3 },
    { frequency: 880.0, type: 'triangle', startAt: 0.58, duration: 0.09, gain: 0.5, releaseScale: 0.3 },
    { frequency: 880.0, type: 'triangle', startAt: 0.73, duration: 0.09, gain: 0.5, releaseScale: 0.3 },
    { frequency: 880.0, type: 'triangle', startAt: 0.88, duration: 0.09, gain: 0.5, releaseScale: 0.3 },
  ],
  // Traguardo di livello: linea ascendente Sol-Do-Mi che si apre su una diade
  // Do-Mi tenuta, senza risolvere del tutto — è un passaggio, non una
  // conclusione. Più corto e più esile di `gameWon`.
  levelComplete: [
    { frequency: 392.0, type: 'triangle', startAt: 0.0, duration: 0.13 },
    { frequency: 523.25, type: 'triangle', startAt: 0.1, duration: 0.15 },
    { frequency: 659.25, type: 'triangle', startAt: 0.2, duration: 0.6 },
    { frequency: 783.99, type: 'triangle', startAt: 0.2, duration: 0.6, gain: 0.5 },
  ],
  // Vittoria finale: arpeggio pieno Do-Mi-Sol-Do che si risolve su una triade
  // maggiore tenuta con la voce acuta in evidenza. Più lungo, più denso e
  // chiaramente risolto rispetto a `levelComplete`: qui il gioco finisce.
  gameWon: [
    { frequency: 523.25, type: 'triangle', startAt: 0.0, duration: 0.14 },
    { frequency: 659.25, type: 'triangle', startAt: 0.13, duration: 0.14 },
    { frequency: 783.99, type: 'triangle', startAt: 0.26, duration: 0.14 },
    { frequency: 1046.5, type: 'triangle', startAt: 0.39, duration: 0.9 },
    { frequency: 783.99, type: 'triangle', startAt: 0.39, duration: 0.9, gain: 0.5 },
    { frequency: 659.25, type: 'triangle', startAt: 0.39, duration: 0.9, gain: 0.45 },
    { frequency: 523.25, type: 'triangle', startAt: 0.39, duration: 0.9, gain: 0.4 },
  ],
  // Sconfitta: stessa lunghezza di `gameWon` ma specchiata — arpeggio
  // discendente Do-La-Fa-Re che sprofonda su una triade minore tenuta.
  // Sinusoide, volume contenuto: negativo e inequivocabile dalla prima nota,
  // senza essere punitivo.
  gameLost: [
    { frequency: 523.25, type: 'sine', startAt: 0.0, duration: 0.16, gain: 0.7 },
    { frequency: 440.0, type: 'sine', startAt: 0.15, duration: 0.16, gain: 0.7 },
    { frequency: 349.23, type: 'sine', startAt: 0.3, duration: 0.16, gain: 0.7 },
    { frequency: 293.66, type: 'sine', startAt: 0.45, duration: 0.85, gain: 0.7 },
    { frequency: 349.23, type: 'sine', startAt: 0.45, duration: 0.85, gain: 0.5 },
    { frequency: 440.0, type: 'sine', startAt: 0.45, duration: 0.85, gain: 0.45 },
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
  // Voci di un suono-traguardo ancora schedulate o in corso: le interrompe la
  // prossima chiamata a play().
  let pendingMilestoneVoices = [];

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
    return oscillator;
  }

  function scheduleNote(note, noteStartTime) {
    const peak = note.gain ?? 1;
    const releaseScale = note.releaseScale ?? 1;
    const releaseStart = noteStartTime + note.duration;
    const endTime = releaseStart + TAIL_SECONDS * releaseScale;

    const envelope = context.createGain();
    envelope.gain.setValueAtTime(0.0001, noteStartTime);
    envelope.gain.linearRampToValueAtTime(peak, noteStartTime + ATTACK_SECONDS);
    envelope.gain.setValueAtTime(peak, releaseStart);
    // setTargetAtTime tende a 0 in modo asintotico (esponenziale): la coda
    // sfuma, l'oscillatore si ferma molto dopo che è diventata inudibile.
    envelope.gain.setTargetAtTime(0, releaseStart, RELEASE_TIME_CONSTANT * releaseScale);
    envelope.connect(masterGain);
    if (convolver) envelope.connect(convolver);

    const oscillators = [
      scheduleVoice(note.type, note.frequency, envelope, noteStartTime, endTime, 1),
      scheduleVoice(note.type, note.frequency * 2, envelope, noteStartTime, endTime, OCTAVE_MIX),
    ];
    return { envelope, oscillators, endTime };
  }

  // Interrompe con una breve dissolvenza le voci di un traguardo ancora in coda.
  // Chiamata a ogni play(): quando la partita riprende, il primo suono nuovo
  // taglia il traguardo residuo invece di lasciarlo suonare sulla schermata dopo.
  function stopPendingMilestone() {
    if (pendingMilestoneVoices.length === 0) return;
    const now = context.currentTime;
    for (const voice of pendingMilestoneVoices) {
      if (voice.endTime <= now) continue;
      try {
        voice.envelope.gain.cancelScheduledValues(now);
        voice.envelope.gain.setTargetAtTime(0, now, MILESTONE_CANCEL_FADE_SECONDS);
        for (const oscillator of voice.oscillators) {
          oscillator.stop(now + MILESTONE_CANCEL_FADE_SECONDS * 4);
        }
      } catch {
        // Voce già terminata: niente da fermare.
      }
    }
    pendingMilestoneVoices = [];
  }

  function play(soundName) {
    if (!enabled || !context || !masterGain) return;
    const sequence = SOUND_SEQUENCES[soundName];
    if (!sequence) return;
    try {
      if (context.state === 'suspended') context.resume();
      stopPendingMilestone();

      const isMilestone = LEAD_SOUNDS.has(soundName);
      const startTime = context.currentTime + (isMilestone ? MILESTONE_LEAD_SECONDS : 0);
      const voices = [];
      for (const note of sequence) {
        voices.push(scheduleNote(note, startTime + note.startAt));
      }
      if (isMilestone) pendingMilestoneVoices = voices;
    } catch {
      // Una singola riproduzione fallita non deve propagare errori al gioco.
    }
  }

  return { unlock, setEnabled, play };
}
