/* Eén gedeelde Web Audio-context voor geluidseffecten (show.js) en achtergrondmuziek (music.js).
   Browsers starten geluid pas na een tik van de gebruiker; roep unlockAudio() daarom aan
   binnen een klik-handler, vóór een eventuele await. */
let ac = null;

export function getAudio() {
  try {
    ac = ac || new (window.AudioContext || window.webkitAudioContext)();
    if (ac.state !== "running" && !document.hidden) ac.resume();
    return ac;
  } catch {
    return null;
  }
}

export function unlockAudio() {
  getAudio();
}

/* App op de achtergrond of scherm uit: alles stil. Terug: weer verder. */
document.addEventListener("visibilitychange", () => {
  if (!ac) return;
  if (document.hidden) ac.suspend();
  else ac.resume();
});

/* iPhone kan de context onderbreken (bijv. na een telefoontje): de volgende tik hervat hem. */
document.addEventListener("pointerdown", () => {
  if (ac && ac.state !== "running" && !document.hidden) ac.resume();
}, true);
