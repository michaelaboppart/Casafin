// /api/fina.js — CasaFin Fina AI (enhanced with Vision + Voice)
// POST /api/fina { message?, image?, lang, context, mode? }
// mode: "chat" | "booking" | "photo" | "voice"
// image: base64-encoded image (receipt photo)
// Returns: { type: "booking" | "chat", ... }

export const config = { runtime: "nodejs" };

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  try {
    const { message, image, lang, context, mode } = req.body || {};
    
    // At least one of message or image must be present
    if (!message && !image) {
      return res.status(400).json({ error: "message or image required" });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "ANTHROPIC_API_KEY not set" });

    const de = lang === "de";

    // ── System Prompt ──────────────────────────────────
    const systemPrompt = de
      ? `Du bist Fina, eine Schweizer KI-Finanzassistentin für CasaFin. Du hilfst Einzelunternehmen und Privatpersonen bei Buchhaltung, Steuern und Finanzen.

Der Nutzer kann Belege hochladen (als Foto oder Text), per Sprache sprechen, oder Fragen stellen.

**Wenn der Nutzer einen Beleg hochlädt (Foto oder Text), antworte IMMER als JSON-Objekt:**
{
  "type": "booking",
  "kind": "revenue" | "expense",
  "label": "Kurze Beschreibung (max 60 Zeichen)",
  "amount": <Zahl ohne CHF, z.B. 420.00>,
  "date": "YYYY-MM-DD" (falls auf Beleg erkennbar, sonst heute),
  "vendor": "Name des Unternehmens/Lieferanten",
  "category": "Material" | "Büro" | "Fahrzeug" | "Versicherung" | "Weiterbildung" | "Lebensmittel" | "Wohnen" | "Transport" | "Freizeit" | "Abos" | "Gesundheit" | "Sonstiges",
  "konto": "<Kontonummer Kontenrahmen KMU>",
  "mwst": <Betrag der MWST falls auf Beleg erkennbar, sonst null>,
  "mwst_rate": <MWST-Satz in %, z.B. 8.1, sonst null>,
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
- Lebensmittel/Wohnen/Privat: 6500 (Privatauslagen)

**Wenn der Nutzer ein Foto hochlädt:**
- Lies den Beleg wie ein Mensch: Anbieter, Betrag, Datum, MWST, Artikel
- Auch wenn handschriftlich oder unklar — gib deine beste Einschätzung
- Wenn du den Betrag nicht sicher lesen kannst, schätze und markiere "explanation" mit "(geschätzt)"

**Wenn der Nutzer eine allgemeine Frage stellt, antworte als:**
{
  "type": "chat",
  "text": "Deine Antwort (mit **fett** für wichtige Zahlen)"
}

**Wenn der Nutzer per Sprache spricht:**
- Interpretiere gesprochene Buchungen ("Ich habe 420 Franken bei Coop ausgegeben")
- Antworte wie bei einem Beleg: als booking JSON

Halte Antworten knapp, präzise und auf Deutsch. Verwende Schweizer Formate (CHF, Punkt als Dezimaltrenner).`
      : `You are Fina, a Swiss AI financial assistant for CasaFin. You help sole proprietors and individuals with bookkeeping, taxes, and finances.

The user can upload receipts (as photo or text), speak via voice, or ask questions.

**When the user uploads a receipt (photo or text), ALWAYS respond as a JSON object:**
{
  "type": "booking",
  "kind": "revenue" | "expense",
  "label": "Short description (max 60 chars)",
  "amount": <number without CHF, e.g. 420.00>,
  "date": "YYYY-MM-DD" (if on receipt, else today),
  "vendor": "Name of vendor/company",
  "category": "Material" | "Büro" | "Fahrzeug" | "Versicherung" | "Weiterbildung" | "Lebensmittel" | "Wohnen" | "Transport" | "Freizeit" | "Abos" | "Gesundheit" | "Sonstiges",
  "konto": "<Kontenrahmen KMU account number>",
  "mwst": <VAT amount if on receipt, else null>,
  "mwst_rate": <VAT rate in %, e.g. 8.1, else null>,
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

**When the user uploads a photo:**
- Read the receipt like a human: vendor, amount, date, VAT, items
- Even if handwritten or unclear — give your best estimate
- If amount is unreadable, estimate and mark "explanation" with "(estimated)"

**For general questions, respond as:**
{
  "type": "chat",
  "text": "Your answer (use **bold** for key numbers)"
}

**When the user speaks:**
- Interpret spoken bookings ("I spent 420 francs at Coop")
- Respond as booking JSON

Keep answers concise. Use Swiss formats (CHF, dot as decimal separator).`;

    // ── Build user message ──────────────────────────────
    let userContent = [];

    // Context (financial data of the user)
    if (context) {
      userContent.push({
        type: "text",
        text: de
          ? `Kontext des Nutzers:\n${context}\n\nNutzer-Eingabe:`
          : `User context:\n${context}\n\nUser input:`
      });
    }

    // Text message
    if (message) {
      const prefix = mode === "voice" ? (de ? "[Gesprochen] " : "[Voice] ") : "";
      userContent.push({ type: "text", text: prefix + message });
    }

    // Image (base64)
    if (image) {
      // Strip data URL prefix if present
      const base64Data = image.replace(/^data:image\/[a-z]+;base64,/, "");
      const mediaType = image.match(/^data:image\/([a-z]+);/)?.[1] || "jpeg";
      
      userContent.push({
        type: "image",
        source: {
          type: "base64",
          media_type: mediaType === "jpg" ? "image/jpeg" : `image/${mediaType}`,
          data: base64Data
        }
      });

      userContent.push({
        type: "text",
        text: de
          ? "Bitte lies diesen Beleg und buche ihn korrekt nach Kontenrahmen KMU."
          : "Please read this receipt and book it according to Kontenrahmen KMU."
      });
    }

    if (userContent.length === 0) {
      userContent = [{ type: "text", text: message || "" }];
    }

    // ── Call Claude ─────────────────────────────────────
    const requestBody = {
      model: "claude-haiku-4-5",
      max_tokens: 800,
      system: systemPrompt,
      messages: [{ role: "user", content: userContent }]
    };

    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    if (!r.ok) {
      const errText = await r.text();
      console.error("Fina API error:", r.status, errText);
      return res.status(502).json({ error: `Anthropic API error: ${r.status}` });
    }

    const data = await r.json();
    const text = data.content?.[0]?.text || "";

    // ── Parse response ──────────────────────────────────
    let parsed;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { type: "chat", text };
    } catch {
      parsed = { type: "chat", text };
    }

    return res.status(200).json(parsed);
  } catch (e) {
    console.error("Fina error:", e);
    return res.status(500).json({ error: String(e).slice(0, 200) });
  }
}