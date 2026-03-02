import { useState } from "react";
import { C, RISK_ORDER } from "../constants/theme";
import { Badge } from "./Badge";

export function TransactionsTable({ transactions, onReview, onExport }) {
    const [riskFilter, setRiskFilter] = useState("all");
    const [search, setSearch] = useState("");
    const [sortCol, setSortCol] = useState("time");
    const [sortDir, setSortDir] = useState(-1);

    const handleSort = (col) => {
        if (sortCol === col) setSortDir((d) => d * -1);
        else { setSortCol(col); setSortDir(-1); }
    };

    const filteredTx = transactions
        .filter((r) => riskFilter === "all" || r.risk === riskFilter)
        .filter((r) => {
            if (!search) return true;
            const q = search.toLowerCase();
            return r.id.toLowerCase().includes(q) || r.entity.toLowerCase().includes(q) || r.rule.toLowerCase().includes(q);
        })
        .sort((a, b) => {
            let va, vb;
            if (sortCol === "amount") { va = a.amount; vb = b.amount; }
            else if (sortCol === "risk") { va = RISK_ORDER[a.risk] || 0; vb = RISK_ORDER[b.risk] || 0; }
            else { va = a[sortCol] || ""; vb = b[sortCol] || ""; }
            return va < vb ? -sortDir : va > vb ? sortDir : 0;
        });

    const th = {
        padding: "9px 12px", fontSize: 9, letterSpacing: ".15em", textTransform: "uppercase",
        color: C.muted, textAlign: "left", fontWeight: 500, cursor: "pointer",
        whiteSpace: "nowrap", userSelect: "none", fontFamily: "'IBM Plex Mono',monospace",
    };

    const cols = [
        ["id", "Transaction ID"], ["entity", "Entity"], ["amount", "Amount"],
        ["", "Type"], ["", "Rule Triggered"], ["risk", "Risk"], ["time", "Time"], ["", "Action"],
    ];

    return (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, overflow: "hidden", marginBottom: 16, animation: "fadeUp .5s ease both" }}>
            {/* Table header bar */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 16px", borderBottom: `1px solid ${C.border}` }}>
                <span style={{ fontSize: 11, letterSpacing: ".12em", textTransform: "uppercase", fontWeight: 600 }}>Flagged Transactions</span>
                <span style={{ fontSize: 10, color: C.accent }}>{filteredTx.length} result{filteredTx.length !== 1 ? "s" : ""}</span>
            </div>

            {/* Controls */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 16px", borderBottom: `1px solid ${C.border}`, flexWrap: "wrap" }}>
                {["all", "critical", "high", "medium", "cleared"].map((f) => (
                    <button
                        key={f}
                        onClick={() => setRiskFilter(f)}
                        style={{
                            fontSize: 10, padding: "3px 9px", borderRadius: 2, cursor: "pointer",
                            fontFamily: "'IBM Plex Mono',monospace", letterSpacing: ".05em",
                            border: `1px solid ${riskFilter === f ? "rgba(0,229,255,.3)" : C.border}`,
                            background: riskFilter === f ? "rgba(0,229,255,.06)" : "transparent",
                            color: riskFilter === f ? C.accent : C.muted,
                        }}
                    >
                        {f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                ))}
                <div style={{ marginLeft: "auto", position: "relative" }}>
                    <span style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: C.muted }}>🔍</span>
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search txn, entity..."
                        style={{
                            background: C.surface2,
                            border: `1px solid ${search ? "rgba(0,229,255,.3)" : C.border}`,
                            borderRadius: 3, padding: "5px 10px 5px 26px",
                            color: C.text, fontSize: 11, fontFamily: "'IBM Plex Mono',monospace",
                            width: 170, outline: "none",
                        }}
                    />
                </div>
            </div>

            {/* Table */}
            <div style={{ overflowX: "auto", maxHeight: 320, overflowY: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                        <tr style={{ borderBottom: `1px solid ${C.border}`, position: "sticky", top: 0, background: C.surface, zIndex: 1 }}>
                            {cols.map(([col, lbl]) => (
                                <th
                                    key={lbl}
                                    onClick={col ? () => handleSort(col) : undefined}
                                    style={{ ...th, color: sortCol === col ? C.accent : C.muted }}
                                >
                                    {lbl}{col ? " ↕" : ""}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {filteredTx.map((r, i) => (
                            <tr key={r.id} className={r._new && i === 0 ? "row-new" : ""}>
                                <td style={{ padding: "10px 12px", fontSize: 11, borderBottom: `1px solid rgba(255,255,255,.03)`, color: C.accent, fontFamily: "'IBM Plex Mono',monospace", whiteSpace: "nowrap" }}>{r.id}</td>
                                <td style={{ padding: "10px 12px", fontSize: 11, borderBottom: `1px solid rgba(255,255,255,.03)`, whiteSpace: "nowrap" }}>{r.entity}</td>
                                <td style={{ padding: "10px 12px", fontSize: 11, borderBottom: `1px solid rgba(255,255,255,.03)`, fontFamily: "'Syne',sans-serif", fontWeight: 600, whiteSpace: "nowrap" }}>${r.amount.toLocaleString()}</td>
                                <td style={{ padding: "10px 12px", fontSize: 11, borderBottom: `1px solid rgba(255,255,255,.03)`, whiteSpace: "nowrap" }}>{r.type}</td>
                                <td style={{ padding: "10px 12px", fontSize: 11, borderBottom: `1px solid rgba(255,255,255,.03)`, whiteSpace: "nowrap" }}>{r.rule}</td>
                                <td style={{ padding: "10px 12px", fontSize: 11, borderBottom: `1px solid rgba(255,255,255,.03)`, whiteSpace: "nowrap" }}><Badge risk={r.risk} /></td>
                                <td style={{ padding: "10px 12px", fontSize: 11, borderBottom: `1px solid rgba(255,255,255,.03)`, whiteSpace: "nowrap" }}>{r.time} UTC</td>
                                <td style={{ padding: "10px 12px", fontSize: 11, borderBottom: `1px solid rgba(255,255,255,.03)`, whiteSpace: "nowrap" }}>
                                    <span onClick={() => onReview(r)} style={{ color: C.muted, cursor: "pointer", fontSize: 10 }}>
                                        {r.risk === "cleared" ? "Archive →" : "Review →"}
                                    </span>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}