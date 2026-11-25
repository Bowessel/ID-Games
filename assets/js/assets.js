/* Beeldmateriaal: inline SVG-illustraties, kleurthema's en het vlag-icoon. */

/* Kleurrijke ID-kaart definitie voor de illustraties */
const CARD = '<defs><g id="idc">'
 + '<rect width="78" height="50" rx="8" fill="#FFFFFF" stroke="#14171F" stroke-width="2"/>'
 + '<rect x="9" y="10" width="20" height="30" rx="4" fill="#EFF6FF" stroke="#2563EB" stroke-width="1.6"/>'
 + '<circle cx="19" cy="21" r="4" fill="#2563EB"/>'
 + '<path d="M13 33c0-3 12-3 12 0" stroke="#2563EB" stroke-width="1.6" stroke-linecap="round" fill="none"/>'
 + '<path d="M36 16h32M36 25h23M36 34h28" stroke="#14171F" stroke-width="2" stroke-linecap="round"/>'
 + '</g></defs>';

/* Illustratie per uitlegstap, in dezelfde volgorde als `steps` in de taalbestanden */
export const ART = [
/* 1 ID's op tafel */
'<svg viewBox="0 0 260 160" aria-hidden="true">' + CARD
 + '<path d="M16 142h228" stroke="#14171F" stroke-width="2" stroke-linecap="round"/>'
 + '<use href="#idc" transform="translate(36 30) rotate(-10)"/>'
 + '<use href="#idc" transform="translate(132 22) rotate(7)"/>'
 + '<use href="#idc" transform="translate(28 76) rotate(5)"/>'
 + '<use href="#idc" transform="translate(130 82) rotate(-6)"/>'
 + '</svg>',
/* 2 geheime vraag */
'<svg viewBox="0 0 260 160" aria-hidden="true">'
 + '<rect x="70" y="10" width="64" height="98" rx="13" fill="#FF5A5F" stroke="#14171F" stroke-width="2.2"/>'
 + '<text x="102" y="73" text-anchor="middle" font-family="Fraunces,Georgia,serif" font-weight="700" font-size="44" fill="#FFFFFF">?</text>'
 + '<g fill="#FFFFFF" stroke="#14171F" stroke-width="1.8">'
 + '<circle cx="46" cy="133" r="13"/><circle cx="158" cy="133" r="13"/><circle cx="214" cy="133" r="13"/></g>'
 + '<circle cx="102" cy="133" r="14" fill="#F59E0B" stroke="#14171F" stroke-width="2"/>'
 + '<path d="M102 127v12M96 133h12" stroke="#14171F" stroke-width="2.2" stroke-linecap="round"/>'
 + '</svg>',
/* 3 volgorde leggen */
'<svg viewBox="0 0 260 180" aria-hidden="true">'
 + '<text x="130" y="13" text-anchor="middle" font-family="Plus Jakarta Sans,sans-serif" font-weight="800" font-size="9.5" letter-spacing="2" fill="#2563EB">MEEST</text>'
 + '<rect x="88" y="21" width="84" height="30" rx="7" fill="#2563EB" stroke="#14171F" stroke-width="2"/>'
 + '<rect x="88" y="57" width="84" height="30" rx="7" fill="#60A5FA" stroke="#14171F" stroke-width="2"/>'
 + '<rect x="88" y="93" width="84" height="30" rx="7" fill="#DBEAFE" stroke="#14171F" stroke-width="2"/>'
 + '<rect x="88" y="129" width="84" height="30" rx="7" fill="#FFFFFF" stroke="#14171F" stroke-width="2"/>'
 + '<path d="M101 36h24" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round"/>'
 + '<path d="M101 72h24" stroke="#14171F" stroke-width="2" stroke-linecap="round"/>'
 + '<path d="M101 108h24M101 144h24" stroke="#14171F" stroke-width="1.8" stroke-linecap="round"/>'
 + '<path d="M44 28v122" stroke="#14171F" stroke-width="2" stroke-linecap="round"/>'
 + '<path d="M44 150l-5-8M44 150l5-8" stroke="#14171F" stroke-width="2" stroke-linecap="round"/>'
 + '<text x="130" y="176" text-anchor="middle" font-family="Plus Jakarta Sans,sans-serif" font-weight="800" font-size="9.5" letter-spacing="2" fill="#525866">MINST</text>'
 + '</svg>',
/* 4 overleggen */
'<svg viewBox="0 0 260 160" aria-hidden="true">'
 + '<path d="M22 20h112a10 10 0 0110 10v34a10 10 0 01-10 10H60l-18 16V74H22a10 10 0 01-10-10V30a10 10 0 0110-10z" fill="#F59E0B" stroke="#14171F" stroke-width="2" stroke-linejoin="round"/>'
 + '<path d="M36 40h72M36 54h46" stroke="#14171F" stroke-width="2.2" stroke-linecap="round"/>'
 + '<path d="M238 76H142a10 10 0 00-10 10v30a10 10 0 0010 10h64l16 14v-14h16a10 10 0 0010-10V86a10 10 0 00-10-10z" fill="#FFFFFF" stroke="#14171F" stroke-width="2" stroke-linejoin="round"/>'
 + '<path d="M154 94h64M154 108h40" stroke="#7C3AED" stroke-width="2.2" stroke-linecap="round"/>'
 + '</svg>',
/* 5 onthulling */
'<svg viewBox="0 0 260 126" aria-hidden="true">'
 + '<rect x="28" y="12" width="204" height="26" rx="7" fill="#FFFFFF" stroke="#14171F" stroke-width="1.8"/>'
 + '<path d="M44 25h104" stroke="#8C93A3" stroke-width="2" stroke-linecap="round"/>'
 + '<rect x="28" y="47" width="204" height="32" rx="8" fill="#2563EB" stroke="#14171F" stroke-width="2.2"/>'
 + '<path d="M44 63h120" stroke="#FFFFFF" stroke-width="2.4" stroke-linecap="round"/>'
 + '<circle cx="206" cy="63" r="10" fill="#F59E0B" stroke="#14171F" stroke-width="1.8"/>'
 + '<path d="M201 63l3.5 3.5 6-6.5" stroke="#14171F" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>'
 + '<rect x="28" y="88" width="204" height="26" rx="7" fill="#FFFFFF" stroke="#14171F" stroke-width="1.8"/>'
 + '<path d="M44 101h88" stroke="#8C93A3" stroke-width="2" stroke-linecap="round"/>'
 + '</svg>'
];

/* Thema-accenten per uitlegstap: [accent, zachte achtergrond]. CSS-variabelen, zodat ze
   meekleuren met het thema van de gekozen editie (zie [data-mode] in styles.css). */
export const STEP_THEMES = [
  ["var(--cobalt)", "var(--cobalt-soft)"],   /* hoofdkleur van de editie */
  ["var(--rule2)", "var(--rule2-soft)"],     /* eigen kleur per editie, zie --rule2 in styles.css */
  ["var(--cobalt)", "var(--cobalt-soft)"],
  ["var(--rule4)", "var(--rule4-soft)"],
  ["var(--cobalt)", "var(--cobalt-soft)"]   /* laatste stap: weer de hoofdkleur van de editie */
];

/* Vlag-icoon voor de vragenlijst */
const FLAG = '<path class="pole" d="M3.1 2.3v15.4"/>'
          + '<path class="cloth" d="M3.1 3.3 13.8 6.8 3.1 10.3Z"/>';

export function createFlag() {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("class", "flag");
  svg.setAttribute("viewBox", "0 0 17 20");
  svg.setAttribute("aria-hidden", "true");
  svg.innerHTML = FLAG;
  return svg;
}
