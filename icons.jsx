/* ============================================================
   CasaFin — Icons (inline stroke SVGs)
   ============================================================ */
function Icon({ name, size = 20, sw = 1.7, style }) {
  const p = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor",
    strokeWidth: sw, strokeLinecap: "round", strokeLinejoin: "round", style };
  const paths = {
    dashboard: <><rect x="3" y="3" width="7.5" height="9" rx="1.5"/><rect x="13.5" y="3" width="7.5" height="5.5" rx="1.5"/><rect x="13.5" y="12" width="7.5" height="9" rx="1.5"/><rect x="3" y="15.5" width="7.5" height="5.5" rx="1.5"/></>,
    accounts: <><rect x="2.5" y="5.5" width="19" height="14" rx="2.5"/><path d="M2.5 9.5h19"/><path d="M6 14.5h4"/></>,
    budget: <><path d="M3 3v18h18"/><path d="M7 14l3.5-4 3 2.5L21 6"/></>,
    fina: <><path d="M12 3l2.1 4.6L19 9l-3.5 3.4.9 5L12 14.8 7.6 17.4l.9-5L5 9l4.9-1.4z"/></>,
    docs: <><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h6"/></>,
    agents: <><rect x="4" y="8" width="16" height="11" rx="2.5"/><path d="M12 8V4M9 4h6"/><circle cx="9" cy="13" r="1.2"/><circle cx="15" cy="13" r="1.2"/></>,
    settings: <><circle cx="12" cy="12" r="3.2"/><path d="M12 2.5v3M12 18.5v3M4.2 7l2.6 1.5M17.2 15.5l2.6 1.5M4.2 17l2.6-1.5M17.2 8.5l2.6-1.5"/></>,
    lock: <><rect x="4.5" y="10.5" width="15" height="10" rx="2.5"/><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"/><circle cx="12" cy="15.5" r="1.3"/></>,
    unlock: <><rect x="4.5" y="10.5" width="15" height="10" rx="2.5"/><path d="M8 10.5V7a4 4 0 0 1 7.8-1.2"/><circle cx="12" cy="15.5" r="1.3"/></>,
    shield: <><path d="M12 2.5l7.5 3v6c0 4.6-3.2 8.4-7.5 10-4.3-1.6-7.5-5.4-7.5-10v-6z"/><path d="M9 12l2 2 4-4"/></>,
    sun: <><circle cx="12" cy="12" r="4.2"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4"/></>,
    moon: <path d="M21 12.8A8.5 8.5 0 1 1 11.2 3a6.6 6.6 0 0 0 9.8 9.8z"/>,
    arrow: <><path d="M5 12h14M13 6l6 6-6 6"/></>,
    plus: <><path d="M12 5v14M5 12h14"/></>,
    chevron: <path d="M9 6l6 6-6 6"/>,
    bell: <><path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6"/><path d="M10.5 20a2 2 0 0 0 3 0"/></>,
    search: <><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/></>,
    check: <path d="M5 12l4.5 4.5L19 7"/>,
    upload: <><path d="M12 16V4M7 9l5-5 5 5"/><path d="M5 16v3a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3"/></>,
    send: <><path d="M21 3L10.5 13.5M21 3l-7 18-4-8-8-4z"/></>,
    sparkle: <><path d="M12 3l1.6 5.4L19 10l-5.4 1.6L12 17l-1.6-5.4L5 10l5.4-1.6z"/></>,
    key: <><circle cx="8" cy="8" r="4.5"/><path d="M11.2 11.2L20 20M17 17l2-2M15 15l2-2"/></>,
    download: <><path d="M12 4v12M7 11l5 5 5-5"/><path d="M5 20h14"/></>,
    trash: <><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/></>,
    eye: <><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></>,
    logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5M21 12H9"/></>,
    chart: <><path d="M3 3v18h18"/><rect x="7" y="11" width="3" height="6"/><rect x="12" y="7" width="3" height="10"/><rect x="17" y="13" width="3" height="4"/></>,
    refresh: <><path d="M20 12a8 8 0 1 1-2.3-5.6M20 4v4h-4"/></>,
    family: <><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9.5" r="2.2"/><path d="M3.5 19a5.5 5.5 0 0 1 11 0M15 17.5a4 4 0 0 1 5.5 1.5"/></>,
    receipt: <><path d="M5 3v18l2-1.4 2 1.4 2-1.4 2 1.4 2-1.4 2 1.4V3l-2 1.4L14 3l-2 1.4L10 3 8 4.4 6 3z"/><path d="M8 8h8M8 12h8M8 16h5"/></>,
    target: <><circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.8"/><circle cx="12" cy="12" r="1.3"/></>,
    loop: <><path d="M17 2.5l3.5 3.5L17 9.5"/><path d="M3.5 11V9a3 3 0 0 1 3-3h14"/><path d="M7 21.5L3.5 18 7 14.5"/><path d="M20.5 13v2a3 3 0 0 1-3 3h-14"/></>,
    scan: <><path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3"/><path d="M4 12h16"/></>,
    heart: <path d="M12 20s-7-4.4-9.2-8.4A4.9 4.9 0 0 1 12 6a4.9 4.9 0 0 1 9.2 5.6C19 15.6 12 20 12 20z"/>,
    phone: <path d="M5 4h3l2 5-2.5 1.5a11 11 0 0 0 5 5L19 17l1 3v0a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>,
    folder: <><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></>,
    coins: <><circle cx="9" cy="9" r="5.5"/><path d="M14.5 5.2A5.5 5.5 0 1 1 15 18.6"/></>,
    briefcase: <><rect x="3" y="7.5" width="18" height="12" rx="2.5"/><path d="M8.5 7.5V6a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v1.5"/><path d="M3 12h18"/></>,
  };
  return <svg {...p}>{paths[name] || null}</svg>;
}
window.Icon = Icon;
