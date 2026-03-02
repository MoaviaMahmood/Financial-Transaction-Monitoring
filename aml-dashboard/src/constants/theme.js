export const C = {
    bg: "#060810",
    surface: "#0d1117",
    surface2: "#131924",
    border: "rgba(255,255,255,0.07)",
    accent: "#00e5ff",
    accent2: "#ff3b6b",
    accent3: "#f5c518",
    text: "#e8eaf0",
    muted: "#5a6378",
    green: "#00d68f",
};

export const BADGE_COLOR = {
    critical: { bg: "rgba(255,59,107,.15)", c: C.accent2, border: "rgba(255,59,107,.25)" },
    high: { bg: "rgba(245,197,24,.1)", c: C.accent3, border: "rgba(245,197,24,.2)" },
    medium: { bg: "rgba(0,229,255,.08)", c: C.accent, border: "rgba(0,229,255,.15)" },
    cleared: { bg: "rgba(0,214,143,.08)", c: C.green, border: "rgba(0,214,143,.15)" },
};

export const RISK_ORDER = { critical: 4, high: 3, medium: 2, cleared: 1 };
