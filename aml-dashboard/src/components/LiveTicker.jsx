import { C } from "../constants/theme";
import { TICKER_ITEMS } from "../constants/data";

export function LiveTicker() {
    return (
        <div
            style={{
                background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6,
                padding: "9px 14px", marginBottom: 18,
                display: "flex", alignItems: "center", gap: 12,
                overflow: "hidden", animation: "fadeUp .5s ease both",
            }}
        >
            <div
                style={{
                    fontSize: 9, letterSpacing: ".12em", color: C.accent, textTransform: "uppercase",
                    whiteSpace: "nowrap", borderRight: `1px solid ${C.border}`, paddingRight: 12,
                    display: "flex", alignItems: "center", gap: 6,
                }}
            >
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.accent2, boxShadow: `0 0 6px ${C.accent2}`, animation: "pulse 1s infinite" }} />
                LIVE FEED
            </div>
            <div style={{ flex: 1, overflow: "hidden" }}>
                <div className="ticker-track">
                    {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
                        <span key={i} style={{ fontSize: 10, color: item.a ? C.accent2 : C.muted, whiteSpace: "nowrap" }}>
                            [<span style={{ color: item.a ? C.accent2 : C.text }}>{item.l}</span>] {item.t}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
}