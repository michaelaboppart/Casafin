/* ============================================================
   CasaFin — Business (Einzelfirma): P&L · VAT · auto-bookkeeping
   ============================================================ */
const { useState: useStateBiz, useEffect: useEffectBiz } = React;

/* Swiss SME chart of accounts (Kontenrahmen KMU) */
const KONTO_REV = { nr: "3000", name: "Dienstleistungsertrag" };
const KONTO_EXP = {
  Material: { nr: "4000", name: "Materialaufwand" },
  "Büro": { nr: "6000", name: "Raumaufwand" },
  Fahrzeug: { nr: "6200", name: "Fahrzeugaufwand" },
  Versicherung: { nr: "6300", name: "Versicherungsaufwand" },
  Weiterbildung: { nr: "5830", name: "Weiterbildung" },
  _default: { nr: "6500", name: "Büro- & Verwaltung" },
};
const EXP_CATS = ["Material", "Büro", "Fahrzeug", "Versicherung", "Weiterbildung", "Sonstiges"];
function kontoFor(cat) { return KONTO_EXP[cat] || KONTO_EXP._default; }

function Business({ lang }) {
  const T = (k) => window.I18N.t(k, lang);
  const d = window.Vault.data, S = window.Vault.sel, F = window.fmt;
  const biz = d.business;
  const [open, setOpen] = useStateBiz(false);
  const [form, setForm] = useStateBiz({ kind: "revenue", label: "", amount: "", cat: "Material" });

  // Listen for booking suggestions from Fina
  useEffectBiz(() => {
    function onFinaBooking(e) {
      const b = e.detail;
      if (!b) return;
      setForm({
        kind: b.kind || "expense",
        label: b.label || "",
        amount: b.amount ? String(b.amount) : "",
        cat: b.category || "Sonstiges",
      });
      setOpen(true);
    }
    window.addEventListener("fina.booking", onFinaBooking);
    return () => window.removeEventListener("fina.booking", onFinaBooking);
  }, []);

  const rev = S.bizRevenue(), exp = S.bizExpenses(), profit = rev - exp;
  const vatOut = Math.round(rev * biz.vatRate / 100);
  const vatIn = Math.round(exp * biz.vatRate / 100);
  const vatBal = vatOut - vatIn;

  function save() {
    const amt = Math.abs(parseFloat(String(form.amount).replace(/['’]/g, "")) || 0);
    if (!amt || !form.label.trim()) return;
    window.Vault.update((data) => {
      const id = "bz" + Date.now();
      if (form.kind === "revenue") data.business.revenue.unshift({ id, label: form.label.trim(), amount: amt, date: new Date().toISOString().slice(0, 10) });
      else data.business.expenses.unshift({ id, label: form.label.trim(), amount: amt, cat: form.cat });
      window.Vault.log("business.entry", form.kind + " · " + form.label);
    });
    setOpen(false); setForm({ kind: "revenue", label: "", amount: "", cat: "Material" });
  }

  function exportAbschluss() {
    const L = [];
    L.push("CasaFin — Jahresabschluss (Erfolgsrechnung)");
    L.push(biz.name + " · " + biz.year);
    L.push("Erstellt: " + new Date().toLocaleString("de-CH"));
    L.push("");
    L.push("ERTRAG");
    biz.revenue.forEach((r) => L.push("  " + KONTO_REV.nr + "  " + r.label.padEnd(34) + F.chf(r.amount)));
    L.push("  " + "".padEnd(6) + "Total Ertrag".padEnd(34) + F.chf(rev));
    L.push("");
    L.push("AUFWAND");
    biz.expenses.forEach((e) => { const k = kontoFor(e.cat); L.push("  " + k.nr + "  " + e.label.padEnd(34) + F.chf(e.amount)); });
    L.push("  " + "".padEnd(6) + "Total Aufwand".padEnd(34) + F.chf(exp));
    L.push("");
    L.push("  " + "".padEnd(6) + "GEWINN VOR STEUERN".padEnd(34) + F.chf(profit));
    L.push("");
    L.push("MWST (" + biz.vatRate + "%): Umsatzsteuer " + F.chf(vatOut) + " − Vorsteuer " + F.chf(vatIn) + " = Saldo " + F.chf(vatBal));
    const blob = new Blob([L.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "CasaFin-Abschluss-" + biz.year + ".txt"; a.click();
    URL.revokeObjectURL(url);
    window.Vault.logPersist("business.exported", "Jahresabschluss " + biz.year);
  }

  return (
    <div className="animate">
      <div className="screen-toolbar">
        <span className="seclabel"><Icon name="briefcase" size={12} /> {biz.name}{biz.vatRegistered ? " · " + T("biz.registered") : ""}</span>
        <button className="btn btn-ghost" style={{ marginLeft: "auto" }} onClick={() => setOpen(true)}><Icon name="plus" size={16} /> {T("biz.add")}</button>
        <button className="btn btn-gold" style={{ marginLeft: 0 }} onClick={exportAbschluss}><Icon name="download" size={16} /> {T("biz.export")}</button>
      </div>

      <div className="grid cols-4" style={{ marginBottom: 18 }}>
        <div className="stat"><div className="k"><Icon name="budget" size={15} /> {T("biz.revenue")}</div><div className="v num up" style={{ fontSize: 23 }}>{F.chf(rev)}</div></div>
        <div className="stat"><div className="k"><Icon name="budget" size={15} style={{ transform: "scaleY(-1)" }} /> {T("biz.expenses")}</div><div className="v num" style={{ fontSize: 23 }}>{F.chf(exp)}</div></div>
        <div className="stat"><div className="k"><Icon name="briefcase" size={15} /> {T("biz.profit")}</div><div className="v num" style={{ fontSize: 23, color: "var(--brand)" }}>{F.chf(profit)}</div></div>
        <div className="stat"><div className="k"><Icon name="folder" size={15} /> {T("biz.vat")}</div><div className="v num" style={{ fontSize: 23, color: vatBal > 0 ? "var(--neg)" : "var(--brand)" }}>{F.chf(vatBal)}</div><div className="s">{biz.vatRate}% MWST</div></div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "1.55fr 1fr", alignItems: "start" }}>
        {/* Erfolgsrechnung */}
        <div className="card card-pad">
          <div className="card-h"><h3>{T("biz.pl")}</h3><span className="eyebrow" style={{ marginLeft: "auto" }}>{biz.year}</span></div>
          <div className="pl-sec">{T("biz.revenue")}</div>
          {biz.revenue.map((r) => (
            <div className="bill-row" key={r.id} style={{ marginBottom: 8 }}>
              <span className="konto">{KONTO_REV.nr}</span>
              <div style={{ flex: 1 }}><div className="nm">{r.label}</div><div className="sub">{KONTO_REV.name} · <span style={{ color: "var(--brand-ink)" }}>{T("biz.autoBooked")}</span></div></div>
              <div className="num up" style={{ fontWeight: 740, fontSize: 15 }}>{F.chf(r.amount)}</div>
            </div>
          ))}
          <div className="pl-total"><span>{T("biz.total")} {T("biz.revenue")}</span><span className="num">{F.chf(rev)}</span></div>

          <div className="pl-sec" style={{ marginTop: 18 }}>{T("biz.expenses")}</div>
          {biz.expenses.map((e) => { const k = kontoFor(e.cat); return (
            <div className="bill-row" key={e.id} style={{ marginBottom: 8 }}>
              <span className="konto">{k.nr}</span>
              <div style={{ flex: 1 }}><div className="nm">{e.label}</div><div className="sub">{k.name} · <span style={{ color: "var(--brand-ink)" }}>{T("biz.autoBooked")}</span></div></div>
              <div className="num" style={{ fontWeight: 740, fontSize: 15 }}>{F.chf(e.amount)}</div>
            </div>
          ); })}
          <div className="pl-total"><span>{T("biz.total")} {T("biz.expenses")}</span><span className="num">{F.chf(exp)}</span></div>

          <div className="pl-profit"><span>{T("biz.net")}</span><span className="num">{F.chf(profit)}</span></div>
        </div>

        {/* right column */}
        <div className="grid">
          <div className="card card-pad" style={{ background: "linear-gradient(165deg, var(--brand-soft), transparent)" }}>
            <div className="card-h"><div className="set-ic" style={{ width: 30, height: 30 }}><Icon name="loop" size={16} /></div><h3>{T("biz.autoTitle")}</h3></div>
            <p style={{ fontSize: 13.5, color: "var(--ink-2)", lineHeight: 1.55 }}>{T("biz.autoDesc")}</p>
            <div className="seclabel" style={{ marginTop: 12 }}><Icon name="check" size={12} /> Kontenrahmen KMU</div>
          </div>

          <div className="card card-pad">
            <div className="card-h"><div className="set-ic" style={{ width: 30, height: 30 }}><Icon name="folder" size={16} /></div><h3>{T("biz.vatTitle")}</h3></div>
            <div className="vat-row"><span>{T("biz.vatOut")} <small>({biz.vatRate}%)</small></span><span className="num">{F.chf(vatOut)}</span></div>
            <div className="vat-row"><span>− {T("biz.vatIn")}</span><span className="num">{F.chf(vatIn)}</span></div>
            <div className="vat-row total"><span>{T("biz.vat")}</span><span className="num" style={{ color: vatBal > 0 ? "var(--neg)" : "var(--brand)" }}>{F.chf(vatBal)}</span></div>
            <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 10 }}>{vatBal > 0 ? (lang === "de" ? "an die ESTV zu zahlen" : "payable to the tax office") : (lang === "de" ? "Guthaben" : "credit")}</div>
          </div>
        </div>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={T("biz.add")}
        footer={<><button className="btn btn-ghost" onClick={() => setOpen(false)}>{T("common.cancel")}</button><button className="btn btn-primary" onClick={save}>{T("common.add")}</button></>}>
        <div className="field" style={{ marginBottom: 14 }}><label>{T("biz.kind")}</label>
          <Segmented value={form.kind} onChange={(v) => setForm({ ...form, kind: v })} options={[{ value: "revenue", label: T("biz.revenue") }, { value: "expense", label: T("biz.expenses") }]} />
        </div>
        <div className="field" style={{ marginBottom: 14 }}><label>{lang === "de" ? "Beschreibung" : "Description"}</label><input className="input" value={form.label} placeholder={lang === "de" ? "z.B. Honorar Projekt X" : "e.g. fee project X"} onChange={(e) => setForm({ ...form, label: e.target.value })} /></div>
        <div className="grid cols-2" style={{ gap: 14 }}>
          <div className="field"><label>{lang === "de" ? "Betrag (CHF)" : "Amount (CHF)"}</label><input className="input num" inputMode="decimal" value={form.amount} placeholder="0" onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
          {form.kind === "expense" && (
            <div className="field"><label>{T("biz.account")}</label>
              <select className="input" value={form.cat} onChange={(e) => setForm({ ...form, cat: e.target.value })}>
                {EXP_CATS.map((c) => <option key={c} value={c}>{kontoFor(c).nr} · {c}</option>)}
              </select>
            </div>
          )}
        </div>
        <div className="seclabel" style={{ marginTop: 16 }}><Icon name="loop" size={12} /> {T("biz.autoBooked")} · Kontenrahmen KMU</div>
      </Modal>
    </div>
  );
}

window.Business = Business;
