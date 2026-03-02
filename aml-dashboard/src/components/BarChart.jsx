import { useState, useRef, useCallback } from "react";
import { C } from "../constants/theme";
import { CHART_DATA } from "../constants/data";

export function BarChart() {
    const [tooltip, setTooltip] = useState(null);
    const tooltipRafRef = useRef(null);
    const mx = Math.max(...CHART_DATA.map((d) => Math.max(d.f, d.c)));

    const handleMouseMove = useCallback((e, label, bLabel, bVal) => {
        if (tooltipRafRef.current) cancelAnimationFrame(tooltipRafRef.current);
        const x = e.clientX, y = e.clientY;
        tooltipRafRef.current = requestAnimationFrame(() => {
            setTooltip({ x, y, label, text: `${bLabel}: ${bVal}` });
        });
    }, []);

    const handleMouseLeave = useCallback(() => {
        if (tooltipRafRef.current) cancelAnimationFrame(tooltipRafRef.current);
        setTooltip(null);
    }, []);

    return (
        <div style={{ padding: "14px 16px" }}>
            {/* Legend */}
            <div style={{ display: "flex", gap: 16, marginBottom: 12 }}>
                {[{ c: C.accent2, l: "Flagged" }, { c: "rgba(0,229,255,.35)", l: "Cleared" }].map((item) => (
                    <div key={item.l} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, color: C.muted, fontFamily: "'IBM Plex Mono',monospace" }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: item.c }} />
                        {item.l}
                    </div>
                ))}
            </div>

            {/* Bars */}
            <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 120, position: "relative" }}>
                {CHART_DATA.map((d, i) => {
                    const fH = Math.round((d.f / mx) * 110);
                    const cH = Math.round((d.c / mx) * 110);
                    return (
                        <div key={`bar-group-${i}`} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", height: "100%", justifyContent: "flex-end", gap: 3 }}>
                            <div style={{ width: "100%", display: "flex", gap: 2, alignItems: "flex-end", flex: 1 }}>
                                {[{ h: fH, c: C.accent2, lbl: "Flagged", v: d.f }, { h: cH, c: "rgba(0,229,255,.35)", lbl: "Cleared", v: d.c }].map((b, bi) => (
                                    <div
                                        key={`bar-${i}-${bi}`}
                                        style={{ flex: 1, height: b.h, background: b.c, borderRadius: "2px 2px 0 0", minHeight: 2, cursor: "pointer", transition: "opacity .2s" }}
                                        onMouseEnter={(e) => setTooltip({ x: e.clientX, y: e.clientY, label: d.l, text: `${b.lbl}: ${b.v}` })}
                                        onMouseMove={(e) => handleMouseMove(e, d.l, b.lbl, b.v)}
                                        onMouseLeave={handleMouseLeave}
                                    />
                                ))}
                            </div>
                            <div style={{ fontSize: 8, color: C.muted, whiteSpace: "nowrap", fontFamily: "'IBM Plex Mono',monospace" }}>
                                {d.l.slice(-5)}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Tooltip */}
            {tooltip && (
                <div style={{
                    position: "fixed", left: tooltip.x + 12, top: tooltip.y - 30,
                    background: C.surface2, border: `1px solid ${C.border}`,
                    borderRadius: 4, padding: "6px 10px", fontSize: 10,
                    pointerEvents: "none", zIndex: 999,
                    fontFamily: "'IBM Plex Mono',monospace", color: C.text,
                }}>
                    <strong>{tooltip.label}</strong><br />{tooltip.text}
                </div>
            )}
        </div>
    );
}