/* ============================================================
   CasaFin — Settings (security-first)
   ============================================================ */
const { useState: useStateS } = React;

function SetRow({ icon, title, sub, children, danger }) {
  return (
    <div className="set-row">
      <div className={"set-ic" + (danger ? " danger" : "")}><Icon name={icon} size={18} /></div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 640, fontSize: 14.5, color: danger ? "var(--neg)" : "var(--ink)" }}>{title}</div>
        {sub && <div style={{ fontSize: 12.5, color: "var(--ink-3)", marginTop: 2 }}>{sub}</div>}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>{children}</div>
    </div>
  );
}

function Settings({ lang, setLang, theme, setTheme, accent, setAccent, customColor, setCustomColor, onLock }) {
  const T = (k) => window.I18N.t(k, lang);
  const d = window.Vault.data, F = window.fmt;
  const [pwModal, setPwModal] = useStateS(false);
  const [auditOpen, setAuditOpen] = useStateS(false);
  const [old, setOld] = useStateS(""); const [n1, setN1] = useStateS(""); const [n2, setN2] = useStateS("");
  const [pwErr, setPwErr] = useStateS(""); const [pwOk, setPwOk] = useStateS(false);
  const [twoFa, setTwoFa] = useStateS(d.settings.twoFa);
  const [autoLock, setAutoLock] = useStateS(d.settings.autoLockMin);
  const [editName, setEditName] = useStateS(false);
  const [nameVal, setNameVal] = useStateS(d.profile.name);
  function saveName() {
    const nm = nameVal.trim(); if (!nm) { setEditName(false); return; }
    window.Vault.update((data) => {
      data.profile.name = nm;
      data.profile.initials = nm.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
      window.Vault.log("profile.renamed", nm);
    });
    setEditName(false);
  }

  async function changePw() {
    setPwErr("");
    if (n1.length < 8) return setPwErr(T("sec.tooShort"));
    if (n1 !== n2) return setPwErr(T("sec.mismatch"));
    const ok = await window.Vault.changePassword(old, n1);
    if (!ok) return setPwErr(T("sec.wrong"));
    setPwOk(true);
    setTimeout(() => { setPwModal(false); setPwOk(false); setOld(""); setN1(""); setN2(""); }, 1100);
  }
  function setTwoFaV(v) { setTwoFa(v); window.Vault.update((data) => { data.settings.twoFa = v; window.Vault.log("2fa.toggled", v ? "aktiviert" : "deaktiviert"); }); }
  function setLockV(v) { setAutoLock(v); window.Vault.update((data) => { data.settings.autoLockMin = v; }); }

  function exportData() {
    const blob = new Blob([localStorage.getItem("casafin.vault.v1")], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "casafin-encrypted-backup.json"; a.click();
    URL.revokeObjectURL(url);
    window.Vault.logPersist("data.exported", "Verschlüsseltes Backup");
  }
  function wipe() {
    if (confirm(T("set.wipeConfirm"))) window.Vault.wipe();
  }
  function clearDemo() {
    if (confirm(T("set.clearDemoConfirm"))) window.Vault.clearDemo();
  }

  return (
    <div className="animate">
      <div className="grid cols-2" style={{ alignItems: "start" }}>
        <div className="grid">
          {/* Security */}
          <div className="card card-pad">
            <div className="card-h"><div className="set-ic" style={{ width: 30, height: 30 }}><Icon name="shield" size={16} /></div><h3>{T("set.security")}</h3></div>
            <SetRow icon="key" title={T("set.changePw")} sub={T("sec.encrypted")}>
              <button className="btn btn-ghost" style={{ padding: "8px 14px", fontSize: 13 }} onClick={() => setPwModal(true)}>{T("common.save")}</button>
            </SetRow>
            <SetRow icon="lock" title={T("set.twoFa")} sub={twoFa ? T("set.on") : T("set.off")}>
              <Toggle on={twoFa} onChange={setTwoFaV} />
            </SetRow>
            <SetRow icon="unlock" title={T("set.autoLock")} sub={T("set.autoLockSub")}>
              <select className="input" style={{ width: "auto", padding: "8px 12px" }} value={autoLock} onChange={(e) => setLockV(+e.target.value)}>
                {[1, 5, 15, 30].map((m) => <option key={m} value={m}>{m} {T("set.mins")}</option>)}
              </select>
            </SetRow>
            <SetRow icon="eye" title={T("set.audit")} sub={(d.audit?.length || 0) + " " + (lang === "de" ? "Einträge" : "entries")}>
              <button className="btn btn-ghost" style={{ padding: "8px 14px", fontSize: 13 }} onClick={() => setAuditOpen(true)}>{T("common.details")}</button>
            </SetRow>
            <div style={{ marginTop: 6 }}>
              <button className="btn btn-ghost btn-block" onClick={onLock}><Icon name="lock" size={16} /> {T("sec.lock")}</button>
            </div>
          </div>

          {/* Data */}
          <div className="card card-pad">
            <div className="card-h"><div className="set-ic" style={{ width: 30, height: 30 }}><Icon name="download" size={16} /></div><h3>{T("set.data")}</h3></div>
            <SetRow icon="refresh" title={T("set.clearDemo")} sub={T("set.clearDemoSub")}>
              <button className="btn btn-ghost" style={{ padding: "8px 14px", fontSize: 13 }} onClick={clearDemo}>{T("common.delete")}</button>
            </SetRow>
            <SetRow icon="download" title={T("set.export")} sub={T("set.exportSub")}>
              <button className="btn btn-ghost" style={{ padding: "8px 14px", fontSize: 13 }} onClick={exportData}>{T("set.export")}</button>
            </SetRow>
            <SetRow icon="trash" title={T("set.wipe")} sub={T("set.wipeSub")} danger>
              <button className="btn btn-ghost" style={{ padding: "8px 14px", fontSize: 13, color: "var(--neg)", borderColor: "var(--danger-soft)" }} onClick={wipe}>{T("common.delete")}</button>
            </SetRow>
          </div>
        </div>

        <div className="grid">
          {/* Profile */}
          <div className="card card-pad">
            <div className="card-h"><div className="set-ic" style={{ width: 30, height: 30 }}><Icon name="accounts" size={16} /></div><h3>{T("set.profile")}</h3></div>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 4 }}>
              <div className="avatar" style={{ width: 56, height: 56, fontSize: 19 }}>{d.profile.initials}</div>
              <div style={{ flex: 1 }}>
                {editName ? (
                  <input className="input" autoFocus value={nameVal} onChange={(e) => setNameVal(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && saveName()} onBlur={saveName} style={{ padding: "7px 10px", fontWeight: 700, fontSize: 16 }} />
                ) : (
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ fontWeight: 700, fontSize: 17 }}>{d.profile.name}</div>
                    <button className="mini-edit" onClick={() => { setNameVal(d.profile.name); setEditName(true); }} aria-label={T("sec.editName")} title={T("sec.editName")}><Icon name="settings" size={14} /></button>
                  </div>
                )}
                <div style={{ fontSize: 13, color: "var(--ink-3)" }}>{d.profile.city}, {lang === "de" ? "Schweiz" : "Switzerland"}</div>
                <span className="chip gold" style={{ marginTop: 6 }}><Icon name="sparkle" size={11} /> {d.profile.plan}</span>
              </div>
            </div>
          </div>

          {/* Appearance */}
          <div className="card card-pad">
            <div className="card-h"><div className="set-ic" style={{ width: 30, height: 30 }}><Icon name="sun" size={16} /></div><h3>{T("set.appearance")}</h3></div>
            <SetRow icon="fina" title={T("set.language")}>
              <Segmented value={lang} onChange={setLang} options={[{ value: "de", label: "DE" }, { value: "en", label: "EN" }]} />
            </SetRow>
            <SetRow icon="moon" title={T("set.theme")}>
              <Segmented value={theme} onChange={setTheme} options={[{ value: "light", label: T("sec.good") === "Gut" ? "Hell" : "Light" }, { value: "dark", label: T("sec.good") === "Gut" ? "Dunkel" : "Dark" }]} />
            </SetRow>
            <SetRow icon="sparkle" title={T("set.accent")} sub={accent === "custom" ? T("set.accentCustom") : window.ACCENTS[accent].label[lang]}>
              <div className="accent-swatches">
                {window.ACCENT_ORDER.map((k) => (
                  <button key={k} className={"accent-swatch" + (accent === k ? " on" : "")} style={{ background: window.ACCENTS[k].swatch }}
                    onClick={() => setAccent(k)} aria-label={window.ACCENTS[k].label[lang]} title={window.ACCENTS[k].label[lang]}>
                    {accent === k && <Icon name="check" size={13} />}
                  </button>
                ))}
                <label className={"accent-swatch custom" + (accent === "custom" ? " on" : "")} style={{ background: accent === "custom" ? customColor : "conic-gradient(from 0deg, #E8746B, #E8A33C, #5AC6A0, #5BB8E8, #B07CE0, #E8746B)" }} title={T("set.accentCustom")}>
                  {accent === "custom" ? <Icon name="check" size={13} /> : <Icon name="plus" size={13} />}
                  <input type="color" value={customColor} onChange={(e) => setCustomColor(e.target.value)} style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }} />
                </label>
              </div>
            </SetRow>
          </div>

          {/* License / Demo */}
          <div className="card card-pad demo-card">
            <div className="card-h"><div className="set-ic" style={{ width: 30, height: 30 }}><Icon name="sparkle" size={16} /></div><h3>{T("set.license")}</h3></div>
            <p style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.5, margin: "0 0 14px" }}>{T("set.licenseSub")}</p>
            <a className="btn btn-gold btn-block" href="mailto:hello@casafin.ch?subject=CasaFin%20Lizenzanfrage&body=Hallo%20CasaFin-Team%2C%20ich%20m%C3%B6chte%20die%20Volllizenz%20anfragen.">
              <Icon name="send" size={16} /> {T("set.licenseBtn")}
            </a>
          </div>

          <div className="card card-pad" style={{ textAlign: "center", color: "var(--ink-3)" }}>
            <div className="seclabel" style={{ margin: "0 auto 10px" }}><Icon name="shield" size={12} /> {T("sec.encrypted")} · {T("sec.localOnly")}</div>
            <div style={{ fontSize: 12 }}>CasaFin · {T("demo.note")} · v0.9.2<br />© 2026 Boppart Digital · Zürich</div>
          </div>
        </div>
      </div>

      {/* change password modal */}
      <Modal open={pwModal} onClose={() => setPwModal(false)} title={T("set.changePw")}
        footer={<><button className="btn btn-ghost" onClick={() => setPwModal(false)}>{T("common.cancel")}</button>
          <button className="btn btn-primary" onClick={changePw}>{pwOk ? <><Icon name="check" size={16} /> OK</> : T("common.save")}</button></>}>
        <div className="field" style={{ marginBottom: 14 }}><label>{lang === "de" ? "Aktuelles Passwort" : "Current password"}</label><PwField value={old} onChange={setOld} placeholder="••••••••" autoFocus /></div>
        <div className="field" style={{ marginBottom: 14 }}><label>{lang === "de" ? "Neues Passwort" : "New password"}</label><PwField value={n1} onChange={setN1} placeholder="••••••••" /></div>
        <div className="field"><label>{T("sec.masterConfirm")}</label><PwField value={n2} onChange={setN2} placeholder="••••••••" onEnter={changePw} /></div>
        {pwErr && <div className="auth-err" style={{ marginTop: 14, marginBottom: 0 }}>{pwErr}</div>}
      </Modal>

      {/* audit modal */}
      <Modal open={auditOpen} onClose={() => setAuditOpen(false)} title={T("set.audit")} width={520}>
        <div style={{ display: "grid", gap: 2 }}>
          {(d.audit || []).map((e, i) => (
            <div className="audit-row" key={i}>
              <span className="audit-dot" />
              <div style={{ flex: 1 }}>
                <span className="mono" style={{ fontSize: 12, color: "var(--brand-ink)" }}>{e.type}</span>
                <div style={{ fontSize: 12.5, color: "var(--ink-2)" }}>{e.detail}</div>
              </div>
              <span className="mono" style={{ fontSize: 11, color: "var(--ink-3)" }}>{F.timeAgo(e.ts, lang)}</span>
            </div>
          ))}
          {(!d.audit || !d.audit.length) && <div style={{ color: "var(--ink-3)", fontSize: 13, padding: 12 }}>—</div>}
        </div>
      </Modal>
    </div>
  );
}

window.Settings = Settings;
