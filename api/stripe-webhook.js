// /api/stripe-webhook.js — CasaFin Stripe Webhook Handler
// Empfängt Stripe Events und synct sie nach Supabase
//
// Setup:
// 1. Stripe Dashboard → Developers → Webhooks → Add endpoint
// 2. URL: https://casafin.ch/api/stripe-webhook
// 3. Events: checkout.session.completed
// 4. Signing Secret → Vercel Env Var: STRIPE_WEBHOOK_SECRET
// 5. Supabase Service Role Key → Vercel Env Var: SUPABASE_SERVICE_ROLE_KEY

// ── Stripe Payment Link ID → Plan Mapping ─────────────
const PAYMENT_LINK_TO_PLAN = {
  // Pioneer / Solo Lifetime
  '14AfZif5m5536y69fI5Ne0H': 'solo_lifetime',
  // Solo monthly / yearly
  'fZu3cwg9qgNLg8G3Vo5Ne0D': 'solo_monthly',
  '3cI9AUf5mbtr9Ki4Zs5Ne0E': 'solo_yearly',
  // Solo Business monthly / yearly
  'bJe5kEe1i6979Ki9fI5Ne0K': 'solo_business_monthly',
  '00w28s0asfJH2hQbnQ5Ne0L': 'solo_business_yearly',
  // Familie monthly / yearly
  '4gM3cw4qI697cWubnQ5Ne0G': 'familie_monthly',
  '6oU7sM0asapnf4C9fI5Ne0I': 'familie_yearly',
  // Premium monthly / yearly
  '8x2dRa2iAdBzg8G2Rk5Ne0J': 'premium_monthly',
  '14AbJ22iA2WV3lU8bE5Ne0F': 'premium_yearly',
};

function getPlanFromSession(session) {
  // 1. Check metadata directly
  if (session?.metadata?.plan) return session.metadata.plan;
  // 2. Check payment_link_id in metadata
  const plId = session?.metadata?.payment_link_id || session?.metadata?.payment_link;
  if (plId && PAYMENT_LINK_TO_PLAN[plId]) return PAYMENT_LINK_TO_PLAN[plId];
  // 3. Check payment_link object
  const checkoutLink = session?.payment_link?.id || session?.payment_link_id;
  if (checkoutLink && PAYMENT_LINK_TO_PLAN[checkoutLink]) return PAYMENT_LINK_TO_PLAN[checkoutLink];
  return 'unknown';
}

// ── Read raw body (Stripe needs raw bytes for signature) ──
function readRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

// ── Supabase REST API Helper ─────────────────────
async function sbRest(supabaseUrl, serviceKey, table, method, body, query) {
  const url = `${supabaseUrl}/rest/v1/${table}${query || ''}`;
  const headers = {
    'apikey': serviceKey,
    'Authorization': `Bearer ${serviceKey}`,
    'Content-Type': 'application/json',
  };
  if (method === 'POST') headers['Prefer'] = 'return=representation,resolution=merge-duplicates';
  if (method === 'PATCH') headers['Prefer'] = 'return=representation';
  const res = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  try { return JSON.parse(text); } catch { return text; }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'method_not_allowed' });
  }

  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!webhookSecret || !supabaseServiceKey || !supabaseUrl) {
    console.error('Missing env vars: STRIPE_WEBHOOK_SECRET, SUPABASE_URL, or SUPABASE_SERVICE_ROLE_KEY');
    return res.status(500).json({ error: 'config_missing' });
  }

  // ── Stripe Signature verifizieren (Raw Body, Pflicht) ──
  let event;
  const rawBody = await readRawBody(req);

  if (!sig) {
    console.error('Missing stripe-signature header — rejected');
    return res.status(400).json({ error: 'missing_signature' });
  }

  try {
    const sigParts = sig.split(',');
    let timestamp = null;
    let signature = null;
    for (const part of sigParts) {
      const [key, val] = part.split('=');
      if (key === 't') timestamp = val;
      if (key === 'v1') signature = val;
    }

    if (!timestamp || !signature) {
      console.error('Malformed stripe-signature header — rejected');
      return res.status(400).json({ error: 'malformed_signature' });
    }

    const crypto = await import('crypto');
    const signedPayload = `${timestamp}.${rawBody}`;
    const expectedSig = crypto
      .createHmac('sha256', webhookSecret)
      .update(signedPayload, 'utf8')
      .digest('hex');

    const sigBuf = Buffer.from(signature);
    const expectedBuf = Buffer.from(expectedSig);
    if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
      console.error('Stripe signature verification failed');
      return res.status(400).json({ error: 'signature_verification_failed' });
    }

    // Timestamp-Check: reject events older than 5 minutes
    const ageSeconds = Math.abs(Date.now() / 1000 - parseInt(timestamp));
    if (ageSeconds > 300) {
      console.error('Stripe webhook timestamp too old:', ageSeconds, 'seconds');
      return res.status(400).json({ error: 'timestamp_too_old' });
    }

    console.log('✅ CasaFin Stripe signature verified');
    event = JSON.parse(rawBody);
  } catch (err) {
    console.error('Webhook parse/verify error:', err.message);
    return res.status(400).json({ error: 'parse_failed', detail: err.message });
  }

  // ── Event loggen in Supabase ────────────────────────
  const eventId = event.id || 'unknown';
  const eventType = event.type;

  try {
    await sbRest(supabaseUrl, supabaseServiceKey, 'casafin_stripe_events', 'POST', {
      event_id: eventId,
      event_type: eventType,
      customer_email: event.data?.object?.customer_email || event.data?.object?.customer_details?.email || null,
      plan: getPlanFromSession(event.data?.object),
      amount_total: event.data?.object?.amount_total || null,
      status: event.data?.object?.status || null,
      created_at: new Date().toISOString(),
    }, '?on_conflict=event_id');
  } catch (e) {
    console.error('Failed to log event:', e);
  }

  // ── Event Handler ───────────────────────────────────
  try {
    switch (eventType) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const plan = getPlanFromSession(session);
        const email = session.customer_email || session.customer_details?.email;

        if (!email) {
          console.error('No email in checkout session', session.id);
          break;
        }

        console.log(`✅ CasaFin ${plan} purchased by ${email}`);

        // Hier später: User in Supabase finden, Plan updaten
        // Für jetzt: nur loggen
        break;
      }

      default:
        console.log(`Unhandled CasaFin event type: ${eventType}`);
    }

    // Event als verarbeitet markieren
    await sbRest(supabaseUrl, supabaseServiceKey, 'casafin_stripe_events', 'PATCH',
      { processed: true },
      `?event_id=eq.${eventId}`
    );

    return res.status(200).json({ received: true, type: eventType });
  } catch (err) {
    console.error('CasaFin webhook handler error:', err);
    return res.status(500).json({ error: 'handler_failed', detail: err.message });
  }
}

// Vercel: bodyParser deaktivieren für Raw Body
module.exports.config = { api: { bodyParser: false } };