/* Instellingen: hoeveel vragen de groep per ronde ziet, plus het instellingenpaneel
   (tandwiel rechtsboven) met schakelaars voor geluidseffecten, muziek en trillen.
   Alle keuzes worden onthouden in de browser. */
import { t } from "./i18n/index.js";
import { isSoundOn, setSoundOn } from "./show.js";
import { isMusicOn, setMusicOn } from "./music.js";
import { isVibrationOn, setVibrationOn, vibrate } from "./haptics.js";
import { unlockAudio } from "./audio.js";

export const MIN_COUNT = 2;
export const MAX_COUNT = 12;
export const DEFAULT_COUNT = 10;
const STORAGE_KEY = "idgame-count";

const $ = (id) => document.getElementById(id);
let count = DEFAULT_COUNT;

const isValid = (n) => Number.isInteger(n) && n >= MIN_COUNT && n <= MAX_COUNT;

/* ---------- aantal vragen ---------- */
export function loadSavedCount() {
  try {
    const saved = Number(localStorage.getItem(STORAGE_KEY));
    if (isValid(saved)) count = saved;
  } catch {
    /* Opslag niet beschikbaar: standaard gebruiken. */
  }
  return count;
}

export function getQuestionCount() {
  return count;
}

export function setQuestionCount(n) {
  n = Number(n);
  if (!isValid(n)) return;
  count = n;
  try {
    localStorage.setItem(STORAGE_KEY, String(n));
  } catch {
    /* Opslag geblokkeerd: keuze geldt alleen voor deze sessie. */
  }
  /* Alle schuifbalken (slide en paneel) tonen meteen de nieuwe keuze */
  document.querySelectorAll(".count-picker").forEach(syncPicker);
}

function syncPicker(picker) {
  const range = picker.querySelector(".count-range");
  if (!range) return;   /* paneel nog nooit geopend: nog geen balk getekend */
  range.value = String(count);
  range.setAttribute("aria-valuetext", t("countAria", { n: count }));
  range.style.setProperty("--f", String((count - MIN_COUNT) / (MAX_COUNT - MIN_COUNT)));
  const num = picker.querySelector(".count-value .num");
  if (num.textContent !== String(count)) {
    const changed = num.textContent !== "";
    num.textContent = String(count);
    if (changed) {   /* getal veert even op als je schuift */
      num.classList.remove("bump");
      void num.offsetWidth;
      num.classList.add("bump");
    }
  }
  picker.querySelectorAll(".count-ticks button").forEach((b) => {
    b.classList.toggle("on", Number(b.dataset.count) === count);
  });
}

/* Tekent een schuifbalk 2–12 met het gekozen getal (in een blokje, met "vragen" ernaast)
   erboven en de getallen eronder */
export function renderCountOptions(container) {
  container.textContent = "";

  const value = document.createElement("p");
  value.className = "count-value";
  value.setAttribute("aria-hidden", "true");
  const num = document.createElement("span");
  num.className = "num";
  const unit = document.createElement("span");
  unit.className = "unit";
  unit.textContent = t("questionsUnit");
  value.append(num, unit);

  const range = document.createElement("input");
  range.type = "range";
  range.className = "count-range";
  range.min = String(MIN_COUNT);
  range.max = String(MAX_COUNT);
  range.step = "1";
  range.setAttribute("aria-label", t("settingsCount"));
  range.addEventListener("input", () => setQuestionCount(range.value));

  /* Getallen onder de balk: ook aantikbaar */
  const ticks = document.createElement("div");
  ticks.className = "count-ticks";
  ticks.setAttribute("aria-hidden", "true");
  for (let n = MIN_COUNT; n <= MAX_COUNT; n++) {
    const b = document.createElement("button");
    b.type = "button";
    b.tabIndex = -1;
    b.dataset.count = String(n);
    b.textContent = String(n);
    b.addEventListener("click", () => setQuestionCount(n));
    ticks.appendChild(b);
  }

  container.append(value, range, ticks);
  syncPicker(container);
}

/* ---------- instellingenpaneel ---------- */
let returnFocus = null;

export function isSettingsOpen() {
  return !$("settings").hidden;
}

/* midRound: er loopt een ronde, dus een nieuw aantal geldt pas vanaf de volgende ronde */
export function openSettings({ midRound = false } = {}) {
  renderCountOptions($("settingsCountOptions"));
  $("settings-note").hidden = !midRound;
  returnFocus = document.activeElement;
  $("settings").hidden = false;
  document.addEventListener("keydown", onKey);
  $("settingsCountOptions").querySelector(".count-range").focus();
}

export function closeSettings() {
  if (!isSettingsOpen()) return;
  $("settings").hidden = true;
  document.removeEventListener("keydown", onKey);
  const back = returnFocus && document.contains(returnFocus) ? returnFocus : $("settingsBtn");
  back.focus();
  returnFocus = null;
}

/* Na een taalwissel: knoppen in het open paneel opnieuw vertalen */
export function refreshSettings() {
  if (isSettingsOpen()) renderCountOptions($("settingsCountOptions"));
}

/* Eenmalig koppelen: sluitknop, klik naast het paneel, Escape en focus binnen het paneel houden */
export function initSettings() {
  const overlay = $("settings");
  const sound = $("soundToggle");
  sound.checked = isSoundOn();
  sound.addEventListener("change", () => setSoundOn(sound.checked));
  const music = $("musicToggle");
  music.checked = isMusicOn();
  music.addEventListener("change", () => {
    unlockAudio();
    setMusicOn(music.checked);
  });
  const vib = $("vibrateToggle");
  vib.checked = isVibrationOn();
  vib.addEventListener("change", () => {
    setVibrationOn(vib.checked);
    if (vib.checked) vibrate([40]);   /* even voelen dat het aan staat */
  });
  $("settingsClose").addEventListener("click", () => closeSettings());
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) closeSettings();
  });
}

/* Toetsen terwijl het paneel open is (op document, zodat het ook werkt als de focus nergens staat) */
function onKey(event) {
  const overlay = $("settings");
  {
    if (event.key === "Escape") {
      event.preventDefault();
      closeSettings();
      return;
    }
    if (event.key !== "Tab") return;
    const items = [...overlay.querySelectorAll("select, input, button:not([tabindex=\"-1\"])")];
    const first = items[0];
    const last = items[items.length - 1];
    if (!overlay.contains(document.activeElement)) {
      event.preventDefault();
      (event.shiftKey ? last : first).focus();
    } else if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }
}
