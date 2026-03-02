import { C } from "./theme";

export const INIT_TRANSACTIONS = [
    { id: "TXN-928841", entity: "Meridian Corp LLC", amount: 487200, type: "Wire Transfer", rule: "Structuring + Layering", risk: "critical", time: "09:14", score: 94, _new: false },
    { id: "TXN-928819", entity: "Axon Trading GmbH", amount: 112500, type: "Crypto Bridge", rule: "PEP Cross-reference", risk: "critical", time: "08:52", score: 88, _new: false },
    { id: "TXN-928740", entity: "J. Petrov Holdings", amount: 34800, type: "ACH Batch", rule: "Velocity Threshold", risk: "high", time: "07:31", score: 71, _new: false },
    { id: "TXN-928721", entity: "Novex Financial SA", amount: 209000, type: "SWIFT", rule: "Sanctions Adjacent", risk: "high", time: "06:18", score: 65, _new: false },
    { id: "TXN-928693", entity: "T. Whitmore (PRIV)", amount: 9800, type: "Cash Equiv", rule: "Sub-threshold Pattern", risk: "medium", time: "04:42", score: 42, _new: false },
    { id: "TXN-928601", entity: "Lodestar Capital", amount: 78300, type: "Wire Transfer", rule: "Geo Anomaly", risk: "cleared", time: "02:11", score: 28, _new: false },
];

export const RISK_ENTITIES = [
    { i: "MK", name: "Meridian Corp LLC", meta: "14 txns · Shell entity flag", score: 94, cls: "high", bg: "rgba(255,59,107,.12)", c: C.accent2 },
    { i: "AX", name: "Axon Trading GmbH", meta: "8 txns · PEP match", score: 88, cls: "high", bg: "rgba(255,59,107,.12)", c: C.accent2 },
    { i: "JP", name: "J. Petrov Holdings", meta: "22 txns · High velocity", score: 71, cls: "med", bg: "rgba(245,197,24,.1)", c: C.accent3 },
    { i: "NF", name: "Novex Financial SA", meta: "5 txns · OFAC adjacent", score: 65, cls: "med", bg: "rgba(245,197,24,.1)", c: C.accent3 },
    { i: "TW", name: "T. Whitmore (PRIV)", meta: "3 txns · Structuring pattern", score: 42, cls: "low", bg: "rgba(0,214,143,.1)", c: C.green },
];

export const GEO_DATA = [
    { f: "🇷🇺", n: "Russia", v: 82, c: C.accent2 },
    { f: "🇨🇳", n: "China", v: 74, c: C.accent },
    { f: "🇦🇪", n: "UAE", v: 61, c: C.accent },
    { f: "🇧🇭", n: "Bahrain", v: 48, c: C.accent3 },
    { f: "🇳🇬", n: "Nigeria", v: 43, c: C.accent3 },
    { f: "🇲🇾", n: "Malaysia", v: 29, c: C.green },
];

export const RULE_DATA = [
    { n: "Structuring / Smurfing", v: 88 },
    { n: "Velocity Threshold", v: 72 },
    { n: "PEP / Sanctions Match", v: 61 },
    { n: "Geographic Anomaly", v: 47 },
    { n: "Round-trip Layering", v: 38 },
    { n: "Crypto Mixing", v: 24 },
];

export const CHART_DATA = [
    { l: "Feb 17", f: 12, c: 18 }, { l: "Feb 18", f: 19, c: 24 },
    { l: "Feb 19", f: 8, c: 15 }, { l: "Feb 20", f: 23, c: 31 },
    { l: "Feb 21", f: 15, c: 28 }, { l: "Feb 22", f: 11, c: 22 },
    { l: "Feb 23", f: 28, c: 19 }, { l: "Feb 24", f: 34, c: 25 },
    { l: "Feb 25", f: 21, c: 38 }, { l: "Feb 26", f: 16, c: 29 },
    { l: "Feb 27", f: 25, c: 34 }, { l: "Feb 28", f: 30, c: 27 },
    { l: "Mar 01", f: 18, c: 41 }, { l: "Mar 02", f: 23, c: 35 },
];

export const TICKER_ITEMS = [
    { a: true, l: "ALERT", t: "TXN-928841 · $487K · Structuring" },
    { a: false, l: "TX", t: "TXN-928800 · Axon Trading · Cleared" },
    { a: true, l: "ALERT", t: "PEP Match · Axon Trading GmbH" },
    { a: false, l: "TX", t: "TXN-928780 · Lodestar Capital · $78.3K" },
    { a: true, l: "ALERT", t: "Velocity breach · J. Petrov · 22 txns" },
    { a: false, l: "TX", t: "TXN-928750 · Standard review · Cleared" },
    { a: false, l: "SYS", t: "Rule engine updated · v4.12.3" },
    { a: true, l: "ALERT", t: "SWIFT $209K · Novex Financial · Sanctions adj." },
];

export const INIT_ALERTS = [
    { lv: "critical", t: "TXN-928841 flagged", s: "Meridian Corp — Structuring + Layering · $487K", time: "09:14" },
    { lv: "critical", t: "PEP Match detected", s: "Axon Trading GmbH — Sanctions list hit", time: "08:52" },
    { lv: "high", t: "Velocity breach", s: "J. Petrov Holdings — 22 txns in 4 hrs", time: "07:31" },
    { lv: "high", t: "Sanctions adjacent", s: "Novex Financial SA — SWIFT $209K", time: "06:18" },
    { lv: "medium", t: "Sub-threshold pattern", s: "T. Whitmore — 3 × $9.8K (structuring)", time: "04:42" },
    { lv: "medium", t: "Case #4412 updated", s: "Analyst review complete — pending SAR", time: "03:30" },
    { lv: "medium", t: "Rule updated", s: "Velocity threshold adjusted to 15 txns/hr", time: "01:15" },
];

export const INIT_KPI_SPARK = {
    critical: [18, 20, 22, 19, 25, 21, 23, 20, 24, 22, 25, 23, 24, 23],
    pending: [130, 135, 140, 138, 145, 142, 148, 144, 150, 146, 149, 147, 150, 148],
    cleared: [320, 335, 350, 340, 360, 355, 370, 365, 375, 368, 380, 376, 388, 391],
    volume: [1.8, 1.9, 2.0, 2.1, 2.0, 2.2, 2.1, 2.3, 2.2, 2.4, 2.3, 2.5, 2.4, 2.4],
};

export const ENTITY_POOL = [
    "Apex Holdings", "Zenith Corp", "Mirage Trading", "Delta Capital",
    "Phantom Ventures", "Volt Finance", "Crest Partners", "Orbital FX",
];
export const RULE_POOL = ["Structuring", "Velocity Breach", "PEP Match", "Geo Anomaly", "Crypto Mix", "Round-trip"];
export const TX_TYPES = ["Wire Transfer", "SWIFT", "ACH Batch", "Crypto Bridge", "Cash Equiv"];

export const NAV_SECTIONS = [
    { label: "Monitor", items: [{ icon: "◉", name: "Overview" }, { icon: "⚡", name: "Alerts" }, { icon: "⇄", name: "Transactions" }, { icon: "◈", name: "Network Graph" }] },
    { label: "Investigate", items: [{ icon: "◎", name: "Entities" }, { icon: "⬡", name: "Case Manager" }, { icon: "⌖", name: "Watchlists" }] },
    { label: "Compliance", items: [{ icon: "▦", name: "SAR Reports" }, { icon: "◧", name: "Audit Log" }, { icon: "⊞", name: "Rule Config" }] },
    { label: "System", items: [{ icon: "◌", name: "Settings" }, { icon: "↗", name: "API Keys" }] },
];
