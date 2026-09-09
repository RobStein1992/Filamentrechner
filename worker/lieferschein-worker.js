/**
 * Cloudflare Worker: Lieferschein-Proxy für die Druckkosten-Rechner-App.
 *
 * Nimmt einen Lieferschein als PDF (base64) entgegen, schickt ihn an die
 * Claude-API (Anthropic) und liefert die daraus extrahierten Positionen als
 * JSON zurück. Der Anthropic-API-Key steckt nur hier als Worker-Secret,
 * nie im Browser der App.
 *
 * Einrichtung: siehe README.md in diesem Ordner.
 */

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const DEFAULT_MODEL = 'claude-sonnet-5';

const EXTRACTION_TOOL = {
  name: 'extract_delivery_note',
  description: 'Extrahiert strukturierte Daten aus einem Lieferschein für 3D-Druck-Filament oder -Resin.',
  input_schema: {
    type: 'object',
    properties: {
      supplier: {
        type: 'string',
        description: 'Name des Lieferanten laut Lieferschein.'
      },
      deliveryNoteNumber: {
        type: 'string',
        description: 'Lieferschein- oder Rechnungsnummer.'
      },
      date: {
        type: 'string',
        description: 'Lieferdatum im Format YYYY-MM-DD, falls erkennbar.'
      },
      items: {
        type: 'array',
        description: 'Alle gelieferten Filament-/Resin-Positionen, eine Zeile pro Artikel.',
        items: {
          type: 'object',
          properties: {
            material: { type: 'string', description: 'Materialbezeichnung, z. B. PLA, PETG, ABS, TPU, Resin.' },
            manufacturer: { type: 'string', description: 'Hersteller/Marke dieser Position, falls im Lieferschein genannt.' },
            color: { type: 'string', description: 'Farbe bzw. Farbbezeichnung der Position.' },
            weight: {
              type: 'number',
              description: 'Nettogewicht bzw. Füllmenge PRO EINHEIT in Gramm. Angaben in kg oder l in Gramm umrechnen (1 kg = 1000 g).'
            },
            quantity: {
              type: 'integer',
              description: 'Anzahl gelieferter Einheiten/Spulen dieser Position. Falls nicht angegeben: 1.'
            },
            articleNo: { type: 'string', description: 'Artikel- oder SKU-Nummer laut Lieferschein, falls vorhanden.' }
          },
          required: ['material', 'weight']
        }
      }
    },
    required: ['items']
  }
};

function corsHeaders(origin){
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400'
  };
}

function jsonResponse(body, status, origin){
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) }
  });
}

export default {
  async fetch(request, env){
    const origin = request.headers.get('Origin') || '*';

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }
    if (request.method !== 'POST') {
      return jsonResponse({ error: 'Nur POST erlaubt.' }, 405, origin);
    }
    if (!env.ANTHROPIC_API_KEY) {
      return jsonResponse({ error: 'ANTHROPIC_API_KEY ist auf dem Worker nicht gesetzt.' }, 500, origin);
    }

    let payload;
    try {
      payload = await request.json();
    } catch (err) {
      return jsonResponse({ error: 'Ungültiger Request-Body (JSON erwartet).' }, 400, origin);
    }

    const pdfBase64 = payload && payload.pdf_base64;
    if (!pdfBase64 || typeof pdfBase64 !== 'string') {
      return jsonResponse({ error: 'Feld "pdf_base64" fehlt.' }, 400, origin);
    }

    const model = env.ANTHROPIC_MODEL || DEFAULT_MODEL;

    const anthropicBody = {
      model,
      max_tokens: 4096,
      tools: [EXTRACTION_TOOL],
      tool_choice: { type: 'tool', name: 'extract_delivery_note' },
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: { type: 'base64', media_type: 'application/pdf', data: pdfBase64 }
            },
            {
              type: 'text',
              text: 'Dies ist ein Lieferschein für 3D-Druck-Filament oder -Resin. Extrahiere Lieferant, Lieferschein-Nummer, Datum und alle gelieferten Positionen über das bereitgestellte Werkzeug. Wenn ein Feld nicht erkennbar ist, lass es leer bzw. weg statt zu raten.'
            }
          ]
        }
      ]
    };

    let anthropicRes;
    try {
      anthropicRes = await fetch(ANTHROPIC_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify(anthropicBody)
      });
    } catch (err) {
      return jsonResponse({ error: 'Anthropic-API nicht erreichbar.' }, 502, origin);
    }

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text().catch(() => '');
      return jsonResponse({ error: 'Anthropic-API-Fehler (' + anthropicRes.status + ')', detail: errText.slice(0, 500) }, 502, origin);
    }

    const anthropicJson = await anthropicRes.json();
    const toolUse = (anthropicJson.content || []).find(block => block.type === 'tool_use' && block.name === 'extract_delivery_note');

    if (!toolUse) {
      return jsonResponse({ error: 'Keine strukturierten Daten in der KI-Antwort gefunden.' }, 502, origin);
    }

    return jsonResponse(toolUse.input, 200, origin);
  }
};
