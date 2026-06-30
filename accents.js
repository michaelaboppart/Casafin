/* ============================================================
   CasaFin — Accent palettes (live-switchable brand colour)
   ============================================================ */
(function () {
  window.ACCENTS = {
    olive: {
      label: { de: "Olive", en: "Olive" },
      swatch: "#B3C242",
      light: { brand: "#B3C242", brand2: "#9AA836", ink: "#4E5A1C", soft: "#E9EECB", glow: "rgba(179,194,66,.18)" },
      dark:  { brand: "#BECA67", brand2: "#C9D47E", ink: "#D6DE9A", soft: "rgba(190,202,103,.16)", glow: "rgba(190,202,103,.30)" },
    },
    emerald: {
      label: { de: "Smaragd", en: "Emerald" },
      swatch: "#0E8A63",
      light: { brand: "#0E8A63", brand2: "#0B6E4F", ink: "#0A5C42", soft: "#E4F2EB", glow: "rgba(14,138,99,.16)" },
      dark:  { brand: "#2BB585", brand2: "#34C994", ink: "#5FD7AE", soft: "rgba(43,181,133,.14)", glow: "rgba(43,181,133,.28)" },
    },
    green: {
      label: { de: "Frisches Grün", en: "Fresh green" },
      swatch: "#10A36B",
      light: { brand: "#10A36B", brand2: "#0C8A57", ink: "#0A6B45", soft: "#E2F4EC", glow: "rgba(16,163,107,.18)" },
      dark:  { brand: "#2FC489", brand2: "#3AD897", ink: "#67E0AC", soft: "rgba(47,196,137,.14)", glow: "rgba(47,196,137,.30)" },
    },
    teal: {
      label: { de: "Petrol", en: "Petrol" },
      swatch: "#0B8F92",
      light: { brand: "#0B8F92", brand2: "#0A7479", ink: "#075257", soft: "#E0F1F1", glow: "rgba(11,143,146,.18)" },
      dark:  { brand: "#1FB6B3", brand2: "#2ACAC4", ink: "#64D8D2", soft: "rgba(31,182,179,.15)", glow: "rgba(31,182,179,.30)" },
    },
    turquoise: {
      label: { de: "Türkis", en: "Turquoise" },
      swatch: "#13A7B8",
      light: { brand: "#13A7B8", brand2: "#0E8595", ink: "#0B6571", soft: "#E0F2F4", glow: "rgba(19,167,184,.18)" },
      dark:  { brand: "#2BBFD0", brand2: "#34D2E2", ink: "#6FDEEA", soft: "rgba(43,191,208,.15)", glow: "rgba(43,191,208,.30)" },
    },
  };
  window.ACCENT_ORDER = ["olive", "emerald", "green", "teal", "turquoise"];

  /* ---- custom colour: derive a full accent from one hex ---- */
  function hexToRgb(h) { h = h.replace("#", ""); if (h.length === 3) h = h.split("").map((c) => c + c).join(""); return [0, 2, 4].map((i) => parseInt(h.substr(i, 2), 16)); }
  function shade(rgb, p) { const f = (c) => Math.round(Math.min(255, Math.max(0, c + (p < 0 ? c * p : (255 - c) * p)))); return "#" + rgb.map((c) => f(c).toString(16).padStart(2, "0")).join(""); }
  function rgba(rgb, a) { return "rgba(" + rgb[0] + "," + rgb[1] + "," + rgb[2] + "," + a + ")"; }
  window.deriveAccent = function (hex, theme) {
    const rgb = hexToRgb(hex);
    if (theme === "dark") return { brand: hex, brand2: shade(rgb, 0.14), ink: shade(rgb, 0.42), soft: rgba(rgb, 0.16), glow: rgba(rgb, 0.30) };
    return { brand: hex, brand2: shade(rgb, -0.18), ink: shade(rgb, -0.36), soft: rgba(rgb, 0.12), glow: rgba(rgb, 0.16) };
  };

  window.applyAccent = function (key, theme, customHex) {
    const c = key === "custom" && customHex
      ? window.deriveAccent(customHex, theme)
      : (window.ACCENTS[key] || window.ACCENTS.olive)[theme === "dark" ? "dark" : "light"];
    const s = document.documentElement.style;
    s.setProperty("--brand", c.brand);
    s.setProperty("--brand-2", c.brand2);
    s.setProperty("--brand-ink", c.ink);
    s.setProperty("--brand-soft", c.soft);
    s.setProperty("--brand-glow", c.glow);
    /* --pos stays a readable semantic green (set in CSS); not tied to a light accent */
  };
})();
