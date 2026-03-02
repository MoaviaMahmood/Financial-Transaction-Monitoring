import { useState, useEffect } from "react";

// Styles
import { FontLoader, GlobalStyles } from "./components/GlobalStyles";

// Hooks
import { useWindowWidth }    from "./hooks/useWindowWidth";
import { useToasts }         from "./hooks/useToasts";
import { useClock }          from "./hooks/useClock";
import { useLiveSimulation } from "./hooks/useLiveSimulation";

// Components
import { Topbar }             from "./components/Topbar";
import { Sidebar }            from "./components/Sidebar";
import { AlertsPanel }        from "./components/AlertsPanel";
import { Modal }              from "./components/Modal";
import { ToastContainer }     from "./components/Toast";
import { KpiCard }            from "./components/KpiCard";
import { LiveTicker }         from "./components/LiveTicker";
import { BarChart }           from "./components/BarChart";
import { RiskEntitiesPanel }  from "./components/RiskEntitiesPanel";
import { TransactionsTable }  from "./components/TransactionsTable";
import { GeoPanel, RulesPanel } from "./components/BottomPanels";

// Theme
import { C } from "./constants/theme";

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [alertsOpen,  setAlertsOpen]  = useState(false);
  const [activeNav,   setActiveNav]   = useState("Overview");
  const [modal,       setModal]       = useState(null);
  const [flashKpi,    setFlashKpi]    = useState("");

  const windowWidth = useWindowWidth();
  const isMobile    = windowWidth <= 700;

  const { toasts, addToast, removeToast } = useToasts();
  const { clock, lastUpdate }             = useClock();
  const {
    transactions,
    liveAlerts,
    kpis,
    escalateTransaction,
    clearTransaction,
  } = useLiveSimulation(addToast);

  // Welcome toast on mount
  useEffect(() => {
    const t = setTimeout(
      () => addToast("SENTINEL Online", "Monitoring 2.4M accounts · Live simulation active", "info"),
      600
    );
    return () => clearTimeout(t);
  }, [addToast]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleEscalate = (id) => {
    escalateTransaction(id);
    addToast("Escalated to SAR", `${id} queued for Suspicious Activity Report`, "critical");
    setModal(null);
  };

  const handleClear = (id) => {
    clearTransaction(id);
    addToast("Transaction Cleared", `${id} marked as cleared`, "success");
    setModal(null);
  };

  const handleExportCSV = () => {
    const rows = ["Transaction ID,Entity,Amount,Type,Rule,Risk,Time"];
    transactions.forEach((t) =>
      rows.push(`${t.id},${t.entity},$${t.amount},${t.type},${t.rule},${t.risk},${t.time}`)
    );
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "sentinel_transactions.csv";
    a.click();
    addToast("Export Complete", "CSV file downloaded", "success");
  };

  const handleEntityClick = (e) => {
    setModal({
      type: "entity",
      data: {
        ...e,
        openCases: Math.floor(Math.random() * 4) + 1,
        onSAR: () => addToast("Case Opened", `New SAR case created for ${e.name}`, "critical"),
      },
    });
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ background: C.bg, color: C.text, fontFamily: "'IBM Plex Mono',monospace", minHeight: "100vh", position: "relative" }}>
      <FontLoader />
      <GlobalStyles />

      {/* Background grid */}
      <div style={{ position: "fixed", inset: 0, backgroundImage: "linear-gradient(rgba(0,229,255,0.015) 1px,transparent 1px),linear-gradient(90deg,rgba(0,229,255,0.015) 1px,transparent 1px)", backgroundSize: "40px 40px", pointerEvents: "none", zIndex: 0 }} />
      <div style={{ position: "fixed", top: -200, left: "50%", transform: "translateX(-50%)", width: 800, height: 400, background: "radial-gradient(ellipse,rgba(0,229,255,0.06) 0%,transparent 70%)", pointerEvents: "none", zIndex: 0 }} />

      {/* Top navigation bar */}
      <Topbar
        clock={clock}
        alertCount={kpis.alertCount}
        isMobile={isMobile}
        onMenuClick={() => setSidebarOpen((o) => !o)}
        onAlertsClick={() => setAlertsOpen((o) => !o)}
        onSettingsClick={() => addToast("Settings", "Feature coming soon", "info")}
      />

      {/* Mobile sidebar backdrop */}
      {isMobile && sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{ position: "fixed", inset: 0, zIndex: 150, background: "rgba(0,0,0,.3)" }}
        />
      )}

      {/* Layout: sidebar + main */}
      <div style={{ display: "flex", position: "relative", zIndex: 1 }}>
        <Sidebar
          activeNav={activeNav}
          setActiveNav={(name) => { setActiveNav(name); if (isMobile) setSidebarOpen(false); }}
          isMobile={isMobile}
          sidebarOpen={sidebarOpen}
          alertCount={kpis.alertCount}
        />

        <main
          style={{
            flex: 1,
            padding: "22px 24px",
            minHeight: "calc(100vh - 56px)",
            minWidth: 0,
            transition: "margin-right .3s ease",
            marginRight: !isMobile && alertsOpen ? 300 : 0,
          }}
        >
          {/* Page header */}
          <div style={{ marginBottom: 20, animation: "fadeUp .5s ease both" }}>
            <div className="page-title-text" style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 20, letterSpacing: ".05em", marginBottom: 4 }}>
              AML Command Center
            </div>
            <div style={{ fontSize: 11, color: C.muted }}>
              Last updated · {lastUpdate} · Monitoring 2,400,000 accounts · {kpis.txCount.toLocaleString()} transactions today
            </div>
          </div>

          {/* Live ticker */}
          <LiveTicker />

          {/* KPI grid */}
          <div className="kpi-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 18 }}>
            <KpiCard
              variant="danger" icon="🚨" label="Critical Alerts" value={kpis.critical}
              delta={`↑ ${kpis.critical - 18} vs baseline`} deltaUp
              sparkData={kpis.spark.critical} sparkColor={C.accent2}
              flash={flashKpi === "critical"}
              onClick={() => setModal({ type: "kpi", data: { label: "Critical Alerts", value: kpis.critical } })}
            />
            <KpiCard
              variant="warning" icon="⚠" label="Pending Review" value={kpis.pending}
              delta="↑ 12 new today" deltaUp
              sparkData={kpis.spark.pending} sparkColor={C.accent3}
              onClick={() => setModal({ type: "kpi", data: { label: "Pending Review", value: kpis.pending } })}
            />
            <KpiCard
              variant="success" icon="✓" label="Cleared Today" value={kpis.cleared}
              delta="↑ 18% above target"
              sparkData={kpis.spark.cleared} sparkColor={C.green}
              onClick={() => setModal({ type: "kpi", data: { label: "Cleared Today", value: kpis.cleared } })}
            />
            <KpiCard
              variant="info" icon="$" label="Flagged Volume" value={`$${Math.round(kpis.volume / 100000) / 10}M`}
              delta="↑ 8.2% this week" deltaUp
              sparkData={kpis.spark.volume} sparkColor={C.accent}
              onClick={() => setModal({ type: "kpi", data: { label: "Flagged Volume", value: `$${Math.round(kpis.volume / 100000) / 10}M` } })}
            />
          </div>

          {/* Chart + Entities row */}
          <div className="main-grid" style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 16, marginBottom: 16 }}>
            <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 6, overflow: "hidden", animation: "fadeUp .5s ease both" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 16px", borderBottom: `1px solid ${C.border}` }}>
                <span style={{ fontSize: 11, letterSpacing: ".12em", textTransform: "uppercase", fontWeight: 600 }}>Alert Activity — Last 14 Days</span>
                <span onClick={handleExportCSV} style={{ fontSize: 10, color: C.accent, cursor: "pointer" }}>Export CSV ↗</span>
              </div>
              <BarChart />
            </div>
            <RiskEntitiesPanel onEntityClick={handleEntityClick} />
          </div>

          {/* Transactions table */}
          <TransactionsTable
            transactions={transactions}
            onReview={(r) => setModal({ type: "tx", data: r })}
            onExport={handleExportCSV}
          />

          {/* Geo + Rules row */}
          <div className="bottom-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <GeoPanel onCountryClick={(g) => addToast(`${g.f} ${g.n}`, `${g.v} flagged transactions this month`, "info")} />
            <RulesPanel />
          </div>
        </main>
      </div>

      {/* Alerts slide-in panel */}
      <AlertsPanel
        liveAlerts={liveAlerts}
        isOpen={alertsOpen}
        isMobile={isMobile}
        onClose={() => setAlertsOpen(false)}
      />

      {/* Modal */}
      {modal && (
        <Modal
          modal={modal}
          onClose={() => setModal(null)}
          onEscalate={handleEscalate}
          onClear={handleClear}
        />
      )}

      {/* Toast notifications */}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </div>
  );
}