// import { useState, useEffect, useCallback } from "react";

// // ─────────────────────────────────────────────────────────────
// // REFERENCE DATA  (mirrors Python script exactly)
// // ─────────────────────────────────────────────────────────────
// const FIRST_NAMES = ["James", "Maria", "Chen", "Ahmed", "Sophie", "Luca", "Yuki", "Omar",
//     "Elena", "Carlos", "David", "Fatima", "Pierre", "Anna", "Raj", "Kim",
//     "Miguel", "Aisha", "Ivan", "Lin", "Samuel", "Nadia", "Felix", "Sara"];
// const LAST_NAMES = ["Smith", "Wang", "Patel", "Mueller", "Silva", "Johnson", "Dubois",
//     "Kim", "Rossi", "Hassan", "Novak", "Williams", "Garcia", "Tanaka",
//     "Brown", "Nguyen", "Ali", "Kowalski", "Fernandez", "Okafor"];
// const BUSINESS_TYPES = ["RETAIL", "RESTAURANT", "CONSULTING", "IMPORT_EXPORT", "REAL_ESTATE",
//     "CRYPTO_EXCHANGE", "SHELL_COMPANY", "INDIVIDUAL", "NGO", "LOGISTICS"];
// const LOCATIONS_LOW_RISK = [
//     ["New York", "US"], ["Los Angeles", "US"], ["Chicago", "US"], ["Houston", "US"], ["Miami", "US"],
//     ["Toronto", "CA"], ["London", "GB"], ["Frankfurt", "DE"], ["Paris", "FR"], ["Amsterdam", "NL"],
//     ["Zurich", "CH"], ["Tokyo", "JP"], ["Singapore", "SG"], ["Sydney", "AU"], ["Shanghai", "CN"],
// ];
// const LOCATIONS_HIGH_RISK = [
//     ["Cayman Islands", "KY"], ["Panama City", "PA"], ["Nassau", "BS"], ["Nicosia", "CY"],
//     ["Moscow", "RU"], ["Dubai", "AE"], ["Hong Kong", "HK"], ["Riga", "LV"], ["Valletta", "MT"],
// ];
// const ALL_LOCATIONS = [...LOCATIONS_LOW_RISK, ...LOCATIONS_HIGH_RISK];
// const HIGH_RISK_CC = new Set(["KY", "PA", "BS", "CY", "RU", "AE", "HK", "LV", "MT"]);
// const SANCTIONED_CC = new Set(["IR", "KP", "MM", "SY", "YE", "CU", "VE"]);
// const TXN_TYPES = ["WIRE", "ACH", "CASH_DEPOSIT", "CASH_WITHDRAWAL", "INTERNAL_TRANSFER", "TRADE_PAYMENT", "PAYMENT"];
// const CASH_TYPES = new Set(["CASH_DEPOSIT", "CASH_WITHDRAWAL"]);
// const MERCHANT_CATS = ["retail", "utilities", "groceries", "entertainment", "healthcare", "travel",
//     "restaurants", "electronics", "fuel", "gambling", "cryptocurrency_exchange", "jewelry", "real_estate", "forex", "atm_cash"];
// const HIGH_RISK_MERCH = ["gambling", "cryptocurrency_exchange", "forex", "atm_cash", "jewelry"];
// const CURRENCIES = ["USD", "USD", "USD", "USD", "USD", "USD", "EUR", "GBP", "JPY", "CHF", "AED", "SGD"];
// const DEVICES = ["mobile", "web", "atm", "pos"];
// const ACCOUNT_TYPES = ["CHECKING", "SAVINGS", "BUSINESS"];
// const ALERT_STATUSES = ["OPEN", "REVIEWED", "ESCALATED", "CLOSED"];
// const ALERT_WEIGHTS = [40, 25, 20, 15];

// const AML_PATTERNS = {
//     NONE: { color: "#3a4f70", label: "Normal", icon: "◆" },
//     STRUCTURING: { color: "#ff6b35", label: "Structuring", icon: "▼" },
//     LAYERING: { color: "#f7c59f", label: "Layering", icon: "⬡" },
//     ROUND_TRIP: { color: "#e040fb", label: "Round-Trip", icon: "↺" },
//     SHELL_COMPANY: { color: "#ff4081", label: "Shell Company", icon: "◈" },
//     TRADE_BASED: { color: "#ffeb3b", label: "Trade-Based", icon: "≠" },
//     LARGE_RAPID: { color: "#ff1744", label: "Large Rapid", icon: "↑" },
//     HIGH_VELOCITY: { color: "#00b0ff", label: "High Velocity", icon: "≫" },
//     IMPOSSIBLE_TRAVEL: { color: "#69ff47", label: "Impossible Travel", icon: "⌖" },
// };

// const PATTERN_DESCS = {
//     NONE: "No suspicious indicators detected.",
//     STRUCTURING: "Multiple deposits just below $10K CTR threshold (smurfing).",
//     LAYERING: "Large amount cycled through 3–7 accounts to obscure origin.",
//     ROUND_TRIP: "Funds sent A→B then returned B→A within hours.",
//     SHELL_COMPANY: "Routed through entity with no real business activity.",
//     TRADE_BASED: "Payment grossly exceeds or falls below declared invoice value.",
//     LARGE_RAPID: "Single large wire transfer to a high-risk jurisdiction.",
//     HIGH_VELOCITY: "Burst of 8–15 payments from one account in ~30 minutes.",
//     IMPOSSIBLE_TRAVEL: "Account active in two geographically distant cities simultaneously.",
// };

// // ─────────────────────────────────────────────────────────────
// // RNG
// // ─────────────────────────────────────────────────────────────
// let _seed = 42;
// const rng = () => { _seed = (_seed * 1664525 + 1013904223) & 0xffffffff; return (_seed >>> 0) / 0xffffffff; };
// const pick = arr => arr[Math.floor(rng() * arr.length)];
// const rand = (a, b) => a + rng() * (b - a);
// const uid = () => Math.random().toString(36).slice(2, 14).toUpperCase();
// const wPick = (arr, w) => { let t = w.reduce((a, b) => a + b, 0), r = rng() * t; for (let i = 0; i < arr.length; i++) { r -= w[i]; if (r <= 0) return arr[i]; } return arr[arr.length - 1]; };
// const fmtDate = d => new Date(d).toISOString().replace(".000", "") + (new Date(d).toISOString().endsWith("Z") ? "" : "Z");

// // ─────────────────────────────────────────────────────────────
// // GENERATORS
// // ─────────────────────────────────────────────────────────────
// function randDate(start, end) {
//     return new Date(start + rng() * (end - start));
// }
// const D2023_S = new Date("2023-01-01").getTime();
// const D2023_E = new Date("2023-12-31T23:59:59").getTime();

// function computeRiskRating(cc, bizType, pep) {
//     let s = 0;
//     if (SANCTIONED_CC.has(cc)) s += 3;
//     else if (HIGH_RISK_CC.has(cc)) s += 2;
//     if (["SHELL_COMPANY", "CRYPTO_EXCHANGE", "IMPORT_EXPORT"].includes(bizType)) s += 2;
//     if (pep) s += 2;
//     return s >= 4 ? "HIGH" : s >= 2 ? "MEDIUM" : "LOW";
// }

// function computeAlertScore(txn, customer) {
//     let s = 0;
//     if (txn.amount >= 10000) s += 30;
//     if (HIGH_RISK_CC.has(txn.country_origin) || SANCTIONED_CC.has(txn.country_origin)) s += 20;
//     if (HIGH_RISK_CC.has(txn.country_dest) || SANCTIONED_CC.has(txn.country_dest)) s += 20;
//     if (CASH_TYPES.has(txn.transaction_type)) s += 15;
//     if (HIGH_RISK_MERCH.includes(txn.merchant_category)) s += 10;
//     if (customer?.pep_flag) s += 20;
//     if (customer?.risk_rating === "HIGH") s += 15;
//     if (txn.is_suspicious) s = Math.min(100, s + 35);
//     return Math.min(100, Math.round(s * 100) / 100);
// }

// function generateCustomers(n) {
//     const out = [];
//     for (let i = 0; i < n; i++) {
//         const [city, cc] = pick(ALL_LOCATIONS);
//         const btype = pick(BUSINESS_TYPES);
//         const pep = rng() < 0.05;
//         out.push({
//             customer_id: "C-" + uid(),
//             name: pick(FIRST_NAMES) + " " + pick(LAST_NAMES),
//             country_code: cc,
//             city,
//             risk_rating: computeRiskRating(cc, btype, pep),
//             business_type: btype,
//             pep_flag: pep,
//             created_date: fmtDate(randDate(new Date("2015-01-01").getTime(), new Date("2022-12-31").getTime())),
//             is_suspicious: false,
//         });
//     }
//     return out;
// }

// function generateAccounts(customers, n) {
//     const out = [];
//     for (let i = 0; i < n; i++) {
//         const cust = pick(customers);
//         out.push({
//             account_id: "ACC" + String(i + 1).padStart(8, "0"),
//             customer_id: cust.customer_id,
//             account_type: pick(ACCOUNT_TYPES),
//             currency: pick(CURRENCIES),
//             balance: Math.round(rand(500, 500000) * 100) / 100,
//             opened_date: fmtDate(randDate(new Date("2015-01-01").getTime(), new Date("2023-01-01").getTime())),
//             country_code: cust.country_code,
//             city: cust.city,
//             is_active: true,
//         });
//     }
//     return out;
// }

// function makeTxn(src, dst, amount, txnType, ts, pattern, custMap, merchant, device, locCity, locCC, isSusp) {
//     const cust = custMap[src.customer_id];
//     const t = {
//         transaction_id: "T-" + uid(),
//         timestamp: fmtDate(ts),
//         sender_account: src.account_id,
//         receiver_account: dst.account_id,
//         sender_customer: src.customer_id,
//         receiver_customer: dst.customer_id,
//         amount: Math.round(amount * 100) / 100,
//         currency: isSusp ? "USD" : (src.currency || "USD"),
//         transaction_type: txnType,
//         merchant_category: merchant || pick(isSusp ? HIGH_RISK_MERCH : MERCHANT_CATS),
//         location_city: locCity,
//         location_country: locCC,
//         device_used: device || pick(DEVICES),
//         country_origin: src.country_code,
//         country_dest: dst.country_code,
//         is_suspicious: isSusp,
//         aml_pattern: pattern,
//         alert_score: 0,
//     };
//     t.alert_score = computeAlertScore(t, cust);
//     if (isSusp && cust) cust.is_suspicious = true;
//     return t;
// }

// function otherAcc(accounts, excludeId) {
//     const filtered = accounts.filter(a => a.account_id !== excludeId);
//     return pick(filtered);
// }

// function buildNormal(accounts, custMap) {
//     const src = pick(accounts);
//     const dst = otherAcc(accounts, src.account_id);
//     const r = rng();
//     const amount = r < 0.60 ? rand(5, 500) : r < 0.88 ? rand(500, 5000) : r < 0.97 ? rand(5000, 25000) : rand(25000, 100000);
//     const [locCity, locCC] = pick(ALL_LOCATIONS);
//     return makeTxn(src, dst, amount, pick(TXN_TYPES), randDate(D2023_S, D2023_E),
//         "NONE", custMap, pick(MERCHANT_CATS), pick(DEVICES), locCity, locCC, false);
// }

// function genStructuring(accounts, custMap, nClusters) {
//     const out = [];
//     for (let c = 0; c < nClusters; c++) {
//         const dst = pick(accounts);
//         const src = otherAcc(accounts, dst.account_id);
//         let base = randDate(D2023_S, D2023_E - 48 * 3600000);
//         const cnt = 3 + Math.floor(rng() * 6);
//         for (let i = 0; i < cnt; i++) {
//             const ts = new Date(base.getTime() + i * (5 + Math.floor(rng() * 25)) * 60000);
//             const [lc, lcc] = pick(LOCATIONS_LOW_RISK);
//             out.push(makeTxn(src, dst, rand(8500, 9950), "CASH_DEPOSIT", ts, "STRUCTURING", custMap, pick(HIGH_RISK_MERCH), "atm", lc, lcc, true));
//         }
//     }
//     return out;
// }

// function genLayering(accounts, custMap, nChains) {
//     const out = [];
//     for (let c = 0; c < nChains; c++) {
//         const len = 3 + Math.floor(rng() * 5);
//         const chain = [];
//         const pool = [...accounts];
//         for (let i = 0; i < Math.min(len, pool.length); i++) {
//             const idx = Math.floor(rng() * pool.length);
//             chain.push(pool.splice(idx, 1)[0]);
//         }
//         let amount = rand(20000, 250000);
//         let base = randDate(D2023_S, D2023_E - 12 * 3600000);
//         for (let i = 0; i < chain.length - 1; i++) {
//             const ts = new Date(base.getTime() + (5 + Math.floor(rng() * 115)) * 60000);
//             amount *= rand(0.85, 0.99);
//             const [lc, lcc] = pick(LOCATIONS_HIGH_RISK);
//             out.push(makeTxn(chain[i], chain[i + 1], amount, "WIRE", ts, "LAYERING", custMap, null, null, lc, lcc, true));
//             base = ts;
//         }
//     }
//     return out;
// }

// function genRoundTrip(accounts, custMap, n) {
//     const out = [];
//     for (let i = 0; i < n; i++) {
//         const a = pick(accounts), b = otherAcc(accounts, a.account_id);
//         const amount = rand(10000, 100000);
//         const base = randDate(D2023_S, D2023_E - 6 * 3600000);
//         const [lc, lcc] = pick(LOCATIONS_HIGH_RISK);
//         out.push(makeTxn(a, b, amount, "WIRE", base, "ROUND_TRIP", custMap, null, null, lc, lcc, true));
//         const ret = new Date(base.getTime() + (30 + Math.floor(rng() * 150)) * 60000);
//         out.push(makeTxn(b, a, amount * rand(0.92, 0.99), "WIRE", ret, "ROUND_TRIP", custMap, null, null, lc, lcc, true));
//     }
//     return out;
// }

// function genShellCompany(accounts, custMap, n) {
//     const shellAccs = accounts.filter(a => custMap[a.customer_id]?.business_type === "SHELL_COMPANY");
//     if (!shellAccs.length) return [];
//     const out = [];
//     for (let i = 0; i < n; i++) {
//         const shell = pick(shellAccs);
//         const extern = otherAcc(accounts, shell.account_id);
//         const amount = rand(50000, 500000);
//         const base = randDate(D2023_S, D2023_E - 5 * 86400000);
//         const [lc, lcc] = pick(LOCATIONS_HIGH_RISK);
//         out.push(makeTxn(extern, shell, amount, "WIRE", base, "SHELL_COMPANY", custMap, "real_estate", null, lc, lcc, true));
//         const out2 = new Date(base.getTime() + (1 + Math.floor(rng() * 3)) * 86400000);
//         out.push(makeTxn(shell, extern, amount * rand(0.9, 1.05), "WIRE", out2, "SHELL_COMPANY", custMap, "consulting", null, lc, lcc, true));
//     }
//     return out;
// }

// function genTradeBased(accounts, custMap, n) {
//     const out = [];
//     for (let i = 0; i < n; i++) {
//         const src = pick(accounts), dst = otherAcc(accounts, src.account_id);
//         const inv = rand(5000, 50000);
//         const factor = rng() < 0.5 ? rand(3, 10) : rand(0.05, 0.25);
//         const [lc, lcc] = pick(LOCATIONS_HIGH_RISK);
//         out.push(makeTxn(src, dst, inv * factor, "TRADE_PAYMENT", randDate(D2023_S, D2023_E), "TRADE_BASED", custMap, "real_estate", null, lc, lcc, true));
//     }
//     return out;
// }

// function genLargeRapid(accounts, custMap, n) {
//     const out = [];
//     for (let i = 0; i < n; i++) {
//         const src = pick(accounts), dst = otherAcc(accounts, src.account_id);
//         const [lc, lcc] = pick(LOCATIONS_HIGH_RISK);
//         out.push(makeTxn(src, dst, rand(50000, 600000), "WIRE", randDate(D2023_S, D2023_E), "LARGE_RAPID", custMap, null, null, lc, lcc, true));
//     }
//     return out;
// }

// function genHighVelocity(accounts, custMap, nBursts) {
//     const out = [];
//     for (let b = 0; b < nBursts; b++) {
//         const src = pick(accounts);
//         const base = randDate(D2023_S, D2023_E - 30 * 60000);
//         const cnt = 8 + Math.floor(rng() * 8);
//         for (let i = 0; i < cnt; i++) {
//             const ts = new Date(base.getTime() + i * 2 * 60000);
//             const dst = otherAcc(accounts, src.account_id);
//             const [lc, lcc] = pick(LOCATIONS_LOW_RISK);
//             out.push(makeTxn(src, dst, rand(100, 3000), pick(["PAYMENT", "WIRE"]), ts, "HIGH_VELOCITY", custMap, null, "mobile", lc, lcc, true));
//         }
//     }
//     return out;
// }

// function genImpossibleTravel(accounts, custMap, n) {
//     const PAIRS = [
//         [["New York", "US"], ["Singapore", "SG"]],
//         [["London", "GB"], ["Sydney", "AU"]],
//         [["Los Angeles", "US"], ["Tokyo", "JP"]],
//         [["Miami", "US"], ["Hong Kong", "HK"]],
//         [["Frankfurt", "DE"], ["New York", "US"]],
//     ];
//     const out = [];
//     for (let i = 0; i < n; i++) {
//         const src = pick(accounts);
//         let base = randDate(D2023_S, D2023_E - 30 * 60000);
//         const [locA, locB] = pick(PAIRS);
//         for (const [lc, lcc] of [locA, locB]) {
//             const ts = new Date(base.getTime() + (5 + Math.floor(rng() * 15)) * 60000);
//             const dst = otherAcc(accounts, src.account_id);
//             out.push(makeTxn(src, dst, rand(200, 5000), "PAYMENT", ts, "IMPOSSIBLE_TRAVEL", custMap, null, "pos", lc, lcc, true));
//             base = ts;
//         }
//     }
//     return out;
// }

// function generateAlerts(transactions, accToCust, custMap) {
//     const out = [];
//     for (const txn of transactions) {
//         if (txn.alert_score >= 50 || txn.is_suspicious) {
//             const custId = accToCust[txn.sender_account] || "UNKNOWN";
//             out.push({
//                 alert_id: "ALT-" + uid(),
//                 transaction_id: txn.transaction_id,
//                 customer_id: custId,
//                 alert_type: txn.aml_pattern !== "NONE" ? txn.aml_pattern : "HIGH_RISK_TXN",
//                 alert_score: txn.alert_score,
//                 created_at: txn.timestamp,
//                 status: wPick(ALERT_STATUSES, ALERT_WEIGHTS),
//                 notes: `Auto alert | pattern=${txn.aml_pattern} | score=${txn.alert_score} | type=${txn.transaction_type}`,
//             });
//         }
//     }
//     return out;
// }

// // ─────────────────────────────────────────────────────────────
// // GENERATE FULL DATASET
// // ─────────────────────────────────────────────────────────────
// export function generateDataset() {
//     _seed = 42; // reset for reproducibility
//     const customers = generateCustomers(300);
//     const accounts = generateAccounts(customers, 450);
//     const custMap = Object.fromEntries(customers.map(c => [c.customer_id, c]));
//     const accToCust = Object.fromEntries(accounts.map(a => [a.account_id, a.customer_id]));

//     const normal = Array.from({ length: 8000 }, () => buildNormal(accounts, custMap));

//     const suspicious = [
//         ...genStructuring(accounts, custMap, 40),
//         ...genLayering(accounts, custMap, 25),
//         ...genRoundTrip(accounts, custMap, 30),
//         ...genShellCompany(accounts, custMap, 25),
//         ...genTradeBased(accounts, custMap, 25),
//         ...genLargeRapid(accounts, custMap, 30),
//         ...genHighVelocity(accounts, custMap, 25),
//         ...genImpossibleTravel(accounts, custMap, 25),
//     ];

//     // Shuffle all transactions together
//     const all = [...normal, ...suspicious];
//     for (let i = all.length - 1; i > 0; i--) {
//         const j = Math.floor(rng() * (i + 1));
//         [all[i], all[j]] = [all[j], all[i]];
//     }

//     const alerts = generateAlerts(all, accToCust, custMap);
//     return { customers, accounts, transactions: all, alerts };
// }

// // ─────────────────────────────────────────────────────────────
// // CSV BUILDER
// // ─────────────────────────────────────────────────────────────
// function toCSV(rows) {
//     if (!rows.length) return "";
//     const esc = v => `"${String(v ?? "").replace(/"/g, '""')}"`;
//     const headers = Object.keys(rows[0]);
//     return [headers.join(","), ...rows.map(r => headers.map(h => esc(r[h])).join(","))].join("\n");
// }

// export function downloadCSV(rows, filename) {
//     const blob = new Blob([toCSV(rows)], { type: "text/csv;charset=utf-8;" });
//     const url = URL.createObjectURL(blob);
//     const a = document.createElement("a");
//     a.href = url; a.download = filename;
//     document.body.appendChild(a); a.click();
//     document.body.removeChild(a); URL.revokeObjectURL(url);
// }

// // ─────────────────────────────────────────────────────────────
// // SPARKLINE
// // ─────────────────────────────────────────────────────────────
// function Sparkline({ values, color, width = 174, height = 34 }) {
//     if (values.length < 2) return null;
//     const max = Math.max(...values, 1);
//     const pts = values.map((v, i) => `${(i / (values.length - 1)) * width},${height - (v / max) * height}`).join(" ");
//     return <svg width={width} height={height} style={{ display: "block" }}><polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" /></svg>;
// }

// // ─────────────────────────────────────────────────────────────
// // SCORE RING
// // ─────────────────────────────────────────────────────────────
// function ScoreRing({ score }) {
//     const r = 14, circ = 2 * Math.PI * r, dash = (score / 100) * circ;
//     const col = score >= 70 ? "#ff1744" : score >= 40 ? "#ffeb3b" : "#00e5a0";
//     return (
//         <svg width="36" height="36" style={{ transform: "rotate(-90deg)", flexShrink: 0 }}>
//             <circle cx="18" cy="18" r={r} fill="none" stroke="#1e2535" strokeWidth="3" />
//             <circle cx="18" cy="18" r={r} fill="none" stroke={col} strokeWidth="3"
//                 strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" />
//             <text x="18" y="18" textAnchor="middle" dominantBaseline="central" fill={col} fontSize="9" fontWeight="700"
//                 style={{ transform: "rotate(90deg) translate(0,-36px)", fontFamily: "'DM Mono',monospace" }}>{score}</text>
//         </svg>
//     );
// }

// // ─────────────────────────────────────────────────────────────
// // APP
// // ─────────────────────────────────────────────────────────────
// export default function AMLSimulator() {
//     const [ds, setDs] = useState(null);   // {customers, accounts, transactions, alerts}
//     const [generating, setGenerating] = useState(false);
//     const [activeTab, setActiveTab] = useState("transactions");
//     const [filter, setFilter] = useState("ALL");
//     const [selected, setSelected] = useState(null);
//     const [scoreHist, setScoreHist] = useState([]);

//     const runGenerate = useCallback(() => {
//         setGenerating(true);
//         setSelected(null);
//         setTimeout(() => {
//             const data = generateDataset();
//             setDs(data);
//             setScoreHist(data.transactions.slice(-60).map(t => t.alert_score));
//             setGenerating(false);
//         }, 60);
//     }, []);

//     useEffect(() => { runGenerate(); }, []); // eslint-disable-line

//     // ── Derived stats ──
//     const txns = ds?.transactions ?? [];
//     const suspTxns = txns.filter(t => t.is_suspicious);
//     const byPat = {};
//     suspTxns.forEach(t => { byPat[t.aml_pattern] = (byPat[t.aml_pattern] || 0) + 1; });
//     const suspRate = txns.length ? ((suspTxns.length / txns.length) * 100).toFixed(1) : "0.0";
//     const totalVol = txns.reduce((s, t) => s + t.amount, 0);

//     const visibleRows = (() => {
//         if (activeTab === "transactions") return filter === "ALL" ? txns : txns.filter(t => t.aml_pattern === filter);
//         if (activeTab === "customers") return ds?.customers ?? [];
//         if (activeTab === "accounts") return ds?.accounts ?? [];
//         if (activeTab === "alerts") return ds?.alerts ?? [];
//         return [];
//     })();

//     const tabCols = {
//         transactions: ["transaction_id", "timestamp", "sender_account", "receiver_account", "amount", "currency", "transaction_type", "merchant_category", "location_city", "country_origin", "country_dest", "device_used", "is_suspicious", "aml_pattern", "alert_score"],
//         customers: ["customer_id", "name", "country_code", "city", "risk_rating", "business_type", "pep_flag", "created_date", "is_suspicious"],
//         accounts: ["account_id", "customer_id", "account_type", "currency", "balance", "opened_date", "country_code", "city", "is_active"],
//         alerts: ["alert_id", "transaction_id", "customer_id", "alert_type", "alert_score", "created_at", "status", "notes"],
//     };

//     const tabFilename = {
//         transactions: "aml_transactions.csv",
//         customers: "aml_customers.csv",
//         accounts: "aml_accounts.csv",
//         alerts: "aml_alerts.csv",
//     };

//     // ── colour helpers ──
//     const riskCol = r => r === "HIGH" ? "#ff1744" : r === "MEDIUM" ? "#ffeb3b" : "#00e5a0";
//     const amtCol = a => a >= 50000 ? "#ff6b35" : a >= 10000 ? "#ffeb3b" : "#c8d6f0";
//     const scoreCol = s => s >= 70 ? "#ff1744" : s >= 40 ? "#ffeb3b" : "#00e5a0";

//     const TABS = [
//         { key: "transactions", label: "Transactions", count: txns.length },
//         { key: "customers", label: "Customers", count: ds?.customers.length ?? 0 },
//         { key: "accounts", label: "Accounts", count: ds?.accounts.length ?? 0 },
//         { key: "alerts", label: "Alerts", count: ds?.alerts.length ?? 0 },
//     ];

//     return (
//         <div style={{ minHeight: "100vh", background: "#080d17", color: "#c8d6f0", fontFamily: "'DM Mono','Courier New',monospace", display: "flex", flexDirection: "column" }}>
//             <style>{`
//         @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Barlow+Condensed:wght@300;600;800&display=swap');
//         *{box-sizing:border-box}
//         ::-webkit-scrollbar{width:4px;height:4px}
//         ::-webkit-scrollbar-track{background:#0d1424}
//         ::-webkit-scrollbar-thumb{background:#1e2e50;border-radius:2px}
//         @keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
//         @keyframes spin{to{transform:rotate(360deg)}}
//         .btn{cursor:pointer;border:none;border-radius:4px;font-family:'DM Mono',monospace;font-size:11px;font-weight:500;letter-spacing:.08em;padding:7px 16px;transition:all .15s}
//         .btn:hover:not(:disabled){filter:brightness(1.15)}
//         .btn:disabled{cursor:not-allowed;opacity:.4}
//         .tag{display:inline-block;padding:2px 7px;border-radius:3px;font-size:9px;font-weight:500;letter-spacing:.05em}
//         .stat-card{background:#0d1424;border:1px solid #1a2540;border-radius:6px;padding:12px 16px}
//         .pat-row{cursor:pointer;padding:7px 10px;border-radius:4px;transition:all .15s;border:1px solid #1a2540}
//         .pat-row:hover{background:#111827}
//         .trow{cursor:pointer;border-bottom:1px solid #0a0f1c;transition:background .1s}
//         .trow:hover{background:#0f1929}
//         .tab-btn{cursor:pointer;padding:7px 14px;border:none;border-bottom:2px solid transparent;background:transparent;font-family:'DM Mono',monospace;font-size:10px;letter-spacing:.1em;color:#4a5c7a;transition:all .15s}
//         .tab-btn:hover{color:#c8d6f0}
//         .tab-btn.active{color:#00e5a0;border-bottom-color:#00e5a0}
//       `}</style>

//             {/* ── HEADER ── */}
//             <div style={{ borderBottom: "1px solid #1a2540", padding: "10px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#0a1020", flexShrink: 0 }}>
//                 <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
//                     <div style={{ width: 30, height: 30, borderRadius: 4, flexShrink: 0, background: "linear-gradient(135deg,#00e5a0,#0057ff)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 800, color: "#080d17", fontFamily: "'Barlow Condensed',sans-serif" }}>A</div>
//                     <div>
//                         <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 800, fontSize: 17, letterSpacing: "0.12em", color: "#e8f0ff", lineHeight: 1 }}>AML SYNTHETIC DATA GENERATOR</div>
//                         <div style={{ fontSize: 9, color: "#4a5c7a", letterSpacing: "0.12em", marginTop: 2 }}>CUSTOMERS · ACCOUNTS · TRANSACTIONS · ALERTS</div>
//                     </div>
//                 </div>
//                 <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
//                     <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "5px 12px", border: "1px solid #1a2540", borderRadius: 4, background: "#0d1424", fontSize: 10, letterSpacing: "0.1em" }}>
//                         <div style={{ width: 7, height: 7, borderRadius: "50%", background: generating ? "#ffeb3b" : "#00e5a0", animation: generating ? "pulse .6s ease infinite" : "none" }} />
//                         {generating ? "GENERATING…" : ds ? "DATASET READY" : "IDLE"}
//                     </div>
//                     <button className="btn" onClick={runGenerate} disabled={generating} style={{ background: "#0d1424", color: "#c8d6f0", border: "1px solid #1a2540", fontWeight: 600 }}>
//                         ⟳ REGENERATE
//                     </button>
//                     <button className="btn"
//                         onClick={() => downloadCSV(visibleRows, tabFilename[activeTab])}
//                         disabled={generating || !ds}
//                         style={{ background: (generating || !ds) ? "#1e2535" : "#00e5a0", color: (generating || !ds) ? "#4a5c7a" : "#080d17", fontWeight: 700, padding: "7px 20px" }}>
//                         ↓ DOWNLOAD {activeTab.toUpperCase()} CSV
//                     </button>
//                 </div>
//             </div>

//             {/* ── BODY ── */}
//             <div style={{ display: "flex", flex: 1, overflow: "hidden", minHeight: 0 }}>

//                 {/* ── SIDEBAR ── */}
//                 <div style={{ width: 218, minWidth: 218, borderRight: "1px solid #1a2540", background: "#090e1a", padding: "12px 10px", display: "flex", flexDirection: "column", gap: 8, overflowY: "auto" }}>
//                     {/* Stats */}
//                     <div className="stat-card">
//                         <div style={{ fontSize: 9, color: "#4a5c7a", letterSpacing: "0.12em", marginBottom: 3 }}>TRANSACTIONS</div>
//                         <div style={{ fontSize: 26, fontWeight: 300, color: "#e8f0ff", fontFamily: "'Barlow Condensed',sans-serif" }}>{txns.length.toLocaleString()}</div>
//                     </div>
//                     <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
//                         <div className="stat-card" style={{ padding: "10px 12px" }}>
//                             <div style={{ fontSize: 8, color: "#4a5c7a", letterSpacing: "0.1em", marginBottom: 2 }}>CUSTOMERS</div>
//                             <div style={{ fontSize: 18, fontWeight: 300, color: "#e8f0ff", fontFamily: "'Barlow Condensed',sans-serif" }}>{(ds?.customers.length ?? 0).toLocaleString()}</div>
//                         </div>
//                         <div className="stat-card" style={{ padding: "10px 12px" }}>
//                             <div style={{ fontSize: 8, color: "#4a5c7a", letterSpacing: "0.1em", marginBottom: 2 }}>ACCOUNTS</div>
//                             <div style={{ fontSize: 18, fontWeight: 300, color: "#e8f0ff", fontFamily: "'Barlow Condensed',sans-serif" }}>{(ds?.accounts.length ?? 0).toLocaleString()}</div>
//                         </div>
//                     </div>
//                     <div className="stat-card">
//                         <div style={{ fontSize: 9, color: "#4a5c7a", letterSpacing: "0.12em", marginBottom: 3 }}>SUSPICIOUS RATE</div>
//                         <div style={{ fontSize: 26, fontWeight: 300, fontFamily: "'Barlow Condensed',sans-serif", color: parseFloat(suspRate) > 15 ? "#ff1744" : parseFloat(suspRate) > 8 ? "#ffeb3b" : "#00e5a0" }}>{suspRate}%</div>
//                     </div>
//                     <div className="stat-card">
//                         <div style={{ fontSize: 9, color: "#4a5c7a", letterSpacing: "0.12em", marginBottom: 3 }}>TOTAL VOLUME</div>
//                         <div style={{ fontSize: 18, fontWeight: 300, color: "#e8f0ff", fontFamily: "'Barlow Condensed',sans-serif" }}>${(totalVol / 1e6).toFixed(1)}M</div>
//                     </div>
//                     <div className="stat-card" style={{ padding: "10px 12px" }}>
//                         <div style={{ fontSize: 9, color: "#4a5c7a", letterSpacing: "0.12em", marginBottom: 6 }}>RISK SCORE TREND</div>
//                         <Sparkline values={scoreHist} color="#00b0ff" />
//                     </div>
//                     <div className="stat-card" style={{ padding: "10px 12px" }}>
//                         <div style={{ fontSize: 9, color: "#4a5c7a", letterSpacing: "0.12em", marginBottom: 6 }}>ALERTS</div>
//                         <div style={{ fontSize: 18, fontWeight: 300, color: "#e8f0ff", fontFamily: "'Barlow Condensed',sans-serif" }}>{(ds?.alerts.length ?? 0).toLocaleString()}</div>
//                     </div>

//                     {/* Pattern filter (only when on transactions tab) */}
//                     {activeTab === "transactions" && <>
//                         <div style={{ fontSize: 9, color: "#4a5c7a", letterSpacing: "0.12em", margin: "4px 0 2px" }}>FILTER BY PATTERN</div>
//                         {Object.entries(AML_PATTERNS).map(([pat, meta]) => {
//                             const cnt = pat === "NONE" ? txns.length - suspTxns.length : (byPat[pat] || 0);
//                             const pct = txns.length ? cnt / txns.length : 0;
//                             const active = filter === pat || (pat === "NONE" && filter === "ALL");
//                             return (
//                                 <div key={pat} className="pat-row"
//                                     onClick={() => setFilter(f => pat === "NONE" ? "ALL" : f === pat ? "ALL" : pat)}
//                                     style={{ background: active ? "#111827" : "transparent", borderColor: active ? meta.color + "55" : "#1a2540" }}>
//                                     <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
//                                         <span style={{ fontSize: 9, color: active ? meta.color : "#7a8baa" }}>{meta.icon} {meta.label}</span>
//                                         <span style={{ fontSize: 9, color: "#4a5c7a" }}>{cnt}</span>
//                                     </div>
//                                     <div style={{ height: 2, background: "#1a2540", borderRadius: 1 }}>
//                                         <div style={{ height: 2, width: `${pct * 100}%`, background: meta.color, borderRadius: 1 }} />
//                                     </div>
//                                 </div>
//                             );
//                         })}
//                     </>}
//                 </div>

//                 {/* ── MAIN PANEL ── */}
//                 <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
//                     {/* Tabs */}
//                     <div style={{ display: "flex", alignItems: "center", borderBottom: "1px solid #1a2540", background: "#090e1a", flexShrink: 0, paddingLeft: 4 }}>
//                         {TABS.map(t => (
//                             <button key={t.key} className={`tab-btn${activeTab === t.key ? " active" : ""}`}
//                                 onClick={() => { setActiveTab(t.key); setSelected(null); }}>
//                                 {t.label}
//                                 <span style={{ marginLeft: 6, fontSize: 9, color: "#3a4f70" }}>({t.count.toLocaleString()})</span>
//                             </button>
//                         ))}
//                     </div>

//                     {/* Column headers */}
//                     {!generating && ds && (() => {
//                         const cols = tabCols[activeTab];
//                         return (
//                             <div style={{ display: "flex", padding: "7px 14px", fontSize: 9, letterSpacing: "0.1em", color: "#4a5c7a", borderBottom: "1px solid #1a2540", background: "#080d17", flexShrink: 0, gap: 0, overflowX: "hidden" }}>
//                                 {cols.map(c => <div key={c} style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 8 }}>{c.replace(/_/g, " ").toUpperCase()}</div>)}
//                                 {activeTab === "transactions" && <div style={{ width: 42, textAlign: "right", flexShrink: 0 }}>RISK</div>}
//                             </div>
//                         );
//                     })()}

//                     {/* Rows */}
//                     <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", minHeight: 0 }}>
//                         {generating && (
//                             <div style={{ padding: 48, textAlign: "center", color: "#4a5c7a", fontSize: 11 }}>
//                                 <div style={{ display: "inline-block", width: 22, height: 22, border: "2px solid #1a2540", borderTopColor: "#00e5a0", borderRadius: "50%", animation: "spin .8s linear infinite", marginBottom: 14 }} />
//                                 <div>Generating dataset…</div>
//                                 <div style={{ fontSize: 9, marginTop: 6, color: "#2a3550" }}>300 customers · 450 accounts · 8,000+ transactions · alerts</div>
//                             </div>
//                         )}

//                         {!generating && ds && visibleRows.map((row, ri) => {
//                             const cols = tabCols[activeTab];
//                             const isSel = selected?.transaction_id === row.transaction_id || selected?.customer_id === row.customer_id || selected?.account_id === row.account_id || selected?.alert_id === row.alert_id;
//                             const pat = row.aml_pattern ? AML_PATTERNS[row.aml_pattern] : null;
//                             return (
//                                 <div key={ri} className="trow"
//                                     onClick={() => setSelected(s => (s?.transaction_id === row.transaction_id || s?.customer_id === row.customer_id || s?.account_id === row.account_id || s?.alert_id === row.alert_id) ? null : row)}
//                                     style={{ display: "flex", padding: "6px 14px", alignItems: "center", background: isSel ? "#111827" : "transparent", borderLeft: `2px solid ${isSel && pat ? pat.color : isSel ? "#00e5a0" : "transparent"}` }}>
//                                     {cols.map(c => {
//                                         const v = row[c];
//                                         let display = v, style = { flex: 1, minWidth: 0, fontSize: 9, color: "#7a8baa", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingRight: 8 };
//                                         if (c === "aml_pattern" && pat) {
//                                             display = <span className="tag" style={{ background: pat.color + "18", color: pat.color, border: `1px solid ${pat.color}33` }}>{pat.icon} {pat.label}</span>;
//                                         } else if (c === "amount") {
//                                             style.color = amtCol(v);
//                                             style.fontWeight = 500;
//                                             display = `$${v >= 1000 ? (v / 1000).toFixed(1) + "K" : v.toFixed(0)}`;
//                                         } else if (c === "risk_rating") {
//                                             style.color = riskCol(v);
//                                             style.fontWeight = 500;
//                                         } else if (c === "alert_score") {
//                                             style.color = scoreCol(v);
//                                             style.fontWeight = 500;
//                                         } else if (c === "is_suspicious" || c === "pep_flag" || c === "is_active") {
//                                             style.color = v ? "#ff6b35" : "#3a4f70";
//                                             display = String(v);
//                                         } else if (c === "status") {
//                                             const sc = { OPEN: "#00b0ff", REVIEWED: "#00e5a0", ESCALATED: "#ff1744", CLOSED: "#4a5c7a" };
//                                             style.color = sc[v] || "#c8d6f0";
//                                         } else if (c.includes("_id") || c.includes("account") || c.includes("customer")) {
//                                             style.color = "#3a5070";
//                                             style.fontSize = 8;
//                                         } else if (c === "timestamp" || c === "created_at" || c === "opened_date" || c === "created_date") {
//                                             style.color = "#4a5c7a";
//                                             style.fontSize = 8;
//                                             display = String(v).slice(0, 16).replace("T", " ");
//                                         } else {
//                                             style.color = "#c8d6f0";
//                                         }
//                                         return <div key={c} style={style}>{display}</div>;
//                                     })}
//                                     {activeTab === "transactions" && <div style={{ width: 42, flexShrink: 0, display: "flex", justifyContent: "flex-end" }}><ScoreRing score={row.alert_score || 0} /></div>}
//                                 </div>
//                             );
//                         })}
//                     </div>

//                     {/* Footer */}
//                     {!generating && ds && (
//                         <div style={{ padding: "5px 14px", fontSize: 9, color: "#2a3550", borderTop: "1px solid #0d1424", background: "#090e1a", flexShrink: 0, display: "flex", justifyContent: "space-between" }}>
//                             <span>SHOWING {visibleRows.length.toLocaleString()} ROWS{filter !== "ALL" && activeTab === "transactions" ? `  ·  PATTERN: ${AML_PATTERNS[filter]?.label}` : ""}</span>
//                             <span style={{ color: "#1a2540" }}>SEED 42 · 2023-01-01 → 2023-12-31</span>
//                         </div>
//                     )}
//                 </div>

//                 {/* ── DETAIL PANEL ── */}
//                 {selected && (
//                     <div style={{ width: 260, minWidth: 260, borderLeft: "1px solid #1a2540", background: "#090e1a", overflowY: "auto", flexShrink: 0 }}>
//                         <div style={{ padding: 14 }}>
//                             {/* Header */}
//                             <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
//                                 <div style={{ fontFamily: "'Barlow Condensed',sans-serif", fontWeight: 800, fontSize: 16, color: "#e8f0ff", letterSpacing: "0.06em" }}>
//                                     {selected.transaction_id ? "TRANSACTION" : selected.customer_id && selected.name ? "CUSTOMER" : selected.account_id ? "ACCOUNT" : "ALERT"}
//                                 </div>
//                                 {selected.alert_score !== undefined && <ScoreRing score={selected.alert_score} />}
//                             </div>

//                             {/* Pattern badge (transactions only) */}
//                             {selected.aml_pattern && (() => {
//                                 const meta = AML_PATTERNS[selected.aml_pattern];
//                                 return (
//                                     <div style={{ padding: "8px 12px", borderRadius: 5, marginBottom: 12, background: meta.color + "14", border: `1px solid ${meta.color}33` }}>
//                                         <div style={{ fontSize: 10, fontWeight: 500, color: meta.color, letterSpacing: "0.08em", marginBottom: 3 }}>{meta.icon} {meta.label.toUpperCase()}</div>
//                                         <div style={{ fontSize: 9, color: "#4a5c7a", lineHeight: 1.6 }}>{PATTERN_DESCS[selected.aml_pattern]}</div>
//                                     </div>
//                                 );
//                             })()}

//                             {/* All fields */}
//                             {Object.entries(selected).map(([k, v]) => (
//                                 <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: "1px solid #0d1424" }}>
//                                     <span style={{ fontSize: 8, color: "#3a4f70", letterSpacing: "0.1em", flexShrink: 0, marginRight: 8 }}>{k.replace(/_/g, " ").toUpperCase()}</span>
//                                     <span style={{
//                                         fontSize: 9, textAlign: "right", wordBreak: "break-all",
//                                         color: k === "alert_score" ? scoreCol(v) : k === "risk_rating" ? riskCol(v) : k === "is_suspicious" || k === "pep_flag" ? (v ? "#ff6b35" : "#3a4f70") : k === "aml_pattern" ? (AML_PATTERNS[v]?.color || "#c8d6f0") : "#c8d6f0"
//                                     }}>{String(v)}</span>
//                                 </div>
//                             ))}
//                         </div>
//                     </div>
//                 )}
//             </div>
//         </div>
//     );
// }