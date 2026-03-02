import { useState } from "react";
import { C } from "../constants/theme";
import { NAV_SECTIONS } from "../constants/data";

function NavItem({ item, active, onClick }) {
    const [hovered, setHovered] = useState(false);
    return (
        <div
            onClick={onClick}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                display: "flex", alignItems: "center", gap: 9,
                padding: "7px 10px", borderRadius: 4, cursor: "pointer", fontSize: 12,
                color: active ? C.accent : hovered ? C.text : C.muted,
                background: active ? "rgba(0,229,255,.06)" : hovered ? C.surface2 : "transparent",
                border: `1px solid ${active ? "rgba(0,229,255,.15)" : "transparent"}`,
                marginBottom: 2, transition: "color .15s, background .15s",
                fontFamily: "'IBM Plex Mono',monospace",
            }}
        >
            <span style={{ fontSize: 13, width: 16, textAlign: "center" }}>{item.icon}</span>
            {item.name}
            {item.badge != null && (
                <span style={{ marginLeft: "auto", background: C.accent2, color: "#fff", fontSize: 9, padding: "1px 5px", borderRadius: 2 }}>
                    {item.badge}
                </span>
            )}
        </div>
    );
}

export function Sidebar({ activeNav, setActiveNav, isMobile, sidebarOpen, alertCount }) {
    // Inject live badge count into Alerts nav item
    const sections = NAV_SECTIONS.map((sec) => ({
        ...sec,
        items: sec.items.map((item) =>
            item.name === "Alerts" ? { ...item, badge: alertCount } : item
        ),
    }));

    return (
        <aside
            style={{
                width: 210,
                flexShrink: 0,
                padding: "20px 0",
                borderRight: `1px solid ${C.border}`,
                overflowY: "auto",
                transition: "transform .3s ease",
                background: C.surface,
                ...(isMobile
                    ? { position: "fixed", top: 56, left: 0, bottom: 0, zIndex: 160, transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)" }
                    : { position: "sticky", top: 56, height: "calc(100vh - 56px)" }),
            }}
        >
            {sections.map((sec) => (
                <div key={sec.label} style={{ marginBottom: 24, padding: "0 14px" }}>
                    <div style={{ fontSize: 9, letterSpacing: ".2em", color: C.muted, textTransform: "uppercase", marginBottom: 8, paddingLeft: 8 }}>
                        {sec.label}
                    </div>
                    {sec.items.map((item) => (
                        <NavItem
                            key={item.name}
                            item={item}
                            active={activeNav === item.name}
                            onClick={() => setActiveNav(item.name)}
                        />
                    ))}
                </div>
            ))}
        </aside>
    );
}