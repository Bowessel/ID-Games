/* De onthulling als korte show, twee spiegelbeelden van elkaar:
   goed = lachende ster met dwarrelende confetti + "ta-da", fout = grijze regenwolk + "wah-wah-wah".
   Tik om over te slaan.
   Geluid via Web Audio (geen bestanden nodig); uit te zetten in de instellingen. */
import { t } from "./i18n/index.js";
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

/* ---------- geluid ---------- */
function ctx() {
  return soundOn ? getAudio() : null;
}

function tone(ac, { freq, start, dur, type = "triangle", gain = 0.18, slideTo = null, vibrato = 0 }) {
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, ac.currentTime + start);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, ac.currentTime + start + dur);
  if (vibrato) {
    const lfo = ac.createOscillator(); const lg = ac.createGain();
    lfo.frequency.value = 6; lg.gain.value = vibrato;
    lfo.connect(lg); lg.connect(o.frequency);
    lfo.start(ac.currentTime + start); lfo.stop(ac.currentTime + start + dur);
  }
  g.gain.setValueAtTime(0.0001, ac.currentTime + start);
  g.gain.exponentialRampToValueAtTime(gain, ac.currentTime + start + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + start + dur);
  o.connect(g); g.connect(ac.destination);
  o.start(ac.currentTime + start); o.stop(ac.currentTime + start + dur + 0.05);
}

function playWinSound() {
  const ac = ctx(); if (!ac) return;
  /* Kort "ta-da": C-E-G omhoog en een zacht gehouden akkoord */
  [[523, 0], [659, 0.1], [784, 0.2]].forEach(([f, s]) => tone(ac, { freq: f, start: s, dur: 0.2, type: "triangle", gain: 0.11 }));
  [523, 659, 784, 1047].forEach((f) => tone(ac, { freq: f, start: 0.32, dur: 0.9, type: "triangle", gain: 0.05 }));
}

function playLoseSound() {
  const ac = ctx(); if (!ac) return;
  /* "Wah wah wah waaah": dalende trombone, laatste toon met vibrato */
  [[392, 0, 0.42], [370, 0.48, 0.42], [349, 0.96, 0.42]].forEach(([f, s, d]) => tone(ac, { freq: f, start: s, dur: d, type: "sawtooth", gain: 0.09, slideTo: f * 0.94 }));
  tone(ac, { freq: 330, start: 1.46, dur: 1.3, type: "sawtooth", gain: 0.1, slideTo: 262, vibrato: 9 });
}

/* ---------- show ---------- */
let current = null;

/* Speelt de onthulling af. correct: goed geraden? Geeft een Promise die klaar is als de show stopt. */
export function playReveal(correct) {
  stopShow();
  const calm = reducedMotion();
  const layer = document.createElement("div");
  layer.className = `show ${correct ? "show-win" : "show-lose"}${calm ? " show-calm" : ""}`;
  layer.setAttribute("role", "status");
  layer.innerHTML = correct
    ? `<div class="show-sky" aria-hidden="true">
         <svg viewBox="0 0 120 110"><path class="star" d="M60 16 72.93 42.2 101.85 46.4 80.92 66.8 85.86 95.6 60 82 34.14 95.6 39.08 66.8 18.15 46.4 47.07 42.2Z" stroke="#14171F" stroke-width="3" stroke-linejoin="round"/>
           <circle cx="53" cy="58" r="2.6" fill="#14171F"/><circle cx="67" cy="58" r="2.6" fill="#14171F"/>
           <path d="M52 66q8 7 16 0" fill="none" stroke="#14171F" stroke-width="2.6" stroke-linecap="round"/></svg>
         <div class="show-drops show-confetti">${"<i></i>".repeat(14)}</div></div>
       <div class="show-card"><p class="show-title"></p><p class="show-sub"></p></div>
       <p class="show-skip"></p>`
    : `<div class="show-sky" aria-hidden="true">
         <svg viewBox="0 0 120 70"><path d="M30 60a20 20 0 0 1 2-40 26 26 0 0 1 49-6 18 18 0 0 1 9 46z" fill="#9AA0AC" stroke="#14171F" stroke-width="3" stroke-linejoin="round"/></svg>
         <div class="show-drops show-rain">${"<i></i>".repeat(14)}</div></div>
       <div class="show-card"><p class="show-title"></p><p class="show-sub"></p></div>
       <p class="show-skip"></p>`;
  layer.querySelector(".show-title").textContent = correct ? t("winTitle") : t("loseTitle");
  layer.querySelector(".show-sub").textContent = correct ? t("winSub") : t("loseSub");
  layer.querySelector(".show-skip").textContent = t("tapToContinue");
  document.body.appendChild(layer);
  document.documentElement.classList.toggle("is-sad", !correct);
  duckMusic(true);   /* muziek zachter tijdens de show */

  const duration = calm ? 1800 : 3400;
  if (correct) { playWinSound(); vibrate([80, 60, 80, 60, 260]); }
  else { playLoseSound(); vibrate([500]); }

  const done = new Promise((resolve) => {
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      layer.classList.add("show-out");
      document.documentElement.classList.remove("is-sad");
      duckMusic(false);
      setTimeout(() => { layer.remove(); resolve(); }, 350);
      if (current && current.layer === layer) current = null;
    };
    current = { layer, finish };
    layer.addEventListener("click", finish);
    const timer = setTimeout(finish, duration);
    layer.addEventListener("click", () => clearTimeout(timer));
  });
  return done;
}

/* Stopt een lopende show (bijv. bij naar het overzicht gaan) */
export function stopShow() {
  if (current) current.finish();
}

/* "Werkt niet": knop laten trillen + korte tril van de telefoon (als trillen aan staat) */
export function nudge(el) {
  el.classList.remove("shake");
  void el.offsetWidth;
  el.classList.add("shake");
  vibrate([60, 40, 60]);
}
