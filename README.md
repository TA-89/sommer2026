# WM 2026 — Reise- & Stadien-App

Reise-/Stadion-Planer für die Fussball-WM 2026 (USA · Kanada · Mexiko). Fokus:
Schweiz & europäische Teams, Stadion-Belegungs-Timelines und ein **„Schweiz raus"**-Modus,
der pro Tag das attraktivste erreichbare Spiel vorschlägt.

## Starten

**Variante A — einfach (Doppelklick):**
`index.html` im Browser öffnen. Lädt die Daten aus `data/fixtures.js` (file://-tauglich).

**Variante B — lokaler Server (empfohlen, aktiviert auch fetch/Merge ohne Einschränkung):**
```
cd "Sommer2026"
python -m http.server 8000
# dann http://localhost:8000 öffnen
```

## Funktionen

- **Karte** — 16 Stadien (Leaflet + OpenStreetMap; fällt offline auf eine SVG-Projektion zurück).
  Klick auf ein Stadion öffnet die **Belegungs-Timeline** (alle Spiele am Ort, Gruppe + K.o.).
- **Stadien** — Kachelübersicht mit „Was läuft hier"-Label und Europa-Bezug.
- **Gruppen** — Live-Tabellen mit FIFA-Tiebreakern + Rangliste der Gruppendritten.
- **K.o.** — Bracket mit rekursiver Platzhalter-Auflösung (1B / 2A / beste Dritte / Wnn / Lnn).
  Unaufgelöstes ist als **projiziert/offen** gekennzeichnet — es wird nie geraten.
- **Schweiz raus** (Schalter oben) — blendet die Nati-Hervorhebung aus und zeigt den Tab
  **Tagesvorschläge**: pro Tag im Reisefenster das bestbewertete Spiel
  (Team-Priorität · Turnierphase · Direktflug-Nähe ab Standort) inkl. Flug-Deeplink.
- **↻ Resultate** — Merge: aktualisiert Resultate aus den Wikipedia-Gruppenartikeln
  (nur Spiele mit Datum ≤ heute, plausibel; Seed/venue bleiben unangetastet; Quelle wird mitgespeichert).
  Manuelle Ergebnisse lassen sich in jeder Spielzeile eintragen (in `localStorage` gespeichert).

## Datenmodell

- `data/fixtures.json` — **kanonische Quelle** (Seed). Aufbau im `_readme`-Block der Datei.
- `data/fixtures.js` — automatisch generierter Browser-Wrapper (`window.FIXTURES`).
  Nach Änderungen an der JSON neu erzeugen:
  ```
  powershell -ExecutionPolicy Bypass -File build-fixtures.ps1
  ```

## Code

| Datei            | Aufgabe |
|------------------|---------|
| `js/data.js`     | Laden, lokale Overrides (Quelle+Zeit), Wikipedia-Merge |
| `js/engine.js`   | Gruppentabellen, Tiebreaker, Dritten-Matrix, Platzhalter-Auflösung |
| `js/app.js`      | UI: Karte, Timelines, Gruppen/K.o., Schweiz-raus-Vorschläge |
| `css/style.css`  | Styling |

Stand der Seed-Resultate: siehe `_readme.seedMeta.asOf` in `fixtures.json`.
