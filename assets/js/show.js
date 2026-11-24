/* De onthulling als show: vuurwerk + confetti + fanfare bij een goed antwoord,
   grijze regenwolk + "wah-wah-wah" bij een fout antwoord. Tik om over te slaan.
   Geluid via Web Audio (geen bestanden nodig); uit te zetten in de instellingen. */
import { t } from "./i18n/index.js";

const SOUND_KEY = "idgame-sound";
let soundOn = true;
try { soundOn = localStorage.getItem(SOUND_KEY) !== "off"; } catch { /* standaard aan */ }

export function isSoundOn() { return soundOn; }
export function setSoundOn(on) {
  soundOn = !!on;
  try { localStorage.setItem(SOUND_KEY, soundOn ? "on" : "off"); } catch { /* alleen deze sessie */ }
}

const reducedMotion = () => window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const vibrate = (pattern) => { try { navigator.vibrate && navigator.vibrate(pattern); } catch { /* niet ondersteund */ } };

/* ---------- geluid ---------- */
let audio = null;
function ctx() {
  if (!soundOn) return null;
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === "suspended") audio.resume();
    return audio;
  } catch { return null; }
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

function pop(ac, start) {
  const len = Math.floor(ac.sampleRate * 0.25);
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
  const src = ac.createBufferSource(); src.buffer = buf;
  const g = ac.createGain(); g.gain.value = 0.35;
  const f = ac.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 1800;
  src.connect(f); f.connect(g); g.connect(ac.destination);
  src.start(ac.currentTime + start);
}

function playWinSound() {
  const ac = ctx(); if (!ac) return;
  /* Fanfare: C-E-G-C' en een gehouden akkoord, met knallen van het vuurwerk */
  [[523, 0], [659, 0.12], [784, 0.24], [1047, 0.38]].forEach(([f, s]) => tone(ac, { freq: f, start: s, dur: 0.22, type: "square", gain: 0.08 }));
  [523, 659, 784, 1047].forEach((f) => tone(ac, { freq: f, start: 0.55, dur: 1.1, type: "triangle", gain: 0.07 }));
  [0.5, 0.9, 1.25, 1.7, 2.1, 2.6].forEach((s) => pop(ac, s));
}

function playLoseSound() {
  const ac = ctx(); if (!ac) return;
  /* "Wah wah wah waaah": dalende trombone, laatste toon met vibrato */
  [[392, 0, 0.42], [370, 0.48, 0.42], [349, 0.96, 0.42]].forEach(([f, s, d]) => tone(ac, { freq: f, start: s, dur: d, type: "sawtooth", gain: 0.09, slideTo: f * 0.94 }));
  tone(ac, { freq: 330, start: 1.46, dur: 1.3, type: "sawtooth", gain: 0.1, slideTo: 262, vibrato: 9 });
}

/* ---------- vuurwerk (canvas) ---------- */
function themeColors() {
  const cs = getComputedStyle(document.documentElement);
  const vars = ["--cobalt", "--coral", "--amber", "--emerald", "--violet"].map((v) => cs.getPropertyValue(v).trim()).filter(Boolean);
  return vars.concat(["#FFD54A", "#FFFFFF", "#FF7AD9"]);
}

function runFireworks(canvas, duration) {
  const c = canvas.getContext("2d");
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const W = () => canvas.clientWidth, H = () => canvas.clientHeight;
  const resize = () => { canvas.width = W() * dpr; canvas.height = H() * dpr; c.setTransform(dpr, 0, 0, dpr, 0, 0); };
  resize();
  const colors = themeColors();
  const pick = () => colors[Math.floor(Math.random() * colors.length)];
  const rockets = [], sparks = [], confetti = [];
  const t0 = performance.now();
  let lastLaunch = 0, raf = 0, finale = false;
  /* opening: drie raketten tegelijk */
  const opening = () => { for (let i = 0; i < 3; i++) launch(); };

  const launch = () => {
    const x = W() * (0.15 + Math.random() * 0.7);
    rockets.push({ x, y: H() + 10, vx: (Math.random() - 0.5) * 1.5, vy: -(H() * 0.016 + Math.random() * 3), color: pick(), fuse: H() * (0.18 + Math.random() * 0.3) });
  };
  const explode = (r) => {
    const n = 100 + Math.floor(Math.random() * 60);
    const ring = Math.random() < 0.35;
    const color2 = pick();
    for (let i = 0; i < n; i++) {
      const a = (Math.PI * 2 * i) / n + Math.random() * 0.1;
      const sp = ring ? 5 : 1 + Math.random() * 6.5;
      sparks.push({ x: r.x, y: r.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1, decay: 0.010 + Math.random() * 0.012, color: i % 3 ? r.color : color2, size: 2 + Math.random() * 2.2 });
    }
  };
  for (let i = 0; i < 140; i++) {
    confetti.push({ x: Math.random() * W(), y: -Math.random() * H() * 1.2, vy: 1.6 + Math.random() * 2.4, vx: (Math.random() - 0.5) * 1.2, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 0.25, w: 6 + Math.random() * 6, h: 8 + Math.random() * 8, color: pick() });
  }

  return new Promise((resolve) => {
    const frame = (now) => {
      const el = now - t0;
      if (el < duration - 900 && now - lastLaunch > 230) { launch(); if (Math.random() < 0.6) launch(); lastLaunch = now; }
      /* finale: salvo vlak voor het einde */
      if (!finale && el > duration - 1700) { finale = true; for (let i = 0; i < 6; i++) launch(); }
      c.globalCompositeOperation = "source-over";
      c.clearRect(0, 0, W(), H());
      c.globalCompositeOperation = "lighter";
      for (let i = rockets.length - 1; i >= 0; i--) {
        const r = rockets[i];
        r.x += r.vx; r.y += r.vy; r.vy += 0.06;
        c.fillStyle = r.color; c.beginPath(); c.arc(r.x, r.y, 2.6, 0, Math.PI * 2); c.fill();
        c.fillStyle = "rgba(255,220,140,.6)"; c.beginPath(); c.arc(r.x, r.y + 6, 1.6, 0, Math.PI * 2); c.fill();
        if (r.y < r.fuse || r.vy > -1) { explode(r); rockets.splice(i, 1); }
      }
      for (let i = sparks.length - 1; i >= 0; i--) {
        const s = sparks[i];
        s.x += s.vx; s.y += s.vy; s.vx *= 0.985; s.vy = s.vy * 0.985 + 0.045; s.life -= s.decay;
        if (s.life <= 0) { sparks.splice(i, 1); continue; }
        c.globalAlpha = Math.max(0, s.life);
        c.fillStyle = s.color; c.beginPath(); c.arc(s.x, s.y, s.size, 0, Math.PI * 2); c.fill();
      }
      c.globalAlpha = 1;
      c.globalCompositeOperation = "source-over";
      for (const p of confetti) {
        p.x += p.vx + Math.sin((now + p.rot * 1000) / 600) * 0.6; p.y += p.vy; p.rot += p.vr;
        c.save(); c.translate(p.x, p.y); c.rotate(p.rot);
        c.fillStyle = p.color; c.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.rot * 2)));
        c.restore();
      }
      if (el < duration && !canvas.dataset.stop) raf = requestAnimationFrame(frame);
      else { cancelAnimationFrame(raf); resolve(); }
    };
    opening();
    raf = requestAnimationFrame(frame);
  });
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
    ? `<canvas class="show-canvas" aria-hidden="true"></canvas>
       <div class="show-card"><div class="show-burst" aria-hidden="true"></div>
         <p class="show-title"></p><p class="show-sub"></p></div>
       <p class="show-skip"></p>`
    : `<div class="show-cloud" aria-hidden="true">
         <svg viewBox="0 0 120 70"><path d="M30 60a20 20 0 0 1 2-40 26 26 0 0 1 49-6 18 18 0 0 1 9 46z" fill="#9AA0AC" stroke="#14171F" stroke-width="3" stroke-linejoin="round"/></svg>
         <div class="show-rain">${"<i></i>".repeat(14)}</div></div>
       <div class="show-card"><p class="show-title"></p><p class="show-sub"></p></div>
       <p class="show-skip"></p>`;
  layer.querySelector(".show-title").textContent = correct ? t("winTitle") : t("loseTitle");
  layer.querySelector(".show-sub").textContent = correct ? t("winSub") : t("loseSub");
  layer.querySelector(".show-skip").textContent = t("tapToContinue");
  document.body.appendChild(layer);
  document.documentElement.classList.toggle("is-sad", !correct);

  const duration = correct ? (calm ? 1800 : 4600) : (calm ? 1800 : 3400);
  if (correct) { playWinSound(); vibrate([80, 60, 80, 60, 260]); }
  else { playLoseSound(); vibrate([500]); }

  const done = new Promise((resolve) => {
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      layer.classList.add("show-out");
      document.documentElement.classList.remove("is-sad");
      const canvas = layer.querySelector("canvas");
      if (canvas) canvas.dataset.stop = "1";
      setTimeout(() => { layer.remove(); resolve(); }, 350);
      if (current && current.layer === layer) current = null;
    };
    current = { layer, finish };
    layer.addEventListener("click", finish);
    const timer = setTimeout(finish, duration);
    layer.addEventListener("click", () => clearTimeout(timer));
    const canvas = layer.querySelector("canvas");
    if (canvas && !calm) runFireworks(canvas, duration);
  });
  return done;
}

/* Stopt een lopende show (bijv. bij naar het overzicht gaan) */
export function stopShow() {
  if (current) current.finish();
}

/* "Werkt niet": knop laten trillen + korte tril van de telefoon */
export function nudge(el) {
  el.classList.remove("shake");
  void el.offsetWidth;
  el.classList.add("shake");
  vibrate([60, 40, 60]);
}
