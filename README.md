# Filamentrechner

Druckkosten-Rechner für den 3D-Druck (FDM und Resin) mit Lagerbuch, Angeboten,
Aufträgen, Rechnungen und Lieferscheinen. Alle Daten bleiben auf dem eigenen
Gerät – die App kontaktiert von sich aus keinen Cloud-Dienst.

## Drei Wege, sie zu nutzen

**Im Browser** – läuft ohne Installation unter
<https://robstein1992.github.io/Filamentrechner/> und lässt sich auf dem
Startbildschirm ablegen. Die Daten liegen im Browserspeicher; zum Übertragen
auf ein anderes Gerät dient die Sicherungsdatei unter
⚙️ Firmen-Einstellungen → Daten & Geräte.

**Im Browser mit Geräte-Synchronisierung** – unter
⚙️ Firmen-Einstellungen → Daten & Geräte lassen sich alle Geräte auf denselben
Datenstand bringen. Auf Windows, Mac und Android schreibt die App dazu direkt
in eine Datei im Cloud-Ordner; für iPhone und iPad gibt es den verschlüsselten
Cloud-Tresor im eigenen Cloudflare-Worker
([`worker/README-sync.md`](worker/README-sync.md)).

**Als Desktop-App** – speichert jede Änderung sofort in eine Datei. Liegt diese
in einem Cloud-Ordner (iCloud Drive, OneDrive, Google Drive, Dropbox …),
synchronisieren sich alle Geräte automatisch. Einrichtung und Bau der
Installationsdateien: siehe [`desktop/README.md`](desktop/README.md).

## Optional: KI-Erkennung für Lieferscheine

Beim Wareneingang lassen sich Lieferschein-PDFs automatisch auslesen. Dafür
wird ein kleiner, selbst gehosteter Proxy benötigt, der den API-Key verwahrt –
er liegt nie im Browser der App. Einrichtung: [`worker/README.md`](worker/README.md).
