/* ============================================================
   CasaFin — Vault  ·  client-side encryption + data store
   Envelope encryption:
     DEK (random AES-256 key) encrypts all data.
     DEK is wrapped by a password-derived key AND a
     recovery-phrase-derived key (PBKDF2-SHA256, 210k iters).
   Nothing is ever stored in plaintext.  No server involved.
   ============================================================ */
(function () {
  const LS_VAULT = "casafin.vault.v1";
  const LS_PREFS = "casafin.prefs.v1";
  const ITER = 210000;
  const enc = new TextEncoder();
  const dec = new TextDecoder();

  /* ---------- base64 helpers ---------- */
  const b64 = {
    enc: (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))),
    dec: (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0)),
  };

  /* ---------- crypto primitives ---------- */
  async function deriveKEK(password, salt) {
    const base = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveKey"]);
    return crypto.subtle.deriveKey(
      { name: "PBKDF2", salt, iterations: ITER, hash: "SHA-256" },
      base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]
    );
  }
  async function aesEnc(key, bytes) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, bytes);
    return b64.enc(iv) + ":" + b64.enc(ct);
  }
  async function aesDec(key, blob) {
    const [ivS, ctS] = blob.split(":");
    const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv: b64.dec(ivS) }, key, b64.dec(ctS));
    return new Uint8Array(pt);
  }

  /* ---------- recovery phrase ---------- */
  const WORDS = ["alpen","anker","birke","brunnen","delta","echo","feder","gipfel","hafen","insel",
    "jade","kompass","lawine","matter","nebel","orbit","pfeil","quelle","raster","stein",
    "tunnel","ufer","vektor","wolke","zenit","amsel","bogen","chronos","dünen","enzian"];
  function makePhrase() {
    const out = [];
    const pool = [...WORDS];
    for (let i = 0; i < 6; i++) out.push(pool.splice(crypto.getRandomValues(new Uint32Array(1))[0] % pool.length, 1)[0]);
    return out;
  }

  /* ============================================================ seed data */
  function seed() {
    return {
      profile: { name: "Elena Bianchi", initials: "EB", email: "", plan: "Pioneer", city: "Zürich" },
      accounts: [
        { id: "a1", bank: "PostFinance", label: "Privatkonto", type: "checking", iban: "CH93·····1234", balance: 12000, status: "active", owner: "you" },
        { id: "a2", bank: "ZKB", label: "Gemeinschaftskonto", type: "savings", iban: "CH21·····5678", balance: 68000, status: "active", owner: "joint" },
        { id: "a3", bank: "UBS", label: "Wertschriften-Depot", type: "securities", iban: "CH56·····9012", balance: 204750, status: "active", owner: "you" },
        { id: "a4", bank: "VIAC", label: "Vorsorge 3a", type: "pillar", iban: "CH08·····3456", balance: 38400, status: "locked", owner: "you" },
        { id: "a5", bank: "Swisscard", label: "Visa Kreditkarte", type: "card", iban: "····  ····  6671", balance: -840, status: "active", owner: "partner" },
        { id: "a6", bank: "Cembra", label: "Konsumkredit", type: "loan", iban: "CH44·····7788", balance: -8500, status: "active", monthly: 280, rate: "7.9%", owner: "joint" },
        { id: "a7", bank: "Neon", label: "Privatkonto", type: "checking", iban: "CH77·····2299", balance: 7400, status: "active", owner: "partner" },
      ],
      transactions: [
        { id: "t1", accountId: "a1", title: "Coop Zürich", category: "Lebensmittel", date: "2026-05-20", amount: -127.40, icon: "🛒" },
        { id: "t2", accountId: "a1", title: "Gehalt Test AG", category: "Einkommen", date: "2026-05-18", amount: 8200, icon: "💰" },
        { id: "t3", accountId: "a1", title: "Miete Mai", category: "Wohnen", date: "2026-05-01", amount: -2400, icon: "🏠" },
        { id: "t4", accountId: "a1", title: "EWZ Strom", category: "Nebenkosten", date: "2026-05-05", amount: -84.20, icon: "⚡" },
        { id: "t5", accountId: "a5", title: "SBB Mobile", category: "Transport", date: "2026-05-12", amount: -119.00, icon: "🚆" },
        { id: "t6", accountId: "a5", title: "Migros", category: "Lebensmittel", date: "2026-05-14", amount: -86.55, icon: "🛒" },
        { id: "t7", accountId: "a1", title: "Swisscom", category: "Abos", date: "2026-05-08", amount: -69.90, icon: "📱" },
        { id: "t8", accountId: "a5", title: "Restaurant Kunsthaus", category: "Freizeit", date: "2026-05-16", amount: -142.00, icon: "🍽️" },
      ],
      budget: {
        month: "2026-05",
        categories: [
          { id: "c1", name: "Wohnen", icon: "🏠", budget: 2700, spent: 2700 },
          { id: "c2", name: "Lebensmittel", icon: "🛒", budget: 1000, spent: 940 },
          { id: "c3", name: "Transport", icon: "🚆", budget: 400, spent: 355 },
          { id: "c4", name: "Freizeit", icon: "🍽️", budget: 500, spent: 612 },
          { id: "c5", name: "Abos", icon: "📱", budget: 200, spent: 169 },
          { id: "c6", name: "Nebenkosten", icon: "⚡", budget: 300, spent: 204 },
        ],
      },
      documents: [
        { id: "d1", name: "Steuererklärung 2025 – Kanton Zürich.pdf", kind: "tax", size: "2.4 MB", date: "2026-01-15", status: "done",
          fields: { vendor: "Kt. Zürich", amount: "—", due: "2026-03-31", category: "Steuern" } },
        { id: "d2", name: "Krankenkasse AXA – Q2 2026.pdf", kind: "invoice", size: "0.8 MB", date: "2026-04-01", status: "done",
          fields: { vendor: "AXA", amount: "CHF 420.00", due: "2026-06-21", category: "Versicherung" } },
        { id: "d3", name: "Swisscard Abrechnung Q2.pdf", kind: "invoice", size: "0.5 MB", date: "2026-04-04", status: "done",
          fields: { vendor: "Swisscard", amount: "CHF 840.00", due: "2026-05-30", category: "Kreditkarte" } },
      ],
      agents: [
        { id: "g1", code: "CT", name: "CasaTax", role: "Steuer-Optimierung", roleEn: "Tax optimisation", status: "running", lastRun: "vor 2 Std.", lastRunEn: "2h ago", found: "CHF 1'200 Abzüge", foundEn: "CHF 1,200 deductions" },
        { id: "g2", code: "CD", name: "CasaDoc", role: "Auto-Ablage & OCR", roleEn: "Auto-filing & OCR", status: "running", lastRun: "vor 10 Min.", lastRunEn: "10m ago", found: "3 Dokumente", foundEn: "3 documents" },
        { id: "g3", code: "CB", name: "CasaBudget", role: "Budget-Monitoring", roleEn: "Budget monitoring", status: "running", lastRun: "Echtzeit", lastRunEn: "Real-time", found: "1 Anomalie", foundEn: "1 anomaly" },
        { id: "g4", code: "CM", name: "CasaMail", role: "Rechnungs-Scanner", roleEn: "Invoice scanner", status: "running", lastRun: "vor 1 Std.", lastRunEn: "1h ago", found: "2 Rechnungen", foundEn: "2 invoices" },
        { id: "g5", code: "CP", name: "CasaPay", role: "Zahlungs-Automation", roleEn: "Payment automation", status: "paused", lastRun: "gestern", lastRunEn: "yesterday", found: "0 fällig", foundEn: "0 due" },
        { id: "g6", code: "CF", name: "CasaFamily", role: "Vorsorge & Planung", roleEn: "Pension & planning", status: "running", lastRun: "vor 3 Std.", lastRunEn: "3h ago", found: "3a Spielraum", foundEn: "3a headroom" },
      ],
      bills: [
        { id: "b1", vendor: "AXA Krankenkasse", amount: 420, due: "2026-06-21", status: "open", category: "Versicherung", icon: "🏥" },
        { id: "b2", vendor: "Serafe (Radio/TV)", amount: 335, due: "2026-07-15", status: "open", category: "Gebühren", icon: "📺" },
        { id: "b3", vendor: "Zahnarzt Dr. Meier", amount: 240, due: "2026-06-28", status: "open", category: "Gesundheit", icon: "🦷" },
        { id: "b4", vendor: "Swisscard Visa", amount: 840, due: "2026-05-30", status: "paid", category: "Kreditkarte", icon: "💳" },
        { id: "b5", vendor: "EWZ Strom", amount: 84.20, due: "2026-06-05", status: "paid", category: "Nebenkosten", icon: "⚡" },
      ],
      subscriptions: [
        { id: "s1", name: "Netflix Premium", amount: 24.90, cycle: "monthly", category: "Streaming", icon: "🎬" },
        { id: "s2", name: "Spotify Family", amount: 21.95, cycle: "monthly", category: "Musik", icon: "🎵" },
        { id: "s3", name: "Swisscom inOne", amount: 119.00, cycle: "monthly", category: "Telecom", icon: "📶" },
        { id: "s4", name: "Fitnesspark", amount: 99.00, cycle: "monthly", category: "Sport", icon: "🏋️", flag: "review" },
        { id: "s5", name: "iCloud+ 2TB", amount: 12.95, cycle: "monthly", category: "Cloud", icon: "☁️" },
        { id: "s6", name: "AXA Hausrat", amount: 28.50, cycle: "monthly", category: "Versicherung", icon: "🛡️" },
        { id: "s7", name: "NZZ Digital", amount: 39.00, cycle: "monthly", category: "News", icon: "📰", flag: "review" },
      ],
      goals: [
        { id: "go1", name: "Notgroschen", target: 20000, saved: 13500, icon: "🛟", monthly: 500 },
        { id: "go2", name: "Ferien Japan", target: 8000, saved: 3200, icon: "🗾", monthly: 300 },
        { id: "go3", name: "Neues Auto", target: 15000, saved: 4100, icon: "🚗", monthly: 250 },
      ],
      tax: {
        year: 2025, canton: "Zürich",
        deductions: [
          { id: "tx1", label: "Säule 3a Einzahlung", amount: 7056, status: "found" },
          { id: "tx2", label: "Berufsauslagen", amount: 2400, status: "found" },
          { id: "tx3", label: "Versicherungsprämien", amount: 1750, status: "found" },
          { id: "tx4", label: "Weiterbildung", amount: 1200, status: "open" },
          { id: "tx5", label: "Kinderbetreuung Drittbetreuung", amount: 3100, status: "open" },
        ],
      },
      family: {
        members: [
          { id: "f1", name: "Elena Bianchi", role: "adult", initials: "EB", tag: "Du" },
          { id: "f2", name: "Marco Bianchi", role: "adult", initials: "MB", tag: "Partner" },
          { id: "f3", name: "Mia", role: "child", initials: "MI", tag: "Kind · 9 J." },
          { id: "f4", name: "Noah", role: "child", initials: "NO", tag: "Kind · 6 J." },
        ],
        junior: [
          { id: "j1", name: "Mia · Sparkonto", owner: "Mia", balance: 1240 },
          { id: "j2", name: "Noah · Sparkonto", owner: "Noah", balance: 860 },
        ],
      },
      emergency: {
        contacts: [
          { id: "e1", name: "Hausarzt Dr. Weber", detail: "+41 44 123 45 67", icon: "🩺" },
          { id: "e2", name: "Notfall: Luca M.", detail: "+41 79 555 12 34", icon: "📞" },
          { id: "e3", name: "Treuhänder Keller AG", detail: "+41 44 987 65 43", icon: "🧾" },
        ],
      },
      business: {
        name: "Bianchi Studio · Einzelfirma", year: 2026, vatRate: 8.1, vatRegistered: true,
        revenue: [
          { id: "br1", label: "Honorar Projekt Helvetia", amount: 18500, date: "2026-05-12" },
          { id: "br2", label: "Retainer ZKB Digital", amount: 12400, date: "2026-04-30" },
          { id: "br3", label: "Workshop & Beratung", amount: 3200, date: "2026-05-22" },
        ],
        expenses: [
          { id: "be1", label: "Software & Material", amount: 4200, cat: "Material" },
          { id: "be2", label: "Büro-Mietanteil", amount: 3600, cat: "Büro" },
          { id: "be3", label: "Geschäftsfahrzeug", amount: 2100, cat: "Fahrzeug" },
          { id: "be4", label: "Versicherungen", amount: 1450, cat: "Versicherung" },
          { id: "be5", label: "Weiterbildung", amount: 900, cat: "Weiterbildung" },
        ],
      },
      netWorthSeries: [248, 251, 255, 259, 263, 267, 270, 274, 277, 280, 282, 284.75],
      audit: [],
      settings: { autoLockMin: 5, twoFa: true },
    };
  }

  // ensure vaults created before a feature shipped still have its keys
  function migrate(d) {
    const s = seed();
    ["bills", "subscriptions", "goals", "tax", "family", "emergency", "business"].forEach((k) => { if (d[k] == null) d[k] = s[k]; });
    (d.accounts || []).forEach((a) => { if (!a.owner) a.owner = "you"; });
    return d;
  }

  /* ============================================================ store */
  let DEK = null;          // CryptoKey (in-memory only)
  let data = null;         // decrypted state (in-memory only)
  let demoMode = false;    // true when running in demo mode (no encryption, no persistence)
  let meta = null;         // { saltPw, saltRec, wrapPw, wrapRec, blob, createdAt }
  const subs = new Set();
  function emit() { subs.forEach((f) => f()); }

  function readMeta() { try { return JSON.parse(localStorage.getItem(LS_VAULT)); } catch { return null; } }
  function writeMeta(m) { localStorage.setItem(LS_VAULT, JSON.stringify(m)); }

  /* ============================================================ remote sync
     Supabase = persistenter Speicher, localStorage = Cache.
     Es wird IMMER nur das verschlüsselte meta-Objekt synchronisiert
     (Salts, gewrappte Keys, Ciphertext) — der Server sieht nie Plaintext.  */
  let remote = null;        // { sb, userId }  (sb = Supabase client)
  let pushTimer = null;
  let lastPushError = null;

  async function remotePush() {
    if (!remote || !meta || demoMode) return;
    try {
      const { error } = await remote.sb
        .from("vault_blobs")
        .upsert({
          user_id: remote.userId,
          encrypted_blob: JSON.stringify(meta),
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });
      lastPushError = error || null;
      if (error) console.error("Vault sync push failed:", error.message);
    } catch (e) {
      lastPushError = e;
      console.error("Vault sync push failed:", e.message);
    }
  }
  function schedulePush() {
    if (!remote) return;
    clearTimeout(pushTimer);
    pushTimer = setTimeout(remotePush, 1500); // debounce
  }
  async function remotePull() {
    if (!remote) return null;
    try {
      const { data: rows, error } = await remote.sb
        .from("vault_blobs")
        .select("encrypted_blob, updated_at")
        .eq("user_id", remote.userId)
        .maybeSingle();
      if (error || !rows || !rows.encrypted_blob) return null;
      return { meta: JSON.parse(rows.encrypted_blob), updatedAt: Date.parse(rows.updated_at) || 0 };
    } catch { return null; }
  }

  async function persist() {
    if (!DEK || !data || demoMode) return;
    meta.blob = await aesEnc(DEK, enc.encode(JSON.stringify(data)));
    meta.updatedAt = Date.now();
    writeMeta(meta);
    schedulePush();
  }

  const Vault = {
    /* ----- prefs (unencrypted: theme + language only) ----- */
    getPrefs() {
      try { return Object.assign({ lang: "de", theme: "light" }, JSON.parse(localStorage.getItem(LS_PREFS)) || {}); }
      catch { return { lang: "de", theme: "light" }; }
    },
    setPrefs(p) { localStorage.setItem(LS_PREFS, JSON.stringify(Object.assign(this.getPrefs(), p))); },

    hasVault() { return !!readMeta(); },
    isUnlocked() { return !!DEK || demoMode; },

    /* ----- remote sync (Supabase) ----- */
    // Nach Login aufrufen: Vault.attachRemote(supabaseClient, user.id)
    // Holt den neueren Stand (lokal vs. remote, updatedAt entscheidet).
    async attachRemote(sb, userId) {
      remote = { sb, userId };
      const local = readMeta();
      const rem = await remotePull();
      if (rem && (!local || (rem.meta.updatedAt || rem.updatedAt || 0) > (local.updatedAt || 0))) {
        writeMeta(rem.meta);           // Remote ist neuer (oder lokal leer) → Cache aktualisieren
        if (meta && DEK) { meta = rem.meta; } // entsperrt: meta-Referenz nachziehen
      } else if (local && (!rem || (local.updatedAt || 0) > (rem.meta.updatedAt || rem.updatedAt || 0))) {
        await remotePush();            // Lokal ist neuer → hochsynchen
      }
      emit();
    },
    detachRemote() { clearTimeout(pushTimer); remote = null; },
    get syncState() {
      return { attached: !!remote, lastError: lastPushError ? String(lastPushError.message || lastPushError) : null };
    },
    // Für Logout: lokalen Vault-Cache UND Speicher-Schlüssel entfernen
    signOutWipe() {
      clearTimeout(pushTimer);
      remote = null;
      localStorage.removeItem(LS_VAULT);
      DEK = null; data = null; demoMode = false;
      emit();
    },
    get isDemo() { return demoMode; },
    subscribe(fn) { subs.add(fn); return () => subs.delete(fn); },
    get data() { return data; },

    enterDemo() {
      data = seed();
      demoMode = true;
      DEK = null;
      this.log("demo.entered", "Demo-Modus (keine Persistenz)");
      emit();
    },

    async create(password, profileName, profileEmail) {
      const saltPw = crypto.getRandomValues(new Uint8Array(16));
      const saltRec = crypto.getRandomValues(new Uint8Array(16));
      const phrase = makePhrase();
      const kekPw = await deriveKEK(password, saltPw);
      const kekRec = await deriveKEK(phrase.join(" "), saltRec);
      // random data-encryption key, exported raw so we can wrap it
      const dekKey = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
      const dekRaw = new Uint8Array(await crypto.subtle.exportKey("raw", dekKey));
      DEK = dekKey;
      data = seed();
      if (profileName) {
        data.profile.name = profileName;
        data.profile.initials = profileName.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "CF";
      }
      if (profileEmail) {
        data.profile.email = profileEmail;
      }
      this.log("vault.created", "Tresor erstellt · AES-256");
      meta = {
        v: 1,
        saltPw: b64.enc(saltPw), saltRec: b64.enc(saltRec),
        wrapPw: await aesEnc(kekPw, dekRaw),
        wrapRec: await aesEnc(kekRec, dekRaw),
        blob: "", createdAt: Date.now(),
      };
      await persist();
      emit();
      return phrase;
    },

    async unlock(password) {
      meta = readMeta();
      if (!meta) return false;
      try {
        const kek = await deriveKEK(password, b64.dec(meta.saltPw));
        const dekRaw = await aesDec(kek, meta.wrapPw);
        DEK = await crypto.subtle.importKey("raw", dekRaw, "AES-GCM", true, ["encrypt", "decrypt"]);
        const json = dec.decode(await aesDec(DEK, meta.blob));
        data = migrate(JSON.parse(json));
        this.log("vault.unlocked", "Entsperrt");
        emit();
        return true;
      } catch (e) {
        DEK = null; data = null;
        return false;
      }
    },

    async recover(phraseStr, newPassword) {
      meta = readMeta();
      if (!meta) return false;
      try {
        const kekRec = await deriveKEK(phraseStr.trim().toLowerCase(), b64.dec(meta.saltRec));
        const dekRaw = await aesDec(kekRec, meta.wrapRec);
        DEK = await crypto.subtle.importKey("raw", dekRaw, "AES-GCM", true, ["encrypt", "decrypt"]);
        data = migrate(JSON.parse(dec.decode(await aesDec(DEK, meta.blob))));
        // re-wrap DEK under the new password
        const saltPw = crypto.getRandomValues(new Uint8Array(16));
        const kekPw = await deriveKEK(newPassword, saltPw);
        meta.saltPw = b64.enc(saltPw);
        meta.wrapPw = await aesEnc(kekPw, dekRaw);
        this.log("vault.recovered", "Per Phrase wiederhergestellt");
        await persist();
        emit();
        return true;
      } catch { return false; }
    },

    async changePassword(oldPw, newPw) {
      const m = readMeta();
      try {
        const kekOld = await deriveKEK(oldPw, b64.dec(m.saltPw));
        const dekRaw = await aesDec(kekOld, m.wrapPw);
        const saltPw = crypto.getRandomValues(new Uint8Array(16));
        const kekNew = await deriveKEK(newPw, saltPw);
        m.saltPw = b64.enc(saltPw);
        m.wrapPw = await aesEnc(kekNew, dekRaw);
        meta = m; writeMeta(m);
        this.log("password.changed", "Master-Passwort geändert");
        emit();
        return true;
      } catch { return false; }
    },

    lock() { DEK = null; data = null; demoMode = false; emit(); },

    wipe() { localStorage.removeItem(LS_VAULT); DEK = null; data = null; demoMode = false; emit(); },

    /* ----- mutations ----- */
    async update(mutator) {
      mutator(data);
      await persist();
      emit();
    },
    log(type, detail) {
      if (!data) return;
      data.audit = data.audit || [];
      data.audit.unshift({ ts: Date.now(), type, detail });
      data.audit = data.audit.slice(0, 60);
    },
    async logPersist(type, detail) { this.log(type, detail); await persist(); emit(); },

    /* ----- self-use helpers ----- */
    async addTransaction(tx) {
      await this.update((d) => {
        d.transactions.unshift(tx);
        if (tx.amount < 0) {
          const c = d.budget.categories.find((x) => x.name === tx.category);
          if (c) c.spent += Math.abs(tx.amount);
        }
        this.log("transaction.added", tx.title + " · " + tx.amount);
      });
    },
    async clearDemo() {
      await this.update((d) => {
        d.accounts = [];
        d.transactions = [];
        d.documents = [];
        d.bills = [];
        d.subscriptions = [];
        d.goals = [];
        d.tax.deductions = [];
        d.family.junior = [];
        d.emergency.contacts = [];
        d.budget.categories = d.budget.categories.map((c) => ({ ...c, spent: 0 }));
        d.netWorthSeries = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
        this.log("demo.cleared", "Demo-Daten geleert");
      });
    },

    /* ----- derived selectors ----- */
    sel: {
      netWorth: () => data.accounts.reduce((s, a) => s + a.balance, 0),
      liquid: () => data.accounts.filter(a => ["checking", "savings"].includes(a.type)).reduce((s, a) => s + a.balance, 0),
      invest: () => data.accounts.filter(a => a.type === "securities").reduce((s, a) => s + a.balance, 0),
      pillar: () => data.accounts.filter(a => a.type === "pillar").reduce((s, a) => s + a.balance, 0),
      debt: () => Math.abs(data.accounts.filter(a => ["card", "loan", "mortgage"].includes(a.type)).reduce((s, a) => s + Math.min(0, a.balance), 0)),
      cardDebt: () => Math.abs(data.accounts.filter(a => a.type === "card").reduce((s, a) => s + Math.min(0, a.balance), 0)),
      monthSpent: () => data.budget.categories.reduce((s, c) => s + c.spent, 0),
      monthBudget: () => data.budget.categories.reduce((s, c) => s + c.budget, 0),
      income: () => data.transactions.filter(t => t.amount > 0).reduce((s, t) => s + t.amount, 0),
      billsOpen: () => data.bills.filter(b => b.status === "open"),
      billsOpenTotal: () => data.bills.filter(b => b.status === "open").reduce((s, b) => s + b.amount, 0),
      nextBill: () => data.bills.filter(b => b.status === "open").sort((a, b) => a.due.localeCompare(b.due))[0],
      subsMonthly: () => data.subscriptions.reduce((s, x) => s + (x.cycle === "yearly" ? x.amount / 12 : x.amount), 0),
      subsYearly: () => data.subscriptions.reduce((s, x) => s + (x.cycle === "yearly" ? x.amount : x.amount * 12), 0),
      deductionsTotal: () => data.tax.deductions.reduce((s, x) => s + x.amount, 0),
      deductionsFound: () => data.tax.deductions.filter(x => x.status === "found").reduce((s, x) => s + x.amount, 0),
      goalsSaved: () => data.goals.reduce((s, g) => s + g.saved, 0),
      goalsTarget: () => data.goals.reduce((s, g) => s + g.target, 0),
      bizRevenue: () => data.business.revenue.reduce((s, x) => s + x.amount, 0),
      bizExpenses: () => data.business.expenses.reduce((s, x) => s + x.amount, 0),
      bizProfit: () => Vault.sel.bizRevenue() - Vault.sel.bizExpenses(),
      savingsRate: () => {
        const inc = Vault.sel.income(); if (!inc) return 0;
        return Math.max(0, Math.round((1 - Vault.sel.monthSpent() / inc) * 100));
      },
      budgetKept: () => {
        const c = data.budget.categories;
        const ok = c.filter(x => x.spent <= x.budget).length;
        return Math.round((ok / c.length) * 100);
      },
      health: () => {
        const sr = Vault.sel.savingsRate();             // 0..~50
        const bk = Vault.sel.budgetKept();              // 0..100
        const debtFactor = Vault.sel.cardDebt() > 0 ? 88 : 100;
        const score = Math.round(sr * 0.9 + bk * 0.45 + debtFactor * 0.2);
        return Math.max(0, Math.min(100, score));
      },
    },
  };

  window.Vault = Vault;
})();
