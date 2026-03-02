import { C } from "../constants/theme";
import { Badge } from "./Badge";

export function AlertsPanel({ liveAlerts, isOpen, isMobile, onClose }) {
    return (
        <div
            style={{
                position: "fixed", top: 56, right: 0, bottom: 0,
                width: isMobile ? "100vw" : 300,
                background: C.surface,
                borderLeft: `1px solid ${C.border}`,
                zIndex: 300,
                transform: isOpen ? "translateX(0)" : "translateX(100%)",
                transition: "transform .3s ease",
                overflowY: "auto",
            }}
        >
            {/* Header */}
            <div
                style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "12px 16px", borderBottom: `1px solid ${C.border}`,
                    position: "sticky", top: 0, background: C.surface, zIndex: 1,
                }}
            >
                <span style={{ fontSize: 11, letterSpacing: ".12em", textTransform: "uppercase", fontWeight: 600 }}>Live Alerts</span>
                <div
                    onClick={onClose}
                    style={{
                        width: 28, height: 28, borderRadius: 4, background: C.surface2,
                        border: `1px solid ${C.border}`, cursor: "pointer",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 13, color: C.muted,
                    }}
                >
                    ✕
                </div>
            </div>

            {/* Alert rows */}
            {liveAlerts.map((a, i) => (
                <div
                    key={i}
                    style={{ padding: "11px 16px", borderBottom: `1px solid rgba(255,255,255,.03)`, cursor: "pointer", transition: "background .15s" }}
                >
                    <div style={{ fontSize: 11, marginBottom: 4, display: "flex", alignItems: "center", gap: 8 }}>
                        <Badge risk={a.lv === "info" ? "medium" : a.lv} /> {a.t}
                    </div>
                    <div style={{ fontSize: 10, color: C.muted }}>{a.s} · {a.time} UTC</div>
                </div>
            ))}
        </div>
    );
}