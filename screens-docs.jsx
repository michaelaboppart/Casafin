/* ============================================================
   CasaFin — Documents & OCR
   ============================================================ */
const { useState: useStateD, useRef: useRefD } = React;

function kindIcon(kind) { return { tax: "📋", invoice: "🧾", insurance: "🏥", contract: "📄", receipt: "🛒" }[kind] || "📄"; }

function mockExtract(name) {
  const lower = name.toLowerCase();
  const vendors = ["AXA", "Swisscard", "Swisscom", "ZKB", "Coop", "Helsana", "Kt. Zürich"];
  const vendor = vendors.find((v) => lower.includes(v.toLowerCase())) || vendors[Math.floor(Math.random() * vendors.length)];
  const amount = "CHF " + (Math.floor(Math.random() * 900) + 80) + ".00";
  const kind = /steuer|tax/.test(lower) ? "tax" : /kranken|insur|axa|helsana/.test(lower) ? "insurance" : "invoice";
  const due = new Date(Date.now() + (Math.floor(Math.random() * 40) + 5) * 864e5).toISOString().slice(0, 10);
  return { vendor, amount: kind === "tax" ? "—" : amount, due, category: kind === "tax" ? "Steuern" : kind === "insurance" ? "Versicherung" : "Rechnung", kind };
}

function Documents({ lang }) {
  const T = (k) => window.I18N.t(k, lang);
  const d = window.Vault.data, F = window.fmt;
  const [drag, setDrag] = useStateD(false);
  const fileRef = useRefD(null);

  function handleFiles(files) {
    [...files].forEach((file) => {
      const id = "d" + Date.now() + Math.floor(Math.random() * 999);
      const ex = mockExtract(file.name);
      window.Vault.update((data) => {
        data.documents.unshift({ id, name: file.name, kind: ex.kind, size: (file.size / 1048576).toFixed(1) + " MB",
          date: new Date().toISOString().slice(0, 10), status: "processing", fields: ex });
        window.Vault.log("document.uploaded", file.name);
      });
      setTimeout(() => {
        window.Vault.update((data) => {
          const doc = data.documents.find((x) => x.id === id);
          if (doc) doc.status = "done";
          window.Vault.log("document.analyzed", file.name + " · OCR");
        });
      }, 2200);
    });
  }

  const processed = d.documents.filter((x) => x.status === "done").length;

  return (
    <div className="animate">
      <div className={"dropzone" + (drag ? " over" : "")}
        onClick={() => fileRef.current.click()}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); handleFiles(e.dataTransfer.files); }}>
        <input ref={fileRef} type="file" multiple accept=".pdf,.jpg,.jpeg,.png" style={{ display: "none" }}
          onChange={(e) => { handleFiles(e.target.files); e.target.value = ""; }} />
        <div className="dz-icon"><Icon name="upload" size={26} /></div>
        <div style={{ fontWeight: 680, fontSize: 16 }}>{T("docs.upload")}</div>
        <div style={{ fontSize: 13.5, color: "var(--ink-2)", marginTop: 4 }}>{T("docs.dropHint")}</div>
        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <span className="chip">{lang === "de" ? "Rechnungen" : "Invoices"}</span>
          <span className="chip">{lang === "de" ? "Quittungen" : "Receipts"}</span>
          <span className="chip">{lang === "de" ? "Steuerdokumente" : "Tax docs"}</span>
        </div>
        <div className="seclabel" style={{ marginTop: 16 }}><Icon name="lock" size={12} /> {T("docs.encNote")}</div>
      </div>

      <div className="card card-pad" style={{ marginTop: 18 }}>
        <div className="card-h"><h3>{T("docs.processed")}</h3><span className="nav-badge" style={{ marginLeft: "auto" }}>{d.documents.length}</span></div>
        <div style={{ display: "grid", gap: 12 }}>
          {d.documents.map((doc) => (
            <div className="doc-card" key={doc.id}>
              <div className="ic" style={{ fontSize: 19 }}>{kindIcon(doc.kind)}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="nm" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{doc.name}</div>
                <div className="sub">{F.date(doc.date, lang)} · {doc.size}</div>
                {doc.status === "done" && (
                  <div className="doc-fields">
                    <span><b>{T("docs.vendor")}:</b> {doc.fields.vendor}</span>
                    <span><b>{T("docs.amount")}:</b> {doc.fields.amount}</span>
                    <span><b>{T("docs.due")}:</b> {F.date(doc.fields.due, lang)}</span>
                    <span className="chip" style={{ fontSize: 10.5, padding: "2px 8px" }}>{doc.fields.category}</span>
                  </div>
                )}
              </div>
              <div style={{ alignSelf: "flex-start" }}>
                {doc.status === "done"
                  ? <span className="chip pos"><Icon name="check" size={12} /> {T("docs.analyzed")}</span>
                  : <span className="chip" style={{ color: "var(--warn)" }}><Icon name="refresh" size={12} style={{ animation: "ringSpin 1s linear infinite" }} /> {T("docs.processing")}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

window.Documents = Documents;
