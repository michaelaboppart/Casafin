/* ============================================================
   CasaFin — Budget & Charts
   ============================================================ */
const { useState: useStateB } = React;

function Budget({ lang }) {
  const T = (k) => window.I18N.t(k, lang);
  const d = window.Vault.data, S = window.Vault.sel, F = window.fmt;
  const [edit, setEdit] = useStateB(null); // category id being edited
  const [val, setVal] = useStateB("");
  const [txOpen, setTxOpen] = useStateB(false);
  const [tx, setTx] = useStateB({ kind: "expense", title: "", category: "", amount: "", date: new Date().toISOString().slice(0, 10) });

  const cats = d.budget.categories;
  const spent = S.monthSpent(), budget = S.monthBudget();
  const income = S.income();
  const saved = income - spent;

  function saveBudget(id) {
    const n = parseFloat(String(val).replace(/'/g, "")) || 0;
    window.Vault.update((data) => {
      const c = data.budget.categories.find((x) => x.id === id);
      if (c) c.budget = n;
      window.Vault.log("budget.edited", c.name + " → " + n);
    });
    setEdit(null); setVal("");
  }

  const catIcons = { Wohnen: "🏠", Lebensmittel: "🛒", Transport: "🚆", Freizeit: "🍽️", Abos: "📱", Nebenkosten: "⚡", Einkommen: "💰" };
  function saveTx() {
    const amt = Math.abs(parseFloat(String(tx.amount).replace(/['’]/g, "")) || 0);
    if (!amt) return;
    const isInc = tx.kind === "income";
    const cat = isInc ? "Einkommen" : (tx.category || (cats[0] && cats[0].name) || "Sonstiges");
    window.Vault.addTransaction({
      id: "t" + Date.now(), accountId: null,
      title: tx.title || (isInc ? "Einnahme" : cat), category: cat,
      date: tx.date, amount: isInc ? amt : -amt,
      icon: isInc ? "💰" : (catIcons[cat] || "💳"),
    });
    setTxOpen(false);
    setTx({ kind: "expense", title: "", category: "", amount: "", date: new Date().toISOString().slice(0, 10) });
  }

  return (
    <div className="animate">
      <div className="screen-toolbar">
        <span className="seclabel"><Icon name="budget" size={12} /> {F.chf(spent)} {T("bud.of")} {F.chf(budget)}</span>
        <button className="btn btn-primary" style={{ marginLeft: "auto" }} onClick={() => setTxOpen(true)}><Icon name="plus" size={16} /> {T("bud.addTx")}</button>
        <div className="seg" style={{ marginLeft: 0 }}><button>‹</button><button className="on">{lang === "de" ? "Mai 2026" : "May 2026"}</button><button>›</button></div>
      </div>

      <div className="grid cols-3" style={{ marginBottom: 18 }}>
        <div className="stat"><div className="k"><Icon name="budget" size={15} /> {T("bud.income")}</div><div className="v num up" style={{ fontSize: 24 }}>{F.chf(income)}</div></div>
        <div className="stat"><div className="k"><Icon name="budget" size={15} style={{ transform: "scaleY(-1)" }} /> {T("bud.expenses")}</div><div className="v num" style={{ fontSize: 24 }}>{F.chf(spent)}</div></div>
        <div className="stat"><div className="k"><Icon name="shield" size={15} /> {T("bud.saved")}</div><div className="v num" style={{ fontSize: 24, color: "var(--brand)" }}>{F.chf(saved)}</div><div className="s">{S.savingsRate()}% {T("dash.savingsRate")}</div></div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "1fr 1.5fr", alignItems: "start" }}>
        <div className="card card-pad" style={{ textAlign: "center" }}>
          <div className="card-h" style={{ justifyContent: "center" }}><h3>{T("bud.byCategory")}</h3></div>
          <div style={{ position: "relative", width: 180, height: 180, margin: "6px auto 20px" }}>
            <CategoryDonut categories={cats} />
            <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", flexDirection: "column" }}>
              <span style={{ fontSize: 11, color: "var(--ink-3)", fontWeight: 600 }}>{T("bud.spent")}</span>
              <span className="num" style={{ fontWeight: 800, fontSize: 23 }}>{F.chf(spent)}</span>
            </div>
          </div>
          <div style={{ display: "grid", gap: 9 }}>
            {cats.map((c, i) => (
              <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 9, fontSize: 13 }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: window.DONUT_COLORS[i % 6] }} />
                <span style={{ fontWeight: 600 }}>{c.name}</span>
                <span className="num" style={{ marginLeft: "auto", color: "var(--ink-2)", fontWeight: 650 }}>{F.chf(c.spent)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card card-pad">
          <div className="card-h"><h3>{T("bud.categories")}</h3><span className="eyebrow" style={{ marginLeft: "auto" }}>{lang === "de" ? "Klick zum Anpassen" : "Click to adjust"}</span></div>
          <div style={{ display: "grid", gap: 16 }}>
            {cats.map((c) => {
              const pct = Math.min(100, Math.round((c.spent / c.budget) * 100));
              const over = c.spent > c.budget;
              return (
                <div key={c.id}>
                  <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 8 }}>
                    <div className="ic" style={{ width: 34, height: 34, fontSize: 15 }}>{c.icon}</div>
                    <div style={{ fontWeight: 640, fontSize: 14 }}>{c.name}</div>
                    <div className="num" style={{ marginLeft: "auto", fontWeight: 700, fontSize: 14 }}>
                      {F.chf(c.spent)} <span style={{ color: "var(--ink-3)", fontWeight: 500 }}>/ {edit === c.id ? "" : F.chf(c.budget)}</span>
                      {edit === c.id && (
                        <input className="input num" autoFocus value={val} placeholder={String(c.budget)}
                          onChange={(e) => setVal(e.target.value)} onKeyDown={(e) => e.key === "Enter" && saveBudget(c.id)} onBlur={() => saveBudget(c.id)}
                          style={{ width: 90, display: "inline-block", padding: "4px 8px", marginLeft: 4 }} />
                      )}
                    </div>
                    {edit !== c.id && <button className="mini-edit" onClick={() => { setEdit(c.id); setVal(String(c.budget)); }}><Icon name="settings" size={14} /></button>}
                  </div>
                  <div className="bar" style={{ height: 9 }}><i style={{ width: pct + "%", background: over ? "var(--neg)" : "var(--brand)" }} /></div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginTop: 5, fontSize: 11.5, color: over ? "var(--neg)" : "var(--ink-3)", fontWeight: 600 }}>
                    <span>{pct}%</span>
                    <span>{over ? F.chf(c.spent - c.budget) + " " + T("bud.over") : F.chf(c.budget - c.spent) + " " + T("bud.left")}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <Modal open={txOpen} onClose={() => setTxOpen(false)} title={T("bud.addTx")}
        footer={<><button className="btn btn-ghost" onClick={() => setTxOpen(false)}>{T("common.cancel")}</button>
          <button className="btn btn-primary" onClick={saveTx}>{T("common.add")}</button></>}>
        <div className="field" style={{ marginBottom: 14 }}>
          <label>{T("tx.kind")}</label>
          <Segmented value={tx.kind} onChange={(v) => setTx({ ...tx, kind: v })}
            options={[{ value: "expense", label: T("tx.expense") }, { value: "income", label: T("tx.income") }]} />
        </div>
        <div className="field" style={{ marginBottom: 14 }}>
          <label>{T("tx.title")}</label>
          <input className="input" value={tx.title} placeholder={lang === "de" ? "z.B. Coop, Miete, Lohn" : "e.g. groceries, rent, salary"} onChange={(e) => setTx({ ...tx, title: e.target.value })} />
        </div>
        <div className="grid cols-2" style={{ gap: 14 }}>
          <div className="field">
            <label>{T("tx.amount")}</label>
            <input className="input num" inputMode="decimal" value={tx.amount} placeholder="0" onChange={(e) => setTx({ ...tx, amount: e.target.value })} />
          </div>
          <div className="field">
            <label>{T("tx.date")}</label>
            <input className="input" type="date" value={tx.date} onChange={(e) => setTx({ ...tx, date: e.target.value })} />
          </div>
        </div>
        {tx.kind === "expense" && (
          <div className="field" style={{ marginTop: 14 }}>
            <label>{T("docs.category")}</label>
            <select className="input" value={tx.category} onChange={(e) => setTx({ ...tx, category: e.target.value })}>
              {cats.map((c) => <option key={c.id} value={c.name}>{c.icon} {c.name}</option>)}
            </select>
          </div>
        )}
        <div className="seclabel" style={{ marginTop: 18 }}><Icon name="lock" size={12} /> {T("sec.encrypted")}</div>
      </Modal>
    </div>
  );
}

window.Budget = Budget;
