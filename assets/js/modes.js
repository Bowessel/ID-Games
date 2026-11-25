/* Edities (Classic, Spicy, Work, Goofy): welke vragen er gespeeld worden en welk kleurthema
   de hele app krijgt.
   Vragen: assets/data/id-games-<editie>.json is de (Nederlandse) bron. De vertalingen staan in
   assets/data/id-games-<editie>.<taal>.json en worden gekoppeld via "nr". Ontbreekt een
   vertaling, dan toont het spel voor die vraag de Nederlandse tekst. */
import { getLang } from "./i18n/index.js";

export const MODES = ["classic", "spicy", "work", "goofy"];

/* Kleur van de adresbalk op telefoons, passend bij het thema in styles.css */
const THEME_COLORS = { home: "#FAF7F2", classic: "#F2F6FD", spicy: "#FFF5F3", work: "#F7F1EA", goofy: "#FBF7FF" };

let mode = "classic";
const sources = {};       /* editie → [{ nr, tekst }] (Nederlands) */
const translations = {};  /* "editie.taal" → Map(nr → vertaalde tekst) */
const cache = {};         /* "editie.taal" → lijst met vragen in die taal */

export function getMode() {
  return mode;
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} niet gevonden (${res.status})`);
  return res.json();
}

/* Nederlandse bron van een editie (eenmalig laden) */
async function loadSource(id) {
  if (sources[id]) return;
  const data = await fetchJson(`assets/data/id-games-${id}.json`);
  const list = (data.vragen || [])
    .map((v) => ({ nr: v.nr, tekst: String(v.tekst || "").trim() }))
    .filter((v) => v.tekst);
  if (list.length < 12) throw new Error(`Te weinig vragen in ${id}`);
  sources[id] = list;
}

/* Vertaling van een editie (eenmalig laden). Mislukt dat, dan blijven de vragen Nederlands. */
async function loadTranslation(id, lang) {
  const key = `${id}.${lang}`;
  if (lang === "nl" || translations[key]) return;
  try {
    const data = await fetchJson(`assets/data/id-games-${id}.${lang}.json`);
    translations[key] = new Map((data.vragen || []).map((v) => [v.nr, String(v.tekst || "").trim()]));
  } catch (err) {
    console.warn(err);
    translations[key] = new Map();
  }
  delete cache[key];
}

/* Kiest een editie: laadt de vragen (+ vertaling) en zet het thema. Gooit een fout als de
   Nederlandse bron niet geladen kan worden. */
export async function setMode(id) {
  if (!MODES.includes(id)) id = "classic";
  await loadSource(id);
  await loadTranslation(id, getLang());
  mode = id;
  applyTheme();
  return mode;
}

/* Na een taalwissel: vertaling van de huidige editie klaarzetten */
export async function prepareLanguage() {
  if (sources[mode]) await loadTranslation(mode, getLang());
}

/* De vragen van de huidige editie in de huidige taal, in vaste volgorde (index = vraag) */
export function getModeQuestions() {
  const lang = getLang();
  const key = `${mode}.${lang}`;
  if (!cache[key]) {
    const src = sources[mode] || [];
    const map = translations[key];
    cache[key] = src.map((v) => (map && map.get(v.nr)) || v.tekst);
  }
  return cache[key];
}

/* Thema van de gekozen editie op de hele pagina (zie [data-mode] in styles.css) */
export function applyTheme(id = mode) {
  document.documentElement.dataset.mode = id;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", THEME_COLORS[id]);
}

/* Terug naar het overzicht: neutraal crème thema (geen editie gekozen) */
export function resetTheme() {
  applyTheme("home");
}
