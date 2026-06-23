/* ============================================================
   CasaFin — Fina (AI copilot, real LLM via /api/fina)
   Beleg-Upload + Text-Chat → Buchungsvorschlag → Bestätigung
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
  const [thinking, setThinking] = useStateF(false);
  const scrollRef = useRefF(null);
  const fileRef = useRefF(null);

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
    return lines.join("\n");
  }

  // Send to /api/fina and handle response
  async function callFina(text) {
    const ctx = buildContext();
    const r = await fetch("/api/fina", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: text, lang, context: ctx }),
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
      const resp = await callFina(q);
      setThinking(false);
      if (resp.type === "booking") {
        // Show booking suggestion with confirm button
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

  // Beleg-Upload: read file as text (OCR would be server-side; for MVP we send filename + any text)
  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file || thinking) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const text = reader.result;
      // Send the extracted text to Fina
      const q = de
        ? `Beleg hochgeladen: ${file.name}\n\nInhalt:\n${String(text).slice(0, 4000)}`
        : `Receipt uploaded: ${file.name}\n\nContent:\n${String(text).slice(0, 4000)}`;
      setMsgs((m) => [...m, { from: "me", text: de ? `📎 Beleg: ${file.name}` : `📎 Receipt: ${file.name}` }]);
      setThinking(true);
      try {
        const resp = await callFina(q);
        setThinking(false);
        if (resp.type === "booking") {
          setMsgs((m) => [...m, { from: "fina", booking: resp }]);
        } else {
          setMsgs((m) => [...m, { from: "fina", text: resp.text || "…" }]);
        }
      } catch (e) {
        setThinking(false);
        setMsgs((m) => [...m, { from: "fina", text: de ? "Fehler beim Lesen des Belegs." : "Error reading receipt." }]);
      }
    };
    reader.readAsText(file);
    e.target.value = ""; // reset input
  }

  // Confirm booking → pre-fill Business form via custom event
  function confirmBooking(booking) {
    // Dispatch event that Business screen listens to
    window.dispatchEvent(new CustomEvent("fina.booking", { detail: booking }));
    setMsgs((m) => [...m, { from: "fina", text: de
      ? `✅ Buchungsvorschlag übernommen. Bitte überprüfe und bestätige im Einzelfirma-Bereich.`
      : `✅ Booking suggestion transferred. Please review and confirm in the Business section.` }]);
  }

  const actions = de
    ? [{ icon: "💳", t: "Krankenkasse AXA fällig", d: "CHF 420 in 3 Tagen — automatische Zahlung einrichten.", v: "CHF 420", u: true },
       { icon: "📋", t: "Steuerabzüge optimieren", d: "CHF 1'200 zusätzliche Abzüge möglich — Kt. Zürich 2025.", v: "+CHF 1'200", u: false },
       { icon: "💡", t: "Freizeit über Budget", d: "CHF 112 über dem Monatsbudget — Tendenz steigend.", v: "−CHF 112", u: false }]
    : [{ icon: "💳", t: "Health insurance AXA due", d: "CHF 420 in 3 days — set up automatic payment.", v: "CHF 420", u: true },
       { icon: "📋", t: "Optimise tax deductions", d: "CHF 1,200 additional deductions possible — ZH 2025.", v: "+CHF 1,200", u: false },
       { icon: "💡", t: "Leisure over budget", d: "CHF 112 above monthly budget — trending up.", v: "−CHF 112", u: false }];

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
                      <div><span className="bk-label">{de ? "Betrag" : "Amount"}</span><span className="bk-val num" style={{ fontWeight: 740 }}>CHF {m.booking.amount}</span></div>
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
            <button className="btn btn-ghost fina-upload-btn" onClick={() => fileRef.current?.click()} aria-label={de ? "Beleg hochladen" : "Upload receipt"} title={de ? "Beleg hochladen" : "Upload receipt"}>
              <Icon name="upload" size={17} />
            </button>
            <input type="file" ref={fileRef} onChange={handleFile} accept=".txt,.csv,.json,.pdf" style={{ display: "none" }} />
            <input className="input" value={input} placeholder={T("fina.placeholder")}
              onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && ask()} />
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