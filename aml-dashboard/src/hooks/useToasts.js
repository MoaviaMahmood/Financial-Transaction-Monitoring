import { useState, useRef, useCallback } from "react";

export function useToasts() {
    const [toasts, setToasts] = useState([]);
    const toastIdRef = useRef(0);

    const addToast = useCallback((title, sub, type = "info") => {
        const id = ++toastIdRef.current;
        setToasts((prev) => [...prev, { id, title, sub, type }]);
    }, []);

    const removeToast = useCallback((id) => {
        setToasts((prev) => prev.filter((x) => x.id !== id));
    }, []);

    return { toasts, addToast, removeToast };
}