/* ============================================================
   CasaFin — Dashboard
   ============================================================ */
function StatTile({ k, icon, v, sub, dir, accent }) {
  return (
    <div className="stat">
      <div className="k"><Icon name={icon} size={15} /> {k}</div>
      <div className="v num">{v}</div>
      {sub && <div className={"measure-row " + (dir || "")} style={{ marginTop: 6 }}>
        {dir && <Icon name="budget" size={13} style={{ transform: dir === "down" ? "scaleY(-1)" : "none" }} />}
        <span>{sub}</span>
      </div>}
    </div>
  );
}

function Dashboard({ lang, go }) {
  const T = (k) => window.I18N.t(k, lang);
  const d = window.Vault.data, S = window.Vault.sel, F = window.fmt;
  const months = ["Jan", "Feb", "Mär", "Apr", "Mai", "Jun", "Jul", "Aug", "Sep", "Okt", "Nov", "Dez"];
  const bars = d.netWorthSeries.slice(-6).map((v, i, a) => ({ label: months[6 + i], v, on: i === a.length - 1 }));
  const recent = [...d.transactions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
  const health = S.health();

  return (
    <div className="animate">
      <div className="grid cols-4" style={{ marginBottom: 18 }}>
        <StatTile k={T("dash.netWorth")} icon="chart" v={F.chf(S.netWorth())} sub={"+2.1% " + T("dash.thisMonth")} dir="up" />
        <StatTile k={T("dash.spendMonth") + " " + (lang === "de" ? "Mai" : "May")} icon="budget" v={F.chf(S.monthSpent())} sub={"+12% " + T("dash.vsLast")} dir="up" />
        <StatTile k={T("dash.deductions")} icon="docs" v={F.chf(2400)} sub={"+" + F.chf(600) + " " + T("dash.newFound")} dir="up" />
        <div className="stat" style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ position: "relative", width: 72, height: 72, flexShrink: 0 }}>
            <HealthRing value={health} size={72} stroke={8} />
            <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
              <span className="num" style={{ fontWeight: 780, fontSize: 20 }}>{health}</span>
            </div>
          </div>
          <div>
            <div className="k"><Icon name="shield" size={15} /> {T("dash.health")}</div>
            <div style={{ fontSize: 13, color: "var(--ink-3)", marginTop: 6, fontWeight: 600 }}>{health >= 75 ? (lang === "de" ? "Sehr gut" : "Very good") : (lang === "de" ? "Solide" : "Solid")}</div>
          </div>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "1.55fr 1fr", alignItems: "start" }}>
        {/* LEFT */}
        <div className="grid">
          <div className="card card-pad">
            <div className="card-h">
              <h3>{T("dash.spending")}</h3>
              <span className="chip pos" style={{ marginLeft: "auto" }}>↑ {F.chf(36750)} · 12 Mt.</span>
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 8 }}>
              <span className="num" style={{ fontSize: 30, fontWeight: 780, letterSpacing: "-.03em" }}>{F.chf(S.netWorth())}</span>
            </div>
            <NetWorthLine series={d.netWorthSeries} height={138} />
            <div style={{ marginTop: 10 }}><MiniBars data={bars} /></div>
          </div>

          <div className="card card-pad">
            <div className="card-h">
              <h3>{T("dash.recent")}</h3>
              <button className="more" onClick={() => go("budget")}>{T("common.viewAll")} <Icon name="chevron" size={14} /></button>
            </div>
            {recent.map((t) => (
              <div className="row" key={t.id}>
                <div className="ic">{t.icon}</div>
                <div>
                  <div className="nm">{t.title}</div>
                  <div className="sub">{t.category} · {F.date(t.date, lang)}</div>
                </div>
                <div className={"amt num " + (t.amount > 0 ? "up" : "")}>{F.chf(t.amount, { sign: t.amount > 0, dp: 2 })}</div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT */}
        <div className="grid">
          {(() => {
            const nb = S.nextBill();
            if (!nb) return null;
            const dd = Math.round((new Date(nb.date || nb.due) - new Date().setHours(0,0,0,0)) / 864e5);
            const urgent = dd <= 5;
            return (
              <div className="card card-pad" style={{ background: urgent ? "var(--danger-soft)" : "var(--surface)", borderColor: urgent ? "transparent" : "var(--line)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <div className="ic" style={{ fontSize: 18, background: "var(--surface)" }}>{nb.icon}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 680, fontSize: 14 }}>{nb.vendor}</div>
                    <div style={{ fontSize: 12, color: urgent ? "var(--neg)" : "var(--ink-3)", fontWeight: 600 }}>
                      {F.chf(nb.amount)} · {dd < 0 ? Math.abs(dd) + " " + (lang === "de" ? "T. überfällig" : "d overdue") : dd === 0 ? (lang === "de" ? "heute fällig" : "due today") : (lang === "de" ? "fällig in " : "due in ") + dd + " " + (lang === "de" ? "Tagen" : "days")}
                    </div>
                  </div>
                  <span className="chip" style={{ fontSize: 10.5, color: "var(--warn)" }}>{T("bills.next")}</span>
                </div>
                <button className="btn btn-ghost btn-block" style={{ fontSize: 13, padding: "9px" }} onClick={() => go("bills")}><Icon name="receipt" size={15} /> {T("nav.bills")}</button>
              </div>
            );
          })()}
          <div className="card card-pad" style={{ textAlign: "center" }}>
            <div className="card-h" style={{ justifyContent: "center" }}><h3>{T("dash.health")}</h3></div>
            <div style={{ position: "relative", width: 132, height: 132, margin: "4px auto 18px" }}>
              <HealthRing value={health} />
              <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", flexDirection: "column" }}>
                <span className="num" style={{ fontWeight: 800, fontSize: 34, lineHeight: 1 }}>{health}</span>
                <span style={{ fontSize: 11, color: "var(--ink-3)", fontWeight: 600 }}>/ 100</span>
              </div>
            </div>
            <Meter label={T("dash.savingsRate")} value={S.savingsRate()} />
            <Meter label={T("dash.budgetKept")} value={S.budgetKept()} />
          </div>

          <div className="card card-pad">
            <div className="card-h">
              <h3>{T("dash.myAccounts")}</h3>
              <button className="more" onClick={() => go("accounts")}>{T("common.viewAll")} <Icon name="chevron" size={14} /></button>
            </div>
            {d.accounts.slice(0, 4).map((a) => (
              <div className="row" key={a.id}>
                <div className="ic" style={{ fontSize: 12, fontWeight: 700, fontFamily: "var(--font-mono)" }}>{a.bank.slice(0, 2).toUpperCase()}</div>
                <div>
                  <div className="nm">{a.label}</div>
                  <div className="sub">{a.bank} · {T("acc.type." + a.type)}</div>
                </div>
                <div className={"amt num " + (a.balance < 0 ? "down" : "")}>{F.chf(a.balance)}</div>
              </div>
            ))}
          </div>

          <div className="card card-pad fina-cta">
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
              <div className="fina-orb"><Icon name="sparkle" size={16} /></div>
              <div><div style={{ fontWeight: 720, fontSize: 15 }}>Fina</div><div style={{ fontSize: 11.5, color: "var(--ink-3)" }}>{T("fina.role")}</div></div>
            </div>
            <p style={{ fontSize: 13.5, color: "var(--ink-2)", lineHeight: 1.5, marginBottom: 14 }}>{T("dash.finaPreview")}</p>
            <button className="btn btn-primary btn-block" onClick={() => go("fina")}><Icon name="sparkle" size={16} /> {T("dash.askFina")}</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Meter({ label, value }) {
  return (
    <div style={{ textAlign: "left", marginTop: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginBottom: 6 }}>
        <span style={{ color: "var(--ink-2)", fontWeight: 600 }}>{label}</span>
        <span className="num" style={{ fontWeight: 700 }}>{value}%</span>
      </div>
      <div className="bar"><i style={{ width: value + "%" }} /></div>
    </div>
  );
}

Object.assign(window, { Dashboard, StatTile, Meter });
