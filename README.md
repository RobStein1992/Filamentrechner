# Filamentrechner

Druckkosten-Rechner für den 3D-Druck (FDM und Resin) mit Lagerbuch, Angeboten,
Aufträgen, Rechnungen und Lieferscheinen. Alle Daten bleiben auf dem eigenen
Gerät – die App kontaktiert von sich aus keinen Cloud-Dienst.

## Zwei Varianten

**Im Browser** – läuft ohne Installation unter
<https://robstein1992.github.io/Filamentrechner/> und lässt sich auf dem
Startbildschirm ablegen. Die Daten liegen im Browserspeicher; zum Übertragen
auf ein anderes Gerät dient die Sicherungsdatei unter
⚙️ Firmen-Einstellungen → Daten & Geräte.

**Als Desktop-App** – speichert jede Änderung sofort in eine Datei. Liegt diese
in einem Cloud-Ordner (iCloud Drive, OneDrive, Google Drive, Dropbox …),
synchronisieren sich alle Geräte automatisch. Einrichtung und Bau der
Installationsdateien: siehe [`desktop/README.md`](desktop/README.md).

## Optional: KI-Erkennung für Lieferscheine

Beim Wareneingang lassen sich Lieferschein-PDFs automatisch auslesen. Dafür
wird ein kleiner, selbst gehosteter Proxy benötigt, der den API-Key verwahrt –
er liegt nie im Browser der App. Einrichtung: [`worker/README.md`](worker/README.md).
