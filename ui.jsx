/* ============================================================
   CasaFin — shared UI primitives
   ============================================================ */
const { useState: useStateU, useEffect: useEffectU } = React;

function Modal({ open, onClose, title, children, footer, width = 460 }) {
  useEffectU(() => {
    if (!open) return;
    const h = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="modal-backdrop" onMouseDown={onClose}>
      <div className="modal" style={{ maxWidth: width }} onMouseDown={(e) => e.stopPropagation()}>
        <div className="modal-h">
          <h3>{title}</h3>
          <button className="icon-btn" style={{ width: 34, height: 34 }} onClick={onClose} aria-label="close">
            <Icon name="plus" size={18} style={{ transform: "rotate(45deg)" }} />
          </button>
        </div>
        <div className="modal-body scroll">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

function Toggle({ on, onChange }) {
  return (
    <button className={"toggle" + (on ? " on" : "")} onClick={() => onChange(!on)} role="switch" aria-checked={on}>
      <span className="knob" />
    </button>
  );
}

function Segmented({ value, onChange, options }) {
  return (
    <div className="seg">
      {options.map((o) => (
        <button key={o.value} className={value === o.value ? "on" : ""} onClick={() => onChange(o.value)}>{o.label}</button>
      ))}
    </div>
  );
}

function PageHead({ eyebrow, title, em, sub, action }) {
  return (
    <div className="topbar" style={{ paddingTop: 0 }}>
      <div className="tb-greet">
        {eyebrow && <div className="eyebrow" style={{ marginBottom: 6 }}>{eyebrow}</div>}
        <h1 style={{ fontSize: 25 }}>{title} {em && <em>{em}</em>}</h1>
        {sub && <p>{sub}</p>}
      </div>
      {action && <div className="tb-actions">{action}</div>}
    </div>
  );
}

Object.assign(window, { Modal, Toggle, Segmented, PageHead });
