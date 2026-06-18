/* ============================================================
   CasaFin — App shell: Sidebar · Topbar · BottomNav
   ============================================================ */
const NAV = [
  { id: "dashboard", icon: "dashboard", group: "overview" },
  { id: "bills", icon: "receipt", group: "overview" },
  { id: "budget", icon: "budget", group: "overview" },
  { id: "goals", icon: "target", group: "overview" },
  { id: "accounts", icon: "accounts", group: "manage" },
  { id: "business", icon: "briefcase", group: "manage" },
  { id: "tax", icon: "folder", group: "manage" },
  { id: "family", icon: "family", group: "manage" },
  { id: "fina", icon: "fina", badge: "AI", group: "intel" },
  { id: "subs", icon: "loop", group: "intel" },
  { id: "docs", icon: "docs", group: "intel" },
  { id: "agents", icon: "agents", count: 6, group: "intel" },
];
const NAV_GROUPS = [
  { id: "overview", label: "nav.gOverview" },
  { id: "manage", label: "nav.gManage" },
  { id: "intel", label: "nav.gIntel" },
];

function BrandMark() {
  return (
    <div className="brand-mark"><img src="assets/casafin-icon.png" alt="CasaFin" /></div>
  );
}

function Sidebar({ route, setRoute, lang, profile, health }) {
  const T = (k) => window.I18N.t(k, lang);
  return (
    <aside className="sidebar scroll">
      <div className="brand-row">
        <BrandMark />
        <div>
          <div className="brand-name">Casa<b>Fin</b></div>
          <div className="brand-tag">{T("app.tag")}</div>
        </div>
        <span className="demo-pill">{T("demo.badge")}</span>
      </div>

      {NAV_GROUPS.map((g) => (
        <React.Fragment key={g.id}>
          <div className="nav-group-label">{T(g.label)}</div>
          {NAV.filter((n) => n.group === g.id).map((n) => (
            <button key={n.id} className={"nav-item" + (route === n.id ? " active" : "")} onClick={() => setRoute(n.id)}>
              <Icon name={n.icon} />
              <span>{T("nav." + n.id)}</span>
              {n.badge && <span className="nav-badge">{n.badge}</span>}
              {n.count && <span className="nav-badge">{n.count}</span>}
            </button>
          ))}
        </React.Fragment>
      ))}
      <button className={"nav-item" + (route === "settings" ? " active" : "")} onClick={() => setRoute("settings")}>
        <Icon name="settings" />
        <span>{T("nav.settings")}</span>
      </button>

      <div className="sidebar-spacer" />

      <div className="pioneer-card">
        <div className="pk-k"><Icon name="sparkle" size={13} /> {T("pio.k")}</div>
        <div className="pk-t">{T("pio.t")}</div>
        <button className="btn btn-gold btn-block" style={{ fontSize: 13, padding: "9px 12px" }}
          onClick={() => window.open("https://buy.stripe.com/bJe8wO4IhdVvd8kdO87Vm00", "_blank")}>
          {T("pio.cta")}
        </button>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 8px 4px" }}>
        <div className="avatar">{profile.initials}</div>
        <div style={{ lineHeight: 1.2 }}>
          <div style={{ fontWeight: 650, fontSize: 13.5 }}>{profile.name}</div>
          <div style={{ fontSize: 11, color: "var(--ink-3)" }}>{profile.plan} · {profile.city}</div>
        </div>
      </div>
    </aside>
  );
}

function Topbar({ lang, setLang, theme, setTheme, onLock, title, em, sub, eyebrow }) {
  const T = (k) => window.I18N.t(k, lang);
  return (
    <div className="topbar">
      <div className="tb-greet">
        {eyebrow && <div className="eyebrow" style={{ marginBottom: 5 }}>{eyebrow}</div>}
        <h1>{title} {em && <em>{em}</em>}</h1>
        {sub && <p>{sub}</p>}
      </div>
      <div className="tb-actions">
        <div className="seg" role="group" aria-label="language">
          <button className={lang === "de" ? "on" : ""} onClick={() => setLang("de")}>DE</button>
          <button className={lang === "en" ? "on" : ""} onClick={() => setLang("en")}>EN</button>
        </div>
        <div className="seg" role="group" aria-label="theme">
          <button className={theme === "light" ? "on" : ""} onClick={() => setTheme("light")} aria-label="light"><Icon name="sun" size={15} /></button>
          <button className={theme === "dark" ? "on" : ""} onClick={() => setTheme("dark")} aria-label="dark"><Icon name="moon" size={15} /></button>
        </div>
        <button className="icon-btn" aria-label="notifications"><Icon name="bell" /></button>
        <button className="icon-btn" onClick={onLock} aria-label={T("sec.lock")} title={T("sec.lock")}><Icon name="lock" /></button>
      </div>
    </div>
  );
}

function BottomNav({ route, setRoute, lang }) {
  const T = (k) => window.I18N.t(k, lang);
  const items = [
    { id: "dashboard", icon: "dashboard" },
    { id: "bills", icon: "receipt" },
    { id: "budget", icon: "budget" },
    { id: "fina", icon: "fina" },
    { id: "settings", icon: "settings" },
  ];
  return (
    <nav className="bottomnav">
      {items.map((n) => (
        <button key={n.id} className={"bn-item" + (route === n.id ? " active" : "")} onClick={() => setRoute(n.id)}>
          <Icon name={n.icon} size={21} />
          <span>{T("nav." + n.id)}</span>
        </button>
      ))}
    </nav>
  );
}

Object.assign(window, { Sidebar, Topbar, BottomNav, BrandMark, NAV });
