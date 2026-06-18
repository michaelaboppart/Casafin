/* ============================================================
   CasaFin — Charts (pure SVG, theme-aware via CSS vars)
   ============================================================ */
const { useState: useStateC, useEffect: useEffectC, useId } = React;

/* ---------- Health ring ---------- */
function HealthRing({ value = 0, size = 132, stroke = 11 }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const [p, setP] = useStateC(0);
  useEffectC(() => { const t = setTimeout(() => setP(value), 120); return () => clearTimeout(t); }, [value]);
  const off = c - (p / 100) * c;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-3)" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--brand)" strokeWidth={stroke}
        strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off}
        style={{ transition: "stroke-dashoffset 1.1s cubic-bezier(.16,1,.3,1)" }} />
    </svg>
  );
}

/* ---------- Net-worth area line ---------- */
function NetWorthLine({ series = [], height = 150 }) {
  const gid = useId().replace(/:/g, "");
  const w = 560, h = height, pad = 8;
  const min = Math.min(...series), max = Math.max(...series);
  const span = max - min || 1;
  const pts = series.map((v, i) => {
    const x = pad + (i / (series.length - 1)) * (w - pad * 2);
    const y = pad + (1 - (v - min) / span) * (h - pad * 2 - 14) + 7;
    return [x, y];
  });
  const line = pts.map((p, i) => (i ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1)).join(" ");
  const area = line + ` L${(w - pad).toFixed(1)} ${h} L${pad} ${h} Z`;
  const last = pts[pts.length - 1];
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none" style={{ display: "block" }}>
      <defs>
        <linearGradient id={"g" + gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--brand)" stopOpacity="0.22" />
          <stop offset="100%" stopColor="var(--brand)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#g${gid})`} />
      <path d={line} fill="none" stroke="var(--brand)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r="4.5" fill="var(--brand)" stroke="var(--surface)" strokeWidth="2.5" />
    </svg>
  );
}

/* ---------- Category donut ---------- */
const DONUT_COLORS = ["var(--brand)", "#5BB8E8", "#E8A33C", "#B07CE0", "#E8746B", "#5AC6A0"];
function CategoryDonut({ categories = [], size = 180 }) {
  const stroke = 26, r = (size - stroke) / 2, c = 2 * Math.PI * r;
  const total = categories.reduce((s, x) => s + x.spent, 0) || 1;
  let acc = 0;
  const [mounted, setMounted] = useStateC(false);
  useEffectC(() => { const t = setTimeout(() => setMounted(true), 100); return () => clearTimeout(t); }, []);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--surface-3)" strokeWidth={stroke} />
        {categories.map((cat, i) => {
          const frac = cat.spent / total;
          const dash = mounted ? frac * c : 0;
          const el = (
            <circle key={cat.id} cx={size / 2} cy={size / 2} r={r} fill="none"
              stroke={DONUT_COLORS[i % DONUT_COLORS.length]} strokeWidth={stroke}
              strokeDasharray={`${dash} ${c - dash}`} strokeDashoffset={-acc * c}
              style={{ transition: "stroke-dasharray 1s cubic-bezier(.16,1,.3,1)" }} />
          );
          acc += frac;
          return el;
        })}
      </g>
    </svg>
  );
}

/* ---------- Mini month bars ---------- */
function MiniBars({ data = [], height = 60 }) {
  const max = Math.max(...data.map(d => d.v), 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, height: "100%" }}>
          <div style={{ flex: 1, width: "100%", display: "flex", alignItems: "flex-end" }}>
            <div style={{
              width: "100%", height: `${(d.v / max) * 100}%`, minHeight: 4,
              background: d.on ? "var(--brand)" : "var(--surface-3)",
              borderRadius: 6, transition: "height .8s cubic-bezier(.16,1,.3,1)",
            }} />
          </div>
          <span style={{ fontSize: 10.5, color: "var(--ink-3)", fontWeight: 600 }}>{d.label}</span>
        </div>
      ))}
    </div>
  );
}

/* ---------- Sparkline ---------- */
function Sparkline({ series = [], width = 84, height = 30, color = "var(--brand)" }) {
  const min = Math.min(...series), max = Math.max(...series), span = max - min || 1;
  const pts = series.map((v, i) => {
    const x = (i / (series.length - 1)) * width;
    const y = (1 - (v - min) / span) * (height - 4) + 2;
    return x.toFixed(1) + " " + y.toFixed(1);
  });
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

Object.assign(window, { HealthRing, NetWorthLine, CategoryDonut, MiniBars, Sparkline, DONUT_COLORS });
