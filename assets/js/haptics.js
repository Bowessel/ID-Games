/* Trillen bij een goed of fout antwoord (en bij "werkt niet"); uit te zetten in de instellingen.
   Android: navigator.vibrate. iPhone kent dat niet; daar geeft het aantikken van een verborgen
   iOS-schakelaar (<input switch>, iOS 18+) een korte haptische tik. Werkt het allebei niet,
   dan gebeurt er gewoon niets. */
const VIBRATE_KEY = "idgame-vibrate";
let vibrationOn = true;
try { vibrationOn = localStorage.getItem(VIBRATE_KEY) !== "off"; } catch { /* standaard aan */ }

export function isVibrationOn() { return vibrationOn; }
export function setVibrationOn(on) {
  vibrationOn = !!on;
  try { localStorage.setItem(VIBRATE_KEY, vibrationOn ? "on" : "off"); } catch { /* alleen deze sessie */ }
}

/* Eén haptische tik op iPhone */
function iosTick() {
  try {
    const label = document.createElement("label");
    label.setAttribute("aria-hidden", "true");
    label.style.display = "none";
    const input = document.createElement("input");
    input.type = "checkbox";
    input.setAttribute("switch", "");
    label.appendChild(input);
    document.head.appendChild(label);
    label.click();
    label.remove();
  } catch { /* niet ondersteund */ }
}

/* pattern: [tril, pauze, tril, ...] in ms, zoals navigator.vibrate */
export function vibrate(pattern) {
  if (!vibrationOn) return;
  const list = Array.isArray(pattern) ? pattern : [pattern];
  if (typeof navigator.vibrate === "function") {
    try { navigator.vibrate(list); } catch { /* niet ondersteund */ }
    return;
  }
  /* iPhone: elke tril wordt één of meer tikken (lange tril = snelle reeks tikken) */
  let at = 0;
  list.forEach((ms, i) => {
    if (i % 2 === 0) {
      const ticks = Math.max(1, Math.round(ms / 100));
      for (let k = 0; k < ticks; k++) {
        const when = at + k * 70;
        if (when === 0) iosTick(); else setTimeout(iosTick, when);
      }
    }
    at += ms;
  });
}
