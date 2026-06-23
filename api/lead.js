export const config = { runtime: "nodejs" };

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  try {
    const { email, source } = req.body || {};
    if (!email || !/^[^@]+@[^@]+\.[^@]+$/.test(email))
      return res.status(400).json({ error: "ungültige Email" });

    const r = await fetch(
      `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Leads`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.AIRTABLE_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          records: [{ fields: {
            Email: email,
            Quelle: source || "casafin-demo",
            Datum: new Date().toISOString(),
          }}],
        }),
      }
    );
    if (!r.ok) return res.status(502).json({ error: "lead store failed" });
    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: String(e).slice(0, 200) });
  }
}