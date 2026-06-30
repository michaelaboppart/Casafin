/* ============================================================
   CasaFin — Business (Einzelfirma): P&L · VAT · auto-bookkeeping
   Automation-first capture + editable chart of accounts (Vault)
   ============================================================ */
const { useState: useStateBiz } = React;

/* ---------- chart of accounts frameworks (seed; editable in Vault) ---------- */
const FRAMEWORKS = {
  kmu: {
    label: { de: "KMU (vollständig)", en: "SME (full)" },
    accounts: [
      { nr: "3000", name: "Dienstleistungsertrag", type: "revenue" },
      { nr: "3200", name: "Handelsertrag", type: "revenue" },
      { nr: "3400", name: "Übriger Ertrag", type: "revenue" },
      { nr: "4000", name: "Materialaufwand", type: "expense" },
      { nr: "5000", name: "Personalaufwand", type: "expense" },
      { nr: "5830", name: "Weiterbildung", type: "expense" },
      { nr: "6000", name: "Raumaufwand", type: "expense" },
      { nr: "6100", name: "Unterhalt & Reparaturen", type: "expense" },
      { nr: "6200", name: "Fahrzeugaufwand", type: "expense" },
      { nr: "6300", name: "Versicherungsaufwand", type: "expense" },
      { nr: "6500", name: "Büro- & Verwaltung", type: "expense" },
      { nr: "6570", name: "Informatikaufwand", type: "expense" },
      { nr: "6600", name: "Werbeaufwand", type: "expense" },
    ],
    map: { Material: "4000", "Büro": "6500", Fahrzeug: "6200", Versicherung: "6300", Weiterbildung: "5830", Sonstiges: "6500" },
    defRev: "3000",
  },
  kmulight: {
    label: { de: "KMU-Light", en: "SME-Light" },
    accounts: [
      { nr: "3000", name: "Ertrag", type: "revenue" },
      { nr: "4000", name: "Materialaufwand", type: "expense" },
      { nr: "6000", name: "Betriebsaufwand", type: "expense" },
      { nr: "6200", name: "Fahrzeugaufwand", type: "expense" },
      { nr: "6300", name: "Versicherungsaufwand", type: "expense" },
      { nr: "5830", name: "Weiterbildung", type: "expense" },
      { nr: "6500", name: "Verwaltung", type: "expense" },
    ],
    map: { Material: "4000", "Büro": "6000", Fahrzeug: "6200", Versicherung: "6300", Weiterbildung: "5830", Sonstiges: "6500" },
    defRev: "3000",
  },
};
const EXP_CATS = ["Material", "Büro", "Fahrzeug", "Versicherung", "Weiterbildung", "Sonstiges"];
const DEFAULT_VAT = [{ rate: 8.1, name: "Normalsatz" }, { rate: 3.8, name: "Beherbergung" }, { rate: 2.6, name: "Reduziert" }, { rate: 0, name: "Befreit" }];
function freshChart(key) { const f = FRAMEWORKS[key] || FRAMEWORKS.kmu; return { framework: key in FRAMEWORKS ? key : "kmu", accounts: f.accounts.map((a) => ({ ...a })), map: { ...f.map }, defRev: f.defRev, vatRates: DEFAULT_VAT.map((v) => ({ ...v })), vatDefault: 8.1 }; }
function getChart(d) {
  const c = (d.business && d.business.chart) ? { ...d.business.chart } : freshChart("kmu");
  if (!c.vatRates || !c.vatRates.length) c.vatRates = DEFAULT_VAT.map((v) => ({ ...v }));
  if (c.vatDefault == null) c.vatDefault = c.vatRates[0].rate;
  return c;
}
function rateName(chart, rate) { const r = chart.vatRates.find((v) => Number(v.rate) === Number(rate)); return r ? r.name : (rate + "%"); }
function accByNr(chart, nr) { return chart.accounts.find((a) => a.nr === nr); }
function revAccount(chart) { return accByNr(chart, chart.defRev) || chart.accounts.find((a) => a.type === "revenue") || { nr: "3000", name: "Ertrag" }; }
function expAccount(chart, cat) { return accByNr(chart, chart.map[cat] || chart.map.Sonstiges) || { nr: "—", name: cat }; }

/* ---------- lightweight local parsers (offline, AI-upgradeable) ---------- */
function bizToday() { return new Date().toISOString().slice(0, 10); }
function bizAmt(s) {
  const m = String(s).match(/(\d[\d'’.\s]*[.,]?\d*)/);
  if (!m) return 0;
  let n = m[1].replace(/['’\s]/g, "");
  if (n.indexOf(",") > -1 && n.indexOf(".") === -1) n = n.replace(",", ".");
  else n = n.replace(/,/g, "");
  return Math.abs(parseFloat(n) || 0);
}
function bizCat(t) {
  t = (t || "").toLowerCase();
  if (/(tank|benzin|diesel|fahrzeug|auto|garage|parking|sbb|zug|öv|\bov\b|mobility)/.test(t)) return "Fahrzeug";
  if (/(material|ware|rohstoff|werkzeug)/.test(t)) return "Material";
  if (/(büro|buro|office|miete|raum|strom|internet|telefon|domain|hosting|software|saas|abo)/.test(t)) return "Büro";
  if (/(versicher|haftpflicht|police|suva|bvg)/.test(t)) return "Versicherung";
  if (/(kurs|weiterbildung|seminar|schulung|workshop|konferenz)/.test(t)) return "Weiterbildung";
  return "Sonstiges";
}
function bizKind(t) {
  t = (t || "").toLowerCase();
  if (/(honorar|umsatz|ertrag|einnahme|erhalten|verkauf|rechnung gestellt|eingang|gutschrift|kunde|lohn erhalten)/.test(t)) return "revenue";
  return "expense";
}
function bizDate(t) {
  const d = new Date(); t = (t || "").toLowerCase();
  if (/vorgestern/.test(t)) d.setDate(d.getDate() - 2);
  else if (/gestern/.test(t)) d.setDate(d.getDate() - 1);
  const iso = t.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return iso[0];
  const ch = t.match(/(\d{1,2})\.(\d{1,2})\.(\d{2,4})/);
  if (ch) { let y = ch[3].length === 2 ? "20" + ch[3] : ch[3]; return y + "-" + ch[2].padStart(2, "0") + "-" + ch[1].padStart(2, "0"); }
  return d.toISOString().slice(0, 10);
}
function bizLabel(t) {
  let s = String(t || "")
    .replace(/^\s*(erfasse?|erfass|buche?|trage?|notiere?|add|book|record)\b/i, "")
    .replace(/\b(mir|bitte|eine?|einen|den|die|das|für|fuer|von|vom|am)\b/gi, " ")
    .replace(/\b(chf|fr\.?|franken|sfr)\b/gi, " ")
    .replace(/(\d[\d'’.,\s]*\.?-?)/g, " ")
    .replace(/\b(gestern|heute|vorgestern)\b/gi, " ")
    .replace(/\b(einnahme|ausgabe|ausgaben|einnahmen)\b/gi, " ")
    .replace(/\s+/g, " ").trim();
  if (!s) s = "Buchung";
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function parseBookingCommand(text) {
  return { kind: bizKind(text), label: bizLabel(text), amount: bizAmt(text), cat: bizCat(text), date: bizDate(text) };
}
function parseCamt053(xml) {
  try {
    const doc = new DOMParser().parseFromString(xml, "application/xml");
    const ntries = Array.prototype.slice.call(doc.getElementsByTagName("Ntry"));
    return ntries.map((n, i) => {
      const amtEl = n.getElementsByTagName("Amt")[0];
      const cd = (n.getElementsByTagName("CdtDbtInd")[0] || {}).textContent || "DBIT";
      const bd = n.getElementsByTagName("BookgDt")[0];
      const dt = bd && bd.getElementsByTagName("Dt")[0] ? bd.getElementsByTagName("Dt")[0].textContent : "";
      const u = n.getElementsByTagName("Ustrd")[0] || n.getElementsByTagName("AddtlNtryInf")[0];
      const desc = u ? u.textContent.trim() : "";
      return { sel: true, kind: cd === "CRDT" ? "revenue" : "expense", amount: Math.abs(parseFloat(amtEl ? amtEl.textContent : 0) || 0), label: desc || ("Transaktion " + (i + 1)), date: (dt || "").slice(0, 10), cat: bizCat(desc) };
    }).filter((r) => r.amount > 0);
  } catch (e) { return []; }
}
function parseCsvRows(txt) {
  const lines = txt.trim().split(/\r?\n/).filter(Boolean);
  const out = [];
  lines.forEach((line, i) => {
    if (i === 0 && /datum|date|betrag|amount|beschreib|description|text/i.test(line)) return;
    const c = line.split(/[;\t,]/);
    if (c.length < 2) return;
    const date = (c[0] || "").trim();
    const label = (c[1] || "").trim();
    const amtCell = c.length > 2 ? c[2] : c[1];
    const neg = /-/.test(String(amtCell));
    out.push({ sel: true, kind: neg ? "expense" : "revenue", amount: bizAmt(amtCell), label: label || "Import", date: date.slice(0, 10), cat: bizCat(label) });
  });
  return out.filter((r) => r.amount > 0);
}
async function casafinAiExtract(payload) {
  const ep = window.CASAFIN_AI_ENDPOINT;
  if (!ep) return null;
  try {
    const r = await fetch(ep, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (!r.ok) return null;
    return await r.json();
  } catch (e) { return null; }
}

function Business({ lang }) {
  const T = (k) => window.I18N.t(k, lang);
  const de = lang === "de";
  const d = window.Vault.data, S = window.Vault.sel, F = window.fmt;
  const biz = d.business;
  const chart = getChart(d);
  const [open, setOpen] = useStateBiz(false);
  const [mode, setMode] = useStateBiz("hub");
  const [form, setForm] = useStateBiz({ kind: "revenue", label: "", amount: "", cat: "Material", vat: getChart(window.Vault.data).vatDefault });
  const [chat, setChat] = useStateBiz("");
  const [draft, setDraft] = useStateBiz(null);
  const [rows, setRows] = useStateBiz(null);
  const [busy, setBusy] = useStateBiz(false);
  const [note, setNote] = useStateBiz("");
  const [chartOpen, setChartOpen] = useStateBiz(false);
  const [cd, setCd] = useStateBiz(null); // chart draft

  const rev = S.bizRevenue(), exp = S.bizExpenses(), profit = rev - exp;
  const vof = (it) => (it.vat === 0 || it.vat) ? it.vat : biz.vatRate;
  const vatGroups = {};
  biz.revenue.forEach((r) => { const v = vof(r); (vatGroups[v] = vatGroups[v] || { out: 0, inp: 0 }).out += Math.round(r.amount * v / 100); });
  biz.expenses.forEach((e) => { const v = vof(e); (vatGroups[v] = vatGroups[v] || { out: 0, inp: 0 }).inp += Math.round(e.amount * v / 100); });
  const vatOut = Object.values(vatGroups).reduce((a, g) => a + g.out, 0);
  const vatIn = Object.values(vatGroups).reduce((a, g) => a + g.inp, 0);
  const vatBal = vatOut - vatIn;
  const vatRatesUsed = Object.keys(vatGroups).map(Number).sort((a, b) => b - a);
  const expCats = EXP_CATS;
  const expAccounts = chart.accounts.filter((a) => a.type === "expense");

  function openCapture() { setOpen(true); setMode("hub"); setDraft(null); setRows(null); setChat(""); setNote(""); setForm({ kind: "revenue", label: "", amount: "", cat: "Material", vat: chart.vatDefault }); }
  function closeCapture() { setOpen(false); setDraft(null); setRows(null); setChat(""); setNote(""); }

  function commit(entry) {
    const amt = Math.abs(parseFloat(String(entry.amount).replace(/['’]/g, "")) || 0);
    if (!amt || !String(entry.label).trim()) return false;
    window.Vault.update((data) => {
      const id = "bz" + Date.now() + Math.floor(Math.random() * 999);
      const vat = (entry.vat === 0 || entry.vat) ? Number(entry.vat) : chart.vatDefault;
      if (entry.kind === "revenue") data.business.revenue.unshift({ id, label: String(entry.label).trim(), amount: amt, date: entry.date || bizToday(), vat });
      else data.business.expenses.unshift({ id, label: String(entry.label).trim(), amount: amt, cat: entry.cat || "Sonstiges", date: entry.date || bizToday(), vat });
      window.Vault.log("business.entry", (entry.source || "manual") + " · " + entry.kind + " · " + entry.label);
    });
    return true;
  }

  async function runChat() {
    if (!chat.trim()) return;
    setBusy(true);
    const ai = await casafinAiExtract({ type: "text", text: chat, lang });
    setBusy(false);
    const p = ai || parseBookingCommand(chat);
    setDraft({ kind: p.kind || "expense", label: p.label || "", amount: String(p.amount || ""), cat: p.cat || "Sonstiges", date: p.date || bizToday(), vat: (p.vat === 0 || p.vat) ? p.vat : chart.vatDefault, source: ai ? "AI" : "Auto" });
  }
  function onReceipt(file) {
    if (!file) return;
    setBusy(true); setNote("");
    const reader = new FileReader();
    reader.onload = async () => {
      const ai = await casafinAiExtract({ type: "receipt", image: reader.result, name: file.name, lang });
      setBusy(false);
      if (ai) setDraft({ kind: ai.kind || "expense", label: ai.label || "", amount: String(ai.amount || ""), cat: ai.cat || "Sonstiges", date: ai.date || bizToday(), vat: (ai.vat === 0 || ai.vat) ? ai.vat : chart.vatDefault, source: "AI" });
      else { setNote(de ? "AI-Beleg-Scan ist noch nicht verbunden — Felder bitte prüfen/ergänzen." : "AI receipt scan not connected yet — please review fields."); setDraft({ kind: "expense", label: file.name.replace(/\.[^.]+$/, ""), amount: "", cat: bizCat(file.name), date: bizToday(), vat: chart.vatDefault, source: "Beleg" }); }
    };
    reader.readAsDataURL(file);
  }
  function onBankFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const txt = String(reader.result);
      const parsed = (/\.xml$/i.test(file.name) || /<Document|<Ntry/.test(txt)) ? parseCamt053(txt) : parseCsvRows(txt);
      setRows(parsed.length ? parsed : []);
      setNote(parsed.length ? "" : (de ? "Keine Transaktionen erkannt. Erwartet: camt.053 (XML) oder CSV (Datum;Text;Betrag)." : "No transactions found. Expected: camt.053 (XML) or CSV (date;text;amount)."));
    };
    reader.readAsText(file);
  }
  function importRows() {
    const sel = (rows || []).filter((r) => r.sel);
    let n = 0; sel.forEach((r) => { if (commit({ ...r, source: "Bank" })) n++; });
    setNote(de ? (n + " Buchungen übernommen.") : (n + " bookings imported."));
    setTimeout(closeCapture, 700);
  }

  /* ---------- chart editor ---------- */
  function openChartEditor() { setCd(JSON.parse(JSON.stringify(chart))); setChartOpen(true); }
  function saveChart() {
    const clean = { ...cd, accounts: cd.accounts.filter((a) => String(a.nr).trim() && String(a.name).trim()), vatRates: cd.vatRates.filter((v) => v.rate !== "" && v.rate != null).map((v) => ({ rate: Number(v.rate), name: v.name || (v.rate + "%") })) };
    window.Vault.update((data) => { data.business.chart = clean; window.Vault.log("business.chart", "Kontenplan aktualisiert (" + clean.accounts.length + " Konten)"); });
    setChartOpen(false); setCd(null);
  }
  function reseed(key) {
    if (!window.confirm(de ? "Rahmen wechseln setzt den Kontenplan auf die Vorlage zurück. Fortfahren?" : "Switching framework resets the chart to the template. Continue?")) return;
    setCd(freshChart(key));
  }
  function addAccount(type) { const c = { ...cd, accounts: cd.accounts.concat([{ nr: "", name: "", type }]) }; setCd(c); }
  function editAccount(i, k, v) { const a = cd.accounts.slice(); a[i] = { ...a[i], [k]: v }; setCd({ ...cd, accounts: a }); }
  function delAccount(i) { const a = cd.accounts.slice(); a.splice(i, 1); setCd({ ...cd, accounts: a }); }
  function setMap(cat, nr) { setCd({ ...cd, map: { ...cd.map, [cat]: nr } }); }

  function exportAbschluss() {
    const L = [];
    L.push("CasaFin — Jahresabschluss (Erfolgsrechnung)");
    L.push(biz.name + " · " + biz.year);
    L.push("Erstellt: " + new Date().toLocaleString("de-CH"));
    L.push("");
    L.push("ERTRAG");
    biz.revenue.forEach((r) => L.push("  " + revAccount(chart).nr + "  " + r.label.padEnd(34) + F.chf(r.amount)));
    L.push("  " + "".padEnd(6) + "Total Ertrag".padEnd(34) + F.chf(rev));
    L.push("");
    L.push("AUFWAND");
    biz.expenses.forEach((e) => { const k = expAccount(chart, e.cat); L.push("  " + k.nr + "  " + e.label.padEnd(34) + F.chf(e.amount)); });
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

  function DraftConfirm() {
    if (!draft) return null;
    return (
      <div className="animate" style={{ marginTop: 4 }}>
        <div className="seclabel" style={{ marginBottom: 12 }}><Icon name="check" size={12} /> {draft.source === "AI" ? (de ? "AI erkannt" : "AI detected") : (de ? "Erkannt" : "Detected")} · {de ? "bitte bestätigen" : "please confirm"}</div>
        <div className="field" style={{ marginBottom: 12 }}><label>{T("biz.kind")}</label>
          <Segmented value={draft.kind} onChange={(v) => setDraft({ ...draft, kind: v })} options={[{ value: "revenue", label: T("biz.revenue") }, { value: "expense", label: T("biz.expenses") }]} />
        </div>
        <div className="field" style={{ marginBottom: 12 }}><label>{de ? "Beschreibung" : "Description"}</label><input className="input" value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} /></div>
        <div className="grid cols-2" style={{ gap: 12 }}>
          <div className="field"><label>{de ? "Betrag (CHF)" : "Amount (CHF)"}</label><input className="input num" inputMode="decimal" value={draft.amount} placeholder="0" onChange={(e) => setDraft({ ...draft, amount: e.target.value })} /></div>
          {draft.kind === "expense"
            ? <div className="field"><label>{T("biz.account")}</label><select className="input" value={draft.cat} onChange={(e) => setDraft({ ...draft, cat: e.target.value })}>{expCats.map((c) => <option key={c} value={c}>{expAccount(chart, c).nr} · {c}</option>)}</select></div>
            : <div className="field"><label>{de ? "Datum" : "Date"}</label><input className="input" type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} /></div>}
        </div>
        <div className="grid cols-2" style={{ gap: 12, marginTop: 12 }}>
          <div className="field"><label>{de ? "MwSt-Satz" : "VAT rate"}</label>
            <select className="input" value={draft.vat} onChange={(e) => setDraft({ ...draft, vat: Number(e.target.value) })}>{chart.vatRates.map((v) => <option key={v.rate} value={v.rate}>{v.rate}% · {v.name}</option>)}</select>
          </div>
          {draft.kind === "expense" ? <div className="field"><label>{de ? "Datum" : "Date"}</label><input className="input" type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} /></div> : <div className="field" />}
        </div>
        {note && <div className="auth-err" style={{ marginTop: 12 }}>{note}</div>}
        <div className="seclabel" style={{ marginTop: 14 }}><Icon name="loop" size={12} /> {draft.kind === "expense" ? expAccount(chart, draft.cat).nr + " · " + expAccount(chart, draft.cat).name : revAccount(chart).nr + " · " + revAccount(chart).name} · {de ? "auto-kontiert" : "auto-posted"}</div>
      </div>
    );
  }

  function Tile({ icon, title, desc, onClick, badge }) {
    return (
      <button className="cap-tile" onClick={onClick}>
        <div className="cap-ic"><Icon name={icon} size={20} /></div>
        <div style={{ flex: 1, textAlign: "left" }}>
          <div className="cap-t">{title}{badge && <span className="cap-badge">{badge}</span>}</div>
          <div className="cap-d">{desc}</div>
        </div>
        <Icon name="arrow" size={16} />
      </button>
    );
  }

  let title = T("biz.add"), body = null, footer = null;
  if (mode === "hub") {
    title = de ? "Buchung erfassen" : "Add booking";
    body = (
      <div className="cap-hub animate">
        <p className="cap-lead">{de ? "Lass CasaFin buchen — wähle deine Quelle:" : "Let CasaFin do the booking — pick a source:"}</p>
        <Tile icon="sparkle" title={de ? "Per Chat erfassen" : "Capture by chat"} desc={de ? "„erfasse 250 CHF Tankquittung gestern“" : "“book 250 CHF fuel receipt yesterday”"} badge="AI" onClick={() => { setMode("chat"); setDraft(null); }} />
        <Tile icon="receipt" title={de ? "Beleg scannen" : "Scan receipt"} desc={de ? "Foto/PDF — AI liest Betrag, MwSt & Konto" : "Photo/PDF — AI reads amount, VAT & account"} badge="AI" onClick={() => { setMode("beleg"); setDraft(null); }} />
        <Tile icon="folder" title={de ? "Bank-Auszug importieren" : "Import bank statement"} desc={de ? "camt.053 (XML) oder CSV — alle Buchungen" : "camt.053 (XML) or CSV — all bookings"} onClick={() => { setMode("bank"); setRows(null); }} />
        <button className="cap-manual" onClick={() => setMode("manual")}>{de ? "oder manuell erfassen" : "or enter manually"}</button>
      </div>
    );
    footer = <button className="btn btn-ghost" onClick={closeCapture}>{T("common.cancel")}</button>;
  } else if (mode === "chat") {
    title = de ? "Per Chat erfassen" : "Capture by chat";
    body = draft ? <DraftConfirm /> : (
      <div className="animate">
        <p className="cap-lead">{de ? "Schreib in einem Satz, was du buchen willst:" : "Write in one sentence what to book:"}</p>
        <textarea className="input" rows={3} autoFocus value={chat} placeholder={de ? "z.B. erfasse 250 CHF Tankquittung von gestern" : "e.g. book 250 CHF fuel receipt yesterday"} onChange={(e) => setChat(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) runChat(); }} style={{ resize: "none" }} />
        <div className="cap-hints">{(de ? ["Honorar 1'800 erhalten", "Büromiete 950 bezahlt", "Mobility 48.50 gestern"] : ["fee 1'800 received", "office rent 950 paid", "Mobility 48.50 yesterday"]).map((h) => <button key={h} className="cap-hint" onClick={() => setChat(h)}>{h}</button>)}</div>
      </div>
    );
    footer = draft
      ? <><button className="btn btn-ghost" onClick={() => setDraft(null)}>{de ? "Zurück" : "Back"}</button><button className="btn btn-primary" onClick={() => { if (commit({ ...draft })) closeCapture(); }}>{de ? "Buchen" : "Book"}</button></>
      : <><button className="btn btn-ghost" onClick={() => setMode("hub")}>{de ? "Zurück" : "Back"}</button><button className="btn btn-primary" onClick={runChat} disabled={busy || !chat.trim()}>{busy ? "…" : (de ? "Erkennen" : "Detect")} <Icon name="arrow" size={16} /></button></>;
  } else if (mode === "beleg") {
    title = de ? "Beleg scannen" : "Scan receipt";
    body = draft ? <DraftConfirm /> : (
      <div className="animate">
        <label className="dropzone" style={{ cursor: "pointer" }}>
          <input type="file" accept="image/*,application/pdf" style={{ display: "none" }} onChange={(e) => onReceipt(e.target.files[0])} />
          <div className="dz-icon"><Icon name="scan" size={24} /></div>
          <div style={{ fontWeight: 650 }}>{busy ? (de ? "Liest Beleg…" : "Reading receipt…") : (de ? "Foto / PDF auswählen" : "Choose photo / PDF")}</div>
          <div style={{ fontSize: 12.5, color: "var(--ink-3)", marginTop: 4 }}>{de ? "AI liest Händler, Datum, Betrag, MwSt & Konto" : "AI reads vendor, date, amount, VAT & account"}</div>
        </label>
        {note && <div className="auth-err" style={{ marginTop: 12 }}>{note}</div>}
      </div>
    );
    footer = draft
      ? <><button className="btn btn-ghost" onClick={() => { setDraft(null); setNote(""); }}>{de ? "Zurück" : "Back"}</button><button className="btn btn-primary" onClick={() => { if (commit({ ...draft })) closeCapture(); }}>{de ? "Buchen" : "Book"}</button></>
      : <button className="btn btn-ghost" onClick={() => setMode("hub")}>{de ? "Zurück" : "Back"}</button>;
  } else if (mode === "bank") {
    title = de ? "Bank-Auszug importieren" : "Import bank statement";
    body = (
      <div className="animate">
        {!rows ? (
          <label className="dropzone" style={{ cursor: "pointer" }}>
            <input type="file" accept=".xml,.csv,text/csv,application/xml" style={{ display: "none" }} onChange={(e) => onBankFile(e.target.files[0])} />
            <div className="dz-icon"><Icon name="folder" size={24} /></div>
            <div style={{ fontWeight: 650 }}>{de ? "camt.053 (XML) oder CSV wählen" : "Choose camt.053 (XML) or CSV"}</div>
            <div style={{ fontSize: 12.5, color: "var(--ink-3)", marginTop: 4 }}>{de ? "Alle Transaktionen werden automatisch kontiert" : "All transactions auto-categorised"}</div>
          </label>
        ) : (
          <div>
            <div className="seclabel" style={{ marginBottom: 10 }}><Icon name="check" size={12} /> {rows.length} {de ? "Transaktionen erkannt" : "transactions found"}</div>
            <div className="scroll" style={{ maxHeight: 300, overflowY: "auto", margin: "0 -4px", padding: "0 4px" }}>
              {rows.map((r, i) => (
                <label key={i} className="bill-row" style={{ marginBottom: 8, cursor: "pointer", alignItems: "center" }}>
                  <input type="checkbox" checked={r.sel} onChange={(e) => { const c = rows.slice(); c[i] = { ...r, sel: e.target.checked }; setRows(c); }} />
                  <div style={{ flex: 1, marginLeft: 4 }}><div className="nm">{r.label}</div><div className="sub">{r.date || "—"} · {r.kind === "revenue" ? revAccount(chart).nr + " " + revAccount(chart).name : expAccount(chart, r.cat).nr + " " + expAccount(chart, r.cat).name}</div></div>
                  <div className={"num" + (r.kind === "revenue" ? " up" : "")} style={{ fontWeight: 740 }}>{r.kind === "expense" ? "−" : ""}{F.chf(r.amount)}</div>
                </label>
              ))}
            </div>
          </div>
        )}
        {note && <div className={rows && rows.length ? "seclabel" : "auth-err"} style={{ marginTop: 12 }}>{note}</div>}
      </div>
    );
    footer = rows && rows.length
      ? <><button className="btn btn-ghost" onClick={() => { setRows(null); setNote(""); }}>{de ? "Andere Datei" : "Other file"}</button><button className="btn btn-primary" onClick={importRows}>{rows.filter((r) => r.sel).length} {de ? "übernehmen" : "import"}</button></>
      : <button className="btn btn-ghost" onClick={() => setMode("hub")}>{de ? "Zurück" : "Back"}</button>;
  } else {
    title = de ? "Manuell erfassen" : "Manual entry";
    body = (
      <div className="animate">
        <div className="field" style={{ marginBottom: 14 }}><label>{T("biz.kind")}</label>
          <Segmented value={form.kind} onChange={(v) => setForm({ ...form, kind: v })} options={[{ value: "revenue", label: T("biz.revenue") }, { value: "expense", label: T("biz.expenses") }]} />
        </div>
        <div className="field" style={{ marginBottom: 14 }}><label>{de ? "Beschreibung" : "Description"}</label><input className="input" value={form.label} placeholder={de ? "z.B. Honorar Projekt X" : "e.g. fee project X"} onChange={(e) => setForm({ ...form, label: e.target.value })} /></div>
        <div className="grid cols-2" style={{ gap: 14 }}>
          <div className="field"><label>{de ? "Betrag (CHF)" : "Amount (CHF)"}</label><input className="input num" inputMode="decimal" value={form.amount} placeholder="0" onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
          {form.kind === "expense" && (
            <div className="field"><label>{T("biz.account")}</label>
              <select className="input" value={form.cat} onChange={(e) => setForm({ ...form, cat: e.target.value })}>{expCats.map((c) => <option key={c} value={c}>{expAccount(chart, c).nr} · {c}</option>)}</select>
            </div>
          )}
        </div>
        <div className="field" style={{ marginTop: 14 }}><label>{de ? "MwSt-Satz" : "VAT rate"}</label>
          <select className="input" value={form.vat} onChange={(e) => setForm({ ...form, vat: Number(e.target.value) })}>{chart.vatRates.map((v) => <option key={v.rate} value={v.rate}>{v.rate}% · {v.name}</option>)}</select>
        </div>
        <div className="seclabel" style={{ marginTop: 16 }}><Icon name="loop" size={12} /> {T("biz.autoBooked")} · {de ? "Kontenplan" : "Chart"}: {FRAMEWORKS[chart.framework] ? FRAMEWORKS[chart.framework].label[lang] : chart.framework}</div>
      </div>
    );
    footer = <><button className="btn btn-ghost" onClick={() => setMode("hub")}>{de ? "Zurück" : "Back"}</button><button className="btn btn-primary" onClick={() => { if (commit({ ...form, source: "manual" })) closeCapture(); }}>{T("common.add")}</button></>;
  }

  return (
    <div className="animate">
      <div className="screen-toolbar">
        <span className="seclabel"><Icon name="briefcase" size={12} /> {biz.name}{biz.vatRegistered ? " · " + T("biz.registered") : ""}</span>
        <button className="btn btn-ghost" style={{ marginLeft: "auto" }} onClick={openChartEditor}><Icon name="settings" size={16} /> {de ? "Kontenplan" : "Chart"}</button>
        <button className="btn btn-primary" style={{ marginLeft: 0 }} onClick={openCapture}><Icon name="plus" size={16} /> {de ? "Buchung erfassen" : "Add booking"}</button>
        <button className="btn btn-gold" style={{ marginLeft: 0 }} onClick={exportAbschluss}><Icon name="download" size={16} /> {T("biz.export")}</button>
      </div>

      <div className="grid cols-4" style={{ marginBottom: 18 }}>
        <div className="stat"><div className="k"><Icon name="budget" size={15} /> {T("biz.revenue")}</div><div className="v num up" style={{ fontSize: 23 }}>{F.chf(rev)}</div></div>
        <div className="stat"><div className="k"><Icon name="budget" size={15} style={{ transform: "scaleY(-1)" }} /> {T("biz.expenses")}</div><div className="v num" style={{ fontSize: 23 }}>{F.chf(exp)}</div></div>
        <div className="stat"><div className="k"><Icon name="briefcase" size={15} /> {T("biz.profit")}</div><div className="v num" style={{ fontSize: 23, color: "var(--brand)" }}>{F.chf(profit)}</div></div>
        <div className="stat"><div className="k"><Icon name="folder" size={15} /> {T("biz.vat")}</div><div className="v num" style={{ fontSize: 23, color: vatBal > 0 ? "var(--neg)" : "var(--brand)" }}>{F.chf(vatBal)}</div><div className="s">{biz.vatRate}% MWST</div></div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "1.55fr 1fr", alignItems: "start" }}>
        <div className="card card-pad">
          <div className="card-h"><h3>{T("biz.pl")}</h3><span className="eyebrow" style={{ marginLeft: "auto" }}>{biz.year}</span></div>
          <div className="pl-sec">{T("biz.revenue")}</div>
          {biz.revenue.map((r) => (
            <div className="bill-row" key={r.id} style={{ marginBottom: 8 }}>
              <span className="konto">{revAccount(chart).nr}</span>
              <div style={{ flex: 1 }}><div className="nm">{r.label}</div><div className="sub">{revAccount(chart).name} · <span style={{ color: "var(--brand-ink)" }}>{T("biz.autoBooked")}</span></div></div>
              <div className="num up" style={{ fontWeight: 740, fontSize: 15 }}>{F.chf(r.amount)}</div>
            </div>
          ))}
          <div className="pl-total"><span>{T("biz.total")} {T("biz.revenue")}</span><span className="num">{F.chf(rev)}</span></div>

          <div className="pl-sec" style={{ marginTop: 18 }}>{T("biz.expenses")}</div>
          {biz.expenses.map((e) => { const k = expAccount(chart, e.cat); return (
            <div className="bill-row" key={e.id} style={{ marginBottom: 8 }}>
              <span className="konto">{k.nr}</span>
              <div style={{ flex: 1 }}><div className="nm">{e.label}</div><div className="sub">{k.name} · <span style={{ color: "var(--brand-ink)" }}>{T("biz.autoBooked")}</span></div></div>
              <div className="num" style={{ fontWeight: 740, fontSize: 15 }}>{F.chf(e.amount)}</div>
            </div>
          ); })}
          <div className="pl-total"><span>{T("biz.total")} {T("biz.expenses")}</span><span className="num">{F.chf(exp)}</span></div>

          <div className="pl-profit"><span>{T("biz.net")}</span><span className="num">{F.chf(profit)}</span></div>
        </div>

        <div className="grid">
          <div className="card card-pad" style={{ background: "linear-gradient(165deg, var(--brand-soft), transparent)" }}>
            <div className="card-h"><div className="set-ic" style={{ width: 30, height: 30 }}><Icon name="loop" size={16} /></div><h3>{T("biz.autoTitle")}</h3></div>
            <p style={{ fontSize: 13.5, color: "var(--ink-2)", lineHeight: 1.55 }}>{T("biz.autoDesc")}</p>
            <button className="seclabel" style={{ marginTop: 12, cursor: "pointer" }} onClick={openChartEditor}><Icon name="settings" size={12} /> {FRAMEWORKS[chart.framework] ? FRAMEWORKS[chart.framework].label[lang] : chart.framework} · {chart.accounts.length} {de ? "Konten — anpassen" : "accounts — edit"}</button>
          </div>

          <div className="card card-pad">
            <div className="card-h"><div className="set-ic" style={{ width: 30, height: 30 }}><Icon name="folder" size={16} /></div><h3>{T("biz.vatTitle")}</h3></div>
            <div className="vat-row"><span>{T("biz.vatOut")} <small>({biz.vatRate}%)</small></span><span className="num">{F.chf(vatOut)}</span></div>
            <div className="vat-row"><span>− {T("biz.vatIn")}</span><span className="num">{F.chf(vatIn)}</span></div>
            <div className="vat-row total"><span>{T("biz.vat")}</span><span className="num" style={{ color: vatBal > 0 ? "var(--neg)" : "var(--brand)" }}>{F.chf(vatBal)}</span></div>
            <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 10 }}>{vatBal > 0 ? (de ? "an die ESTV zu zahlen" : "payable to the tax office") : (de ? "Guthaben" : "credit")}</div>
            {vatRatesUsed.length > 1 && (
              <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid var(--line)" }}>
                <div className="eyebrow" style={{ marginBottom: 6 }}>{de ? "nach Satz" : "by rate"}</div>
                {vatRatesUsed.map((r) => (
                  <div className="vat-row" key={r} style={{ fontSize: 12.5 }}><span>{r}% · {rateName(chart, r)}</span><span className="num">{F.chf((vatGroups[r].out || 0) - (vatGroups[r].inp || 0))}</span></div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <Modal open={open} onClose={closeCapture} title={title} footer={footer}>{body}</Modal>

      <Modal open={chartOpen} onClose={() => { setChartOpen(false); setCd(null); }} title={de ? "Kontenplan bearbeiten" : "Edit chart of accounts"}
        footer={cd ? <><button className="btn btn-ghost" onClick={() => { setChartOpen(false); setCd(null); }}>{T("common.cancel")}</button><button className="btn btn-primary" onClick={saveChart}>{de ? "Speichern" : "Save"}</button></> : null}>
        {cd && (
          <div className="animate">
            <div className="field" style={{ marginBottom: 16 }}><label>{de ? "Vorlage" : "Template"}</label>
              <Segmented value={cd.framework} onChange={reseed} options={Object.keys(FRAMEWORKS).map((k) => ({ value: k, label: FRAMEWORKS[k].label[lang] }))} />
            </div>

            <div className="pl-sec">{de ? "Ertragskonten" : "Revenue accounts"}</div>
            {cd.accounts.map((a, i) => a.type === "revenue" && (
              <div key={i} className="koeditrow">
                <input className="input num" style={{ width: 78 }} value={a.nr} onChange={(e) => editAccount(i, "nr", e.target.value)} placeholder="Nr" />
                <input className="input" value={a.name} onChange={(e) => editAccount(i, "name", e.target.value)} placeholder={de ? "Bezeichnung" : "Name"} />
                <button className="koedel" onClick={() => delAccount(i)} aria-label="del"><Icon name="trash" size={15} /></button>
              </div>
            ))}
            <button className="cap-hint" style={{ marginTop: 6 }} onClick={() => addAccount("revenue")}><Icon name="plus" size={12} /> {de ? "Ertragskonto" : "Revenue account"}</button>

            <div className="pl-sec" style={{ marginTop: 18 }}>{de ? "Aufwandskonten" : "Expense accounts"}</div>
            {cd.accounts.map((a, i) => a.type === "expense" && (
              <div key={i} className="koeditrow">
                <input className="input num" style={{ width: 78 }} value={a.nr} onChange={(e) => editAccount(i, "nr", e.target.value)} placeholder="Nr" />
                <input className="input" value={a.name} onChange={(e) => editAccount(i, "name", e.target.value)} placeholder={de ? "Bezeichnung" : "Name"} />
                <button className="koedel" onClick={() => delAccount(i)} aria-label="del"><Icon name="trash" size={15} /></button>
              </div>
            ))}
            <button className="cap-hint" style={{ marginTop: 6 }} onClick={() => addAccount("expense")}><Icon name="plus" size={12} /> {de ? "Aufwandskonto" : "Expense account"}</button>

            <div className="pl-sec" style={{ marginTop: 18 }}>{de ? "Auto-Kontierung (Kategorie → Konto)" : "Auto-posting (category → account)"}</div>
            <p style={{ fontSize: 12.5, color: "var(--ink-3)", margin: "2px 0 10px", lineHeight: 1.5 }}>{de ? "Bestimmt, auf welches Konto Chat, Beleg & Bank-Import automatisch buchen." : "Controls which account chat, receipts & bank import post to automatically."}</p>
            {EXP_CATS.map((cat) => (
              <div key={cat} className="koeditrow">
                <span style={{ width: 110, fontSize: 13, fontWeight: 600 }}>{cat}</span>
                <select className="input" value={cd.map[cat] || ""} onChange={(e) => setMap(cat, e.target.value)}>
                  {cd.accounts.filter((a) => a.type === "expense").map((a) => <option key={a.nr} value={a.nr}>{a.nr} · {a.name}</option>)}
                </select>
              </div>
            ))}

            <div className="pl-sec" style={{ marginTop: 18 }}>{de ? "MwSt-Sätze" : "VAT rates"}</div>
            {cd.vatRates.map((v, i) => (
              <div key={i} className="koeditrow">
                <input className="input num" style={{ width: 78 }} value={v.rate} onChange={(e) => { const a = cd.vatRates.slice(); a[i] = { ...a[i], rate: e.target.value === "" ? "" : Number(e.target.value) }; setCd({ ...cd, vatRates: a }); }} placeholder="%" />
                <input className="input" value={v.name} onChange={(e) => { const a = cd.vatRates.slice(); a[i] = { ...a[i], name: e.target.value }; setCd({ ...cd, vatRates: a }); }} placeholder={de ? "Bezeichnung" : "Name"} />
                <button className="koedel" onClick={() => { const a = cd.vatRates.slice(); a.splice(i, 1); setCd({ ...cd, vatRates: a }); }} aria-label="del"><Icon name="trash" size={15} /></button>
              </div>
            ))}
            <button className="cap-hint" style={{ marginTop: 6 }} onClick={() => setCd({ ...cd, vatRates: cd.vatRates.concat([{ rate: 0, name: "" }]) })}><Icon name="plus" size={12} /> {de ? "MwSt-Satz" : "VAT rate"}</button>
            <div className="field" style={{ marginTop: 12 }}><label>{de ? "Standard-Satz für neue Buchungen" : "Default rate for new bookings"}</label>
              <select className="input" value={cd.vatDefault} onChange={(e) => setCd({ ...cd, vatDefault: Number(e.target.value) })}>{cd.vatRates.filter((v) => v.rate !== "").map((v) => <option key={v.rate} value={v.rate}>{v.rate}% · {v.name}</option>)}</select>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

window.Business = Business;
