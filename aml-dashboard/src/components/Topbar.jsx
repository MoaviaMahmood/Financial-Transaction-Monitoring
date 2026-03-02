import { C } from "../constants/theme";

export function Topbar({ clock, alertCount, isMobile, onMenuClick, onAlertsClick, onSettingsClick }) {
    return (
        <div
            style={{
                position: "sticky", top: 0, zIndex: 200,
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "0 20px", height: 56,
                background: "rgba(6,8,16,0.92)", backdropFilter: "blur(16px)",
                borderBottom: `1px solid ${C.border}`,
            }}
        >
            {/* Left: hamburger + logo */}
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                {isMobile && (
                    <div
                        style={{ display: "flex", flexDirection: "column", gap: 5, cursor: "pointer", padding: 4 }}
                        onClick={onMenuClick}
                    >
                        <span style={{ width: 20, height: 2, background: C.muted, borderRadius: 1, display: "block" }} />
                        <span style={{ width: 20, height: 2, background: C.muted, borderRadius: 1, display: "block" }} />
                        <span style={{ width: 20, height: 2, background: C.muted, borderRadius: 1, display: "block" }} />
                    </div>
                )}
                <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 17, letterSpacing: ".15em", color: C.accent, display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.accent, boxShadow: `0 0 10px ${C.accent}`, animation: "pulse 2s infinite" }} />
                    SENTINEL
                </div>
            </div>

            {/* Right: status + clock + buttons */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {!isMobile && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: C.green, padding: "4px 10px", border: `1px solid rgba(0,214,143,.25)`, borderRadius: 2, background: "rgba(0,214,143,.06)" }}>
                        <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.green, boxShadow: `0 0 6px ${C.green}`, animation: "pulse 2s infinite" }} />
                        SYSTEMS NOMINAL
                    </div>
                )}
                <div style={{ fontSize: 11, color: C.muted }}>{clock}</div>
                <div
                    style={{ position: "relative", width: 36, height: 36, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 4, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}
                    onClick={onAlertsClick}
                >
                    🔔
                    <div style={{ position: "absolute", top: -4, right: -4, background: C.accent2, color: "#fff", fontSize: 9, width: 16, height: 16, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {alertCount}
                    </div>
                </div>
                <div
                    style={{ width: 36, height: 36, background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 4, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}
                    onClick={onSettingsClick}
                >
                    ⚙️
                </div>
            </div>
        </div>
    );
}