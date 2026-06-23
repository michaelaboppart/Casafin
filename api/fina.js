export const config = { runtime: "nodejs" };

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  try {
    const { message, lang, context } = req.body || {};
    if (!message) return res.status(400).json({ error: "message required" });

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "ANTHROPIC_API_KEY not set" });

    const de = lang === "de";
    const systemPrompt = de
      ? `Du bist Fina, eine Schweizer KI-Finanzassistentin für CasaFin. Du hilfst Einzelunternehmen und Privatpersonen bei Buchhaltung, Steuern und Finanzen.

Der Nutzer kann Belege hochladen (als Text extrahiert) oder Fragen stellen.

Wenn der Nutzer einen Beleg hochlädt oder eine Buchung beschreibt, antworte IMMER als JSON-Objekt mit folgenden Feldern:
{
  "type": "booking",
  "kind": "revenue" | "expense",
  "label": "Kurze Beschreibung (max 60 Zeichen)",
  "amount": <Zahl ohne CHF, z.B. 420.00>,
  "category": "Material" | "Büro" | "Fahrzeug" | "Versicherung" | "Weiterbildung" | "Sonstiges",
  "konto": "<Kontonummer Kontenrahmen KMU>",
  "explanation": "Kurze Erklärung warum dieses Konto (1-2 Sätze)"
}

Gültige Kontenrahmen KMU Zuordnungen:
- Ertrag: 3000 (Dienstleistungsertrag)
- Materialaufwand: 4000
- Raumaufwand: 6000
- Fahrzeugaufwand: 6200
- Versicherungsaufwand: 6300
- Weiterbildung: 5830
- Büro/Verwaltung: 6500

Wenn der Nutzer eine allgemeine Frage stellt (kein Beleg, keine Buchung), antworte als:
{
  "type": "chat",
  "text": "Deine Antwort (mit **fett** für wichtige Zahlen)"
}

Halte Antworten knapp, präzise und auf Deutsch. Verwende Schweizer Formate (CHF, Punkt als Dezimaltrenner).`
      : `You are Fina, a Swiss AI financial assistant for CasaFin. You help sole proprietors and individuals with bookkeeping, taxes, and finances.

The user can upload receipts (as extracted text) or ask questions.

When the user uploads a receipt or describes a booking, ALWAYS respond as a JSON object:
{
  "type": "booking",
  "kind": "revenue" | "expense",
  "label": "Short description (max 60 chars)",
  "amount": <number without CHF, e.g. 420.00>,
  "category": "Material" | "Büro" | "Fahrzeug" | "Versicherung" | "Weiterbildung" | "Sonstiges",
  "konto": "<Kontenrahmen KMU account number>",
  "explanation": "Short explanation for this account (1-2 sentences)"
}

Valid Kontenrahmen KMU mappings:
- Revenue: 3000 (Dienstleistungsertrag)
- Material: 4000
- Office: 6000
- Vehicle: 6200
- Insurance: 6300
- Training: 5830
- Admin: 6500

For general questions (no receipt, no booking), respond as:
{
  "type": "chat",
  "text": "Your answer (use **bold** for key numbers)"
}

Keep answers concise. Use Swiss formats (CHF, dot as decimal separator).`;

    const userMessage = context
      ? de
        ? `Kontext des Nutzers:\n${context}\n\nNutzer-Eingabe:\n${message}`
        : `User context:\n${context}\n\nUser input:\n${message}`
      : message;

    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5",
        max_tokens: 600,
        system: systemPrompt,
        messages: [{ role: "user", content: userMessage }],
      }),
    });

    if (!r.ok) {
      const errText = await r.text();
      return res.status(502).json({ error: `Anthropic API error: ${r.status}` });
    }

    const data = await r.json();
    const text = data.content?.[0]?.text || "";

    // Try to parse JSON from the response
    let parsed;
    try {
      // Extract JSON from possible markdown code blocks
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { type: "chat", text };
    } catch {
      parsed = { type: "chat", text };
    }

    return res.status(200).json(parsed);
  } catch (e) {
    return res.status(500).json({ error: String(e).slice(0, 200) });
  }
}