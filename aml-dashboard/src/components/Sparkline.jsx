import { useRef, useEffect } from "react";

export function Sparkline({ data, color }) {
    const ref = useRef(null);

    useEffect(() => {
        const c = ref.current;
        if (!c) return;
        c.width = c.parentElement?.clientWidth || 180;
        c.height = 28;
        const ctx = c.getContext("2d");
        const mn = Math.min(...data), mx = Math.max(...data), rng = mx - mn || 1;
        const pts = data.map((v, i) => ({
            x: (i / (data.length - 1)) * c.width,
            y: c.height - ((v - mn) / rng) * (c.height - 4) - 2,
        }));

        const g = ctx.createLinearGradient(0, 0, 0, c.height);
        g.addColorStop(0, color + "50");
        g.addColorStop(1, color + "00");

        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        pts.slice(1).forEach((p) => ctx.lineTo(p.x, p.y));
        ctx.lineTo(pts[pts.length - 1].x, c.height);
        ctx.lineTo(0, c.height);
        ctx.closePath();
        ctx.fillStyle = g;
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        pts.slice(1).forEach((p) => ctx.lineTo(p.x, p.y));
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.stroke();
    }, [data, color]);

    return (
        <canvas
            ref={ref}
            style={{ display: "block", width: "100%", height: 28, marginTop: 8 }}
        />
    );
}