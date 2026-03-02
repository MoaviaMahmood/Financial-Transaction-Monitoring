import { C } from "../constants/theme";
import { Sparkline } from "./Sparkline";

export function KpiCard({ variant, icon, label, value, delta, deltaUp, sparkData, sparkColor, onClick, flash }) {
    const top = { danger: C.accent2, warning: C.accent3, success: C.green, info: C.accent }[variant];

    return (
        <div
            className={flash ? "kpi-flash" : ""}
            onClick={onClick}
            style={{
                background: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: 6,
                padding: 16,
                position: "relative",
                overflow: "hidden",
                cursor: "pointer",
                transition: "border-color .2s,transform .2s",
                animation: "fadeUp .5s ease both",
            }}
        >
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: top }} />
            <div style={{ position: "absolute", right: 12, top: 12, fontSize: 24, opacity: 0.07 }}>{icon}</div>
            <div style={{ fontSize: 9, letterSpacing: ".1em", color: C.muted, textTransform: "uppercase", marginBottom: 8, fontFamily: "'IBM Plex Mono',monospace" }}>
                {label}
            </div>
            <div
                className="kpi-value-num"
                style={{ fontFamily: "'Orbitron',sans-serif", fontWeight: 900, fontSize: 24, lineHeight: 1, marginBottom: 6, color: top, letterSpacing: ".04em" }}
            >
                {value}
            </div>
            <div style={{ fontSize: 9, color: deltaUp ? C.accent2 : C.green, display: "flex", alignItems: "center", gap: 4, fontFamily: "'IBM Plex Mono',monospace" }}>
                {delta}
            </div>
            <Sparkline data={sparkData} color={sparkColor} />
        </div>
    );
}