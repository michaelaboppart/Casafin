/* ============================================================
   CasaFin — Fina (AI copilot, scripted over real data)
   ============================================================ */
const { useState: useStateF, useRef: useRefF, useEffect: useEffectF } = React;

function finaAnswer(q, lang) {
  const S = window.Vault.sel, F = window.fmt;
  const t = q.toLowerCase();
  const income = S.income(), spent = S.monthSpent(), saved = income - spent;
  const de = lang === "de";

  // car / afford
  const m = t.match(/(\d[\d'’.]{2,})/);
  if (/(auto|car|leist|afford|kauf|buy)/.test(t)) {
    const price = m ? parseFloat(m[1].replace(/['’.]/g, "")) : 35000;
    const monthly = Math.round(price / 48);
    const pct = Math.round((monthly / saved) * 100);
    return de
      ? `Basierend auf deinen Daten sparst du aktuell rund **${F.chf(saved)}/Monat**. Bei einer Finanzierung von ${F.chf(price)} über 48 Monate wären das ca. **${F.chf(monthly)}/Mt.** — das entspricht **${pct}% deiner Sparquote**. Tragbar, aber ich würde maximal 40% empfehlen. Soll ich dir die Auswirkung aufs Budget zeigen?`
      : `Based on your data you currently save about **${F.chf(saved)}/month**. Financing ${F.chf(price)} over 48 months is roughly **${F.chf(monthly)}/mo** — that's **${pct}% of your savings rate**. Affordable, but I'd keep it under 40%. Want me to show the budget impact?`;
  }
  // pillar 3a
  if (/(säule|saule|3a|pillar|vorsorge|pension)/.test(t)) {
    const headroom = 4342, taxSave = "CHF 800–1'200";
    return de
      ? `Du hast dieses Jahr noch **${F.chf(headroom)}** Spielraum für die 3. Säule (Max. 2026: CHF 7'056). Eine Maximaleinzahlung würde deine Steuerrechnung in Kanton Zürich um geschätzt **${taxSave}** senken — je nach Einkommen.`
      : `You still have **${F.chf(headroom)}** of pillar 3a headroom this year (2026 max: CHF 7,056). Contributing the maximum would cut your Zurich tax bill by an estimated **${taxSave}** — depending on income.`;
  }
  // tax
  if (/(steuer|tax|abzug|deduction)/.test(t)) {
    return de
      ? `Ich habe für 2025 (Kanton Zürich) **${F.chf(2400)}** an Abzügen erkannt — inkl. Berufsauslagen und Versicherungsprämien. **${F.chf(1200)}** zusätzliche Abzüge sind noch möglich. CasaTax bereitet alles für deinen Treuhänder vor.`
      : `For 2025 (Canton Zurich) I've identified **${F.chf(2400)}** in deductions — including professional expenses and insurance premiums. **${F.chf(1200)}** of additional deductions are still possible. CasaTax prepares everything for your trustee.`;
  }
  // save more / overview
  if (/(spar|save|mehr|more|budget|ausgeb|spend|überblick|overview)/.test(t)) {
    const top = [...window.Vault.data.budget.categories].sort((a, b) => b.spent - a.spent)[0];
    const over = window.Vault.data.budget.categories.filter((c) => c.spent > c.budget);
    return de
      ? `Diesen Monat hast du **${F.chf(spent)}** ausgegeben bei **${F.chf(income)}** Einnahmen — Sparquote **${S.savingsRate()}%**. Grösster Posten: ${top.name} (${F.chf(top.spent)}).${over.length ? ` Über Budget: ${over.map(c => c.name).join(", ")}.` : ""} Reduziere «Freizeit» um CHF 100 und du sparst CHF 1'200/Jahr extra.`
      : `This month you spent **${F.chf(spent)}** on **${F.chf(income)}** income — savings rate **${S.savingsRate()}%**. Biggest category: ${top.name} (${F.chf(top.spent)}).${over.length ? ` Over budget: ${over.map(c => c.name).join(", ")}.` : ""} Trim "Freizeit" by CHF 100 and you'd save an extra CHF 1,200/year.`;
  }
  // net worth
  if (/(vermögen|vermogen|net worth|worth|reich|wealth)/.test(t)) {
    return de
      ? `Dein Gesamtvermögen liegt bei **${F.chf(S.netWorth())}** — ${F.chf(S.liquid())} liquid, ${F.chf(S.invest())} investiert, ${F.chf(S.pillar())} in der 3. Säule. Trend: +2.1% diesen Monat. 📈`
      : `Your net worth is **${F.chf(S.netWorth())}** — ${F.chf(S.liquid())} liquid, ${F.chf(S.invest())} invested, ${F.chf(S.pillar())} in pillar 3a. Trend: +2.1% this month. 📈`;
  }
  // default
  return de
    ? `Gute Frage. Auf Basis deiner Daten: Vermögen **${F.chf(S.netWorth())}**, Sparquote **${S.savingsRate()}%**, Finanzgesundheit **${S.health()}/100**. Frag mich z.B. nach Steuerabzügen, deiner 3. Säule oder ob du dir etwas leisten kannst.`
    : `Good question. From your data: net worth **${F.chf(S.netWorth())}**, savings rate **${S.savingsRate()}%**, financial health **${S.health()}/100**. Ask me about tax deductions, your pillar 3a, or whether you can afford something.`;
}

function renderMd(s) {
  const parts = s.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) => p.startsWith("**") ? <b key={i}>{p.slice(2, -2)}</b> : <span key={i}>{p}</span>);
}

function Fina({ lang }) {
  const T = (k) => window.I18N.t(k, lang);
  const F = window.fmt;
  const suggested = lang === "de"
    ? ["Kann ich mir ein Auto für CHF 35'000 leisten?", "Wie viel kann ich in die 3. Säule einzahlen?", "Wo gebe ich zu viel aus?", "Welche Steuerabzüge habe ich?"]
    : ["Can I afford a car for CHF 35,000?", "How much can I add to pillar 3a?", "Where do I overspend?", "What tax deductions do I have?"];
  const [msgs, setMsgs] = useStateF([{ from: "fina", text: T("fina.intro") }]);
  const [input, setInput] = useStateF("");
  const [thinking, setThinking] = useStateF(false);
  const scrollRef = useRefF(null);

  useEffectF(() => { if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; }, [msgs, thinking]);

  function ask(text) {
    const q = (text ?? input).trim();
    if (!q || thinking) return;
    setMsgs((m) => [...m, { from: "me", text: q }]);
    setInput("");
    setThinking(true);
    setTimeout(() => {
      setThinking(false);
      setMsgs((m) => [...m, { from: "fina", text: finaAnswer(q, lang) }]);
    }, 850);
  }

  const actions = lang === "de"
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
              <div style={{ fontSize: 12, color: "var(--brand)", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}><span className="dot" /> {lang === "de" ? "Online · kennt deine Zahlen" : "Online · knows your numbers"}</div>
            </div>
          </div>
          <div className="fina-msgs scroll" ref={scrollRef}>
            {msgs.map((m, i) => (
              <div key={i} className={"bubble " + m.from}>{renderMd(m.text)}</div>
            ))}
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
            <input className="input" value={input} placeholder={T("fina.placeholder")}
              onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && ask()} />
            <button className="btn btn-primary" onClick={() => ask()} aria-label="send"><Icon name="send" size={17} /></button>
          </div>
          <div className="fina-disc">{T("fina.disclaimer")}</div>
        </div>

        {/* insights */}
        <div className="grid">
          <div className="card card-pad fina-summary">
            <div className="card-h"><h3>{lang === "de" ? "Heute für dich" : "Today for you"}</h3></div>
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
