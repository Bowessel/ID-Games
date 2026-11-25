/* Talen: bundelt alle taalbestanden (schermteksten) en beheert de gekozen taal.
   De vragen per editie en taal staan in assets/data/ en worden geladen door modes.js. */
import nl from "./nl.js";
import en from "./en.js";
import de from "./de.js";
import es from "./es.js";
import fr from "./fr.js";
import it from "./it.js";
import pt from "./pt.js";

export const DEFAULT_LANG = "nl";
const STORAGE_KEY = "idgame-lang";

const LANGUAGES = { nl, en, de, es, fr, it, pt };

let currentLang = DEFAULT_LANG;

export function isSupported(code) {
  return Object.prototype.hasOwnProperty.call(LANGUAGES, code);
}

export function getLang() {
  return currentLang;
}

/* Kiest een taal en onthoudt die; onbekende codes vallen terug op Nederlands. */
export function setLang(code) {
  currentLang = isSupported(code) ? code : DEFAULT_LANG;
  try {
    localStorage.setItem(STORAGE_KEY, currentLang);
  } catch {
    /* Opslag geblokkeerd (bijv. privévenster): de taal geldt dan alleen voor deze sessie. */
  }
  return currentLang;
}

/* Laadt de eerder gekozen taal, of Nederlands als er niets (geldigs) is opgeslagen. */
export function loadSavedLang() {
  let saved = null;
  try {
    saved = localStorage.getItem(STORAGE_KEY);
  } catch {
    /* Opslag niet beschikbaar: standaardtaal gebruiken. */
  }
  currentLang = isSupported(saved) ? saved : DEFAULT_LANG;
  return currentLang;
}

/* Vertaalde tekst ophalen; {naam} in de tekst wordt vervangen door values.naam. */
export function t(key, values = {}) {
  let text = LANGUAGES[currentLang][key] ?? LANGUAGES[DEFAULT_LANG][key] ?? key;
  for (const [name, value] of Object.entries(values)) {
    text = text.split(`{${name}}`).join(String(value));
  }
  return text;
}

export function getSteps() {
  return LANGUAGES[currentLang].steps;
}

/* Vaste teksten in index.html: element-id → vertaalsleutel */
const STATIC_TEXTS = {
  "home-label": "homeLabel",
  "home-title": "homeTitle",
  "home-sub": "homeSub",
  "pill-classic": "pillClassic",
  "pill-spicy": "pillSpicy",
  "pill-work": "pillWork",
  "pill-goofy": "pillGoofy",
  "desc-classic": "descClassic",
  "desc-spicy": "descSpicy",
  "desc-work": "descWork",
  "desc-goofy": "descGoofy",
  "hand-label": "handLabel",
  "hand-title": "handTitle",
  "hand-text": "handText",
  "secret-crest": "secretCrest",
  "secret-step-1": "secretStep1",
  "secret-step-2": "secretStep2",
  "secret-step-3": "secretStep3",
  "guess-label": "guessLabel",
  "guess-hint": "guessHint",
  "reveal-label": "revealLabel",
  "reveal-tip": "winSub",
  "reveal-hint": "revealHint",
  "count-title": "countTitle",
  "count-body": "countBody",
  "count-hint": "countHint",
  "lastAnswerLabel": "prevAnswerLabel",
  "settings-title": "settings",
  "settings-count-label": "settingsCount",
  "settings-note": "settingsNote",
  "settingsClose": "done",
  "settings-sound-label": "sound",
  "settings-music-label": "music",
  "settings-vibrate-label": "vibration",
  "settings-lang-label": "language"
};

/* Vertaalde attributen: element-id → { attribuut: vertaalsleutel } */
const STATIC_ATTRS = {
  settingsBtn: { "aria-label": "settings", title: "settings" }
};

/* Zet alle vaste teksten op de pagina (en de taalkeuze zelf) in de gekozen taal. */
export function applyTranslations() {
  document.documentElement.lang = currentLang;
  for (const [id, key] of Object.entries(STATIC_TEXTS)) {
    const el = document.getElementById(id);
    if (el) el.textContent = t(key);
  }
  for (const [id, attrs] of Object.entries(STATIC_ATTRS)) {
    const el = document.getElementById(id);
    if (!el) continue;
    for (const [attr, key] of Object.entries(attrs)) el.setAttribute(attr, t(key));
  }
  const select = document.getElementById("langSelect");
  if (select) select.value = currentLang;
}
