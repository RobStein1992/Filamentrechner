# Daten auf iPhone und iPad synchronisieren

Eine Schritt-für-Schritt-Anleitung zum Mitmachen. Nach dieser Anleitung haben
PC, iPhone und iPad **denselben Datenstand**: Legst du am PC einen Auftrag an,
ist er kurz darauf auch auf dem iPad da – und umgekehrt.

**Du brauchst dafür:**

- etwa 15 Minuten
- deinen PC (dort fängst du an)
- eine E-Mail-Adresse für ein kostenloses Konto bei Cloudflare
- dein iPhone und/oder iPad

**Kosten:** keine. Das Gratis-Angebot von Cloudflare reicht für diesen Zweck
mit großem Abstand.

---

## Warum das überhaupt nötig ist

Die App speichert ihre Daten normalerweise nur in dem Browser, in dem du sie
benutzt. Jedes Gerät hat damit seinen eigenen Stand.

Auf dem PC könnte die App die Daten einfach in deinen iCloud- oder
OneDrive-Ordner schreiben. **Auf iPhone und iPad geht das nicht** – Safari
erlaubt Webseiten keinen Zugriff auf Dateien. Deshalb brauchen wir einen
kleinen eigenen Speicherplatz im Internet, über den sich alle Geräte
abgleichen. Dieser Speicherplatz heißt in der App **Cloud-Tresor**.

Wichtig vorweg: **Der Speicherplatz kann deine Daten nicht lesen.** Alles wird
schon auf deinem Gerät verschlüsselt und erst dann verschickt. Dort liegt nur
unlesbarer Zeichensalat. Den Schlüssel dazu hast ausschließlich du.

---

# Teil 1 · Den Speicher anlegen (einmalig, am PC)

Das ist der aufwendigste Teil – aber du machst ihn genau **einmal**.

## Schritt 1 · Konto bei Cloudflare anlegen

1. Öffne <https://dash.cloudflare.com/sign-up>.
2. E-Mail-Adresse und Passwort eingeben, Konto bestätigen.
3. Fertig – du landest im sogenannten Dashboard.

Es wird keine Kreditkarte verlangt.

## Schritt 2 · Den Speicher anlegen

1. Suche links im Menü den Punkt **Storage & Databases** und darunter **KV**.
2. Klicke auf **Create Instance** (oder **Create a namespace** – je nach
   Ansicht etwas anders benannt).
3. Als Namen eintragen: `druckrechner-sync`
4. Auf **Add** bzw. **Create** klicken.

> **"KV" ist nur Cloudflares Name für einen einfachen Datenspeicher.** Du musst
> dazu nichts weiter wissen – hier landen später deine verschlüsselten Daten.

## Schritt 3 · Das Programm anlegen, das den Speicher bedient

1. Links im Menü auf **Workers & Pages** klicken.
2. Auf **Create** klicken, dann auf **Create Worker**.
3. Als Namen eintragen: `druckrechner-sync`
4. Auf **Deploy** klicken.

Cloudflare legt jetzt ein Beispielprogramm an. Das ersetzen wir im nächsten
Schritt.

## Schritt 4 · Den richtigen Code einsetzen

1. Öffne in einem zweiten Browser-Tab diese Datei:
   <https://github.com/RobStein1992/Filamentrechner/blob/main/worker/sync-worker.js>
2. Klicke dort oben rechts auf das Kopier-Symbol (**Copy raw file**).
3. Zurück bei Cloudflare: auf **Edit code** klicken.
4. Im Editor **alles markieren** (Strg + A) und **löschen**.
5. Den kopierten Code einfügen (Strg + V).
6. Oben rechts auf **Deploy** klicken.

## Schritt 5 · Speicher und Programm verbinden

Das Programm muss noch wissen, wohin es die Daten legen soll.

1. Im Worker auf **Settings** klicken.
2. Den Bereich **Bindings** suchen, dann auf **Add** → **KV Namespace**.
3. Zwei Felder ausfüllen:
   - **Variable name:** `SYNC_KV` — genau so, groß geschrieben, mit Unterstrich
   - **KV namespace:** `druckrechner-sync` (den aus Schritt 2 auswählen)
4. Auf **Add binding** bzw. **Save** klicken.
5. Falls Cloudflare danach fragt: noch einmal **Deploy**.

> ⚠️ Der Variablenname muss **exakt** `SYNC_KV` lauten. Ein Tippfehler hier ist
> der häufigste Grund, warum es hinterher nicht klappt.

## Schritt 6 · Die Adresse notieren

Oben im Worker steht jetzt eine Internetadresse, ungefähr so:

```
https://druckrechner-sync.deinname.workers.dev
```

**Diese Adresse brauchst du gleich.** Kopiere sie oder lass den Tab offen.

✅ **Teil 1 geschafft.** Den Cloudflare-Bereich musst du ab jetzt nie wieder
anfassen.

---

# Teil 2 · Den PC verbinden

Jetzt verbinden wir das Gerät, auf dem deine **echten Daten** liegen. Das ist
wichtig: Dieses Gerät gibt den Anfangsstand vor, alle anderen übernehmen ihn
später.

1. Öffne die App: <https://robstein1992.github.io/Filamentrechner/>
2. Oben links auf **⚙️ Firmen-Einstellungen**.
3. Auf den Reiter **💾 Daten & Geräte**.
4. Dort findest du den Bereich **🔄 Geräte-Synchronisierung**, darin
   **Variante 2 · Cloud-Tresor**.
5. Bei **Adresse des Sync-Workers** die Adresse aus Schritt 6 eintragen.
6. Auf **🔑 Schlüssel erzeugen** klicken. Es erscheint etwas wie
   `FKXSY-FJAUU-5S7JD-TS4KV-L2AQR`.
7. **Diesen Schlüssel aufschreiben und sicher aufbewahren.** Er ist das
   Passwort zu deinen Daten. Geht er verloren, lassen sich die Daten im Tresor
   nicht mehr lesen – auch von niemandem sonst.
8. Auf **🔄 Verbinden** klicken.

Oben erscheint jetzt **🟢 Cloud-Tresor verbunden**. Dein aktueller Stand liegt
damit im Tresor.

---

# Teil 3 · iPhone und iPad verbinden

Hier kommt der bequeme Teil: Du musst auf dem iPhone **nichts abtippen**.

## Schritt 1 · Den Einrichtungs-Link holen (am PC)

In denselben Einstellungen steht jetzt ein Feld **Einrichtungs-Link für deine
weiteren Geräte**. Klicke darunter auf **📋 Link kopieren**.

## Schritt 2 · Den Link aufs iPhone bringen

Schick ihn dir selbst – egal wie:

- per **Nachrichten** an die eigene Nummer
- per **Mail** an dich selbst
- über eine geteilte **Notiz**
- oder per **AirDrop**, wenn beide Geräte nebeneinander liegen

> 🔒 Der Link enthält deinen Zugangsschlüssel. Also **nicht öffentlich posten**
> und die Nachricht hinterher am besten löschen.

## Schritt 3 · Den Link auf dem iPhone öffnen

1. Tippe auf den Link. Safari öffnet die App.
2. Es erscheint eine Rückfrage: *"Dieses Gerät mit dem Cloud-Tresor
   verbinden?"* → auf **OK** tippen.
3. Kurz warten. Die App lädt sich neu – und deine Aufträge, Angebote,
   Lieferscheine und Lagerdaten sind da.

Die Adresse in Safari wird dabei sofort bereinigt, dein Schlüssel steht also
nicht mehr in der Adresszeile.

> ⚠️ Falls auf dem iPhone bereits Daten in der App standen: Sie werden durch
> den Stand aus dem Tresor **ersetzt**. Deshalb immer mit dem Gerät anfangen,
> auf dem die richtigen Daten liegen (Teil 2).

## Schritt 4 · Dasselbe auf dem iPad

Genau derselbe Link, genau dieselben drei Schritte. Du kannst beliebig viele
Geräte so verbinden.

---

# Teil 4 · App auf den Home-Bildschirm legen

Damit sich die App auf dem iPhone wie ein normales Programm anfühlt:

1. Die App in Safari öffnen.
2. Unten auf das **Teilen-Symbol** tippen (Quadrat mit Pfeil nach oben).
3. **Zum Home-Bildschirm** wählen.
4. Namen bestätigen, auf **Hinzufügen** tippen.

Ab jetzt startest du sie über das Symbol auf dem Home-Bildschirm, ohne
Safari-Leiste.

---

# Die Probe aufs Exempel

Teste einmal, ob wirklich alles läuft:

1. **Am PC:** ⚙️ Firmen-Einstellungen → 💾 Daten & Geräte → ganz unten
   **🧪 Testauftrag anlegen**.
2. Ein paar Sekunden warten.
3. **Am iPhone:** die App öffnen (oder kurz zu einer anderen App wechseln und
   zurück).
4. Reiter **📋 Aufträge** → der Testauftrag steht dort.

Klappt das, ist alles richtig eingerichtet. Den Testauftrag kannst du danach
mit dem **✕** wieder entfernen.

---

# So arbeitest du ab jetzt

Du musst nichts weiter tun – der Abgleich läuft von allein:

- **Nach jeder Änderung** wird der neue Stand kurz darauf hochgeladen.
- **Beim Öffnen der App** wird der neueste Stand geholt.
- **Wenn du zur App zurückkehrst**, wird ebenfalls nachgeschaut.

Dabei lädt die App nie einfach ungefragt neu, während du mittendrin bist.
Stattdessen meldet sie sich unten am Bildschirmrand mit *"Auf einem anderen
Gerät wurde etwas geändert"* und einem Knopf **Neu laden**. So geht nichts
verloren, was du gerade eintippst.

## Wenn du an zwei Geräten gleichzeitig gearbeitet hast

Dann meldet sich die App mit *"Auf einem anderen Gerät wurde **ebenfalls** etwas
geändert"* und zwei Knöpfen:

| Knopf | Bedeutung |
|---|---|
| **Anderen Stand laden** | Du übernimmst, was das andere Gerät gemacht hat. Deine eigenen Änderungen auf diesem Gerät gehen verloren. |
| **Meinen Stand behalten** | Dein Stand auf diesem Gerät gewinnt und wird auf alle anderen übertragen. |

Die App entscheidet das **nie** von selbst. Am einfachsten vermeidest du die
Frage, indem du nacheinander arbeitest statt gleichzeitig.

## Ohne Internet

Die App funktioniert weiter, auch komplett offline. Deine Eingaben bleiben auf
dem Gerät und werden beim nächsten Mal mit Verbindung automatisch übertragen.
In den Einstellungen steht dann der Hinweis *"Keine Verbindung – die Änderungen
werden beim nächsten erfolgreichen Abgleich übertragen."*

---

# Wenn etwas nicht klappt

Die App schreibt den Grund immer im Klartext in die Einstellungen, direkt
unter die Knöpfe. Tippe dort auf **🔄 Jetzt abgleichen**, dann steht da, woran
es hakt.

| Was dort steht | Was zu tun ist |
|---|---|
| *"… KV-Speicher ist nicht gebunden (Binding "SYNC_KV" fehlt)"* | Teil 1, Schritt 5 wurde ausgelassen, oder der Variablenname ist falsch geschrieben. Er muss exakt `SYNC_KV` lauten. |
| *"Die Daten lassen sich nicht entschlüsseln – stimmt der Zugangsschlüssel?"* | Auf diesem Gerät steht ein anderer Schlüssel als im Tresor. Am einfachsten: **Trennen**, dann noch einmal den Einrichtungs-Link vom PC verwenden. |
| *"Keine Verbindung – Internet prüfen und die Adresse des Sync-Workers kontrollieren"* | Entweder ist gerade kein Netz da, oder die Adresse hat einen Tippfehler. Sie endet auf `.workers.dev`. |
| *"Server antwortet mit Status 403 …"* | Nur möglich, wenn im Worker die Variable `SYNC_KEY_HASH` gesetzt ist und nicht zum Schlüssel passt. Entweder die Variable löschen oder den passenden Wert eintragen. |
| Auf dem iPhone fehlen bei **Variante 1** die Knöpfe | Richtig so. Safari kann keine Dateien schreiben – auf iPhone und iPad ist nur der Cloud-Tresor möglich. |

---

# Noch ein paar Hinweise

**Zum Schlüssel.** Er ist das Einzige, was deine Daten schützt – und das
Einzige, womit sie sich wiederherstellen lassen. Bewahre ihn so auf wie ein
wichtiges Passwort, zum Beispiel im Passwort-Manager. Anders als bei einem
üblichen Online-Konto gibt es hier bewusst **keine** Funktion "Passwort
vergessen": Genau deshalb kann auch niemand anders an deine Daten.

**Der PC sollte denselben Weg nutzen.** In den Einstellungen gibt es auch
*Variante 1 · Datei im Cloud-Ordner*. Das ist eine Alternative für den PC
allein. Nutzt der PC die Datei und das iPad den Tresor, hast du **zwei
getrennte Datenstände**. Damit alle Geräte zusammenpassen: überall den
Cloud-Tresor.

**Zusätzliche Sicherung.** Am PC erscheint nach dem Verbinden der Punkt
*Zusätzliche Sicherungsdatei*. Wählst du dort eine Datei in deinem iCloud- oder
OneDrive-Ordner, schreibt die App bei jedem Abgleich zusätzlich eine lesbare
Kopie dorthin. Empfehlenswert – dann hast du den Abgleich **und** eine
gewöhnliche Sicherungsdatei.

**Ein Gerät wieder abmelden.** ⚙️ Firmen-Einstellungen → 💾 Daten & Geräte →
**Trennen**. Die Daten bleiben auf dem Gerät erhalten, es gleicht sich nur
nicht mehr ab.

---

*Technische Fassung dieser Anleitung – mit allen Hintergründen zur
Verschlüsselung und zur optionalen Absicherung des Workers:*
[`worker/README-sync.md`](worker/README-sync.md)
