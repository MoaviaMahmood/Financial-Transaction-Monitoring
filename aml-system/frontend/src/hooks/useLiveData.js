import { useState, useEffect, useCallback, useMemo } from "react";

const API = "http://localhost:8000";

const normalizeRisk = (r) => (r || "").toLowerCase();

const toLiveAlert = (a) => {
    const score = a.score || 0;
    const lv = score >= 90 ? "critical" : score >= 70 ? "high" : score >= 50 ? "medium" : "info";
    return {
        lv,
        t: `${a.id} flagged`,
        s: `${a.entity} — ${a.rule} · score ${score}`,
        time: a.time,
        // raw fields for ticker reuse
        rule: a.rule,
        entity: a.entity,
        score,
    };
};

const toUiTransaction = (t) => ({
    id: t.id,
    entity: t.entity,
    amount: t.amount,
    type: t.type,
    rule: t.rule,
    risk: normalizeRisk(t.risk),
    time: t.time,
    score: 0,
    _new: false,
});

export function useLiveData(addToast) {
    const [transactions, setTransactions]     = useState([]);
    const [liveAlerts, setLiveAlerts]         = useState([]);
    const [riskEntities, setRiskEntities]     = useState([]);
    const [alertBreakdown, setAlertBreakdown] = useState([]);
    const [geoData, setGeoData]               = useState([]);
    const [kpis, setKpis] = useState({
        critical: 0, pending: 0, cleared: 0, volume: 0,
        alertCount: 0, txCount: 0,
        spark: {
            critical: [0, 0, 0, 0, 0, 0, 0],
            pending:  [0, 0, 0, 0, 0, 0, 0],
            cleared:  [0, 0, 0, 0, 0, 0, 0],
            volume:   [0, 0, 0, 0, 0, 0, 0],
        },
    });

    const fetchAll = useCallback(async () => {
        try {
            const [kpiRes, txRes, alertRes, entRes, breakRes, geoRes] = await Promise.all([
                fetch(`${API}/api/kpis`).then((r) => r.json()),
                fetch(`${API}/api/transactions/flagged?limit=25`).then((r) => r.json()),
                fetch(`${API}/api/alerts/live?limit=30`).then((r) => r.json()),
                fetch(`${API}/api/entities/top-risk?limit=5`).then((r) => r.json()),
                fetch(`${API}/api/alerts/breakdown`).then((r) => r.json()),
                fetch(`${API}/api/geo/high-risk?limit=8`).then((r) => r.json()),
            ]);

            setKpis(kpiRes);
            setRiskEntities(entRes);
            setAlertBreakdown(breakRes);
            setGeoData(geoRes);

            const newTxs = txRes.map(toUiTransaction);
            setTransactions((prev) => {
                const prevIds = new Set(prev.map((t) => t.id));
                return newTxs.map((t) => ({ ...t, _new: !prevIds.has(t.id) && prev.length > 0 }));
            });

            const newAlerts = alertRes.map(toLiveAlert);
            setLiveAlerts((prev) => {
                const prevTitles = new Set(prev.map((a) => a.t));
                const trulyNew = newAlerts.filter((a) => !prevTitles.has(a.t));
                if (prev.length > 0 && trulyNew.length > 0) {
                    const critical = trulyNew.filter((a) => a.lv === "critical");
                    if (critical.length > 0) {
                        addToast("🚨 New Critical Alert", critical[0].s, "critical");
                    }
                }
                return newAlerts;
            });
        } catch (err) {
            console.error("Fetch failed:", err);
        }
    }, [addToast]);

    useEffect(() => {
        fetchAll();
        const id = setInterval(fetchAll, 30000);
        return () => clearInterval(id);
    }, [fetchAll]);

    // Derive ticker items: interleave alerts (highlighted) and transactions (muted)
    const tickerItems = useMemo(() => {
        const alertItems = liveAlerts.slice(0, 8).map((a) => ({
            l: "ALERT",
            t: `${a.entity} — ${a.rule} · score ${a.score}`,
            a: true,
        }));
        const txItems = transactions.slice(0, 8).map((t) => ({
            l: "TX",
            t: `${t.id} · ${t.entity} · $${Math.round(t.amount).toLocaleString()}`,
            a: false,
        }));
        // Interleave for visual variety
        const merged = [];
        const len = Math.max(alertItems.length, txItems.length);
        for (let i = 0; i < len; i++) {
            if (alertItems[i]) merged.push(alertItems[i]);
            if (txItems[i])    merged.push(txItems[i]);
        }
        return merged;
    }, [liveAlerts, transactions]);

    const escalateTransaction = (id) => {
        setTransactions((prev) =>
            prev.map((t) => (t.id === id ? { ...t, risk: "critical" } : t))
        );
    };

    const clearTransaction = (id) => {
        setTransactions((prev) =>
            prev.map((t) => (t.id === id ? { ...t, risk: "cleared" } : t))
        );
        setKpis((prev) => ({ ...prev, cleared: prev.cleared + 1 }));
    };

    return {
        transactions,
        liveAlerts,
        kpis,
        riskEntities,
        alertBreakdown,
        geoData,
        tickerItems,
        escalateTransaction,
        clearTransaction,
    };
}