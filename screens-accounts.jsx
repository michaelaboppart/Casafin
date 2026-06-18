/* ============================================================
   CasaFin — Accounts
   ============================================================ */
const { useState: useStateAc } = React;

const BANKS = ["PostFinance", "ZKB", "UBS", "Raiffeisen", "VIAC", "Swisscard", "Cembra", "Bob Finance", "Migros Bank", "Neon", "Yuh", "Andere / Other"];
const ACC_TYPES = ["checking", "savings", "securities", "pillar", "card", "loan", "mortgage"];
const LIABILITY = ["card", "loan", "mortgage"];

function Accounts({ lang }) {
  const T = (k) => window.I18N.t(k, lang);
  const d = window.Vault.data, S = window.Vault.sel, F = window.fmt;
  const [add, setAdd] = useStateAc(false);
  const [owner, setOwner] = useStateAc("all");
  const [form, setForm] = useStateAc({ bank: "PostFinance", label: "", type: "checking", balance: "", monthly: "", owner: "you" });
  const isLiab = LIABILITY.includes(form.type);
  const accs = owner === "all" ? d.accounts : d.accounts.filter((a) => a.owner === owner);
  const OWNERS = [
    { value: "all", label: T("acc.allOwners") },
    { value: "you", label: T("acc.owner.you") },
    { value: "partner", label: T("acc.owner.partner") },
    { value: "joint", label: T("acc.owner.joint") },
  ];
  const ownerChip = { you: "var(--brand-soft)", partner: "var(--gold-soft)", joint: "var(--surface-3)" };

  function submit() {
    const bal = parseFloat(String(form.balance).replace(/['’]/g, "")) || 0;
    const mon = parseFloat(String(form.monthly).replace(/['’]/g, "")) || 0;
    const id = "a" + Date.now();
    window.Vault.update((data) => {
      data.accounts.push({ id, bank: form.bank, label: form.label || form.bank, type: form.type, owner: form.owner,
        iban: (form.type === "card" ? "····  ····  " : "CH·····") + Math.floor(1000 + Math.random() * 8999),
        balance: isLiab ? -Math.abs(bal) : bal,
        monthly: mon || undefined,
        status: form.type === "pillar" ? "locked" : "active" });
      window.Vault.log("account.added", form.bank + " · " + (form.label || form.type));
    });
    setAdd(false);
    setForm({ bank: "PostFinance", label: "", type: "checking", balance: "", monthly: "", owner: "you" });
  }

  function remove(a) {
    if (!confirm(T("acc.delete") + "\n" + a.label)) return;
    window.Vault.update((data) => {
      data.accounts = data.accounts.filter((x) => x.id !== a.id);
      window.Vault.log("account.removed", a.bank + " · " + a.label);
    });
  }

  const nw = accs.reduce((s, a) => s + a.balance, 0);
  const liquid = accs.filter((a) => ["checking", "savings"].includes(a.type)).reduce((s, a) => s + a.balance, 0);
  const invest = accs.filter((a) => a.type === "securities").reduce((s, a) => s + a.balance, 0);
  const debt = Math.abs(accs.filter((a) => LIABILITY.includes(a.type)).reduce((s, a) => s + Math.min(0, a.balance), 0));
  const tiles = [
    { k: owner === "all" ? T("acc.household") : T("dash.netWorth"), v: nw, icon: "chart" },
    { k: T("acc.liquid"), v: liquid, icon: "accounts" },
    { k: T("acc.invest"), v: invest, icon: "budget" },
    { k: T("acc.debt"), v: -debt, icon: "lock", neg: true },
  ];

  return (
    <div className="animate">
      <div className="screen-toolbar">
        <span className="seclabel"><Icon name="family" size={12} /> {T("acc.household")}</span>
        <div style={{ marginLeft: "auto" }}><Segmented value={owner} onChange={setOwner} options={OWNERS} /></div>
        <button className="btn btn-primary" style={{ marginLeft: 8 }} onClick={() => setAdd(true)}><Icon name="plus" size={16} /> {T("acc.add")}</button>
      </div>

      <div className="grid cols-4" style={{ marginBottom: 18 }}>
        {tiles.map((t) => (
          <div className="stat" key={t.k}>
            <div className="k"><Icon name={t.icon} size={15} /> {t.k}</div>
            <div className="v num" style={{ fontSize: 24, color: t.neg && t.v < 0 ? "var(--neg)" : undefined }}>{F.chf(t.v)}</div>
          </div>
        ))}
      </div>

      <div className="card" style={{ overflow: "hidden" }}>
        <div className="acc-table-h">
          <span>{T("acc.bank")}</span><span>{T("acc.type")}</span><span>{T("acc.iban")}</span>
          <span style={{ textAlign: "right" }}>{T("acc.balance")}</span><span style={{ textAlign: "right" }}>{T("acc.status")}</span>
        </div>
        {accs.length === 0 && (
          <div style={{ padding: "34px 22px", textAlign: "center", color: "var(--ink-3)", fontSize: 13.5 }}>
            {lang === "de" ? "Keine Konten in dieser Ansicht." : "No accounts in this view."}
          </div>
        )}
        {accs.map((a) => (
          <div className="acc-row" key={a.id}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div className="bank-badge">{a.bank.slice(0, 2).toUpperCase()}</div>
              <div><div className="nm">{a.label}</div><div className="sub">{a.bank}{a.monthly ? " · " + F.chf(a.monthly) + "/Mt." : ""}</div></div>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              <span className="chip">{T("acc.type." + a.type)}</span>
              <span className="chip" style={{ background: ownerChip[a.owner] || "var(--surface-3)", borderColor: "transparent", fontSize: 11 }}>
                {a.owner === "joint" ? "🤝 " : ""}{T("acc.owner." + (a.owner || "you"))}
              </span>
            </div>
            <div className="mono" style={{ color: "var(--ink-3)", fontSize: 13 }}>{a.iban}</div>
            <div className={"num " + (a.balance < 0 ? "down" : "")} style={{ textAlign: "right", fontWeight: 740, fontSize: 15.5 }}>{F.chf(a.balance)}</div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 8 }}>
              <span className={"chip " + (a.status === "active" ? "pos" : "")} style={{ fontSize: 11 }}>
                {a.status === "active" ? <><span className="dot" style={{ width: 6, height: 6 }} /> {T("common.active")}</> : <><Icon name="lock" size={11} /> {T("common.locked")}</>}
              </span>
              <button className="mini-edit" onClick={() => remove(a)} aria-label="delete" title={T("common.delete")}><Icon name="trash" size={15} /></button>
            </div>
          </div>
        ))}
        <div className="acc-foot">
          <span className="seclabel"><Icon name="shield" size={12} /> {T("acc.connected")}</span>
          <span style={{ marginLeft: "auto", fontSize: 12.5, color: "var(--ink-3)" }}>
            {lang === "de" ? "CasaFin kann keine Zahlungen auslösen." : "CasaFin cannot initiate payments."}
          </span>
        </div>
      </div>

      <Modal open={add} onClose={() => setAdd(false)} title={T("acc.add")}
        footer={<><button className="btn btn-ghost" onClick={() => setAdd(false)}>{T("common.cancel")}</button>
          <button className="btn btn-primary" onClick={submit}>{T("common.add")}</button></>}>
        <div className="field" style={{ marginBottom: 14 }}>
          <label>{T("acc.bank")}</label>
          <select className="input" value={form.bank} onChange={(e) => setForm({ ...form, bank: e.target.value })}>
            {BANKS.map((b) => <option key={b}>{b}</option>)}
          </select>
        </div>
        <div className="field" style={{ marginBottom: 14 }}>
          <label>{T("acc.name")}</label>
          <input className="input" value={form.label} placeholder={lang === "de" ? "z.B. Privatkonto" : "e.g. Checking"} onChange={(e) => setForm({ ...form, label: e.target.value })} />
        </div>
        <div className="grid cols-2" style={{ gap: 14 }}>
          <div className="field">
            <label>{T("acc.type")}</label>
            <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {ACC_TYPES.map((t) => <option key={t} value={t}>{T("acc.type." + t)}</option>)}
            </select>
          </div>
          <div className="field">
            <label>{isLiab ? T("acc.owed") : T("acc.balance") + " (CHF)"}</label>
            <input className="input num" inputMode="decimal" value={form.balance} placeholder="0" onChange={(e) => setForm({ ...form, balance: e.target.value })} />
          </div>
        </div>
        <div className="field" style={{ marginTop: 14 }}>
          <label>{T("acc.owner")}</label>
          <Segmented value={form.owner} onChange={(v) => setForm({ ...form, owner: v })}
            options={[{ value: "you", label: T("acc.owner.you") }, { value: "partner", label: T("acc.owner.partner") }, { value: "joint", label: T("acc.owner.joint") }]} />
        </div>
        {(form.type === "loan" || form.type === "mortgage") && (
          <div className="field" style={{ marginTop: 14 }}>
            <label>{T("acc.monthly")}</label>
            <input className="input num" inputMode="decimal" value={form.monthly} placeholder="0" onChange={(e) => setForm({ ...form, monthly: e.target.value })} />
          </div>
        )}
        {isLiab && <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 10 }}>{T("acc.balanceHint")}</div>}
        <div className="seclabel" style={{ marginTop: 18 }}><Icon name="lock" size={12} /> {T("sec.encrypted")}</div>
      </Modal>
    </div>
  );
}

window.Accounts = Accounts;
