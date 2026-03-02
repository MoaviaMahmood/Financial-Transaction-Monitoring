import { C } from "../constants/theme";
import { Badge } from "./Badge";

function Field({ label, value }) {
    return (
        <div style={{ flex: 1 }}>
            <div style={{ fontSize: 9, letterSpacing: ".12em", textTransform: "uppercase", color: C.muted, marginBottom: 4 }}>
                {label}
            </div>
            <div style={{ fontSize: 12, color: C.text, fontFamily: "'IBM Plex Mono',monospace" }}>{value}</div>
        </div>
    );
}

function Btn({ variant, onClick, children }) {
    const styles = {
        danger: { background: "rgba(255,59,107,.1)", color: C.accent2, borderColor: "rgba(255,59,107,.3)" },
        success: { background: "rgba(0,214,143,.1)", color: C.green, borderColor: "rgba(0,214,143,.3)" },
        ghost: { background: "transparent", color: C.muted, borderColor: C.border },
    };
    const s = styles[variant] || styles.ghost;
    return (
        <button
            onClick={onClick}
            style={{
                flex: 1, padding: 9, borderRadius: 4, cursor: "pointer",
                fontSize: 11, fontFamily: "'IBM Plex Mono',monospace",
                letterSpacing: ".08em", textTransform: "uppercase", fontWeight: 600,
                border: `1px solid ${s.borderColor}`,
                background: s.background, color: s.color, transition: "all .2s",
            }}
        >
            {children}
        </button>
    );
}

export function Modal({ modal, onClose, onEscalate, onClear }) {
    if (!modal) return null;
    const { type, data } = modal;
    const rcolor = { critical: C.accent2, high: C.accent3, medium: C.accent, cleared: C.green }[data?.risk] || C.accent;

    return (
        <div
            onClick={(e) => e.target === e.currentTarget && onClose()}
            style={{
                position: "fixed", inset: 0, background: "rgba(0,0,0,.7)",
                zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
            }}
        >
            <div
                style={{
                    background: C.surface, border: `1px solid rgba(0,229,255,.2)`,
                    borderRadius: 8, width: "100%", maxWidth: 520,
                    maxHeight: "80vh", overflowY: "auto", animation: "fadeUp .3s ease",
                }}
            >
                {/* Header */}
                <div
                    style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "14px 18px", borderBottom: `1px solid ${C.border}`,
                        position: "sticky", top: 0, background: C.surface,
                    }}
                >
                    <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 14 }}>
                        {type === "tx"
                            ? `Transaction · ${data.id}`
                            : type === "entity"
                                ? `Entity · ${data.name}`
                                : data.label}
                    </span>
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

                {/* Body */}
                <div style={{ padding: 18 }}>
                    {/* Transaction modal */}
                    {type === "tx" && (
                        <>
                            <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                                <Field label="Entity" value={data.entity} />
                                <Field label="Risk Score" value={
                                    <span style={{ color: rcolor, fontSize: 20, fontFamily: "'Orbitron',sans-serif", fontWeight: 900 }}>
                                        {data.score}/100
                                    </span>
                                } />
                            </div>
                            <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                                <Field label="Amount" value={`$${data.amount.toLocaleString()}`} />
                                <Field label="Type" value={data.type} />
                            </div>
                            <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                                <Field label="Rule Triggered" value={data.rule} />
                                <Field label="Time" value={`${data.time} UTC`} />
                            </div>
                            <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                                <Field label="Status" value={<Badge risk={data.risk} />} />
                            </div>
                            <div style={{ display: "flex", gap: 10, marginTop: 18, paddingTop: 14, borderTop: `1px solid ${C.border}` }}>
                                <Btn variant="danger" onClick={() => onEscalate(data.id)}>Escalate to SAR</Btn>
                                <Btn variant="success" onClick={() => onClear(data.id)}>Mark Cleared</Btn>
                                <Btn variant="ghost" onClick={onClose}>Close</Btn>
                            </div>
                        </>
                    )}

                    {/* Entity modal */}
                    {type === "entity" && (
                        <>
                            <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                                <Field label="Entity Name" value={data.name} />
                                <Field label="Risk Score" value={
                                    <span style={{
                                        color: data.score > 80 ? C.accent2 : data.score > 60 ? C.accent3 : C.green,
                                        fontSize: 20, fontFamily: "'Orbitron',sans-serif", fontWeight: 900,
                                    }}>
                                        {data.score}/100
                                    </span>
                                } />
                            </div>
                            <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
                                <Field label="Classification" value={data.score > 80 ? "HIGH RISK" : "MEDIUM RISK"} />
                                <Field label="Open Cases" value={data.openCases} />
                            </div>
                            <div style={{ display: "flex", gap: 10, marginTop: 18, paddingTop: 14, borderTop: `1px solid ${C.border}` }}>
                                <Btn variant="danger" onClick={() => { onClose(); data.onSAR && data.onSAR(); }}>Open SAR Case</Btn>
                                <Btn variant="ghost" onClick={onClose}>Close</Btn>
                            </div>
                        </>
                    )}

                    {/* KPI modal */}
                    {type === "kpi" && (
                        <>
                            <div style={{ marginBottom: 12 }}>
                                <Field label="Current Value" value={
                                    <span style={{ fontSize: 32, fontFamily: "'Orbitron',sans-serif", fontWeight: 900, marginTop: 4, display: "block" }}>
                                        {data.value}
                                    </span>
                                } />
                            </div>
                            <div style={{ marginBottom: 12 }}>
                                <Field label="Status" value="Live data simulation active" />
                            </div>
                            <div style={{ display: "flex", gap: 10, marginTop: 18, paddingTop: 14, borderTop: `1px solid ${C.border}` }}>
                                <Btn variant="ghost" onClick={onClose}>Close</Btn>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}