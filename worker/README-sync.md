# Cloud-Tresor einrichten (Synchronisierung für iPhone & iPad)

Damit alle Geräte denselben Datenstand haben – auch die, auf denen der Browser
keinen direkten Dateizugriff erlaubt. Die Daten liegen dabei in deinem eigenen
Cloudflare-Speicher.

**Der Server kann die Daten nicht lesen.** Ver- und entschlüsselt wird
ausschließlich im Browser deiner Geräte (AES-256-GCM, Schlüssel aus deinem
Zugangsschlüssel abgeleitet). Auf dem Worker liegt nur Geheimtext; der
Zugangsschlüssel selbst wird nie übertragen.

Kostenlos im Cloudflare-Gratis-Tarif (100.000 Aufrufe und 1 GB KV-Speicher pro
Tag) – für einen Betrieb mit ein paar Geräten weit mehr als genug.

## 1. Speicher anlegen

1. Auf [dash.cloudflare.com](https://dash.cloudflare.com) anmelden.
2. **Storage & Databases → KV → Create Instance**.
3. Namen vergeben, z. B. `druckrechner-sync`, und anlegen.

## 2. Worker anlegen

1. **Workers & Pages → Create → Create Worker**.
2. Namen vergeben, z. B. `druckrechner-sync`, und erstellen lassen.
3. Im Editor den kompletten Inhalt von `sync-worker.js` (in diesem Ordner)
   einfügen und **Deploy** klicken.

## 3. Speicher mit dem Worker verbinden

1. Im Worker: **Settings → Bindings → Add → KV Namespace**.
2. Variablenname: **`SYNC_KV`** (genau so geschrieben).
3. KV-Instanz: die aus Schritt 1.
4. Speichern und erneut deployen.

## 4. Erstes Gerät verbinden

1. Die App öffnen → ⚙️ **Firmen-Einstellungen → 💾 Daten & Geräte**.
2. Unter **Variante 2 · Cloud-Tresor** die Worker-Adresse eintragen
   (z. B. `https://druckrechner-sync.deinname.workers.dev`).
3. Auf **🔑 Schlüssel erzeugen** tippen – es erscheint ein zufälliger
   Zugangsschlüssel. Diesen Schlüssel **sicher notieren**: Er ist das Passwort
   für deine Daten, und ohne ihn lassen sie sich nicht mehr entschlüsseln.
4. Auf **🔄 Verbinden** tippen. Der aktuelle Stand dieses Geräts wandert damit
   in den Tresor.

## 5. Weitere Geräte verbinden

Nach dem Verbinden erscheint in den Einstellungen ein **Einrichtungs-Link**.
Diesen Link auf dem iPhone oder iPad öffnen (z. B. per Nachricht, Mail oder
Notiz an sich selbst) – dort sind Adresse und Schlüssel dann bereits
eingetragen und das Gerät übernimmt den Stand aus dem Tresor.

Der Link enthält deinen Zugangsschlüssel. Also nicht öffentlich posten und
nach dem Einrichten am besten wieder löschen.

Alternativ lassen sich Adresse und Schlüssel auf dem zweiten Gerät auch von
Hand eintragen.

## Wie der Abgleich läuft

- Jede Änderung wird nach kurzer Pause automatisch hochgeladen.
- Beim Öffnen der App wird geprüft, ob ein anderes Gerät etwas geändert hat;
  der neue Stand wird dann direkt übernommen.
- Während die App offen ist, wird ebenfalls regelmäßig geprüft. Hier lädt die
  App aber nicht von allein neu, sondern meldet sich unten im Fenster mit
  **Neu laden** – so geht nichts Eingetipptes verloren.
- Haben **beide** Seiten seit dem letzten Abgleich etwas geändert, überschreibt
  die App nichts von allein. Sie meldet sich unten im Fenster und du
  entscheidest: **Anderen Stand laden** oder **Meinen Stand behalten**.

Wie bei jeder Synchronisierung gilt: An zwei Geräten gleichzeitig zu arbeiten
führt zu genau dieser Rückfrage. Nacheinander arbeiten erspart sie.

## Optional: Worker auf die eigene Ablage beschränken

Wer die Worker-Adresse kennt, könnte ihn sonst als eigenen Speicher nutzen
(lesen kann er deine Daten trotzdem nicht). Das lässt sich abstellen:

1. In der App unter ⚙️ **Firmen-Einstellungen → Daten & Geräte** steht nach dem
   Verbinden die **Ablage-Kennung** – ein 64-stelliger Wert.
2. Im Worker unter **Settings → Variables** eine Variable **`SYNC_KEY_HASH`**
   mit genau diesem Wert anlegen und erneut deployen.

Danach akzeptiert der Worker nur noch genau diese eine Ablage.

## Zusätzliche Sicherungsdatei

Auf Geräten, deren Browser den direkten Dateizugriff beherrscht (Chrome/Edge
auf Windows, Mac, Linux, Android), erscheint nach dem Verbinden der Punkt
**Zusätzliche Sicherungsdatei**. Wählst du dort eine Datei in deinem
Cloud-Ordner, schreibt die App bei jedem Abgleich zusätzlich eine lesbare
Kopie dorthin. Diese Datei wird nur geschrieben, nie gelesen – der Tresor
bleibt die maßgebliche Quelle.

So hast du beides: denselben Stand auf allen Geräten inklusive iPhone und
iPad, und zugleich eine normale Datei im Cloud-Ordner, die du sichern,
kopieren oder im Notfall über **Sicherungsdatei laden** zurückspielen kannst.

## Die drei Varianten im Überblick

| | Geräte | Server nötig |
|---|---|---|
| **Cloud-Tresor** | alle, auch iPhone und iPad | eigener Worker |
| **Datei im Cloud-Ordner** (Einstellungen, Variante 1) | Chrome/Edge auf Windows, Mac, Linux, Android | nein |
| **Desktop-App** (`desktop/README.md`) | Windows, Mac, Linux als installiertes Programm | nein |

Pro Gerät ist immer genau eine Variante aktiv. Wichtig: Läuft der PC über die
Datei und das iPad über den Tresor, sind das **zwei getrennte Datenstände**.
Damit wirklich alle Geräte denselben Stand haben, richte überall den
Cloud-Tresor ein – und auf dem PC zusätzlich die Sicherungsdatei oben.
