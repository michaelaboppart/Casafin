/* ============================================================
   CasaFin — Fina (AI copilot, real LLM via /api/fina)
   Chat + Foto-Upload (Vision) + Spracheingabe (Voice) + Beleg-Upload
   ============================================================ */
const { useState: useStateF, useRef: useRefF, useEffect: useEffectF } = React;

function renderMd(s) {
  const parts = s.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) => p.startsWith("**") ? <b key={i}>{p.slice(2, -2)}</b> : <span key={i}>{p}</span>);
}

function Fina({ lang }) {
  const T = (k) => window.I18N.t(k, lang);
  const F = window.fmt;
  const de = lang === "de";
  const suggested = de
    ? ["Buche eine Rechnung", "Kann ich mir ein Auto für CHF 35'000 leisten?", "Wie viel kann ich in die 3. Säule einzahlen?", "Welche Steuerabzüge habe ich?"]
    : ["Book an invoice", "Can I afford a car for CHF 35,000?", "How much can I add to pillar 3a?", "What tax deductions do I have?"];
  const [msgs, setMsgs] = useStateF([{ from: "fina", text: T("fina.intro") }]);
  const [input, setInput] = useStateF("");
  // ── Fina AI Consent (revDSG): einmalige Zustimmung, verschlüsselt im Vault ──
  const [consent, setConsent] = useStateF(!!(window.Vault.data && window.Vault.data.settings && window.Vault.data.settings.finaConsent));
  const [consentChecked, setConsentChecked] = useStateF(false);
  async function giveConsent() {
    if (!consentChecked) return;
    await window.Vault.update((d) => {
      d.settings.finaConsent = { given: true, ts: Date.now() };
      window.Vault.log("fina.consent", "Fina-Consent erteilt");
    });
    setConsent(true);
  }
  const [thinking, setThinking] = useStateF(false);
  const [recording, setRecording] = useStateF(false);
  const scrollRef = useRefF(null);
  const fileRef = useRefF(null);
  const photoRef = useRefF(null);
  const recognitionRef = useRefF(null);

  useEffectF(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [msgs, thinking]);

  // Build context string from vault data for the API
  function buildContext() {
    const d = window.Vault.data;
    if (!d) return "";
    const S = window.Vault.sel;
    const lines = [
      `Kontostand: ${F.chf(S.netWorth())}`,
      `Liquid: ${F.chf(S.liquid())}`,
      `Investiert: ${F.chf(S.invest())}`,
      `3. Säule: ${F.chf(S.pillar())}`,
      `Einnahmen (Monat): ${F.chf(S.income())}`,
      `Ausgaben (Monat): ${F.chf(S.monthSpent())}`,
      `Sparquote: ${S.savingsRate()}%`,
    ];
    if (d.business) {
      lines.push(`Einzelfirma: ${d.business.name}`);
      lines.push(`MWST-Satz: ${d.business.vatRate}%`);
      lines.push(`Jahresertrag: ${F.chf(S.bizRevenue())}`);
      lines.push(`Jahresaufwand: ${F.chf(S.bizExpenses())}`);
    }
    if (d.ahv) {
      lines.push(`AHV-Beitragssatz: ${d.ahv.rate || 10.3}%`);
      lines.push(`AHV geschätzter Beitrag: ${F.chf(S.ahvEstimatedContribution())}`);
      lines.push(`AHV bereits bezahlt: ${F.chf(S.ahvPaidThisYear())}`);
      lines.push(`AHV Saldo: ${F.chf(S.ahvBalance())}`);
    }
    return lines.join("\n");
  }

  // Send to /api/fina and handle response (now supports image)
  async function callFina(text, imageBase64, mode) {
    const ctx = buildContext();
    const body = { lang, context: ctx, consent: true }; // Server verlangt Consent-Flag
    if (text) body.message = text;
    if (imageBase64) body.image = imageBase64;
    if (mode) body.mode = mode;

    const r = await fetch("/api/fina", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!r.ok) {
      return { type: "chat", text: de
        ? "Entschuldigung, ich konnte das gerade nicht verarbeiten. Versuch es erneut."
        : "Sorry, I couldn't process that right now. Please try again." };
    }
    return await r.json();
  }

  async function ask(text) {
    const q = (text ?? input).trim();
    if (!q || thinking) return;
    setMsgs((m) => [...m, { from: "me", text: q }]);
    setInput("");
    setThinking(true);

    try {
      const resp = await callFina(q, null, "chat");
      setThinking(false);
      if (resp.type === "booking") {
        setMsgs((m) => [...m, { from: "fina", booking: resp }]);
      } else {
        setMsgs((m) => [...m, { from: "fina", text: resp.text || resp.message || "…" }]);
      }
    } catch (e) {
      setThinking(false);
      setMsgs((m) => [...m, { from: "fina", text: de
        ? "Verbindung fehlgeschlagen. Bitte später erneut."
        : "Connection failed. Please try again later." }]);
    }
  }

  // ── Foto-Upload (Kamera): Bild als base64 an Claude Vision senden ──
  function handlePhoto(e) {
    const file = e.target.files?.[0];
    if (!file || thinking) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result; // data URL
      setMsgs((m) => [...m, { from: "me", text: de ? `📸 Foto: ${file.name}` : `📸 Photo: ${file.name}` }]);
      setThinking(true);
      try {
        const resp = await callFina(null, base64, "photo");
        setThinking(false);
        if (resp.type === "booking") {
          setMsgs((m) => [...m, { from: "fina", booking: resp }]);
        } else {
          setMsgs((m) => [...m, { from: "fina", text: resp.text || "…" }]);
        }
      } catch (err) {
        setThinking(false);
        setMsgs((m) => [...m, { from: "fina", text: de ? "Fehler beim Lesen des Fotos." : "Error reading photo." }]);
      }
    };
    reader.readAsDataURL(file); // base64 data URL
    e.target.value = "";
  }

  // ── Beleg-Upload (Text/CSV/PDF): als Text senden ──
  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file || thinking) return;

    // If it's an image, use handlePhoto instead
    if (file.type.startsWith("image/")) {
      handlePhoto(e);
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      const text = reader.result;
      const q = de
        ? `Beleg hochgeladen: ${file.name}\n\nInhalt:\n${String(text).slice(0, 4000)}`
        : `Receipt uploaded: ${file.name}\n\nContent:\n${String(text).slice(0, 4000)}`;
      setMsgs((m) => [...m, { from: "me", text: de ? `📎 Beleg: ${file.name}` : `📎 Receipt: ${file.name}` }]);
      setThinking(true);
      try {
        const resp = await callFina(q, null, "booking");
        setThinking(false);
        if (resp.type === "booking") {
          setMsgs((m) => [...m, { from: "fina", booking: resp }]);
        } else {
          setMsgs((m) => [...m, { from: "fina", text: resp.text || "…" }]);
        }
      } catch (err) {
        setThinking(false);
        setMsgs((m) => [...m, { from: "fina", text: de ? "Fehler beim Lesen des Belegs." : "Error reading receipt." }]);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  // ── Spracheingabe (Voice): Web Speech API ──
  function toggleVoice() {
    if (recording) {
      // Stop recording
      if (recognitionRef.current) {
        recognitionRef.current.stop();
        recognitionRef.current = null;
      }
      setRecording(false);
      return;
    }

    // Start recording
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setMsgs((m) => [...m, { from: "fina", text: de
        ? "Spracheingabe wird in diesem Browser nicht unterstützt. Versuche Chrome oder Safari."
        : "Voice input not supported in this browser. Try Chrome or Safari." }]);
      return;
    }

    const rec = new SR();
    rec.lang = de ? "de-CH" : "en-US";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.continuous = false;

    rec.onstart = () => setRecording(true);
    rec.onend = () => setRecording(false);
    rec.onerror = () => setRecording(false);

    rec.onresult = async (event) => {
      const transcript = event.results[0][0].transcript;
      setMsgs((m) => [...m, { from: "me", text: `🎙️ ${transcript}` }]);
      setThinking(true);
      try {
        const resp = await callFina(transcript, null, "voice");
        setThinking(false);
        if (resp.type === "booking") {
          setMsgs((m) => [...m, { from: "fina", booking: resp }]);
        } else {
          setMsgs((m) => [...m, { from: "fina", text: resp.text || "…" }]);
        }
      } catch (err) {
        setThinking(false);
        setMsgs((m) => [...m, { from: "fina", text: de ? "Fehler bei der Spracherkennung." : "Voice recognition error." }]);
      }
    };

    recognitionRef.current = rec;
    rec.start();
  }

  // Confirm booking → pre-fill Business form via custom event
  function confirmBooking(booking) {
    window.dispatchEvent(new CustomEvent("fina.booking", { detail: booking }));
    setMsgs((m) => [...m, { from: "fina", text: de
      ? `✅ Buchungsvorschlag übernommen. Bitte überprüfe und bestätige im Einzelfirma-Bereich.`
      : `✅ Booking suggestion transferred. Please review and confirm in the Business section.` }]);
  }

  // AXA bill — read from vault (single source of truth)
  const axaBill = (window.Vault.data?.bills || []).find(b => b.vendor && b.vendor.includes("AXA"));
  const axaDays = axaBill ? Math.round((new Date(axaBill.due) - new Date()) / 86400000) : null;
  const axaLabel = axaBill ? (axaDays < 0 ? (de ? Math.abs(axaDays) + " T. überfällig" : Math.abs(axaDays) + "d overdue") : (de ? "in " + axaDays + " Tagen" : "in " + axaDays + " days")) : "";
  const axaAmt = axaBill ? "CHF " + axaBill.amount : "CHF 420";

  const actions = de
    ? [{ icon: "💳", t: "Krankenkasse AXA " + (axaDays < 0 ? "überfällig" : "fällig"), d: axaAmt + " " + axaLabel + " — automatische Zahlung einrichten.", v: axaAmt, u: true },
       { icon: "📋", t: "Steuerabzüge optimieren", d: "CHF 1'200 zusätzliche Abzüge möglich — Kt. Zürich " + (new Date().getFullYear() - 1) + ".", v: "+CHF 1'200", u: false },
       { icon: "💡", t: "Freizeit über Budget", d: "CHF 112 über dem Monatsbudget — Tendenz steigend.", v: "−CHF 112", u: false }]
    : [{ icon: "💳", t: "Health insurance AXA " + (axaDays < 0 ? "overdue" : "due"), d: axaAmt + " " + axaLabel + " — set up automatic payment.", v: axaAmt, u: true },
       { icon: "📋", t: "Optimise tax deductions", d: "CHF 1,200 additional deductions possible — ZH " + (new Date().getFullYear() - 1) + ".", v: "+CHF 1,200", u: false },
       { icon: "💡", t: "Leisure over budget", d: "CHF 112 above monthly budget — trending up.", v: "−CHF 112", u: false }];

  // ── Consent-Gate: vor erster Fina-Nutzung (revDSG) ──
  if (!consent) {
    return (
      <div className="animate">
        <div className="card" style={{ maxWidth: 560, margin: "40px auto", padding: "36px 34px", textAlign: "center" }}>
          <div className="fina-orb lg" style={{ margin: "0 auto 16px" }}><Icon name="sparkle" size={22} /></div>
          <h2 style={{ fontSize: 20, fontWeight: 780, marginBottom: 10 }}>{de ? "Bevor Fina loslegt" : "Before Fina starts"}</h2>
          <p style={{ color: "var(--ink-3)", fontSize: 14.5, lineHeight: 1.65, marginBottom: 18 }}>
            {de
              ? "Fina beantwortet deine Fragen mit Hilfe von Anthropic Claude (Auftragsverarbeiter). Dafür werden nur aggregierte Werte übermittelt — z.B. «Ausgaben Mai: CHF 3'200» — niemals einzelne Transaktionen oder dein Tresor-Inhalt. Belege, die du aktiv hochlädst, werden nur zur Analyse verarbeitet und nicht gespeichert."
              : "Fina answers your questions using Anthropic Claude (data processor). Only aggregated values are transmitted — e.g. \"May spending: CHF 3,200\" — never individual transactions or your vault contents. Receipts you actively upload are processed for analysis only and not stored."}
          </p>
          <label className="ack" style={{ textAlign: "left", marginBottom: 18 }}>
            <input type="checkbox" checked={consentChecked} onChange={(e) => setConsentChecked(e.target.checked)} />
            <span>{de
              ? "Ich stimme zu, dass Fina meine aggregierten Finanzdaten verarbeitet, um mir zu helfen. Rohdaten werden nie gesendet."
              : "I agree that Fina processes my aggregated financial data to help me. Raw data is never sent."}</span>
          </label>
          <button className="btn btn-primary btn-lg" disabled={!consentChecked} style={{ opacity: consentChecked ? 1 : .5 }} onClick={giveConsent}>
            {de ? "Zustimmen & Fina starten" : "Agree & start Fina"}
          </button>
          <div style={{ marginTop: 14, fontSize: 12, color: "var(--ink-3)" }}>
            {de ? "Details in der " : "Details in the "}<a href="Datenschutz.html" target="_blank" style={{ color: "var(--brand)" }}>{de ? "Datenschutzerklärung" : "privacy policy"}</a>. {de ? "Widerruf jederzeit in den Einstellungen." : "Revoke anytime in settings."}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate">
      <div className="grid" style={{ gridTemplateColumns: "1.5fr 1fr", alignItems: "start" }}>
        {/* chat */}
        <div className="card fina-chat">
          <div className="fina-head">
            <div className="fina-orb lg"><Icon name="sparkle" size={20} /></div>
            <div>
              <div style={{ fontWeight: 720, fontSize: 16 }}>Fina</div>
              <div style={{ fontSize: 12, color: "var(--brand)", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}><span className="dot" /> {de ? "Online · kennt deine Zahlen" : "Online · knows your numbers"}</div>
            </div>
          </div>
          <div className="fina-msgs scroll" ref={scrollRef}>
            {msgs.map((m, i) => {
              if (m.booking) {
                return (
                  <div key={i} className="bubble fina booking-suggest">
                    <div style={{ fontWeight: 700, marginBottom: 8 }}>{de ? "📋 Buchungsvorschlag" : "📋 Booking suggestion"}</div>
                      <div className="booking-detail">
                        <div><span className="bk-label">{de ? "Typ" : "Type"}</span><span className="bk-val">{m.booking.kind === "revenue" ? (de ? "Ertrag" : "Revenue") : (de ? "Aufwand" : "Expense")}</span></div>
                        <div><span className="bk-label">{de ? "Beschreibung" : "Description"}</span><span className="bk-val">{m.booking.label}</span></div>
                        {m.booking.vendor && <div><span className="bk-label">{de ? "Anbieter" : "Vendor"}</span><span className="bk-val">{m.booking.vendor}</span></div>}
                        <div><span className="bk-label">{de ? "Betrag" : "Amount"}</span><span className="bk-val num" style={{ fontWeight: 740 }}>CHF {m.booking.amount}</span></div>
                        {m.booking.mwst != null && <div><span className="bk-label">{de ? "MWST" : "VAT"}</span><span className="bk-val num">CHF {m.booking.mwst} ({m.booking.mwst_rate || "?"}%)</span></div>}
                        {m.booking.date && <div><span className="bk-label">{de ? "Datum" : "Date"}</span><span className="bk-val">{m.booking.date}</span></div>}
                        <div><span className="bk-label">{de ? "Konto" : "Account"}</span><span className="bk-val">{m.booking.konto} · {m.booking.category}</span></div>
                      </div>
                    {m.booking.explanation && <div style={{ fontSize: 12, color: "var(--ink-2)", marginTop: 8, lineHeight: 1.4 }}>{m.booking.explanation}</div>}
                    <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
                      <button className="btn btn-primary" style={{ fontSize: 13, padding: "8px 14px" }} onClick={() => confirmBooking(m.booking)}>
                        {de ? "Übernehmen →" : "Accept →"}
                      </button>
                    </div>
                    <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 8 }}>{de ? "Kein Blind-Buchen — du bestätigst im Einzelfirma-Bereich." : "No blind booking — you confirm in the Business section."}</div>
                  </div>
                );
              }
              return <div key={i} className={"bubble " + m.from}>{renderMd(m.text)}</div>;
            })}
            {thinking && <div className="bubble fina thinking"><span /><span /><span /></div>}
            {msgs.length <= 1 && (
              <div className="suggest">
                <div className="eyebrow" style={{ marginBottom: 8 }}>{T("fina.suggested")}</div>
                <div className="suggest-chips">
                  {suggested.map((s) => <button key={s} className="sg-chip" onClick={() => ask(s)}>{s}</button>)}
                </div>
              </div>
            )}
          </div>
          <div className="fina-input">
            {/* Foto-Upload (Kamera) */}
            <button className="btn btn-ghost fina-upload-btn" onClick={() => photoRef.current?.click()} aria-label={de ? "Foto aufnehmen" : "Take photo"} title={de ? "Foto aufnehmen · Beleg scannen" : "Take photo · Scan receipt"}>
              <Icon name="upload" size={17} />
            </button>
            <input type="file" ref={photoRef} onChange={handlePhoto} accept="image/*" capture="environment" style={{ display: "none" }} />
            
            {/* Beleg-Upload (Text/CSV/PDF) */}
            <button className="btn btn-ghost fina-upload-btn" onClick={() => fileRef.current?.click()} aria-label={de ? "Beleg hochladen" : "Upload receipt"} title={de ? "Beleg hochladen" : "Upload receipt"}>
              <span style={{ fontSize: 17 }}>📎</span>
            </button>
            <input type="file" ref={fileRef} onChange={handleFile} accept=".txt,.csv,.json,.pdf,image/*" style={{ display: "none" }} />
            
            {/* Text-Input */}
            <input className="input" value={input} placeholder={T("fina.placeholder")}
              onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && ask()} />
            
            {/* Spracheingabe (Voice) */}
            <button className="btn btn-ghost fina-upload-btn" onClick={toggleVoice} aria-label={de ? "Sprechen" : "Speak"} title={de ? "Sprechen · Beleg diktieren" : "Speak · Dictate receipt"}
              style={recording ? { color: "var(--neg)", animation: "pulse 1s infinite" } : {}}>
              {recording ? "●" : <span style={{ fontSize: 17 }}>🎙️</span>}
            </button>
            
            {/* Senden */}
            <button className="btn btn-primary" onClick={() => ask()} aria-label="send"><Icon name="send" size={17} /></button>
          </div>
          <div className="fina-disc">{T("fina.disclaimer")}</div>
        </div>

        {/* insights */}
        <div className="grid">
          <div className="card card-pad fina-summary">
            <div className="card-h"><h3>{de ? "Heute für dich" : "Today for you"}</h3></div>
            <div className="grid cols-3" style={{ gap: 10, textAlign: "center" }}>
              <div><div className="num" style={{ fontSize: 22, fontWeight: 780, color: "var(--brand)" }}>{F.chf(1840, { noCur: true })}</div><div style={{ fontSize: 10.5, color: "var(--ink-3)", fontWeight: 600, marginTop: 2 }}>CHF {T("fina.potential")}</div></div>
              <div><div className="num" style={{ fontSize: 22, fontWeight: 780 }}>7</div><div style={{ fontSize: 10.5, color: "var(--ink-3)", fontWeight: 600, marginTop: 2 }}>{T("fina.actions")}</div></div>
              <div><div className="num" style={{ fontSize: 22, fontWeight: 780, color: "var(--neg)" }}>3</div><div style={{ fontSize: 10.5, color: "var(--ink-3)", fontWeight: 600, marginTop: 2 }}>{T("fina.urgent")}</div></div>
            </div>
          </div>
          {actions.map((a) => (
            <div className="card card-pad action-card" key={a.t}>
              <div style={{ display: "flex", gap: 12 }}>
                <div className="ic" style={{ fontSize: 18 }}>{a.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ fontWeight: 680, fontSize: 14 }}>{a.t}</div>
                    {a.u && <span className="chip neg" style={{ fontSize: 10, padding: "2px 7px" }}>{T("fina.urgent")}</span>}
                  </div>
                  <div style={{ fontSize: 12.5, color: "var(--ink-2)", marginTop: 4, lineHeight: 1.45 }}>{a.d}</div>
                </div>
                <div className="num" style={{ fontWeight: 740, fontSize: 14, color: a.v.startsWith("+") ? "var(--brand)" : a.v.startsWith("−") ? "var(--neg)" : "var(--ink)" }}>{a.v}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

window.Fina = Fina;