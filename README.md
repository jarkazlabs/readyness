# Readyness

Readyness ist eine Produktdemo für die dokumentierte Klärung eines Vorhabens vor dessen Umsetzung.

## Produktlogik

- Vorhaben haben einen Ersteller, eine hauptverantwortliche Person, eine Zielabteilung und Beteiligte.
- Inputs halten benötigte Informationen fest und werden bewusst über ein Bestätigungs-Popover abgeschlossen.
- Entscheidungen benötigen ein dokumentiertes Ergebnis.
- Alle Inputs und Entscheidungen zählen gleich zur Readyness.
- Jeder offene Punkt verhindert 100 Prozent Readyness.
- Die Funktion „Nächste Klärung“ motiviert zum Weiterarbeiten, ohne Readyness zu einem Aufgaben-Tool zu machen.
- Änderungen und Abschlüsse bleiben in der Historie nachvollziehbar.

## Demo

Die Demo simuliert Sascha Boss als Administrator. Administration, Abteilungen, Personen und Rollen sind lokal hinterlegt.

Die Daten werden ausschließlich im Browser über `localStorage` gespeichert.

## Tests

Die Kernlogik wird ohne zusätzliche Abhängigkeiten mit dem integrierten Node-Test-Runner geprüft:

```sh
npm test
```

Bei Pushes und Pull Requests führt GitHub Actions diese Tests ebenfalls aus.

## Lokal öffnen

`index.html` direkt im Browser öffnen.

Alternativ kann im Projektordner ein lokaler Webserver gestartet werden:

```sh
python3 -m http.server 4173
```

Anschließend `http://127.0.0.1:4173` öffnen.
