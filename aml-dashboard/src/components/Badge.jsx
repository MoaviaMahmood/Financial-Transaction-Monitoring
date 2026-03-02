import { BADGE_COLOR } from "../constants/theme";

export function Badge({ risk }) {
    const s = BADGE_COLOR[risk] || BADGE_COLOR.medium;
    return (
        <span
            style={{
                display: "inline-block",
                padding: "2px 7px",
                borderRadius: 2,
                fontSize: 9,
                letterSpacing: ".08em",
                textTransform: "uppercase",
                fontWeight: 600,
                background: s.bg,
                color: s.c,
                border: `1px solid ${s.border}`,
            }}
        >
            {risk.charAt(0).toUpperCase() + risk.slice(1)}
        </span>
    );
}
