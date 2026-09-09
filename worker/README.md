# Lieferschein-Proxy einrichten

Dieser kleine Cloudflare Worker nimmt einen Lieferschein (PDF) von der App entgegen,
schickt ihn an die Claude-API (Anthropic) zur automatischen Datenerkennung und gibt
das Ergebnis zurück. Der Anthropic-API-Key liegt dabei **nur auf dem Worker**, nie im
Browser der App.

Kostenlos möglich über den Cloudflare-Workers-Gratis-Tarif (100.000 Aufrufe/Tag).
Kosten entstehen nur bei Anthropic pro tatsächlich analysiertem Lieferschein.

## 1. Anthropic-API-Key besorgen

1. Auf [console.anthropic.com](https://console.anthropic.com) registrieren/anmelden.
2. Unter **API Keys** einen neuen Key erstellen und Guthaben hinterlegen (Pay-as-you-go).
3. Den Key (beginnt mit `sk-ant-...`) sicher notieren – wird gleich als Worker-Secret
   eingetragen, nicht in Code oder App.

## 2. Cloudflare Worker anlegen

1. Auf [dash.cloudflare.com](https://dash.cloudflare.com) registrieren/anmelden
   (kostenloses Konto reicht).
2. **Workers & Pages → Create → Create Worker**.
3. Einen Namen vergeben (z. B. `lieferschein-proxy`) und erstellen lassen.
4. Im Worker-Editor den kompletten Inhalt von `lieferschein-worker.js` (in diesem
   Ordner) einfügen und **Deploy** klicken.

## 3. API-Key als Secret hinterlegen

1. Im Worker: **Settings → Variables and Secrets**.
2. Neue Variable hinzufügen:
   - Name: `ANTHROPIC_API_KEY`
   - Wert: der Key aus Schritt 1
   - Typ: **Secret** (verschlüsselt, nicht im Klartext einsehbar)
3. Speichern – der Worker lädt das Secret automatisch beim nächsten Aufruf.

Optional: Über eine weitere Variable `ANTHROPIC_MODEL` lässt sich das verwendete
Modell ändern (Standard: `claude-sonnet-5`). Für geringere Kosten pro Scan eignet
sich z. B. `claude-haiku-4-5-20251001` – bei sehr unübersichtlichen Lieferscheinen
liefert das größere Modell tendenziell zuverlässigere Ergebnisse.

## 4. Worker-URL in der App eintragen

1. Nach dem Deploy zeigt Cloudflare die Worker-Adresse an, z. B.
   `https://lieferschein-proxy.deinname.workers.dev`.
2. In der App: ⚙️ **Firmen-Einstellungen → Daten & Geräte → KI-Lieferschein-Erkennung**
   → diese Adresse eintragen und speichern.

Damit ist die Funktion einsatzbereit: Beim Wareneingang lässt sich jetzt ein
Lieferschein-PDF hochladen, dessen Positionen automatisch vorausgefüllt werden.

## Sicherheitshinweis

Der Worker akzeptiert Anfragen standardmäßig von jeder Webseite (offene CORS-Regel),
da die App als statische Seite ohne festen Origin läuft (GitHub Pages, ggf. eigene
Domain). Der Worker selbst verlangt keine Anmeldung – wer die Worker-URL kennt, kann
sie nutzen und verursacht dadurch Kosten auf eurem Anthropic-Konto. Wer das
einschränken möchte, kann in `lieferschein-worker.js` bei `corsHeaders()` den
Origin fest auf die eigene App-Adresse setzen und/oder einen einfachen
Zugriffs-Token prüfen, den die App per Header mitschickt.
