import { useState, useRef, useCallback } from "react";
import { C } from "../constants/theme";

export function BarChart({ data = [] }) {
    const [tooltip, setTooltip] = useState(null);
    const tooltipRafRef = useRef(null);

    const max = data.length > 0 ? Math.max(...data.map((d) => d.value)) : 1;

    const handleMouseMove = useCallback((e, label, value) => {
        if (tooltipRafRef.current) cancelAnimationFrame(tooltipRafRef.current);
        const x = e.clientX, y = e.clientY;
        tooltipRafRef.current = requestAnimationFrame(() => {
            setTooltip({ x, y, label, text: `${value} alerts` });
        });
    }, []);

    const handleMouseLeave = useCallback(() => {
        if (tooltipRafRef.current) cancelAnimationFrame(tooltipRafRef.current);
        setTooltip(null);
    }, []);

    // Color scale: more alerts = hotter color
    const colorFor = (value) => {
        const ratio = value / max;
        if (ratio > 0.66) return C.accent2;                  // pink/red — high
        if (ratio > 0.33) return "rgba(255,184,77,0.85)";    // amber — medium
        return "rgba(0,229,255,.55)";                        // cyan — low
    };

    if (data.length === 0) {
        return (
            <div style={{ padding: "40px 16px", textAlign: "center", fontSize: 11, color: C.muted }}>
                Loading alert distribution...
            </div>
        );
    }

    return (
        <div style={{ padding: "14px 16px" }}>
            {/* Legend */}
            <div style={{ display: "flex", gap: 16, marginBottom: 12 }}>
                {[
                    { c: C.accent2, l: "High volume" },
                    { c: "rgba(255,184,77,0.85)", l: "Medium" },
                    { c: "rgba(0,229,255,.55)", l: "Low" },
                ].map((item) => (
                    <div key={item.l} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 10, color: C.muted, fontFamily: "'IBM Plex Mono',monospace" }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: item.c }} />
                        {item.l}
                    </div>
                ))}
            </div>

            {/* Bars */}
            <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 140, position: "relative" }}>
                {data.map((d, i) => {
                    const h = Math.max(2, Math.round((d.value / max) * 120));
                    const color = colorFor(d.value);
                    return (
                        <div
                            key={`bar-${i}`}
                            style={{
                                flex: 1,
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                height: "100%",
                                justifyContent: "flex-end",
                                gap: 4,
                            }}
                        >
                            <div style={{ fontSize: 9, color: C.text, fontFamily: "'Orbitron',sans-serif", fontWeight: 700 }}>
                                {d.value}
                            </div>
                            <div
                                style={{
                                    width: "100%",
                                    height: h,
                                    background: color,
                                    borderRadius: "2px 2px 0 0",
                                    minHeight: 2,
                                    cursor: "pointer",
                                    transition: "opacity .2s",
                                }}
                                onMouseEnter={(e) => setTooltip({ x: e.clientX, y: e.clientY, label: d.label, text: `${d.value} alerts` })}
                                onMouseMove={(e) => handleMouseMove(e, d.label, d.value)}
                                onMouseLeave={handleMouseLeave}
                            />
                            <div
                                style={{
                                    fontSize: 8,
                                    color: C.muted,
                                    whiteSpace: "nowrap",
                                    fontFamily: "'IBM Plex Mono',monospace",
                                    transform: "rotate(-35deg)",
                                    transformOrigin: "center",
                                    marginTop: 8,
                                    width: "100%",
                                    textAlign: "center",
                                }}
                                title={d.label}
                            >
                                {d.label.length > 12 ? d.label.slice(0, 11) + "…" : d.label}
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