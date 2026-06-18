/* ============================================================
   CasaFin — Life tools: Tax folder · Family + Emergency
   ============================================================ */
const { useState: useStateL } = React;

/* ===================== Tax folder ===================== */
function TaxFolder({ lang }) {
  const T = (k) => window.I18N.t(k, lang);
  const d = window.Vault.data, S = window.Vault.sel, F = window.fmt;
  const found = S.deductionsFound();
  const total = S.deductionsTotal();
  const potential = total - found;
  const estSaving = Math.round(total * 0.24);

  function exportTax() {
    const lines = [];
    lines.push("CasaFin — Steuer-Export für Treuhänder");
    lines.push("Steuerjahr " + d.tax.year + " · Kanton " + d.tax.canton);
    lines.push("Profil: " + d.profile.name);
    lines.push("Erstellt: " + new Date().toLocaleString("de-CH"));
    lines.push("");
    lines.push("ABZÜGE");
    d.tax.deductions.forEach((x) => lines.push("  " + x.label.padEnd(34) + F.chf(x.amount) + "   [" + (x.status === "found" ? "erkannt" : "prüfen") + "]"));
    lines.push("");
    lines.push("Summe Abzüge: " + F.chf(total));
    lines.push("Geschätzte Steuerersparnis: ~" + F.chf(estSaving));
    lines.push("");
    lines.push("Belege (verschlüsselt im Tresor):");
    d.documents.forEach((doc) => lines.push("  • " + doc.name));
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "CasaFin-Steuer-" + d.tax.year + ".txt"; a.click();
    URL.revokeObjectURL(url);
    window.Vault.logPersist("tax.exported", "Steuer-Export " + d.tax.year);
  }

  return (
    <div className="animate">
      <div className="screen-toolbar">
        <span className="seclabel"><Icon name="folder" size={12} /> {T("tax.year")} {d.tax.year} · {d.tax.canton}</span>
        <button className="btn btn-gold" style={{ marginLeft: "auto" }} onClick={exportTax}><Icon name="download" size={16} /> {T("tax.export")}</button>
      </div>

      <div className="grid cols-3" style={{ marginBottom: 18 }}>
        <div className="stat"><div className="k"><Icon name="check" size={15} /> {T("tax.found")}</div><div className="v num" style={{ fontSize: 24, color: "var(--brand)" }}>{F.chf(found)}</div></div>
        <div className="stat"><div className="k"><Icon name="docs" size={15} /> {T("tax.potential")}</div><div className="v num" style={{ fontSize: 24 }}>{F.chf(potential)}</div></div>
        <div className="stat"><div className="k"><Icon name="sparkle" size={15} /> {T("tax.estimate")}</div><div className="v num" style={{ fontSize: 24, color: "var(--gold)" }}>~{F.chf(estSaving)}</div></div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "1.4fr 1fr", alignItems: "start" }}>
        <div className="card card-pad">
          <div className="card-h"><h3>{T("tax.deductions")}</h3><span className="nav-badge" style={{ marginLeft: "auto" }}>{d.tax.deductions.length}</span></div>
          <div style={{ display: "grid", gap: 10 }}>
            {d.tax.deductions.map((x) => (
              <div className="bill-row" key={x.id}>
                <div className="ic" style={{ fontSize: 16 }}><Icon name={x.status === "found" ? "check" : "eye"} size={16} /></div>
                <div style={{ flex: 1 }}><div className="nm">{x.label}</div></div>
                <span className={"chip " + (x.status === "found" ? "pos" : "")} style={{ fontSize: 11, color: x.status === "open" ? "var(--warn)" : undefined }}>{x.status === "found" ? T("tax.statusFound") : T("tax.statusOpen")}</span>
                <div className="num" style={{ fontWeight: 740, fontSize: 15, minWidth: 90, textAlign: "right" }}>{F.chf(x.amount)}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="card card-pad" style={{ background: "linear-gradient(165deg, var(--gold-soft), transparent)" }}>
          <div className="card-h"><div className="set-ic" style={{ width: 30, height: 30 }}><Icon name="folder" size={16} /></div><h3>CasaTax</h3></div>
          <p style={{ fontSize: 13.5, color: "var(--ink-2)", lineHeight: 1.55, marginBottom: 14 }}>
            {lang === "de"
              ? "Alle Belege werden das ganze Jahr automatisch gesammelt und nach Kanton geprüft. Beim Export erhält dein Treuhänder eine saubere Aufstellung — verschlüsselt, nur von dir freigegeben."
              : "All receipts are collected automatically all year and checked by canton. On export your trustee gets a clean breakdown — encrypted, released only by you."}
          </p>
          <button className="btn btn-gold btn-block" onClick={exportTax}><Icon name="download" size={16} /> {T("tax.export")}</button>
          <div className="seclabel" style={{ marginTop: 14 }}><Icon name="lock" size={12} /> {T("sec.encrypted")}</div>
        </div>
      </div>
    </div>
  );
}

/* ===================== Family + Emergency ===================== */
const MEMBER_COLORS = ["#0E9E8E", "#5BB8E8", "#E8A33C", "#B07CE0"];

function Family({ lang }) {
  const T = (k) => window.I18N.t(k, lang);
  const d = window.Vault.data, S = window.Vault.sel, F = window.fmt;
  const [addOpen, setAddOpen] = useStateL(false);
  const [form, setForm] = useStateL({ name: "", role: "adult" });

  function addMember() {
    if (!form.name.trim()) return;
    const initials = form.name.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
    window.Vault.update((data) => {
      data.family.members.push({ id: "f" + Date.now(), name: form.name.trim(), role: form.role, initials, tag: form.role === "child" ? T("fam.child") : T("fam.adult") });
      window.Vault.log("family.added", form.name);
    });
    setAddOpen(false); setForm({ name: "", role: "adult" });
  }

  const policies = d.subscriptions.filter((s) => s.category === "Versicherung");
  const juniorTotal = d.family.junior.reduce((s, j) => s + j.balance, 0);

  return (
    <div className="animate">
      <div className="screen-toolbar">
        <span className="seclabel"><Icon name="family" size={12} /> {d.family.members.length} {lang === "de" ? "Mitglieder" : "members"}</span>
        <button className="btn btn-primary" style={{ marginLeft: "auto" }} onClick={() => setAddOpen(true)}><Icon name="plus" size={16} /> {T("fam.addMember")}</button>
      </div>

      {/* members */}
      <div className="card card-pad" style={{ marginBottom: 18 }}>
        <div className="card-h"><h3>{T("fam.members")}</h3></div>
        <div className="grid cols-4">
          {d.family.members.map((m, i) => (
            <div className="member-card" key={m.id}>
              <div className="avatar" style={{ width: 52, height: 52, fontSize: 18, background: `linear-gradient(150deg, ${MEMBER_COLORS[i % 4]}, ${MEMBER_COLORS[i % 4]}cc)` }}>{m.initials}</div>
              <div style={{ fontWeight: 680, fontSize: 14.5, marginTop: 10 }}>{m.name}</div>
              <span className="chip" style={{ fontSize: 11, marginTop: 5 }}>{m.tag}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", alignItems: "start" }}>
        {/* junior */}
        <div className="card card-pad">
          <div className="card-h"><div className="set-ic" style={{ width: 30, height: 30 }}><Icon name="coins" size={16} /></div><h3>{T("fam.junior")}</h3></div>
          <p style={{ fontSize: 12.5, color: "var(--ink-3)", margin: "-6px 0 14px" }}>{T("fam.juniorSub")}</p>
          {d.family.junior.map((j) => (
            <div className="row" key={j.id}>
              <div className="ic">🐷</div>
              <div><div className="nm">{j.name}</div><div className="sub">{j.owner}</div></div>
              <div className="amt num">{F.chf(j.balance)}</div>
            </div>
          ))}
          <div className="row" style={{ borderTop: "1px solid var(--line)", borderBottom: "none", marginTop: 4 }}>
            <div className="nm" style={{ fontWeight: 700 }}>{lang === "de" ? "Total" : "Total"}</div>
            <div className="amt num" style={{ marginLeft: "auto", color: "var(--brand)" }}>{F.chf(juniorTotal)}</div>
          </div>
        </div>

        {/* emergency file */}
        <div className="card card-pad" style={{ background: "linear-gradient(165deg, var(--brand-soft), transparent)" }}>
          <div className="card-h"><div className="set-ic" style={{ width: 30, height: 30 }}><Icon name="heart" size={16} /></div><h3>{T("fam.emergency")}</h3></div>
          <p style={{ fontSize: 12.5, color: "var(--ink-2)", margin: "-6px 0 14px", lineHeight: 1.5 }}>{T("fam.emergencySub")}</p>
          <div className="emergency-grid">
            <div className="em-item"><div className="em-k">{T("fam.accounts")}</div><div className="em-v num">{F.chf(S.netWorth())}</div><div className="em-s">{d.accounts.length} {lang === "de" ? "Konten" : "accounts"}</div></div>
            <div className="em-item"><div className="em-k">{T("fam.policies")}</div><div className="em-v num">{policies.length}</div><div className="em-s">{lang === "de" ? "Policen" : "policies"}</div></div>
          </div>
          <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
            <div className="em-k" style={{ marginBottom: 2 }}>{T("fam.contacts")}</div>
            {d.emergency.contacts.map((c) => (
              <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 13 }}>
                <span style={{ fontSize: 16 }}>{c.icon}</span>
                <span style={{ fontWeight: 600 }}>{c.name}</span>
                <span className="mono" style={{ marginLeft: "auto", color: "var(--ink-3)", fontSize: 12 }}>{c.detail}</span>
              </div>
            ))}
          </div>
          <div className="seclabel" style={{ marginTop: 16 }}><Icon name="lock" size={12} /> {T("fam.emergencyNote")}</div>
        </div>
      </div>

      <Modal open={addOpen} onClose={() => setAddOpen(false)} title={T("fam.addMember")}
        footer={<><button className="btn btn-ghost" onClick={() => setAddOpen(false)}>{T("common.cancel")}</button><button className="btn btn-primary" onClick={addMember}>{T("common.add")}</button></>}>
        <div className="field" style={{ marginBottom: 14 }}><label>{T("acc.name")}</label><input className="input" value={form.name} placeholder={lang === "de" ? "Name" : "Name"} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
        <div className="field"><label>{T("acc.type")}</label>
          <Segmented value={form.role} onChange={(v) => setForm({ ...form, role: v })} options={[{ value: "adult", label: T("fam.adult") }, { value: "child", label: T("fam.child") }]} />
        </div>
      </Modal>
    </div>
  );
}

Object.assign(window, { TaxFolder, Family });
