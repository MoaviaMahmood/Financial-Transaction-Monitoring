import { C } from "../constants/theme";
import { GEO_DATA, RULE_DATA } from "../constants/data";

export function GeoPanel({ onCountryClick }) {
    return (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, overflow: "hidden", animation: "fadeUp .5s ease both" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 16px", borderBottom: `1px solid ${C.border}` }}>
                <span style={{ fontSize: 11, letterSpacing: ".12em", textTransform: "uppercase", fontWeight: 600 }}>High-Risk Jurisdictions</span>
                <span style={{ fontSize: 10, color: C.accent, cursor: "pointer" }}>World View ↗</span>
            </div>
            <div style={{ padding: "4px 0" }}>
                {GEO_DATA.map((g) => {
                    const pct = Math.round((g.v / 82) * 100);
                    return (
                        <div
                            key={g.n}
                            onClick={() => onCountryClick(g)}
                            style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 16px", cursor: "pointer", transition: "background .15s" }}
                        >
                            <div style={{ fontSize: 15, width: 20 }}>{g.f}</div>
                            <div style={{ flex: 1, fontSize: 11 }}>{g.n}</div>
                            <div style={{ width: 80, height: 3, background: "rgba(255,255,255,.06)", borderRadius: 2, overflow: "hidden" }}>
                                <div style={{ width: `${pct}%`, height: "100%", borderRadius: 2, background: g.c, transition: "width .5s ease" }} />
                            </div>
                            <div style={{ fontSize: 11, color: C.muted, width: 32, textAlign: "right" }}>{g.v}</div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export function RulesPanel() {
    return (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, overflow: "hidden", animation: "fadeUp .5s ease both" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 16px", borderBottom: `1px solid ${C.border}` }}>
                <span style={{ fontSize: 11, letterSpacing: ".12em", textTransform: "uppercase", fontWeight: 600 }}>Rule Trigger Distribution</span>
                <span style={{ fontSize: 10, color: C.accent, cursor: "pointer" }}>Configure ↗</span>
            </div>
            <div style={{ padding: "12px 16px" }}>
                {RULE_DATA.map((r) => {
                    const pct = Math.round((r.v / 88) * 100);
                    return (
                        <div key={r.n} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                            <div style={{ flex: 1, fontSize: 11 }}>{r.n}</div>
                            <div style={{ width: 90, height: 3, background: "rgba(255,255,255,.06)", borderRadius: 2, overflow: "hidden" }}>
                                <div style={{ width: `${pct}%`, height: "100%", borderRadius: 2, background: `linear-gradient(90deg,${C.accent},rgba(0,229,255,.4))`, transition: "width .5s ease" }} />
                            </div>
                            <div style={{ fontFamily: "'Orbitron',sans-serif", fontWeight: 700, fontSize: 11, width: 26, textAlign: "right", color: C.accent }}>{r.v}</div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}