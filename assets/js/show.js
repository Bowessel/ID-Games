/* Wat er gebeurt als de groep een antwoord kiest. Het scherm zelf blijft gewoon staan.
   - Goed (playWin): onder de goede vraag vandaan rollen vier verjaardagstoeters uit die
     "brrreee" blazen, met een klein beetje confetti in de kleuren van de editie. De rij
     glanst en de vlag wappert.
   - Fout (playMiss): de gekozen vraag schudt "nee" en kleurt rood, met een "oh-oh" en een
     korte tril. Het spel streept hem daarna door, zodat de groep opnieuw kan kiezen.
   Geluid via Web Audio (geen bestanden nodig) en trillen; allebei uit te zetten in de instellingen.
   Staat "minder beweging" aan op de telefoon, dan alleen geluid en trillen. */
import { getAudio } from "./audio.js";
import { vibrate } from "./haptics.js";
import { duckMusic } from "./music.js";

const SOUND_KEY = "idgame-sound";
let soundOn = true;
try { soundOn = localStorage.getItem(SOUND_KEY) !== "off"; } catch { /* standaard aan */ }

export function isSoundOn() { return soundOn; }
export function setSoundOn(on) {
  soundOn = !!on;
  try { localStorage.setItem(SOUND_KEY, soundOn ? "on" : "off"); } catch { /* alleen deze sessie */ }
}

const reducedMotion = () => window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const rand = (a, b) => a + Math.random() * (b - a);
const pickOne = (list) => list[Math.floor(Math.random() * list.length)];
const rad = (deg) => (deg * Math.PI) / 180;
const lerp = (a, b, p) => a + (b - a) * p;
const easeOut = (p) => 1 - Math.pow(1 - p, 3);
const easeInOut = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);

/* ---------- tijdlijn goed geraden (seconden na het tikken op "Onthul") ---------- */
const T_BLOW = 0.3;    /* toeters beginnen te blazen; het scherm is dan net ingevlogen */
const T_BLOW2 = 1.04;  /* tweede keer blazen */
const T_END = 2.5;     /* alles is uitgespeeld */

/* Trillen: [tril, pauze, tril, ...] in ms */
const WIN_BUZZ = [0, 300, 220, 520, 160];   /* in de maat van het blazen */
const MISS_BUZZ = [70, 60, 110];             /* "nee-nee" */

/* ---------- geluid ---------- */
/* Eigen volumeknop per keer, zodat het geluid meteen stopt als je doorklikt */
function soundBus() {
  if (!soundOn) return null;
  const ac = getAudio();
  if (!ac) return null;
  const bus = ac.createGain();
  bus.connect(ac.destination);
  return { ac, bus };
}

/* Toeter: zaag- en blokgolf samen door een bandfilter, klinkt als een kazoo.
   from → freq: het aanblazen; to: glijden tijdens de toon; band: filter van/naar;
   flutter: snel trillend volume, het "brrr" van een papieren toeter. */
function horn({ ac, bus }, at, { freq, dur, from = freq * 0.85, to = freq, vibrato = 0, flutter = 0, band = [1300, 1300], gain = 0.09 }) {
  const t0 = ac.currentTime + at;
  const end = t0 + dur + 0.05;
  const filter = ac.createBiquadFilter();
  filter.type = "bandpass";
  filter.Q.value = 1.1;
  filter.frequency.setValueAtTime(band[0], t0);
  if (band[1] !== band[0]) filter.frequency.exponentialRampToValueAtTime(band[1], t0 + dur);
  const env = ac.createGain();
  env.gain.setValueAtTime(0.0001, t0);
  env.gain.exponentialRampToValueAtTime(gain, t0 + 0.02);
  env.gain.setValueAtTime(gain, t0 + dur * 0.75);
  env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  const trem = ac.createGain();
  trem.gain.value = flutter ? 0.7 : 1;
  filter.connect(env);
  env.connect(trem);
  trem.connect(bus);
  if (flutter) {
    const lfo = ac.createOscillator();
    const depth = ac.createGain();
    lfo.frequency.value = flutter;
    depth.gain.value = 0.3;
    lfo.connect(depth);
    depth.connect(trem.gain);
    lfo.start(t0);
    lfo.stop(end);
  }
  for (const [type, detune] of [["sawtooth", 0], ["square", 8]]) {
    const o = ac.createOscillator();
    o.type = type;
    o.detune.value = detune;
    o.frequency.setValueAtTime(from, t0);
    o.frequency.exponentialRampToValueAtTime(freq, t0 + 0.04);
    if (to !== freq) o.frequency.exponentialRampToValueAtTime(to, t0 + dur);
    if (vibrato) {
      const lfo = ac.createOscillator();
      const depth = ac.createGain();
      lfo.frequency.value = 7;
      depth.gain.value = vibrato;
      lfo.connect(depth);
      depth.connect(o.frequency);
      lfo.start(t0 + 0.08);
      lfo.stop(end);
    }
    o.connect(filter);
    o.start(t0);
    o.stop(end);
  }
}

/* Glinstertje (confetti) */
function ping({ ac, bus }, at, freq, gain = 0.03) {
  const t0 = ac.currentTime + at;
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = "triangle";
  o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.18);
  o.connect(g);
  g.connect(bus);
  o.start(t0);
  o.stop(t0 + 0.2);
}

/* Twee toeters die tegelijk blazen (net iets anders van toon), twee keer */
function playWinSound(s) {
  horn(s, T_BLOW, { freq: 520, from: 430, dur: 0.52, flutter: 28, gain: 0.06 });
  horn(s, T_BLOW + 0.1, { freq: 610, from: 500, dur: 0.46, flutter: 31, gain: 0.05 });
  horn(s, T_BLOW2, { freq: 560, from: 470, dur: 0.32, flutter: 28, gain: 0.06 });
  horn(s, T_BLOW2 + 0.08, { freq: 650, from: 540, dur: 0.28, flutter: 31, gain: 0.05 });
  [2093, 2637, 3136].forEach((f, i) => ping(s, T_BLOW + 0.3 + i * 0.09, f));
}

/* "Oh-oh" */
function playMissSound(s) {
  horn(s, 0, { freq: 466, from: 440, dur: 0.13, gain: 0.06, band: [1000, 1000] });
  horn(s, 0.17, { freq: 349, to: 330, from: 370, dur: 0.26, gain: 0.06, band: [900, 700] });
}

/* ---------- confetti ---------- */
/* In de kleuren van de editie (CSS-variabelen, zie [data-mode] in styles.css) */
const PARTY = ["var(--amber)", "var(--coral)", "var(--cobalt)", "var(--violet)", "#FFFFFF"];

/* Vlucht van één snipper: wegschieten, afremmen in de lucht, dwarrelend vallen en omdraaien.
   De tussenstappen liggen aan het begin dichter op elkaar, waar het snelst gaat. */
function flightFrames({ vx, vy, g, k, life, spin, sway, flip }) {
  const frames = [];
  const N = 18;
  for (let i = 0; i <= N; i++) {
    const f = Math.pow(i / N, 1.5);
    const t = (f * life) / 1000;
    const e = 1 - Math.exp(-k * t);
    const x = (vx / k) * e + sway.amp * Math.sin(sway.w * t + sway.p) * Math.min(1, t / 0.35);
    const y = (g / k) * t + ((vy - g / k) / k) * e;
    frames.push({
      offset: f,
      transform: `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) rotate(${(spin * t).toFixed(1)}deg) scaleY(${Math.cos(flip.w * t + flip.p).toFixed(2)})`,
      opacity: f < 0.7 ? 1 : Math.max(0, 1 - (f - 0.7) / 0.3)
    });
  }
  return frames;
}

/* Een paar snippers vanuit (x, y), in de richting angle (graden, 0 = rechts, -90 = omhoog) */
function burst(layer, x, y, angle, { count, speed, spread, g = 900, k = 3, life = [1100, 1600] }) {
  for (let i = 0; i < count; i++) {
    const bit = document.createElement("span");
    bit.className = `fx-bit ${pickOne(["is-rect", "is-rect", "is-dot", "is-strip"])}`;
    bit.style.left = `${x}px`;
    bit.style.top = `${y}px`;
    bit.style.background = pickOne(PARTY);
    layer.appendChild(bit);
    const a = rad(angle + rand(-spread, spread));
    const v = rand(speed[0], speed[1]);
    const ms = rand(life[0], life[1]);
    bit.animate(flightFrames({
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v,
      g, k, life: ms,
      spin: rand(-540, 540),
      sway: { amp: rand(4, 12), w: rand(6, 11), p: rand(0, 6.3) },
      flip: { w: rand(8, 16), p: rand(0, 6.3) }
    }), { duration: ms });
  }
}

/* ---------- verjaardagstoeters ---------- */
/* Vier toeters onder de goede vraag. at: plek langs de rij (0..1); angle: richting waarin
   hij uitrolt (graden, -90 = omhoog); curl: kant waarnaar het rolletje krult (naar buiten);
   wait: hoeveel later hij begint te blazen (s); color: kleur van het papier. */
const BLOWERS = [
  { at: 0.2, angle: -112, curl: -1, wait: 0, color: "var(--coral)" },
  { at: 0.8, angle: -68, curl: 1, wait: 0.07, color: "var(--cobalt)" },
  { at: 0.38, angle: 105, curl: 1, wait: 0.14, color: "var(--amber)" },
  { at: 0.62, angle: 75, curl: -1, wait: 0.21, color: "var(--violet)" }
];
const TUBE = 92;          /* lengte van het papieren rolletje (px) */
const REACH = TUBE - 5;   /* zo ver rolt hij uit: het puntje blijft een tikje gekruld */
const COIL_R = 13;        /* straal van de buitenste slag als hij is opgerold */
const TIGHTEN = 0.0013;   /* naar binnen toe krult hij steeds strakker */
const BLOW_MS = 1380;     /* hoe lang één toeter bezig is */

/* Hoe ver de toeter is uitgerold (px), ms na zijn start: blazen, even vasthouden,
   half terug, nog een keer blazen en weer helemaal oprollen (onder de rij) */
function unrolled(ms) {
  const hold = (t) => REACH - 2 * (1 + Math.sin(t / 22));   /* trillend vasthouden */
  if (ms <= 0 || ms >= BLOW_MS) return 0;
  if (ms < 260) return REACH * easeOut(ms / 260);
  if (ms < 540) return hold(ms);
  if (ms < 740) return lerp(hold(540), REACH * 0.45, easeInOut((ms - 540) / 200));
  if (ms < 920) return lerp(REACH * 0.45, REACH, easeOut((ms - 740) / 180));
  if (ms < 1100) return hold(ms);
  return lerp(hold(1100), 0, easeInOut((ms - 1100) / (BLOW_MS - 1100)));
}

/* Vorm van het rolletje: recht tot `straight` px, daarna opgerold (steeds strakker) */
function tubeShape(x0, y0, b, straight) {
  let x = x0;
  let y = y0;
  let d = `M${x0.toFixed(1)} ${y0.toFixed(1)}`;
  let stripes = d;
  let th = rad(b.angle);
  for (let u = 1; u <= TUBE; u++) {
    const o = Math.max(0, u - 0.5 - straight);
    th = rad(b.angle) + b.curl * (o / COIL_R + (TIGHTEN / 2) * o * o);
    x += Math.cos(th);
    y += Math.sin(th);
    const pt = `L${x.toFixed(1)} ${y.toFixed(1)}`;
    d += pt;
    if (u <= straight) stripes += pt;
  }
  return { d, stripes, tip: [x, y], tipAngle: (th * 180) / Math.PI };
}

/* Tekent de toeters elk beeldje opnieuw. Ze beginnen opgerold midden onder de rij en zijn
   alleen buiten de rij te zien (clip), dus het lijkt alsof ze onder het blokje vandaan
   komen. Bij de eerste keer helemaal uitgerold: een paar snippers confetti uit het puntje. */
function blowers(layer, row) {
  const NS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("class", "fx-blowers");
  svg.innerHTML = '<defs><clipPath id="fxUnder" clipPathUnits="userSpaceOnUse"><path clip-rule="evenodd"/></clipPath></defs>'
    + '<g clip-path="url(#fxUnder)"></g>';
  const clip = svg.querySelector("clipPath path");
  const group = svg.querySelector("g");
  const tubes = BLOWERS.map((b) => {
    const g = document.createElementNS(NS, "g");
    g.innerHTML = `<path class="ink"/><path class="paper" style="stroke:${b.color}"/><path class="stripes"/>`;
    group.appendChild(g);
    const [ink, paper, stripes] = g.children;
    return { b, ink, paper, stripes, popped: false };
  });
  layer.prepend(svg);

  const start = performance.now();
  const frame = (now) => {
    if (!svg.isConnected) return;   /* opgeruimd (doorgeklikt) */
    const r = row.getBoundingClientRect();
    const W = window.innerWidth + 50;
    const H = window.innerHeight + 50;
    clip.setAttribute("d", `M-50 -50H${W}V${H}H-50Z M${r.left} ${r.top}H${r.right}V${r.bottom}H${r.left}Z`);
    let busy = false;
    for (const tube of tubes) {
      const ms = now - start - tube.b.wait * 1000;
      if (ms < BLOW_MS) busy = true;
      const shape = tubeShape(r.left + r.width * tube.b.at, r.top + r.height / 2, tube.b, unrolled(ms));
      tube.ink.setAttribute("d", shape.d);
      tube.paper.setAttribute("d", shape.d);
      tube.stripes.setAttribute("d", shape.stripes);
      if (!tube.popped && ms >= 260) {
        tube.popped = true;
        burst(layer, shape.tip[0], shape.tip[1], shape.tipAngle, { count: 5, speed: [200, 420], spread: 35 });
      }
    }
    if (busy) requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

/* Zorgt dat de goede vraag met ruimte erboven en eronder (voor de toeters) in beeld staat,
   boven de knoppenbalk */
function bringIntoView(row) {
  const r = row.getBoundingClientRect();
  const bar = document.getElementById("actions");
  const top = 12;
  const bottom = Math.min(window.innerHeight, bar ? bar.getBoundingClientRect().top + 20 : Infinity) - 12;
  const from = r.top - 80;
  const to = r.bottom + 80;
  if (from >= top && to <= bottom) return;
  window.scrollBy(0, (from + to) / 2 - (top + bottom) / 2);
}

/* ---------- publiek ---------- */
let current = null;

/* Goed geraden: de viering op de goede vraag (row) van het onthulscherm. Blokkeert niets:
   je kunt meteen doorklikken; dan stopt alles (zie stopShow). */
export function playWin(row) {
  stopShow();
  const sound = soundBus();
  if (sound) playWinSound(sound);
  vibrate(WIN_BUZZ);
  duckMusic(true);   /* muziek even zachter, zodat je de toeters hoort */

  const layer = document.createElement("div");
  layer.className = "fx-layer";
  layer.setAttribute("aria-hidden", "true");
  document.body.appendChild(layer);
  const timers = [];
  const at = (sec, fn) => timers.push(setTimeout(fn, sec * 1000));
  current = { layer, timers, sound };

  if (row) {
    bringIntoView(row);
    if (!reducedMotion()) at(T_BLOW, () => blowers(layer, row));
    at(T_BLOW + 0.15, () => row.classList.add("fx-cheer"));
  }
  at(T_END, stopShow);
}

/* Fout gekozen: de vraag (row) schudt "nee" en kleurt rood, met een "oh-oh" en een korte
   tril. Geeft terug hoe lang het schudden duurt (ms); daarna streept het spel hem door. */
export function playMiss(row) {
  const sound = soundBus();
  if (sound) {
    playMissSound(sound);
    setTimeout(() => sound.bus.disconnect(), 1500);
  }
  vibrate(MISS_BUZZ);
  if (!row || !row.animate || reducedMotion()) return 0;
  const shake = [0, -7, 6, -5, 4, -2, 0].map((x) => ({ transform: `translateX(${x}px)` }));
  for (const child of row.children) child.animate(shake, { duration: 450, easing: "ease-out" });
  row.animate(
    [{ backgroundColor: getComputedStyle(row).backgroundColor }, { backgroundColor: "#FEE2E2" }],
    { duration: 450, easing: "ease-in", fill: "forwards" }
  );
  return 450;
}

/* Stopt een lopende viering (doorklikken, terug naar het overzicht) */
export function stopShow() {
  if (!current) return;
  const { layer, timers, sound } = current;
  current = null;
  timers.forEach(clearTimeout);
  layer.remove();
  if (sound) {
    sound.bus.gain.setTargetAtTime(0.0001, sound.ac.currentTime, 0.05);
    setTimeout(() => sound.bus.disconnect(), 400);
  }
  duckMusic(false);
}

/* "Werkt niet": knop laten trillen + korte tril van de telefoon (als trillen aan staat) */
export function nudge(el) {
  el.classList.remove("shake");
  void el.offsetWidth;
  el.classList.add("shake");
  vibrate([60, 40, 60]);
}
