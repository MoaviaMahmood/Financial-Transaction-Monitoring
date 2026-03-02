import { C } from "../constants/theme";
import { RISK_ENTITIES } from "../constants/data";

export function RiskEntitiesPanel({ onEntityClick }) {
    return (
        <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, overflow: "hidden", animation: "fadeUp .5s ease both" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 16px", borderBottom: `1px solid ${C.border}` }}>
                <span style={{ fontSize: 11, letterSpacing: ".12em", textTransform: "uppercase", fontWeight: 600 }}>Top Risk Entities</span>
                <span style={{ fontSize: 10, color: C.accent, cursor: "pointer" }}>View all ↗</span>
            </div>
            <div style={{ padding: "4px 0" }}>
                {RISK_ENTITIES.map((e) => (
                    <div
                        key={e.name}
                        onClick={() => onEntityClick(e)}
                        style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 16px", borderBottom: `1px solid ${C.border}`, cursor: "pointer", transition: "background .15s" }}
                    >
                        <div style={{ width: 30, height: 30, borderRadius: 4, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, fontFamily: "'Syne',sans-serif", flexShrink: 0, background: e.bg, color: e.c }}>
                            {e.i}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 11, marginBottom: 2 }}>{e.name}</div>
                            <div style={{ fontSize: 9, color: C.muted }}>{e.meta}</div>
                        </div>
                        <div style={{ textAlign: "right" }}>
                            <div style={{ fontFamily: "'Orbitron',sans-serif", fontWeight: 700, fontSize: 14, marginBottom: 4, color: e.c }}>{e.score}</div>
                            <div style={{ width: 55, height: 3, background: "rgba(255,255,255,.06)", borderRadius: 2, overflow: "hidden" }}>
                                <div style={{ width: `${e.score}%`, height: "100%", borderRadius: 2, background: e.c, transition: "width .5s ease" }} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}