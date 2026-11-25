/* Startpunt van de app (geladen door index.html): zet taal en instellingen, koppelt de
   vaste knoppen en laadt analytics. */
import { loadSavedLang, setLang, applyTranslations, t } from "./i18n/index.js";
import { showHome, startMode, rerender, isInRound, onTagClick } from "./game.js";
import { loadSavedCount, initSettings, openSettings, refreshSettings } from "./settings.js";
import { prepareLanguage } from "./modes.js";
import { unlockAudio } from "./audio.js";

const $ = (id) => document.getElementById(id);

loadSavedLang();
loadSavedCount();
applyTranslations();
initSettings();

/* Kopbalk: logo terug naar het overzicht, "Ronde N" toont het antwoord van de vorige ronde,
   taalkeuze vertaalt het huidige scherm, tandwiel opent de instellingen */
$("homeBtn").addEventListener("click", () => showHome());
$("tag").addEventListener("click", () => onTagClick());
$("langSelect").addEventListener("change", async (event) => {
  setLang(event.target.value);
  applyTranslations();
  await prepareLanguage();   /* vragen van de huidige editie in de nieuwe taal laden */
  rerender();
  refreshSettings();
});
$("settingsBtn").addEventListener("click", () => openSettings({ midRound: isInRound() }));

/* Openingsscherm: elke tegel kiest een editie (vragen + kleurthema) en start de uitleg */
let starting = false;
for (const id of ["classic", "spicy", "work", "goofy"]) {
  $(`btn-${id}`).addEventListener("click", async () => {
    if (starting) return;            /* dubbel tikken tijdens het laden negeren */
    starting = true;
    unlockAudio();                   /* nu, tijdens de tik: anders mag de muziek niet starten */
    try {
      await startMode(id);
    } catch (err) {
      console.error(err);
      window.alert(t("loadError"));
    } finally {
      starting = false;
    }
  });
}

showHome();

/* Analytics apart laden: als een adblocker analytics.js tegenhoudt, blijft het spel gewoon werken. */
import("./analytics.js").catch(() => {});
