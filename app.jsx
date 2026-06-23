/* ============================================================
   CasaFin — Root app
   ============================================================ */
const { useState, useEffect, useCallback, useRef } = React;

function useVaultState() {
  const [, force] = useState(0);
  useEffect(() => window.Vault.subscribe(() => force((n) => n + 1)), []);
  return window.Vault;
}

function App() {
  const prefs = window.Vault.getPrefs();
  const [lang, setLangState] = useState(prefs.lang);
  const [theme, setThemeState] = useState(prefs.theme);
  const [accent, setAccentState] = useState(prefs.accent || "teal");
  const [customColor, setCustomColorState] = useState(prefs.accentColor || "#0E9E8E");
  const [route, setRoute] = useState("dashboard");
  const [authed, setAuthed] = useState(false);
  const [emailGatePassed, setEmailGatePassed] = useState(false);
  const vault = useVaultState();
  const isDemo = vault.isDemo;
  const unlocked = vault.isUnlocked() && authed;

  useEffect(() => { document.documentElement.setAttribute("data-theme", theme); }, [theme]);
  useEffect(() => { window.applyAccent(accent, theme, customColor); }, [accent, theme, customColor]);
  const setLang = (l) => { setLangState(l); window.Vault.setPrefs({ lang: l }); };
  const setAccent = (a) => { setAccentState(a); window.Vault.setPrefs({ accent: a }); };
  const setCustomColor = (c) => { setCustomColorState(c); setAccentState("custom"); window.Vault.setPrefs({ accent: "custom", accentColor: c }); };
  const setTheme = (t) => {
    const el = document.documentElement;
    el.classList.add("theme-switching");
    setThemeState(t); window.Vault.setPrefs({ theme: t });
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.remove("theme-switching")));
  };

  /* ---- auto-lock ---- */
  const timer = useRef(null);
  useEffect(() => {
    if (!unlocked) return;
    const mins = (window.Vault.data?.settings?.autoLockMin) || 5;
    const reset = () => {
      clearTimeout(timer.current);
      timer.current = setTimeout(() => { window.Vault.logPersist("vault.autolock", "Auto-Sperre"); window.Vault.lock(); }, mins * 60000);
    };
    const evts = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    evts.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => { clearTimeout(timer.current); evts.forEach((e) => window.removeEventListener(e, reset)); };
  }, [unlocked]);

  const lock = useCallback(() => { window.Vault.logPersist("vault.locked", "Manuell gesperrt"); window.Vault.lock(); setAuthed(false); }, []);

  if (!emailGatePassed) {
    return <EmailGate lang={lang} setLang={setLang} theme={theme} setTheme={setTheme}
      onDemo={() => { window.Vault.enterDemo(); setAuthed(true); setEmailGatePassed(true); setRoute("dashboard"); }}
      onReal={() => { setEmailGatePassed(true); }} />;
  }
  if (!unlocked) {
    return <AuthScreen lang={lang} setLang={setLang} theme={theme} setTheme={setTheme} onUnlocked={() => { setAuthed(true); setRoute("dashboard"); }} />;
  }

  const d = window.Vault.data, F = window.fmt;
  const T = (k) => window.I18N.t(k, lang);
  const hour = new Date().getHours();
  const greet = hour < 11 ? T("dash.greetMorning") : hour < 18 ? T("dash.greetDay") : T("dash.greetEvening");
  const firstName = d.profile.name.split(" ")[0];

  const heads = {
    dashboard: { title: greet + ", ", em: firstName, sub: new Date().toLocaleDateString(lang === "de" ? "de-CH" : "en-GB", { weekday: "long", day: "numeric", month: "long" }) },
    bills: { eyebrow: "Cashflow", title: T("bills.title"), em: T("bills.titleEm"), sub: T("bills.sub") },
    goals: { eyebrow: "Sparen", title: T("goals.title"), em: T("goals.titleEm"), sub: T("goals.sub") },
    accounts: { eyebrow: "Portfolio", title: T("acc.title"), em: T("acc.titleEm"), sub: d.accounts.length + " " + (lang === "de" ? "verbundene Konten · Read-only" : "connected accounts · read-only") },
    business: { eyebrow: "Einzelfirma", title: T("biz.head"), em: T("biz.headEm"), sub: T("biz.sub") },
    tax: { eyebrow: "CasaTax", title: T("tax.title"), em: T("tax.titleEm"), sub: T("tax.sub") },
    family: { eyebrow: "CasaFamily", title: T("fam.title"), em: T("fam.titleEm"), sub: T("fam.sub") },
    budget: { eyebrow: lang === "de" ? "Mai 2026" : "May 2026", title: T("bud.title"), em: T("bud.titleEm") },
    fina: { eyebrow: "AI Copilot", title: "Fina", sub: T("fina.role") },
    subs: { eyebrow: "CasaBudget", title: T("subs.title"), em: T("subs.titleEm"), sub: T("subs.sub") },
    docs: { eyebrow: "OCR · AES-256", title: T("docs.title"), em: T("docs.titleEm") },
    agents: { eyebrow: "Claude · 5 " + (lang === "de" ? "aktiv" : "active"), title: T("agents.title"), em: T("agents.titleEm"), sub: T("agents.sub") },
    settings: { eyebrow: "Account", title: T("set.title") },
  };
  const h = heads[route];

  return (
    <div className="app">
      <Sidebar route={route} setRoute={setRoute} lang={lang} profile={d.profile} />
      <main className="main scroll">
        <div className="main-inner">
          <Topbar lang={lang} setLang={setLang} theme={theme} setTheme={setTheme} onLock={lock}
            title={h.title} em={h.em} sub={h.sub} eyebrow={h.eyebrow} />
          {isDemo && (
            <div className="demo-banner" style={{ background: "var(--gold-soft)", color: "var(--ink)", padding: "8px 14px", borderRadius: "10px", fontSize: 13, marginBottom: 14, display: "flex", alignItems: "center", gap: 8 }}>
              <Icon name="sparkle" size={15} /> {lang === "de" ? "Demo-Modus — erstelle deinen Tresor, um echte Daten zu speichern." : "Demo mode — create your vault to save real data."}
            </div>
          )}
          {route === "dashboard" && <Dashboard lang={lang} go={setRoute} />}
          {route === "bills" && <Bills lang={lang} />}
          {route === "goals" && <Goals lang={lang} />}
          {route === "accounts" && <Accounts lang={lang} />}
          {route === "business" && <Business lang={lang} />}
          {route === "tax" && <TaxFolder lang={lang} />}
          {route === "family" && <Family lang={lang} />}
          {route === "budget" && <Budget lang={lang} />}
          {route === "fina" && <Fina lang={lang} />}
          {route === "subs" && <Subscriptions lang={lang} />}
          {route === "docs" && <Documents lang={lang} />}
          {route === "agents" && <Agents lang={lang} />}
          {route === "settings" && <Settings lang={lang} setLang={setLang} theme={theme} setTheme={setTheme} accent={accent} setAccent={setAccent} customColor={customColor} setCustomColor={setCustomColor} onLock={lock} />}
        </div>
      </main>
      <BottomNav route={route} setRoute={setRoute} lang={lang} />
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
