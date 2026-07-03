# 🇨🇭 NATI ON TOUR — WM 2026 Reise-App

Persönlicher WM-Reiseplaner rund um die Schweizer Nati. **Live:** https://ta-89.github.io/sommer2026/

Stand 03.07.2026: Die Schweiz hat Gruppe B gewonnen, Algerien im Sechzehntelfinale
2:0 geschlagen und spielt am **Di 07.07. um 13:00 (Ortszeit) das Achtelfinale in
Vancouver** (BC Place) gegen den Sieger Kolumbien–Ghana.

## Bereiche

- **✈️ Mein Trip** — das Dashboard:
  - Hero mit Live-Countdown zum nächsten Nati-Spiel (Gegner löst sich automatisch auf)
  - **Anreise**: Flüge ZRH→YVR für So 05.07. (frühester Abflug am Nachmittag) —
    Edelweiss nonstop (empfohlen), 1-Stopp-Alternativen, Condor ab FRA, Hinweis zu Friedrichshafen.
    Preise = geschätzte Last-Minute-Spannen mit Deeplinks zur Live-Prüfung.
  - **Weiterreise-Pfad**: Wenn die Nati gewinnt → Viertelfinale Kansas City (Sa 11.07.),
    Halbfinale Atlanta (Mi 15.07.), Finale New York (So 19.07.) — je mit Anschlussflug,
    Pacing ("ohne Stress"), 2 Ausflugtipps und "wer sonst noch hier spielt".
  - **🎉 Party-Button**: Falls die Nati verliert — datengetriebenes Ranking, in welcher
    WM-Stadt die grösste Party steigt (Fan-Power × Stadt-Vibe × Phase).
  - **🧭 Plan B**: aktiviert sich automatisch beim Ausscheiden — Costa Rica (SJO) +
    alle Städte mit verbleibenden Spielen inkl. Flugschätzung ab aktuellem Standort.
- **🏆 Turnierbaum** — komplettes Bracket; offene Slots zeigen alle möglichen Teams
  ("X oder Y gegen A oder B"), Penaltys werden ausgewiesen, Nati-Spiele leuchten rot.
  Manuelle Resultat-Eingabe möglich (Simulation), sobald beide Teams feststehen.
- **🗺️ Karte** — dunkle Karte mit *nur noch stattfindenden* Spielen pro Stadion;
  die rote animierte Route zeigt den möglichen Weg der Nati bis ins Finale.

## Selbst-aktualisierend

- **↻ Aktualisieren** holt neue Resultate von Wikipedia (K.o.-Runde + offene Gruppen)
  und rechnet alles neu: Gegner, Countdown, Reisepfad, Party-Ranking, Plan B.
- Scheidet die Nati aus, schaltet das Dashboard automatisch auf Plan B um; kommt sie
  weiter, rückt der Pfad automatisch eine Runde vor — bis zum Finale.

## Technik

Vanilla JS, kein Build-Tool. `data/fixtures.json` = kanonische Datenbasis
(alle 104 Spiele, Resultate mit Quelle), `data/fixtures.js` = generierter Wrapper
(`build-fixtures.ps1`, UTF-8!). `js/engine.js` löst das Bracket rekursiv auf
(inkl. Penaltys), `js/data.js` lädt/merged, `js/app.js` rendert die drei Views.
Karte: Leaflet + CARTO dark. Flaggen: flagcdn.com (Windows rendert keine Flaggen-Emojis).

Lokal testen: `index.html` öffnen oder Preview-Server (Port 8123).
