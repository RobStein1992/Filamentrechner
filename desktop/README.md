# Desktop-Variante mit automatischer Sicherung

Dieselbe App wie im Browser, nur als eigenständiges Programm für Windows, macOS
und Linux. Der Unterschied: Statt im Browserspeicher liegen alle Daten in einer
Datei `druckrechner-daten.json`, die bei **jeder Änderung sofort geschrieben**
wird.

Liegt diese Datei in einem Ordner, den ein Cloud-Client ohnehin synchronisiert
(iCloud Drive über „iCloud für Windows", OneDrive, Google Drive, Dropbox …),
landen die Daten automatisch auf allen Geräten – ohne Anmeldung in der App und
ohne dass die App selbst einen Cloud-Dienst kontaktiert. Das manuelle
Sichern/Laden aus der Browser-Version entfällt damit.

## Voraussetzungen

[Node.js](https://nodejs.org) (Version 18 oder neuer). Mehr wird nicht
gebraucht, alles Weitere installiert `npm`.

## Starten

Im Hauptordner des Projekts (nicht in diesem Unterordner):

```bash
npm install     # einmalig
npm start
```

## Installationsdatei bauen

```bash
npm run dist:win     # Windows-Installer (.exe)
npm run dist:mac     # macOS-Image (.dmg)
npm run dist:linux   # Linux-AppImage
```

Das Ergebnis liegt danach im Ordner `dist/`. Gebaut werden kann jeweils nur auf
dem passenden Betriebssystem – eine Windows-Datei entsteht also auf einem
Windows-Rechner, eine macOS-Datei auf einem Mac.

## Speicherort einrichten

1. In der App oben rechts **⚙️ Firmen-Einstellungen** öffnen.
2. Auf den Reiter **💾 Daten & Geräte** wechseln.
3. Unter **Speicherort (Desktop-App)** auf **📁 Speicherort wählen …** klicken
   und einen Ordner innerhalb deines Cloud-Ordners auswählen.

Ab dann schreibt die App jede Änderung direkt dorthin. **📂 Ordner öffnen**
zeigt den Ordner im Explorer bzw. Finder.

### Zweites Gerät anschließen

Auf dem zweiten Rechner dieselbe App installieren und dort denselben
(synchronisierten) Ordner auswählen. Die App erkennt die vorhandene Datei,
übernimmt deren Stand und meldet „Vorhandene Daten aus diesem Ordner
übernommen". Die lokale Kopie des zweiten Geräts wird dabei verworfen, damit
nicht zwei Stände nebeneinander stehen.

### Wenn ein anderes Gerät etwas ändert

Die App beobachtet die Datei. Ändert ein anderes Gerät sie über die Cloud,
erscheint unten im Fenster der Hinweis „Die Daten wurden auf einem anderen
Gerät geändert" mit einem Knopf **Neu laden**. Erst dieser Klick übernimmt den
fremden Stand – nichts wird stillschweigend überschrieben.

Wie bei jedem Ordner-Sync gilt trotzdem: Zwei Geräte **gleichzeitig** am selben
Datenbestand arbeiten zu lassen ist keine gute Idee. Der Cloud-Client entscheidet
dann, welche Fassung gewinnt, und legt die andere je nach Anbieter als
Konfliktkopie daneben. Nacheinander arbeiten ist der sichere Weg.

## Wie die Datei geschrieben wird

Die App schreibt zuerst in `druckrechner-daten.json.tmp` und benennt die Datei
anschließend um. Dadurch bleibt die eigentliche Datei auch dann vollständig,
wenn der Rechner mitten im Speichern ausgeht oder der Cloud-Client gleichzeitig
zugreift. Ein halb geschriebener Stand kann also nicht entstehen.

Zusätzlich lässt sich unter **💾 Zusätzliche Sicherungsdatei** jederzeit ein
Schnappschuss des kompletten Datenbestands ablegen – praktisch als
Versionsstand vor größeren Änderungen.

## Offline

Die App funktioniert ohne Internetverbindung. Zwei Dinge werden beim Start aus
dem Netz geladen und stehen offline nicht zur Verfügung:

- die Schriftarten (es wird dann eine Systemschrift verwendet),
- die Bibliotheken für **Barcode-Etiketten** und den **QR-Scanner** im
  Lagerbereich. Beides meldet sich in dem Fall mit einem Hinweis, statt einen
  Fehler zu erzeugen; alles Übrige – Kalkulation, Aufträge, Lieferscheine,
  Lagerbuch, Drucken – läuft normal weiter.

## Verhältnis zur Browser-Version

Die Dateien `index.html`, `style.css` und die Symbole werden von beiden
Varianten gemeinsam genutzt; die Desktop-Variante besteht nur aus
`desktop/main.js` (Programmfenster und Dateispeicher) und `desktop/preload.js`
(Brücke zur App). Die Browser-Version unter GitHub Pages bleibt davon
unberührt und speichert weiterhin lokal im Browser.
