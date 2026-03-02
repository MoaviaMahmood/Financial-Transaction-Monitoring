import { useState, useEffect } from "react";

export function useWindowWidth() {
    const getWidth = () => (typeof window !== "undefined" ? window.innerWidth : 1200);
    const [width, setWidth] = useState(getWidth);

    useEffect(() => {
        const handler = () => setWidth(window.innerWidth);
        window.addEventListener("resize", handler);
        return () => window.removeEventListener("resize", handler);
    }, []);

    return width;
}