/* Spelverloop: openingsscherm, uitleg, aantal vragen kiezen, rondes, vlaggen en onthulling.
   Elk scherm heeft één render-functie. Zo kan een taalwissel het huidige scherm
   opnieuw tekenen zonder dat de ronde, de vraag of de vlaggen verloren gaan. */
import { t, getSteps } from "./i18n/index.js";
import { setMode, resetTheme, getModeQuestions as getQuestions } from "./modes.js";
import { ART, STEP_THEMES, createFlag } from "./assets.js";
import { getQuestionCount, renderCountOptions } from "./settings.js";
import { playReveal, stopShow, nudge } from "./show.js";
import { playMusic, stopMusic } from "./music.js";

const SCREENS = ["s-home", "s-intro", "s-count", "s-hand", "s-secret", "s-guess", "s-reveal"];
const ROUND_SCREENS = ["s-hand", "s-secret", "s-guess", "s-reveal"];
const $ = (id) => document.getElementById(id);

let screen = "s-home";
let step = 0, round = 0, answer = 0;
let roundOrder = [];
let prevAnswer = null;      /* antwoord van de vorige ronde (vraagnummer) */
let pick = null;           /* de gevlagde vraag waarmee de groep onthulde */
let lastRevealed = null;    /* antwoord van de laatst onthulde (= echt gespeelde) ronde */
const used = new Set();    /* vragen die al getoond zijn (suggestie of antwoord) */
const marks = new Set();   /* wat de groep deze ronde onthoudt */

/* ---------- schermen en knoppen ---------- */
function show(id) {
  screen = id;
  hideLastAnswer();
  SCREENS.forEach((s) => { $(s).hidden = s !== id; });
  const st = $(id).querySelector(".stage");
  if (st) { st.style.animation = "none"; void st.offsetWidth; st.style.animation = ""; }
  window.scrollTo(0, 0);
}

/* Knoppenbalk onderaan: lijst van [tekst, css-klassen, actie] */
function setActions(list) {
  const bar = $("actions");
  bar.textContent = "";
  list.forEach(([text, cls, fn]) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = text;
    b.className = cls;
    b.addEventListener("click", () => fn());
    bar.appendChild(b);
  });
}

/* Bovenin: "Kies modus", "Spelregels 2 / 5" of "Ronde 3". Tijdens een ronde is de tag
   klikbaar en toont hij het antwoord van de vorige ronde. */
function setTag(text, isRound) {
  const tag = $("tag");
  tag.classList.toggle("is-round", isRound);
  tag.textContent = text;
  tag.disabled = !isRound;
  if (isRound) tag.title = t("prevAnswerHint");
  else tag.removeAttribute("title");
}

/* ---------- antwoord vorige ronde ---------- */
function fillLastAnswer() {
  $("lastAnswerText").textContent = prevAnswer === null ? t("prevAnswerNone") : getQuestions()[prevAnswer];
}

function hideLastAnswer() {
  $("lastAnswer").hidden = true;
  $("tag").setAttribute("aria-expanded", "false");
}

function toggleLastAnswer() {
  if (!ROUND_SCREENS.includes(screen) || screen === "s-secret") return;
  if (!$("lastAnswer").hidden) { hideLastAnswer(); return; }
  fillLastAnswer();
  $("lastAnswer").hidden = false;
  $("tag").setAttribute("aria-expanded", "true");
}

function setRoundTag() {
  setTag(`${t("roundLabel")} ${round}`, true);
}

/* ---------- openingsscherm ---------- */
function renderHome() {
  resetTheme();
  setTag(t("chooseMode"), false);
  setActions([]);
  show("s-home");
}

/* ---------- uitleg ---------- */
/* dir: 1 = vooruit, -1 = terug (de kaart schuift dan van die kant binnen), 0 = gewoon tonen */
function renderIntro(dir = 0) {
  const steps = getSteps();
  const [accent, soft] = STEP_THEMES[step];
  document.documentElement.style.setProperty("--step-accent", accent);
  document.documentElement.style.setProperty("--step-bg", soft);
  setTag(`${t("rulesLabel")} ${step + 1} / ${steps.length}`, false);

  $("art").innerHTML = ART[step];
  $("st-title").textContent = steps[step].title;
  $("st-body").textContent = steps[step].body;
  $("dots").innerHTML = steps.map((_, i) =>
    '<span class="dot' + (i === step ? " on" : "") + '"></span>').join("");

  const last = step === steps.length - 1;
  const acts = [[last ? t("start") : t("next"), "primary is-cobalt", nextStep]];
  if (step > 0) acts.push([t("back"), "quiet", prevStep]);
  else {
    acts.push([t("skip"), "plain", renderCount]);
    acts.push([t("backHome"), "plain", showHome]);
  }
  setActions(acts);
  show("s-intro");
  slideIn(dir);
}

function nextStep() {
  if (step < getSteps().length - 1) { step++; renderIntro(1); }
  else renderCount();
}

function prevStep() {
  if (step > 0) { step--; renderIntro(-1); }
}

const reducedMotion = () => window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function slideIn(dir) {
  const card = $("s-intro").querySelector(".intro-card");
  card.style.transition = "";
  card.style.transform = "";
  if (!dir || reducedMotion() || !card.animate) return;
  card.animate(
    [{ transform: `translateX(${dir * 70}px)`, opacity: 0 }, { transform: "none", opacity: 1 }],
    { duration: 280, easing: "cubic-bezier(.22,1,.36,1)" }
  );
}

/* Swipen door de spelregels: naar links = volgende, naar rechts = vorige.
   Alleen binnen de uitleg: op de eerste en laatste stap veert de kaart terug.
   Verder na de uitleg gaat alleen via de knop "Begin het spel". */
function initSwipe() {
  const card = $("s-intro").querySelector(".intro-card");
  const THRESHOLD = 60;
  let startX = 0, startY = 0, dx = 0, axis = null, pointer = null;

  card.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    pointer = e.pointerId;
    startX = e.clientX;
    startY = e.clientY;
    dx = 0;
    axis = null;
  });

  card.addEventListener("pointermove", (e) => {
    if (e.pointerId !== pointer) return;
    const mx = e.clientX - startX;
    const my = e.clientY - startY;
    if (axis === null && Math.hypot(mx, my) > 8) {
      axis = Math.abs(mx) > Math.abs(my) ? "x" : "y";
      if (axis === "x") {
        try { card.setPointerCapture(pointer); } catch { /* niet nodig */ }
      }
    }
    if (axis !== "x") return;
    const lastStep = getSteps().length - 1;
    const atEdge = (mx < 0 && step === lastStep) || (mx > 0 && step === 0);
    dx = atEdge ? mx * 0.2 : mx;   /* rand van de uitleg: alleen een beetje meegeven */
    card.style.transition = "none";
    card.style.transform = `translateX(${dx}px) rotate(${dx / 45}deg)`;
  });

  const end = (e) => {
    if (e.pointerId !== pointer) return;
    pointer = null;
    if (axis !== "x") return;
    const lastStep = getSteps().length - 1;
    if (dx < -THRESHOLD && step < lastStep) { step++; renderIntro(1); return; }
    if (dx > THRESHOLD && step > 0) { step--; renderIntro(-1); return; }
    card.style.transition = "transform .3s cubic-bezier(.34,1.56,.64,1)";
    card.style.transform = "";
  };
  card.addEventListener("pointerup", end);
  card.addEventListener("pointercancel", end);
}
initSwipe();

/* ---------- aantal vragen kiezen (na de spelregels) ---------- */
function renderCount() {
  setTag(t("setupLabel"), false);
  renderCountOptions($("countOptions"));
  setActions([
    [t("start"), "primary is-cobalt", startGame],
    [t("back"), "quiet", renderIntro]
  ]);
  show("s-count");
}

/* ---------- rondes ---------- */
/* Elke ronde worden zoveel vragen als ingesteld (standaard 10) willekeurig gekozen uit de
   vragen die nog NIET getoond zijn, als suggestie of als antwoord. Zo zie je geen enkele vraag
   twee keer totdat de pot op is (bijv. 100 vragen: 10 rondes van 10, of 20 rondes van 5).
   Daarna begint de pot opnieuw, zonder de vragen van de ronde die net gespeeld is.
   Het schudden is willekeurig, dus elk spel begint met andere vragen. */
function drawRound() {
  const WINDOW = getQuestionCount();
  const N = getQuestions().length;
  let pool = [];
  for (let i = 0; i < N; i++) {
    if (!used.has(i)) pool.push(i);
  }
  if (pool.length < WINDOW) {
    used.clear();
    const previous = new Set(roundOrder);
    pool = Array.from({ length: N }, (_, i) => i).filter((i) => !previous.has(i));
  }
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  roundOrder = pool.slice(0, WINDOW);
  answer = roundOrder[Math.floor(Math.random() * roundOrder.length)];
  roundOrder.forEach((i) => used.add(i));   /* alle getoonde vragen tellen als gebruikt */
}

function startGame() {
  round = 0;
  newRound();
}

function newRound() {
  prevAnswer = lastRevealed;
  pick = null;
  drawRound();
  round++;
  renderHand();
}

/* Overdracht: telefoon naar de legger */
function renderHand() {
  setRoundTag();
  setActions([[t("legger"), "primary is-cobalt", renderSecret]]);
  show("s-hand");
}

/* Geheime vraag, alleen voor de legger */
function renderSecret() {
  setRoundTag();
  $("tag").disabled = true;   /* legger ziet de geheime vraag: geen tweede vraag tonen */
  $("q").textContent = getQuestions()[answer];
  setActions([[t("placed"), "primary is-cobalt", toGuess]]);
  show("s-secret");
}

function toGuess() {
  marks.clear();
  renderGuess();
}

/* Raden: de groep zet vlaggen bij kansrijke vragen */
function renderGuess() {
  setRoundTag();
  paint($("list"), false);
  tally();
  setActions([[t("reveal"), "primary", tryReveal]]);
  show("s-guess");
}

/* Onthullen kan pas als er precies één vraag gevlagd is. Anders trilt de knop
   en verschijnt er een zinnetje boven de knop. */
function tryReveal() {
  if (marks.size !== 1) {
    showFlagWarning(marks.size === 0 ? t("flagNone") : t("flagOne"));
    nudge($("actions").querySelector("button"));
    return;
  }
  pick = [...marks][0];
  renderReveal();
  playReveal(pick === answer);
}

function showFlagWarning(text) {
  let warn = $("flagWarn");
  if (!warn) {
    warn = document.createElement("p");
    warn.id = "flagWarn";
    warn.className = "flag-warn";
    warn.setAttribute("role", "alert");
    $("actions").prepend(warn);
  }
  warn.textContent = text;
}

function hideFlagWarning() {
  const warn = $("flagWarn");
  if (warn) warn.remove();
  const btn = $("actions").querySelector("button.shake");
  if (btn) btn.classList.remove("shake");
}

/* Onthulling (de show zelf start in tryReveal, zodat een taalwissel hem niet herhaalt) */
function renderReveal() {
  setRoundTag();
  lastRevealed = answer;
  const correct = pick === answer;
  const tip = $("reveal-tip");
  tip.textContent = correct ? t("winSub") : t("revealTip");
  tip.classList.toggle("is-win", correct);
  paint($("list2"), true);
  setActions([
    [t("nextRound"), "primary is-cobalt", newRound],
    [t("rulesAgain"), "quiet", openRules],
    [t("backHome"), "plain", showHome]
  ]);
  show("s-reveal");
}

/* ---------- vragenlijst ---------- */
function questionText(i) {
  const span = document.createElement("span");
  span.className = "txt";
  span.textContent = getQuestions()[i];
  return span;
}

function paint(el, hit) {
  el.textContent = "";
  for (const i of roundOrder) {
    const li = document.createElement("li");
    if (hit) {
      li.className = (i === answer) ? (i === pick ? "hit picked" : "hit") : (i === pick ? "wrong" : "miss");
      const row = document.createElement("div");
      row.className = "still";
      row.append(createFlag(), questionText(i));
      li.appendChild(row);
    } else {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "row" + (marks.has(i) ? " on" : "");
      b.setAttribute("aria-pressed", marks.has(i) ? "true" : "false");
      b.append(createFlag(), questionText(i));
      b.addEventListener("click", () => {
        const on = !marks.has(i);
        if (on) marks.add(i); else marks.delete(i);
        b.classList.toggle("on", on);
        b.setAttribute("aria-pressed", on ? "true" : "false");
        tally();
      });
      li.appendChild(b);
    }
    el.appendChild(li);
  }
}

function tally() {
  const n = marks.size;
  if (n === 1) hideFlagWarning();
  $("tally").textContent = n === 0 ? ""
    : n === 1 ? t("tallyOne") : t("tallyMany", { n });
}

/* ---------- publiek ---------- */
export function showHome() {
  stopShow();
  stopMusic();
  renderHome();
}

/* Kiest een editie (laadt zo nodig de vragen) en start de uitleg. Een andere editie
   betekent een nieuwe vragenpot, dus de spelstand begint opnieuw. */
export async function startMode(id) {
  await setMode(id);
  playMusic(id);   /* achtergrondmuziek van deze editie (als muziek aan staat) */
  used.clear();
  marks.clear();
  roundOrder = [];
  prevAnswer = null;
  lastRevealed = null;
  pick = null;
  openRules();
}

export function openRules() {
  step = 0;
  renderIntro();
}

export function isInRound() {
  return ROUND_SCREENS.includes(screen);
}

export function onTagClick() {
  toggleLastAnswer();
}

const RENDERERS = {
  "s-home": renderHome,
  "s-intro": renderIntro,
  "s-count": renderCount,
  "s-hand": renderHand,
  "s-secret": renderSecret,
  "s-guess": renderGuess,
  "s-reveal": renderReveal
};

/* Tekent het huidige scherm opnieuw, bijvoorbeeld na een taalwissel. De spelstand blijft staan. */
export function rerender() {
  const answerOpen = !$("lastAnswer").hidden;
  RENDERERS[screen]();
  if (answerOpen) toggleLastAnswer();
}
