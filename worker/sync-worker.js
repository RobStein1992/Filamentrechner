/**
 * Cloudflare Worker: Cloud-Tresor für die Druckkosten-Rechner-App.
 *
 * Nimmt ein verschlüsseltes Datenpaket entgegen und gibt es wieder heraus.
 * Der Worker kann den Inhalt nicht lesen: Ver- und entschlüsselt wird
 * ausschließlich im Browser der App (AES-GCM, Schlüssel aus dem
 * Zugangsschlüssel abgeleitet). Hier liegt nur der Geheimtext.
 *
 * Adressiert wird über die Ablage-Kennung – den SHA-256-Wert des
 * Zugangsschlüssels. Der Schlüssel selbst verlässt das Gerät nie.
 *
 * Einrichtung: siehe README-sync.md in diesem Ordner.
 */

const MAX_BODY_BYTES = 4 * 1024 * 1024;   // 4 MB reichen für sehr viele Aufträge
const SPACE_ID_PATTERN = /^[0-9a-f]{64}$/;

function corsHeaders(origin){
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400'
  };
}

function jsonResponse(body, status, origin){
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      ...corsHeaders(origin)
    }
  });
}

export default {
  async fetch(request, env){
    const origin = request.headers.get('Origin') || '*';

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }

    if (!env.SYNC_KV) {
      return jsonResponse({ error: 'KV-Speicher ist nicht gebunden (Binding "SYNC_KV" fehlt).' }, 500, origin);
    }

    const url = new URL(request.url);
    const spaceId = url.pathname.replace(/^\/+/, '').replace(/\/+$/, '');

    if (!SPACE_ID_PATTERN.test(spaceId)) {
      return jsonResponse({ error: 'Ungültige Ablage-Kennung.' }, 400, origin);
    }

    // Optional: Wenn SYNC_KEY_HASH gesetzt ist, akzeptiert der Worker nur
    // genau diese eine Ablage. Damit kann niemand Fremdes den Worker als
    // eigenen Speicher missbrauchen, selbst wenn die Adresse bekannt wird.
    if (env.SYNC_KEY_HASH && env.SYNC_KEY_HASH.trim().toLowerCase() !== spaceId) {
      return jsonResponse({ error: 'Diese Ablage ist auf diesem Worker nicht freigegeben.' }, 403, origin);
    }

    if (request.method === 'GET') {
      const stored = await env.SYNC_KV.get(spaceId);
      if (!stored) return jsonResponse({ error: 'Noch keine Daten abgelegt.' }, 404, origin);
      return new Response(stored, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
          ...corsHeaders(origin)
        }
      });
    }

    if (request.method === 'PUT') {
      const body = await request.text();

      if (body.length > MAX_BODY_BYTES) {
        return jsonResponse({ error: 'Datenpaket ist zu groß.' }, 413, origin);
      }

      let envelope;
      try {
        envelope = JSON.parse(body);
      } catch (err) {
        return jsonResponse({ error: 'Ungültiger Request-Body (JSON erwartet).' }, 400, origin);
      }

      // Nur die Hülle wird geprüft – der Inhalt ist für den Worker
      // unlesbarer Geheimtext und bleibt es auch.
      if (!envelope || typeof envelope.data !== 'string' || typeof envelope.iv !== 'string') {
        return jsonResponse({ error: 'Datenpaket unvollständig.' }, 400, origin);
      }

      await env.SYNC_KV.put(spaceId, body);
      return jsonResponse({ ok: true, updatedAt: envelope.updatedAt || null }, 200, origin);
    }

    return jsonResponse({ error: 'Nur GET und PUT erlaubt.' }, 405, origin);
  }
};
