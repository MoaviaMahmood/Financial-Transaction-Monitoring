import { useState, useEffect } from "react";

export function useClock() {
    const [clock, setClock] = useState("");
    const [lastUpdate, setLastUpdate] = useState("");

    useEffect(() => {
        const tick = () => {
            const n = new Date();
            setClock(n.toISOString().substring(11, 19) + " UTC");
            setLastUpdate(n.toISOString().substring(11, 16) + " UTC");
        };
        tick();
        const t = setInterval(tick, 1000);
        return () => clearInterval(t);
    }, []);

    return { clock, lastUpdate };
}