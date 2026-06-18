/* ============================================================
   CasaFin — Auth & Security screens
   Onboarding · Recovery phrase · Unlock · 2FA · Recover
   ============================================================ */
const { useState: useStateA, useEffect: useEffectA, useRef: useRefA } = React;

function pwStrength(pw) {
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  if (/\d/.test(pw) && /[^A-Za-z0-9]/.test(pw)) s++;
  return Math.min(4, s);
}

function PwField({ value, onChange, placeholder, autoFocus, onEnter }) {
  const [show, setShow] = useStateA(false);
  return (
    <div style={{ position: "relative" }}>
      <input className="input mono" type={show ? "text" : "password"} value={value} autoFocus={autoFocus}
        placeholder={placeholder} onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onEnter && onEnter()}
        style={{ paddingRight: 44, letterSpacing: show ? 0 : "0.18em" }} />
      <button onClick={() => setShow(!show)} aria-label="toggle"
        style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", color: "var(--ink-3)", padding: 6 }}>
        <Icon name="eye" size={17} />
      </button>
    </div>
  );
}

function AuthShell({ lang, setLang, theme, setTheme, children, sub }) {
  const T = (k) => window.I18N.t(k, lang);
  return (
    <div className="auth-wrap">
      <div className="auth-aside">
        <div className="auth-aside-top">
          <div className="brand-row" style={{ padding: 0 }}>
            <BrandMark />
            <div>
              <div className="brand-name" style={{ color: "#fff" }}>Casa<b style={{ color: "#fff" }}>Fin</b></div>
              <div className="brand-tag" style={{ color: "rgba(255,255,255,.6)" }}>{T("app.tag")}</div>
            </div>
            <span className="demo-pill light">{window.I18N.t("demo.badge", lang)}</span>
          </div>
        </div>
        <div className="auth-aside-mid">
          <div className="lockviz"><Icon name="shield" size={40} sw={1.4} /></div>
          <h2>{lang === "de" ? "Deine Finanzen. Verschlüsselt. Schweizerisch." : "Your finances. Encrypted. Swiss."}</h2>
          <p>{sub}</p>
        </div>
        <div className="auth-aside-foot">
          <span className="seclabel" style={{ color: "#fff", background: "rgba(255,255,255,.14)" }}><Icon name="lock" size={12} /> AES-256</span>
          <span className="seclabel" style={{ color: "#fff", background: "rgba(255,255,255,.14)" }}>CH-Server</span>
          <span className="seclabel" style={{ color: "#fff", background: "rgba(255,255,255,.14)" }}>DSG</span>
        </div>
      </div>

      <div className="auth-main">
        <div className="auth-topctrl">
          <div className="seg"><button className={lang === "de" ? "on" : ""} onClick={() => setLang("de")}>DE</button><button className={lang === "en" ? "on" : ""} onClick={() => setLang("en")}>EN</button></div>
          <div className="seg"><button className={theme === "light" ? "on" : ""} onClick={() => setTheme("light")}><Icon name="sun" size={15} /></button><button className={theme === "dark" ? "on" : ""} onClick={() => setTheme("dark")}><Icon name="moon" size={15} /></button></div>
        </div>
        <div className="auth-card">{children}</div>
      </div>
    </div>
  );
}

function AuthScreen({ lang, setLang, theme, setTheme, onUnlocked }) {
  const T = (k) => window.I18N.t(k, lang);
  const hasVault = window.Vault.hasVault();
  const [mode, setMode] = useStateA(hasVault ? "unlock" : "create");
  const [pw, setPw] = useStateA("");
  const [pw2, setPw2] = useStateA("");
  const [err, setErr] = useStateA("");
  const [busy, setBusy] = useStateA(false);
  const [phrase, setPhrase] = useStateA([]);
  const [ack, setAck] = useStateA(false);
  const [code, setCode] = useStateA("");
  const [recPhrase, setRecPhrase] = useStateA("");
  const [name, setName] = useStateA("");

  const strength = pwStrength(pw);
  const strengthLabel = [T("sec.weak"), T("sec.weak"), T("sec.fair"), T("sec.good"), T("sec.strong")][strength];
  const strengthColor = ["var(--neg)", "var(--neg)", "var(--warn)", "var(--brand)", "var(--brand)"][strength];

  async function doCreate() {
    setErr("");
    if (pw.length < 8) return setErr(T("sec.tooShort"));
    if (pw !== pw2) return setErr(T("sec.mismatch"));
    setBusy(true);
    const ph = await window.Vault.create(pw, name.trim());
    setBusy(false);
    setPhrase(ph);
    setMode("recovery");
  }

  async function doUnlock() {
    setErr(""); setBusy(true);
    const ok = await window.Vault.unlock(pw);
    setBusy(false);
    if (!ok) { setErr(T("sec.wrong")); return; }
    if (window.Vault.data.settings.twoFa) setMode("twofa");
    else onUnlocked();
  }

  function doTwoFa() {
    setErr("");
    if (code.length !== 6) return setErr(T("sec.wrong"));
    window.Vault.logPersist("2fa.verified", "2FA bestätigt");
    onUnlocked();
  }

  async function doRecover() {
    setErr("");
    if (pw.length < 8) return setErr(T("sec.tooShort"));
    setBusy(true);
    const ok = await window.Vault.recover(recPhrase, pw);
    setBusy(false);
    if (!ok) return setErr(lang === "de" ? "Phrase ungültig." : "Invalid phrase.");
    onUnlocked();
  }

  const asideSub = {
    create: T("sec.setupSub"),
    recovery: T("sec.recoverySub"),
    unlock: lang === "de" ? "Alle Daten sind mit deinem Master-Passwort verschlüsselt — nur auf diesem Gerät." : "All data is encrypted with your master password — on this device only.",
    twofa: lang === "de" ? "Zusätzlicher Schutz durch Zwei-Faktor-Authentifizierung." : "Extra protection via two-factor authentication.",
    recover: lang === "de" ? "Mit deiner Wiederherstellungs-Phrase erhältst du wieder Zugang." : "Regain access with your recovery phrase.",
  }[mode];

  return (
    <AuthShell lang={lang} setLang={setLang} theme={theme} setTheme={setTheme} sub={asideSub}>
      {/* ---------- CREATE ---------- */}
      {mode === "create" && (
        <div className="animate">
          <div className="auth-icon"><Icon name="key" size={22} /></div>
          <h1 className="auth-h">{T("sec.setupTitle")}</h1>
          <p className="auth-p">{T("sec.setupSub")}</p>
          <div className="field" style={{ marginBottom: 14 }}>
            <label>{T("sec.name")}</label>
            <input className="input" value={name} autoFocus placeholder={lang === "de" ? "Vorname oder Familienname" : "First name or family name"} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="field" style={{ marginBottom: 14 }}>
            <label>{T("sec.master")}</label>
            <PwField value={pw} onChange={setPw} placeholder="••••••••••••" />
            {pw && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 9 }}>
                <div className="bar" style={{ flex: 1 }}><i style={{ width: `${(strength / 4) * 100}%`, background: strengthColor, transition: "all .3s" }} /></div>
                <span style={{ fontSize: 11.5, fontWeight: 650, color: strengthColor }}>{strengthLabel}</span>
              </div>
            )}
          </div>
          <div className="field" style={{ marginBottom: 18 }}>
            <label>{T("sec.masterConfirm")}</label>
            <PwField value={pw2} onChange={setPw2} placeholder="••••••••••••" onEnter={doCreate} />
          </div>
          {err && <div className="auth-err">{err}</div>}
          <button className="btn btn-primary btn-block btn-lg" onClick={doCreate} disabled={busy}>
            {busy ? "…" : <>{T("sec.create")} <Icon name="arrow" size={17} /></>}
          </button>
          <div className="auth-foot-note"><Icon name="shield" size={14} /> {T("sec.encrypted")} · {T("sec.localOnly")}</div>
        </div>
      )}

      {/* ---------- RECOVERY PHRASE ---------- */}
      {mode === "recovery" && (
        <div className="animate">
          <div className="auth-icon"><Icon name="shield" size={22} /></div>
          <h1 className="auth-h">{T("sec.recoveryTitle")}</h1>
          <p className="auth-p">{T("sec.recoverySub")}</p>
          <div className="phrase-grid">
            {phrase.map((w, i) => (
              <div className="phrase-chip" key={i}><span className="pc-i">{i + 1}</span><span className="mono">{w}</span></div>
            ))}
          </div>
          <label className="ack">
            <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} />
            <span>{T("sec.recoveryAck")}</span>
          </label>
          <button className="btn btn-primary btn-block btn-lg" disabled={!ack} style={{ opacity: ack ? 1 : .5 }} onClick={onUnlocked}>
            {T("sec.continue")} <Icon name="arrow" size={17} />
          </button>
        </div>
      )}

      {/* ---------- UNLOCK ---------- */}
      {mode === "unlock" && (
        <div className="animate">
          <div className="auth-icon"><Icon name="lock" size={22} /></div>
          <h1 className="auth-h">{T("sec.unlockTitle")}</h1>
          <p className="auth-p">{T("sec.unlockSub")}</p>
          <div className="field" style={{ marginBottom: 18 }}>
            <label>{T("sec.master")}</label>
            <PwField value={pw} onChange={setPw} placeholder="••••••••••••" autoFocus onEnter={doUnlock} />
          </div>
          {err && <div className="auth-err">{err}</div>}
          <button className="btn btn-primary btn-block btn-lg" onClick={doUnlock} disabled={busy}>
            {busy ? "…" : <>{T("sec.unlock")} <Icon name="unlock" size={17} /></>}
          </button>
          <button className="auth-link" onClick={() => { setErr(""); setPw(""); setMode("recover"); }}>
            {lang === "de" ? "Passwort vergessen? Phrase verwenden" : "Forgot password? Use recovery phrase"}
          </button>
          <div className="auth-foot-note"><Icon name="lock" size={14} /> {T("sec.autoLockNote")}</div>
        </div>
      )}

      {/* ---------- 2FA ---------- */}
      {mode === "twofa" && (
        <div className="animate">
          <div className="auth-icon"><Icon name="shield" size={22} /></div>
          <h1 className="auth-h">{T("sec.twoFa")}</h1>
          <p className="auth-p">{T("sec.twoFaSub")}</p>
          <input className="input mono otp" inputMode="numeric" maxLength={6} value={code} autoFocus
            placeholder="······" onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            onKeyDown={(e) => e.key === "Enter" && doTwoFa()} />
          {err && <div className="auth-err" style={{ marginTop: 14 }}>{err}</div>}
          <button className="btn btn-primary btn-block btn-lg" style={{ marginTop: 18 }} onClick={doTwoFa}>
            {T("sec.verify")} <Icon name="check" size={17} />
          </button>
          <div className="auth-foot-note">{T("sec.demoHint")}: <b className="mono" style={{ color: "var(--ink-2)" }}>beliebige 6 Ziffern</b></div>
        </div>
      )}

      {/* ---------- RECOVER ---------- */}
      {mode === "recover" && (
        <div className="animate">
          <div className="auth-icon"><Icon name="key" size={22} /></div>
          <h1 className="auth-h">{T("sec.recoveryTitle")}</h1>
          <p className="auth-p">{lang === "de" ? "Gib deine 6-Wort-Phrase ein und setze ein neues Master-Passwort." : "Enter your 6-word phrase and set a new master password."}</p>
          <div className="field" style={{ marginBottom: 14 }}>
            <label>{T("sec.recoveryTitle")}</label>
            <textarea className="input mono" rows={2} value={recPhrase} placeholder="alpen anker birke …"
              onChange={(e) => setRecPhrase(e.target.value)} style={{ resize: "none" }} />
          </div>
          <div className="field" style={{ marginBottom: 18 }}>
            <label>{lang === "de" ? "Neues Master-Passwort" : "New master password"}</label>
            <PwField value={pw} onChange={setPw} placeholder="••••••••••••" onEnter={doRecover} />
          </div>
          {err && <div className="auth-err">{err}</div>}
          <button className="btn btn-primary btn-block btn-lg" onClick={doRecover} disabled={busy}>{T("sec.continue")}</button>
          <button className="auth-link" onClick={() => { setErr(""); setMode("unlock"); }}>{T("common.back")}</button>
        </div>
      )}
    </AuthShell>
  );
}

Object.assign(window, { AuthScreen, PwField });
