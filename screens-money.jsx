/* ============================================================
   CasaFin — Money tools: Bills · Subscriptions · Goals
   ============================================================ */
const { useState: useStateM } = React;

function daysUntil(due) {
  const now = new Date(); now.setHours(0, 0, 0, 0);
  return Math.round((new Date(due) - now) / 86400000);
}
function dueLabel(due, lang, T) {
  const dd = daysUntil(due);
  if (dd < 0) return { txt: Math.abs(dd) + " " + T("bills.days") + " " + T("bills.overdue"), tone: "neg" };
  if (dd === 0) return { txt: T("bills.today"), tone: "neg" };
  if (dd <= 5) return { txt: T("bills.dueIn") + " " + dd + " " + T("bills.days"), tone: "warn" };
  return { txt: T("bills.dueIn") + " " + dd + " " + T("bills.days"), tone: "" };
}

/* ===================== Bills ===================== */
const QR_VENDORS = [["Sunrise GmbH", "Telecom", "📶"], ["Helsana", "Versicherung", "🏥"], ["SBB CFF FFS", "Transport", "🚆"], ["Coop Rechtsschutz", "Versicherung", "🛡️"], ["Stadt Zürich", "Gebühren", "🏛️"]];

function Bills({ lang }) {
  const T = (k) => window.I18N.t(k, lang);
  const d = window.Vault.data, S = window.Vault.sel, F = window.fmt;
  const [scan, setScan] = useStateM(false);
  const [scanning, setScanning] = useStateM(false);
  const [addOpen, setAddOpen] = useStateM(false);
  const [form, setForm] = useStateM({ vendor: "", amount: "", due: new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10), category: "Rechnung" });

  const sorted = [...d.bills].sort((a, b) => (a.status === b.status ? a.due.localeCompare(b.due) : a.status === "open" ? -1 : 1));
  const next = S.nextBill();

  function markPaid(id) {
    window.Vault.update((data) => { const b = data.bills.find((x) => x.id === id); if (b) b.status = "paid"; window.Vault.log("bill.paid", b.vendor + " · " + b.amount); });
  }
  function doScan() {
    setScanning(true);
    setTimeout(() => {
      const [vendor, category, icon] = QR_VENDORS[Math.floor(Math.random() * QR_VENDORS.length)];
      window.Vault.update((data) => {
        data.bills.unshift({ id: "b" + Date.now(), vendor, amount: Math.round(60 + Math.random() * 540), due: new Date(Date.now() + (7 + Math.floor(Math.random() * 25)) * 864e5).toISOString().slice(0, 10), status: "open", category, icon });
        window.Vault.log("bill.scanned", vendor + " · QR");
      });
      setScanning(false); setScan(false);
    }, 1800);
  }
  function addBill() {
    const amt = parseFloat(String(form.amount).replace(/['’]/g, "")) || 0;
    if (!amt || !form.vendor) return;
    window.Vault.update((data) => {
      data.bills.unshift({ id: "b" + Date.now(), vendor: form.vendor, amount: amt, due: form.due, status: "open", category: form.category, icon: "🧾" });
      window.Vault.log("bill.added", form.vendor);
    });
    setAddOpen(false); setForm({ vendor: "", amount: "", due: new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10), category: "Rechnung" });
  }

  return (
    <div className="animate">
      <div className="screen-toolbar">
        <span className="seclabel"><Icon name="receipt" size={12} /> {S.billsOpen().length} {T("bills.open")}</span>
        <button className="btn btn-ghost" style={{ marginLeft: "auto" }} onClick={() => setAddOpen(true)}><Icon name="plus" size={16} /> {T("bills.add")}</button>
        <button className="btn btn-primary" style={{ marginLeft: 0 }} onClick={() => setScan(true)}><Icon name="scan" size={16} /> {T("bills.scan")}</button>
      </div>

      <div className="grid cols-3" style={{ marginBottom: 18 }}>
        <div className="stat"><div className="k"><Icon name="receipt" size={15} /> {T("bills.openTotal")}</div><div className="v num" style={{ fontSize: 24, color: "var(--neg)" }}>{F.chf(S.billsOpenTotal())}</div></div>
        <div className="stat"><div className="k"><Icon name="bell" size={15} /> {T("bills.next")}</div>
          {next ? <><div className="v num" style={{ fontSize: 19 }}>{next.vendor}</div><div className="s" style={{ color: dueLabel(next.due, lang, T).tone === "neg" ? "var(--neg)" : "var(--warn)" }}>{F.chf(next.amount)} · {dueLabel(next.due, lang, T).txt}</div></> : <div className="v" style={{ fontSize: 16, color: "var(--brand)" }}>✓</div>}
        </div>
        <div className="stat"><div className="k"><Icon name="check" size={15} /> {T("bills.paid")}</div><div className="v num" style={{ fontSize: 24 }}>{d.bills.filter((b) => b.status === "paid").length}</div></div>
      </div>

      <div className="card card-pad">
        <div className="card-h"><h3>{T("nav.bills")}</h3></div>
        {sorted.length === 0 && <div style={{ padding: 24, textAlign: "center", color: "var(--ink-3)" }}>{T("bills.allPaid")}</div>}
        <div style={{ display: "grid", gap: 10 }}>
          {sorted.map((b) => {
            const dl = dueLabel(b.due, lang, T);
            const paid = b.status === "paid";
            return (
              <div className="bill-row" key={b.id} style={{ opacity: paid ? .62 : 1 }}>
                <div className="ic" style={{ fontSize: 18 }}>{b.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="nm">{b.vendor}</div>
                  <div className="sub">{b.category} · {F.date(b.due, lang)}</div>
                </div>
                {!paid && <span className={"chip " + (dl.tone === "neg" ? "neg" : "")} style={{ fontSize: 11, color: dl.tone === "warn" ? "var(--warn)" : undefined }}>{dl.txt}</span>}
                <div className="num" style={{ fontWeight: 740, fontSize: 15.5, minWidth: 92, textAlign: "right" }}>{F.chf(b.amount)}</div>
                {paid ? <span className="chip pos" style={{ fontSize: 11 }}><Icon name="check" size={12} /> {T("bills.paid")}</span>
                  : <button className="btn btn-ghost" style={{ padding: "7px 12px", fontSize: 12.5 }} onClick={() => markPaid(b.id)}><Icon name="check" size={14} /> {T("bills.markPaid")}</button>}
              </div>
            );
          })}
        </div>
      </div>

      <Modal open={scan} onClose={() => !scanning && setScan(false)} title={T("bills.scan")}>
        <div className="scan-frame">
          <div className={"scan-box" + (scanning ? " active" : "")}>
            <Icon name="scan" size={48} />
            {scanning && <div className="scan-line" />}
          </div>
          <p style={{ fontSize: 13, color: "var(--ink-2)", textAlign: "center", marginTop: 16, lineHeight: 1.5 }}>{scanning ? T("bills.scanning") : T("bills.scanHint")}</p>
          {!scanning && <button className="btn btn-primary btn-block" style={{ marginTop: 16 }} onClick={doScan}><Icon name="scan" size={16} /> {T("bills.scan")}</button>}
        </div>
      </Modal>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title={T("bills.add")}
        footer={<><button className="btn btn-ghost" onClick={() => setAddOpen(false)}>{T("common.cancel")}</button><button className="btn btn-primary" onClick={addBill}>{T("common.add")}</button></>}>
        <div className="field" style={{ marginBottom: 14 }}><label>{T("bills.vendor")}</label><input className="input" value={form.vendor} placeholder={lang === "de" ? "z.B. Krankenkasse" : "e.g. insurer"} onChange={(e) => setForm({ ...form, vendor: e.target.value })} /></div>
        <div className="grid cols-2" style={{ gap: 14 }}>
          <div className="field"><label>{T("docs.amount")} (CHF)</label><input className="input num" inputMode="decimal" value={form.amount} placeholder="0" onChange={(e) => setForm({ ...form, amount: e.target.value })} /></div>
          <div className="field"><label>{T("docs.due")}</label><input className="input" type="date" value={form.due} onChange={(e) => setForm({ ...form, due: e.target.value })} /></div>
        </div>
      </Modal>
    </div>
  );
}

/* ===================== Subscriptions ===================== */
function Subscriptions({ lang }) {
  const T = (k) => window.I18N.t(k, lang);
  const d = window.Vault.data, S = window.Vault.sel, F = window.fmt;
  const reviewCount = d.subscriptions.filter((s) => s.flag === "review").length;
  function cancelSub(id) {
    window.Vault.update((data) => { const s = data.subscriptions.find((x) => x.id === id); data.subscriptions = data.subscriptions.filter((x) => x.id !== id); window.Vault.log("sub.cancelled", s.name); });
  }
  const sorted = [...d.subscriptions].sort((a, b) => (b.flag === "review" ? 1 : 0) - (a.flag === "review" ? 1 : 0) || b.amount - a.amount);

  return (
    <div className="animate">
      <div className="grid cols-3" style={{ marginBottom: 18 }}>
        <div className="stat"><div className="k"><Icon name="loop" size={15} /> {T("subs.monthly")}</div><div className="v num" style={{ fontSize: 24 }}>{F.chf(S.subsMonthly(), { dp: 2 })}</div><div className="s">{d.subscriptions.length} {lang === "de" ? "Abos" : "subscriptions"}</div></div>
        <div className="stat"><div className="k"><Icon name="budget" size={15} /> {T("subs.yearly")}</div><div className="v num" style={{ fontSize: 24 }}>{F.chf(S.subsYearly())}</div></div>
        <div className="stat"><div className="k"><Icon name="bell" size={15} /> {T("subs.review")}</div><div className="v num" style={{ fontSize: 24, color: reviewCount ? "var(--warn)" : undefined }}>{reviewCount}</div><div className="s">{T("subs.reviewHint")}</div></div>
      </div>
      <div className="card card-pad">
        <div className="card-h"><h3>{T("nav.subs")}</h3><span className="eyebrow" style={{ marginLeft: "auto" }}>{lang === "de" ? "automatisch erkannt" : "auto-detected"}</span></div>
        <div style={{ display: "grid", gap: 10 }}>
          {sorted.map((s) => (
            <div className="bill-row" key={s.id}>
              <div className="ic" style={{ fontSize: 18 }}>{s.icon}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="nm" style={{ display: "flex", alignItems: "center", gap: 8 }}>{s.name}{s.flag === "review" && <span className="chip" style={{ fontSize: 10, padding: "2px 7px", color: "var(--warn)" }}>⚠ {T("subs.review")}</span>}</div>
                <div className="sub">{s.category} · {s.cycle === "monthly" ? T("subs.perMonth") : T("subs.perYear")}</div>
              </div>
              <div className="num" style={{ fontWeight: 740, fontSize: 15.5, minWidth: 92, textAlign: "right" }}>{F.chf(s.amount, { dp: 2 })}</div>
              <button className="btn btn-ghost" style={{ padding: "7px 12px", fontSize: 12.5 }} onClick={() => cancelSub(s.id)}><Icon name="trash" size={14} /> {T("subs.cancel")}</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ===================== Goals ===================== */
function Goals({ lang }) {
  const T = (k) => window.I18N.t(k, lang);
  const d = window.Vault.data, S = window.Vault.sel, F = window.fmt;
  const [addOpen, setAddOpen] = useStateM(false);
  const [form, setForm] = useStateM({ name: "", target: "", monthly: "", icon: "🎯" });

  function contribute(g) {
    const v = prompt(T("goals.contribute") + " — " + g.name + " (CHF)");
    const n = parseFloat(String(v || "").replace(/['’]/g, ""));
    if (!n) return;
    window.Vault.update((data) => { const x = data.goals.find((y) => y.id === g.id); x.saved = Math.min(x.target, x.saved + n); window.Vault.log("goal.contribution", g.name + " +" + n); });
  }
  function addGoal() {
    const tgt = parseFloat(String(form.target).replace(/['’]/g, "")) || 0;
    if (!tgt || !form.name) return;
    window.Vault.update((data) => {
      data.goals.push({ id: "go" + Date.now(), name: form.name, target: tgt, saved: 0, icon: form.icon || "🎯", monthly: parseFloat(String(form.monthly).replace(/['’]/g, "")) || 0 });
      window.Vault.log("goal.added", form.name);
    });
    setAddOpen(false); setForm({ name: "", target: "", monthly: "", icon: "🎯" });
  }

  return (
    <div className="animate">
      <div className="screen-toolbar">
        <span className="seclabel"><Icon name="target" size={12} /> {T("goals.totalSaved")}: {F.chf(S.goalsSaved())}</span>
        <button className="btn btn-primary" style={{ marginLeft: "auto" }} onClick={() => setAddOpen(true)}><Icon name="plus" size={16} /> {T("goals.add")}</button>
      </div>
      <div className="grid cols-3">
        {d.goals.map((g) => {
          const pct = Math.min(100, Math.round((g.saved / g.target) * 100));
          const remain = Math.max(0, g.target - g.saved);
          const eta = g.monthly ? Math.ceil(remain / g.monthly) : null;
          return (
            <div className="card card-pad goal-card" key={g.id}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                <div className="goal-emoji">{g.icon}</div>
                <div style={{ flex: 1 }}><div style={{ fontWeight: 700, fontSize: 16 }}>{g.name}</div><div style={{ fontSize: 12.5, color: "var(--ink-3)" }}>{pct}% · {F.chf(g.saved)} {T("goals.of")} {F.chf(g.target)}</div></div>
              </div>
              <div className="bar" style={{ height: 10 }}><i style={{ width: pct + "%" }} /></div>
              <div style={{ display: "flex", alignItems: "center", marginTop: 12 }}>
                <div style={{ fontSize: 12, color: "var(--ink-3)", fontWeight: 600 }}>{pct >= 100 ? T("goals.reached") : eta ? T("goals.eta") + " " + eta + " " + T("goals.months") : F.chf(remain) + " " + (lang === "de" ? "übrig" : "left")}</div>
                <button className="btn btn-ghost" style={{ marginLeft: "auto", padding: "7px 12px", fontSize: 12.5 }} onClick={() => contribute(g)}><Icon name="plus" size={14} /> {T("goals.contribute")}</button>
              </div>
            </div>
          );
        })}
      </div>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title={T("goals.add")}
        footer={<><button className="btn btn-ghost" onClick={() => setAddOpen(false)}>{T("common.cancel")}</button><button className="btn btn-primary" onClick={addGoal}>{T("common.add")}</button></>}>
        <div className="field" style={{ marginBottom: 14 }}><label>{T("goals.name")}</label><input className="input" value={form.name} placeholder={lang === "de" ? "z.B. Ferien, Notgroschen" : "e.g. holiday, rainy day"} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
        <div className="grid cols-2" style={{ gap: 14 }}>
          <div className="field"><label>{T("goals.target")}</label><input className="input num" inputMode="decimal" value={form.target} placeholder="0" onChange={(e) => setForm({ ...form, target: e.target.value })} /></div>
          <div className="field"><label>{T("goals.monthly")}</label><input className="input num" inputMode="decimal" value={form.monthly} placeholder="0" onChange={(e) => setForm({ ...form, monthly: e.target.value })} /></div>
        </div>
      </Modal>
    </div>
  );
}

Object.assign(window, { Bills, Subscriptions, Goals });
