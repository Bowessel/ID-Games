/* Achtergrondmuziek per editie, live gespeeld met Web Audio (geen muziekbestanden nodig).
   Elke editie heeft een eigen loopje:
   - Classic: vrolijke pop in C-groot
   - Spicy:   zwoele latin-lounge in A-klein
   - Work:    relaxte lo-fi jazz (lift-muziek op vrijdagmiddag)
   - Goofy:   huppelende hoempa met een glijfluitje
   Uit te zetten in de instellingen; de keuze wordt onthouden in de browser. */
import { getAudio } from "./audio.js";

const MUSIC_KEY = "idgame-music";
let musicOn = true;
try { musicOn = localStorage.getItem(MUSIC_KEY) !== "off"; } catch { /* standaard aan */ }

const VOLUME = 0.7;       /* totaalvolume van de muziek (de noten zelf zijn al zacht) */
const DUCKED = 0.15;      /* tijdens de onthullingsshow: muziek bijna weg */
const LOOKAHEAD = 0.15;   /* zoveel seconden vooruit worden noten ingepland */

/* Akkoord: grondtoon voor de bas + noten voor de begeleiding (MIDI-nummers, 60 = middelste C) */
const ch = (root, ...notes) => ({ root, notes });

/* Patronen: 16 tekens per maat (zestiende noten). "x" = slag, "-" = zachte slag, "." = rust.
   Bas: "x" grondtoon, "5" kwint, "o" octaaf. Melodie: per maat [stap, noot, lengte, (glij naar)]. */
const SONGS = {
  classic: {
    bpm: 112, swing: 0,
    chords: [ch(48, 60, 64, 67), ch(45, 60, 64, 69), ch(41, 60, 65, 69), ch(43, 59, 62, 67)],
    bass: "x.....x.x...5...",
    comp: "..x...x...x...x.",
    kick: "x.......x.x.....",
    snare: "....x.......x...",
    hat: "-.x.-.x.-.x.-.x.",
    clave: "................",
    lead: [
      [[0, 76, 2], [2, 79, 2], [4, 84, 4], [10, 83, 2], [12, 79, 4]],
      [[0, 81, 2], [2, 79, 2], [4, 76, 4], [10, 72, 2], [12, 76, 4]],
      [[0, 77, 2], [2, 76, 2], [4, 72, 4], [8, 69, 2], [10, 72, 2], [12, 77, 4]],
      [[0, 79, 6], [8, 74, 2], [10, 76, 2], [12, 74, 4]],
      [[0, 76, 2], [2, 79, 2], [4, 84, 4], [10, 86, 2], [12, 84, 4]],
      [[0, 81, 4], [6, 79, 2], [8, 76, 4], [12, 79, 4]],
      [[0, 77, 2], [2, 81, 2], [4, 84, 4], [8, 81, 2], [10, 79, 2], [12, 77, 4]],
      [[0, 79, 4], [4, 74, 2], [6, 76, 2], [8, 79, 8]]
    ],
    sound: {
      bass: { type: "triangle", gain: 0.16, cutoff: 900, len: 2 },
      comp: { type: "triangle", gain: 0.03, len: 1 },
      lead: { type: "triangle", gain: 0.06, release: 0.1 },
      kick: 0.22, snare: 0.05, hat: 0.025
    }
  },

  spicy: {
    bpm: 96, swing: 0,
    chords: [ch(45, 55, 60, 64), ch(45, 55, 60, 64), ch(38, 57, 60, 65), ch(40, 56, 59, 62)],
    bass: "x..x..5.x..x..5.",
    comp: "x...............",
    kick: "x.....x.x.......",
    snare: "................",
    hat: "..-x..-x..-x..-x",
    clave: "x..x..x...x.x...",
    lead: [
      [[0, 69, 6], [6, 72, 2], [8, 71, 4], [12, 69, 4]],
      [[2, 76, 4], [6, 74, 2], [8, 72, 4], [12, 71, 4]],
      [[0, 74, 6], [6, 77, 2], [8, 76, 4], [12, 74, 2], [14, 72, 2]],
      [[0, 71, 6], [6, 68, 2], [8, 71, 4], [12, 74, 4]],
      [],
      [[8, 76, 8]],
      [[0, 77, 4], [4, 76, 4], [8, 74, 8]],
      [[0, 80, 4], [4, 76, 4], [8, 71, 8]]
    ],
    sound: {
      bass: { type: "sawtooth", gain: 0.1, cutoff: 520, len: 2 },
      comp: { type: "sine", gain: 0.022, len: 16, attack: 0.25, release: 0.3, sustain: true },
      lead: { type: "sawtooth", gain: 0.035, cutoff: 1500, attack: 0.04, vibrato: 5, sustain: true },
      kick: 0.2, snare: 0, hat: 0.02, clave: 0.05
    }
  },

  work: {
    bpm: 82, swing: 0.6,
    chords: [ch(43, 58, 62, 65), ch(48, 58, 62, 64), ch(41, 57, 60, 64), ch(38, 57, 60, 65)],
    bass: "x...5...o...5...",
    comp: "x.........x.....",
    kick: "x.........x.....",
    snare: "....-.......-...",
    hat: "x.-.x.-.x.-.x.-.",
    clave: "................",
    lead: [
      [[0, 74, 4], [6, 72, 2], [8, 70, 6]],
      [[4, 72, 2], [6, 74, 2], [8, 76, 8]],
      [[0, 77, 6], [8, 76, 4], [12, 72, 4]],
      [[0, 69, 8], [10, 72, 2], [12, 74, 4]],
      [],
      [[8, 79, 4], [12, 77, 4]],
      [[0, 76, 8]],
      [[8, 74, 8]]
    ],
    sound: {
      bass: { type: "triangle", gain: 0.15, cutoff: 700, len: 3 },
      comp: { type: "sine", gain: 0.035, len: 8, detune: 6 },
      lead: { type: "sine", gain: 0.05, release: 0.4 },
      kick: 0.16, snare: 0.035, hat: 0.018
    }
  },

  goofy: {
    bpm: 132, swing: 0,
    chords: [ch(41, 57, 60, 65), ch(36, 55, 58, 64), ch(41, 57, 60, 65), ch(41, 57, 60, 65),
             ch(46, 58, 62, 65), ch(41, 57, 60, 65), ch(36, 55, 58, 64), ch(41, 57, 60, 65)],
    bass: "x.......5.......",
    comp: "....x.......x...",
    kick: "x.......x.......",
    snare: "................",
    hat: "................",
    clave: "..x...x...x...x.",
    lead: [
      [[0, 72, 1], [2, 72, 1], [4, 77, 1], [6, 76, 1], [8, 77, 2], [12, 69, 1], [14, 72, 1]],
      [[0, 70, 1], [2, 70, 1], [4, 76, 1], [6, 75, 1], [8, 76, 2], [12, 67, 1], [14, 70, 1]],
      [[0, 69, 1], [2, 72, 1], [4, 77, 1], [6, 81, 1], [8, 84, 2], [12, 81, 1], [14, 77, 1]],
      [[0, 79, 1], [2, 78, 1], [4, 77, 4], [12, 65, 1], [14, 67, 1]],
      [[0, 70, 1], [2, 74, 1], [4, 77, 1], [6, 82, 1], [8, 81, 2], [12, 77, 1], [14, 74, 1]],
      [[0, 72, 1], [2, 77, 1], [4, 81, 1], [6, 80, 1], [8, 81, 2], [12, 77, 2]],
      [[0, 79, 1], [2, 76, 1], [4, 72, 1], [6, 70, 1], [8, 67, 2], [10, 68, 1], [12, 69, 2]],
      [[0, 77, 2], [4, 65, 1], [6, 65, 1], [10, 72, 4, 84]]
    ],
    sound: {
      bass: { type: "square", gain: 0.07, cutoff: 450, len: 3 },
      comp: { type: "square", gain: 0.014, cutoff: 1800, len: 1 },
      lead: { type: "square", gain: 0.022, cutoff: 2600, release: 0.05 },
      kick: 0.18, clave: 0.06
    }
  }
};

const freq = (midi) => 440 * Math.pow(2, (midi - 69) / 12);

/* ---------- instrumenten ---------- */
function voice(ac, out, t, hz, dur, o) {
  const osc = ac.createOscillator();
  osc.type = o.type || "triangle";
  osc.frequency.setValueAtTime(hz, t);
  if (o.slideTo) osc.frequency.exponentialRampToValueAtTime(o.slideTo, t + dur);
  if (o.detune) osc.detune.value = o.detune;
  const g = ac.createGain();
  const attack = o.attack ?? 0.01;
  const release = o.release ?? 0.08;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(o.gain, t + attack);
  if (o.sustain) g.gain.setValueAtTime(o.gain, t + Math.max(attack, dur - release));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur + release);
  let node = osc;
  if (o.cutoff) {
    const f = ac.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = o.cutoff;
    osc.connect(f);
    node = f;
  }
  node.connect(g);
  g.connect(out);
  const end = t + dur + release + 0.05;
  if (o.vibrato) {
    const lfo = ac.createOscillator();
    const lg = ac.createGain();
    lfo.frequency.value = 5;
    lg.gain.value = o.vibrato;
    lfo.connect(lg);
    lg.connect(osc.frequency);
    lfo.start(t);
    lfo.stop(end);
  }
  osc.start(t);
  osc.stop(end);
}

let noise = null;
function noiseBuffer(ac) {
  if (noise && noise.sampleRate === ac.sampleRate) return noise;
  noise = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
  const data = noise.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return noise;
}

function hit(ac, out, t, gain, { type, freq: f, decay }) {
  const src = ac.createBufferSource();
  src.buffer = noiseBuffer(ac);
  const filter = ac.createBiquadFilter();
  filter.type = type;
  filter.frequency.value = f;
  const g = ac.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
  src.connect(filter);
  filter.connect(g);
  g.connect(out);
  src.start(t, Math.random() * 0.5);
  src.stop(t + decay + 0.02);
}

function kick(ac, out, t, gain) {
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.frequency.setValueAtTime(140, t);
  osc.frequency.exponentialRampToValueAtTime(45, t + 0.12);
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
  osc.connect(g);
  g.connect(out);
  osc.start(t);
  osc.stop(t + 0.25);
}

function clave(ac, out, t, gain) {
  voice(ac, out, t, 1150, 0.03, { type: "sine", gain, attack: 0.002, release: 0.05 });
}

/* ---------- sequencer ---------- */
let wanted = null;    /* editie die nu gespeeld hoort te worden (null = overzicht, geen muziek) */
let playing = null;   /* { id, song, bus, timer, next, step } */
let ducked = false;

function playStep(ac, p, t) {
  const { song, bus } = p;
  const s = p.step % 16;
  const bar = Math.floor(p.step / 16);
  const chord = song.chords[bar % song.chords.length];
  const snd = song.sound;
  const sixteenth = 60 / song.bpm / 4;
  const at = (pattern) => pattern[s];
  const level = (c, gain) => (c === "x" ? gain : c === "-" ? gain * 0.5 : 0);

  const b = at(song.bass);
  if (b !== ".") {
    const note = chord.root + (b === "5" ? 7 : b === "o" ? 12 : 0);
    voice(ac, bus, t, freq(note), snd.bass.len * sixteenth, snd.bass);
  }
  if (at(song.comp) !== ".") {
    chord.notes.forEach((n) => voice(ac, bus, t, freq(n), snd.comp.len * sixteenth, snd.comp));
  }
  const k = level(at(song.kick), snd.kick || 0);
  if (k) kick(ac, bus, t, k);
  const sn = level(at(song.snare), snd.snare || 0);
  if (sn) hit(ac, bus, t, sn, { type: "bandpass", freq: 1800, decay: 0.14 });
  const h = level(at(song.hat), snd.hat || 0);
  if (h) hit(ac, bus, t, h, { type: "highpass", freq: 7000, decay: 0.045 });
  const c = level(at(song.clave), snd.clave || 0);
  if (c) clave(ac, bus, t, c);

  const melody = song.lead[bar % song.lead.length];
  for (const [step, note, len, slide] of melody) {
    if (step !== s) continue;
    voice(ac, bus, t, freq(note), len * sixteenth, { ...snd.lead, slideTo: slide ? freq(slide) : null });
  }
}

function tick() {
  const ac = getAudio();
  if (!ac || !playing) return;
  const p = playing;
  const sixteenth = 60 / p.song.bpm / 4;
  /* Lag de app even stil (bijv. op de achtergrond)? Dan niet alle gemiste noten tegelijk spelen. */
  if (p.next < ac.currentTime - 0.05) p.next = ac.currentTime + 0.05;
  while (p.next < ac.currentTime + LOOKAHEAD) {
    const swing = p.step % 4 === 2 ? p.song.swing * sixteenth : 0;
    playStep(ac, p, p.next + swing);
    p.next += sixteenth;
    p.step = (p.step + 1) % (p.song.lead.length * 16);
  }
}

function start(id) {
  const ac = getAudio();
  const song = SONGS[id];
  if (!ac || !song) return;
  const bus = ac.createGain();
  bus.gain.setValueAtTime(0.0001, ac.currentTime);
  bus.gain.exponentialRampToValueAtTime(ducked ? DUCKED : VOLUME, ac.currentTime + 1.2);
  bus.connect(ac.destination);
  playing = { id, song, bus, next: ac.currentTime + 0.1, step: 0, timer: setInterval(tick, 25) };
  tick();
}

/* Huidige (eventueel nog lopende) volumeverandering vastzetten, zodat een nieuwe vloeiend aansluit */
function hold(param, ac) {
  if (param.cancelAndHoldAtTime) { param.cancelAndHoldAtTime(ac.currentTime); return; }
  const v = param.value;
  param.cancelScheduledValues(ac.currentTime);
  param.setValueAtTime(v, ac.currentTime);
}

function stop() {
  if (!playing) return;
  const { bus, timer } = playing;
  clearInterval(timer);
  playing = null;
  const ac = getAudio();
  if (ac) {
    hold(bus.gain, ac);
    bus.gain.setTargetAtTime(0.0001, ac.currentTime, 0.12);
  }
  setTimeout(() => bus.disconnect(), 800);
}

function refresh() {
  const id = musicOn ? wanted : null;
  if (playing && playing.id === id) return;
  stop();
  if (id) start(id);
}

/* ---------- publiek ---------- */
export function isMusicOn() { return musicOn; }

export function setMusicOn(on) {
  musicOn = !!on;
  try { localStorage.setItem(MUSIC_KEY, musicOn ? "on" : "off"); } catch { /* alleen deze sessie */ }
  refresh();
}

/* Muziek van een editie starten (of null: stoppen, bijv. terug naar het overzicht) */
export function playMusic(id) {
  wanted = id;
  refresh();
}

export function stopMusic() {
  playMusic(null);
}

/* Tijdens de onthullingsshow de muziek zachter zetten, zodat fanfare of "wah-wah" goed klinkt */
export function duckMusic(on) {
  ducked = !!on;
  if (!playing) return;
  const ac = getAudio();
  if (!ac) return;
  const g = playing.bus.gain;
  hold(g, ac);
  g.setTargetAtTime(ducked ? DUCKED : VOLUME, ac.currentTime, ducked ? 0.08 : 0.5);
}
