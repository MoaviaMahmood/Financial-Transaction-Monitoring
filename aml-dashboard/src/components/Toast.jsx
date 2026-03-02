import { useState, useEffect } from "react";
import { C } from "../constants/theme";

export function Toast({ id, title, sub, type, onClose }) {
    const [leaving, setLeaving] = useState(false);

    useEffect(() => {
        const t = setTimeout(() => {
            setLeaving(true);
            setTimeout(() => onClose(id), 300);
        }, 5000);
        return () => clearTimeout(t);
    }, [id, onClose]);

    const icons = { critical: "🚨", success: "✅", info: "ℹ️" };
    const borderLeft = {
        critical: `3px solid ${C.accent2}`,
        success: `3px solid ${C.green}`,
        info: `3px solid ${C.accent}`,
    };

    return (
        <div
            className={leaving ? "toast-out" : "toast-in"}
            style={{
                background: C.surface2,
                border: `1px solid ${C.border}`,
                borderLeft: borderLeft[type] || borderLeft.info,
                borderRadius: 6,
                padding: "11px 14px",
                minWidth: 260,
                maxWidth: 320,
                display: "flex",
                alignItems: "flex-start",
                gap: 10,
                fontFamily: "'IBM Plex Mono',monospace",
                fontSize: 11,
            }}
        >
            <span style={{ fontSize: 15, flexShrink: 0 }}>{icons[type] || "📌"}</span>
            <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, marginBottom: 2 }}>{title}</div>
                <div style={{ fontSize: 10, color: C.muted }}>{sub}</div>
            </div>
            <span
                onClick={() => { setLeaving(true); setTimeout(() => onClose(id), 300); }}
                style={{ color: C.muted, cursor: "pointer", fontSize: 12 }}
            >
                ✕
            </span>
        </div>
    );
}

export function ToastContainer({ toasts, onClose }) {
    return (
        <div style={{ position: "fixed", bottom: 18, right: 18, zIndex: 1000, display: "flex", flexDirection: "column", gap: 8 }}>
            {toasts.map((t) => (
                <Toast key={t.id} {...t} onClose={onClose} />
            ))}
        </div>
    );
}