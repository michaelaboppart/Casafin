/* ============================================================
   CasaFin — Agents
   ============================================================ */
const { useState: useStateG } = React;

const AGENT_ICON = { CT: "docs", CD: "upload", CB: "budget", CM: "bell", CP: "send", CF: "family" };

function Agents({ lang }) {
  const T = (k) => window.I18N.t(k, lang);
  const d = window.Vault.data;
  const [pulse, setPulse] = useStateG(null);

  function toggle(id) {
    window.Vault.update((data) => {
      const a = data.agents.find((x) => x.id === id);
      a.status = a.status === "paused" ? "running" : "paused";
      window.Vault.log("agent.toggled", a.name + " → " + a.status);
    });
  }
  function run(id) {
    setPulse(id);
    window.Vault.logPersist("agent.run", d.agents.find((x) => x.id === id).name);
    setTimeout(() => setPulse(null), 1200);
  }

  const active = d.agents.filter((a) => a.status === "running").length;

  return (
    <div className="animate">
      <div className="grid cols-3">
        {d.agents.map((a) => {
          const running = a.status === "running";
          return (
            <div className={"card card-pad agent-card" + (pulse === a.id ? " pulse" : "")} key={a.id}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 14 }}>
                <div className="agent-badge"><Icon name={AGENT_ICON[a.code]} size={19} /></div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span className="mono" style={{ fontSize: 11, color: "var(--ink-3)", fontWeight: 600 }}>{a.code}</span>
                    <span style={{ fontWeight: 720, fontSize: 15 }}>{a.name}</span>
                  </div>
                  <div style={{ fontSize: 12.5, color: "var(--ink-2)", marginTop: 2 }}>{lang === "de" ? a.role : a.roleEn}</div>
                </div>
                <span className={"agent-status " + (running ? "on" : "off")}>{running ? <><span className="dot" /> {T("agents.running")}</> : T("agents.paused")}</span>
              </div>

              <div className="agent-meta">
                <div><div className="am-k">{T("agents.lastRun")}</div><div className="am-v">{lang === "de" ? a.lastRun : a.lastRunEn}</div></div>
                <div><div className="am-k">{T("agents.found")}</div><div className="am-v" style={{ color: "var(--brand)" }}>{lang === "de" ? a.found : a.foundEn}</div></div>
              </div>

              <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                <button className="btn btn-ghost" style={{ flex: 1, padding: "9px 12px", fontSize: 13 }} onClick={() => run(a.id)}>
                  <Icon name="refresh" size={15} style={pulse === a.id ? { animation: "ringSpin 1s linear infinite" } : null} /> {T("agents.run")}
                </button>
                <Toggle on={running} onChange={() => toggle(a.id)} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

window.Agents = Agents;
