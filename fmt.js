/* ============================================================
   CasaFin — formatting helpers
   ============================================================ */
(function () {
  function chf(n, opts = {}) {
    const neg = n < 0;
    const v = Math.abs(n);
    const s = v.toLocaleString("de-CH", {
      minimumFractionDigits: opts.dp ?? 0,
      maximumFractionDigits: opts.dp ?? 0,
    }).replace(/\u2019/g, "'");
    const out = (opts.noCur ? "" : "CHF ") + s;
    return (neg ? "–" : (opts.sign ? "+" : "")) + out;
  }
  function compact(n) {
    if (Math.abs(n) >= 1000) return (n / 1000).toLocaleString("de-CH", { maximumFractionDigits: 0 }) + "k";
    return String(n);
  }
  function date(iso, lang = "de") {
    const d = new Date(iso);
    return d.toLocaleDateString(lang === "de" ? "de-CH" : "en-GB", { day: "2-digit", month: "short", year: "numeric" });
  }
  function timeAgo(ts, lang = "de") {
    const d = new Date(ts);
    return d.toLocaleString(lang === "de" ? "de-CH" : "en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  }
  window.fmt = { chf, compact, date, timeAgo };
})();
