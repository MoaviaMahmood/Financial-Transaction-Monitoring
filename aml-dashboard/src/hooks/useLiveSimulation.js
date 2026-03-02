import { useState, useEffect } from "react";
import {
    INIT_TRANSACTIONS,
    INIT_ALERTS,
    INIT_KPI_SPARK,
    ENTITY_POOL,
    RULE_POOL,
    TX_TYPES,
} from "../constants/data";

export function useLiveSimulation(addToast) {
    const [transactions, setTransactions] = useState(INIT_TRANSACTIONS);
    const [liveAlerts, setLiveAlerts] = useState(INIT_ALERTS);
    const [txCounter, setTxCounter] = useState(928840);
    const [kpis, setKpis] = useState({
        critical: 23,
        pending: 148,
        cleared: 391,
        volume: 2400000,
        alertCount: 7,
        txCount: 4821,
        spark: INIT_KPI_SPARK,
    });

    useEffect(() => {
        const sim = () => {
            // Tick KPIs + sparklines
            setKpis((prev) => ({
                ...prev,
                txCount: prev.txCount + Math.floor(Math.random() * 5),
                spark: {
                    critical: [...prev.spark.critical.slice(1), prev.spark.critical[prev.spark.critical.length - 1] + (Math.random() - 0.4)],
                    pending: [...prev.spark.pending.slice(1), prev.spark.pending[prev.spark.pending.length - 1] + (Math.random() - 0.4) * 2],
                    cleared: [...prev.spark.cleared.slice(1), prev.spark.cleared[prev.spark.cleared.length - 1] + Math.random() * 2],
                    volume: [...prev.spark.volume.slice(1), +(prev.spark.volume[prev.spark.volume.length - 1] + (Math.random() - 0.3) * 0.1).toFixed(2)],
                },
            }));

            // Randomly inject a new transaction
            if (Math.random() < 0.2) {
                const entity = ENTITY_POOL[Math.floor(Math.random() * ENTITY_POOL.length)];
                const amount = Math.floor(Math.random() * 500000) + 5000;
                const rule = RULE_POOL[Math.floor(Math.random() * RULE_POOL.length)];
                const risk = ["critical", "critical", "high", "high", "medium", "medium", "cleared"][Math.floor(Math.random() * 7)];
                const time = new Date().toISOString().substring(11, 16);

                setTxCounter((prev) => prev + 1);
                setTxCounter((prev) => {
                    const newTx = {
                        id: `TXN-${prev}`,
                        entity, amount,
                        type: TX_TYPES[Math.floor(Math.random() * TX_TYPES.length)],
                        rule, risk, time,
                        score: Math.floor(Math.random() * 40) + 50,
                        _new: true,
                    };

                    setTransactions((prevTx) => {
                        const arr = [newTx, ...prevTx];
                        return arr.length > 25 ? arr.slice(0, 25) : arr;
                    });

                    setTimeout(() => {
                        setTransactions((prevTx) =>
                            prevTx.map((t) => (t.id === newTx.id ? { ...t, _new: false } : t))
                        );
                    }, 1000);

                    if (risk === "critical" || risk === "high") {
                        setKpis((prevKpis) => ({ ...prevKpis, alertCount: prevKpis.alertCount + 1 }));
                        setLiveAlerts((prevAlerts) => [
                            { lv: risk, t: `${newTx.id} flagged`, s: `${entity} — ${rule} · $${amount.toLocaleString()}`, time },
                            ...prevAlerts,
                        ].slice(0, 30));
                        if (risk === "critical") {
                            addToast("🚨 New Critical Alert", `${entity} — ${rule} · $${amount.toLocaleString()}`, "critical");
                        }
                    }
                    return prev;
                });
            }
        };

        const t = setInterval(sim, 3000);
        return () => clearInterval(t);
    }, [addToast]);

    const escalateTransaction = (id) => {
        setTransactions((prev) => prev.map((t) => (t.id === id ? { ...t, risk: "critical" } : t)));
    };

    const clearTransaction = (id) => {
        setTransactions((prev) => prev.map((t) => (t.id === id ? { ...t, risk: "cleared" } : t)));
        setKpis((prev) => ({ ...prev, cleared: prev.cleared + 1 }));
    };

    return { transactions, liveAlerts, kpis, txCounter, escalateTransaction, clearTransaction };
}
