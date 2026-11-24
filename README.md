# ID Games

Een mobiele party-cardgame. Spelers leggen de ID-kaarten op volgorde en raden samen welke geheime vraag de legger heeft gebruikt.

## Starten

De scripts zijn ES-modules. Daarom werkt de app alleen via een (lokale) webserver: `index.html` dubbelklikken (`file://`) blokkeert de browser. Start bijvoorbeeld in deze map:

```bash
python3 -m http.server 8000
```

Open daarna `http://localhost:8000`. In VS Code kan ook de extensie Live Server.

## Structuur

- `index.html` — pagina-opbouw en semantische HTML
- `assets/css/styles.css` — alle stijlen en responsive regels
- `assets/js/main.js` — startpunt: taal laden, vaste knoppen koppelen, analytics laden
- `assets/js/game.js` — spelverloop: schermen, uitleg, aantal vragen kiezen, rondes, vlaggen, onthulling en antwoord vorige ronde (tik op "Ronde N")
- `assets/js/settings.js` — aantal vragen per ronde (schuifbalk 2–12, standaard 10, onthouden in de browser) en het instellingenpaneel (tandwiel)
- `assets/js/assets.js` — SVG-illustraties, kleurthema's per uitlegstap en het vlag-icoon
- `assets/js/analytics.js` — Google Tag Manager
- `assets/js/modes.js` — edities (Classic, Spicy, Work, Goofy): vragen laden en het kleurthema van de editie
- `assets/js/i18n/index.js` — taalbeheer: gekozen taal onthouden, vertalen, vaste teksten op de pagina
- `assets/js/i18n/<taal>.js` — schermteksten en spelregels per taal
- `assets/data/id-games-<editie>.json` — de vragen per editie (Nederlands, de bron)
- `assets/data/id-games-<editie>.<taal>.json` — vertaling van die vragen (en, de, es, fr, it, pt), gekoppeld via `nr`
- `assets/images/` — afbeeldingen voor toekomstige uitbreidingen

## Ondersteunde talen

Nederlands, Engels, Duits, Spaans, Frans, Italiaans en Portugees.

## Uitbreiden

Nieuwe stijlen kunnen in `assets/css/styles.css` komen. Spellogica hoort in `assets/js/game.js`.

Een nieuwe vraag zet je in `assets/data/id-games-<editie>.json` met een nieuw `nr`. Zet de vertaling met hetzelfde `nr` in de zes vertaalbestanden van die editie; zonder vertaling toont het spel de Nederlandse vraag. Nieuwe schermteksten krijgen een sleutel in alle 7 taalbestanden.
