# Würfel-Coach – Zauberwürfel lösen lernen

Ein Löser und Trainer für den 3×3-Zauberwürfel, der die **Anfängermethode (Schicht für Schicht)** Schritt für Schritt erklärt:

1. Gänseblümchen
2. Weißes Kreuz
3. Weiße Ecken (erste Ebene)
4. Zweite Ebene
5. Gelbes Kreuz
6. Gelbe Kanten ausrichten
7. Gelbe Ecken an ihren Platz
8. Gelbe Ecken drehen

## Starten

`index.html` im Browser öffnen. Kein Server und keine Installation nötig, alles läuft offline.

## Funktionen

- **Erklär-Löser:** Würfel mischen oder den eigenen Würfel eingeben. Jeder Schritt wird mit Text erklärt. Der Stein, um den es gerade geht, leuchtet. Zug für Zug, schrittweise oder automatisch abspielen.
- **Trainer:** Man übt einen einzelnen Schritt, alles davor ist schon gelöst. Mit „Tipp“ sieht man den nächsten Schritt. Wird dabei ein früherer Schritt kaputt gemacht, weist der Tipp darauf hin.
- **Würfel eingeben:** Die Farben des echten Würfels im Netz abmalen. Die Eingabe wird geprüft (Farbanzahl, unmögliche Steine, nicht lösbare Lagen).
- **Anleitung:** Alle Schritte mit Beispielwürfeln zum Vorführen, auch für Sonderfälle wie gekippte Kanten, verdrehte Ecken oder Steine am falschen Platz, plus eine Hilfe-Tabelle „Steine liegen komisch“.
- **Notation:** Was R, U, F, R', U2, y … bedeuten, mit Animation.

Bedienung per Tastatur: `U D R L F B` drehen, mit Shift gegen den Uhrzeigersinn, `Y` dreht den ganzen Würfel. Im Löser gehen `←`/`→` einen Zug zurück bzw. vor, die Leertaste spielt ab.

## Aufbau

| Datei | Inhalt |
|---|---|
| `js/cube.js` | Würfelmodell (Steine, Züge, Netz-Umrechnung) |
| `js/solver.js` | Löser nach Anfängermethode mit Erklärtexten, Prüfungen, Eingabe-Validierung |
| `js/view3d.js` | 3D-Darstellung mit CSS-Transforms und Zug-Animation |
| `js/lessons.js` | Inhalte der Anleitung und Notation |
| `js/app.js` | Oberfläche |

## Tests

```
node tests/solver.test.js 5000
```

Löst 5000 zufällig gemischte Würfel und prüft, dass jedes Zwischenziel erreicht wird.
