"""SENTINEL backend — FastAPI bridge between React UI and Athena."""
import os
from datetime import datetime
from functools import lru_cache
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pyathena import connect
from dotenv import load_dotenv
import pandas as pd

load_dotenv()

AWS_REGION       = os.getenv("AWS_REGION", "eu-north-1")
ATHENA_DATABASE  = os.getenv("ATHENA_DATABASE", "aml_db")
ATHENA_S3_OUTPUT = os.getenv("ATHENA_S3_OUTPUT")

# Theme colors (match Sentinel UI)
C_HIGH = "#ff4c6c"
C_MED  = "#ffb84d"
C_LOW  = "#00e5ff"
C_CRIT = "#ff2244"

print(f"[CONFIG] region={AWS_REGION} db={ATHENA_DATABASE} s3={ATHENA_S3_OUTPUT}")

app = FastAPI(title="SENTINEL Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------- Athena helper ----------------
@lru_cache(maxsize=1)
def get_conn():
    return connect(
        s3_staging_dir=ATHENA_S3_OUTPUT,
        region_name=AWS_REGION,
        schema_name=ATHENA_DATABASE,
    )

def query(sql: str) -> list[dict]:
    df = pd.read_sql(sql, get_conn())
    return df.astype(object).where(pd.notnull(df), None).to_dict(orient="records")

# ---------------- Endpoints ----------------
@app.get("/api/health")
def health():
    return {"ok": True, "ts": datetime.utcnow().isoformat()}

@app.get("/api/kpis")
def kpis():
    sql = """
    SELECT
        (SELECT COUNT(*) FROM aml_db.alerts_clean WHERE alert_score >= 90) AS critical,
        (SELECT COUNT(*) FROM aml_db.alerts_clean WHERE status = 'OPEN') AS pending,
        (SELECT COUNT(*) FROM aml_db.alerts_clean WHERE status IN ('CLOSED','REVIEWED')) AS cleared,
        (SELECT COALESCE(SUM(amount), 0) FROM aml_db.transactions_clean WHERE is_suspicious = TRUE) AS volume,
        (SELECT COUNT(*) FROM aml_db.alerts_clean) AS alert_count,
        (SELECT COUNT(*) FROM aml_db.transactions_clean) AS tx_count
    """
    row = query(sql)[0]
    return {
        "critical":   int(row["critical"] or 0),
        "pending":    int(row["pending"] or 0),
        "cleared":    int(row["cleared"] or 0),
        "volume":     float(row["volume"] or 0),
        "alertCount": int(row["alert_count"] or 0),
        "txCount":    int(row["tx_count"] or 0),
        "spark": {
            "critical": [int(row["critical"] or 0)] * 7,
            "pending":  [int(row["pending"] or 0)]  * 7,
            "cleared":  [int(row["cleared"] or 0)]  * 7,
            "volume":   [float(row["volume"] or 0)] * 7,
        },
    }

@app.get("/api/transactions/flagged")
def flagged_transactions(limit: int = 50):
    sql = f"""
    SELECT 
        t.transaction_id   AS id,
        COALESCE(c.first_name || ' ' || c.last_name, 'Unknown') AS entity,
        CAST(t.amount AS DOUBLE) AS amount,
        t.transaction_type AS type,
        COALESCE(t.aml_pattern, 'UNKNOWN') AS rule,
        CASE 
            WHEN t.alert_score >= 90 THEN 'CRITICAL'
            WHEN t.alert_score >= 70 THEN 'HIGH'
            WHEN t.alert_score >= 50 THEN 'MEDIUM'
            ELSE 'LOW'
        END AS risk,
        format_datetime(t.event_time, 'HH:mm:ss') AS time
    FROM aml_db.transactions_clean t
    LEFT JOIN aml_db.customers_clean c ON t.sender_customer = c.customer_id
    WHERE t.is_suspicious = TRUE
    ORDER BY t.event_time DESC
    LIMIT {limit}
    """
    return query(sql)

@app.get("/api/alerts/live")
def live_alerts(limit: int = 30):
    sql = f"""
    SELECT 
        alert_id   AS id,
        alert_type AS rule,
        customer_id AS entity,
        CAST(alert_score AS DOUBLE) AS score,
        format_datetime(created_at, 'HH:mm:ss') AS time,
        status
    FROM aml_db.alerts_clean
    ORDER BY created_at DESC
    LIMIT {limit}
    """
    return query(sql)

@app.get("/api/entities/top-risk")
def top_risk_entities(limit: int = 5):
    sql = f"""
    SELECT 
        first_name || ' ' || last_name AS name,
        business_type,
        customer_country AS country,
        pep_flag,
        COUNT(*) AS tx_count,
        ROUND(AVG(alert_score), 0) AS score
    FROM aml_db.alerts_enriched
    WHERE first_name IS NOT NULL
    GROUP BY first_name, last_name, business_type, customer_country, pep_flag
    ORDER BY COUNT(*) DESC
    LIMIT {limit}
    """
    rows = query(sql)

    # Color tiers based on score severity (matches Sentinel theme)
    def colors_for(score: int):
        if score >= 80:
            return {"bg": "rgba(255,76,108,0.15)", "c": "#ff4c6c"}   # danger / pink-red
        if score >= 60:
            return {"bg": "rgba(255,184,77,0.15)", "c": "#ffb84d"}   # warning / amber
        return {"bg": "rgba(0,229,255,0.15)",     "c": "#00e5ff"}    # info / cyan

    out = []
    for r in rows:
        score = int(r["score"] or 0)
        colors = colors_for(score)
        first_two = (r["name"][:2] if r["name"] else "??").upper()
        suffix = " · PEP" if r["pep_flag"] else ""
        out.append({
            "name":  r["name"],
            "i":     first_two,                                          # initials (component expects e.i)
            "meta":  f"{r['tx_count']} txns · {r['business_type']}{suffix}",
            "score": score,
            "bg":    colors["bg"],
            "c":     colors["c"],
        })
    return out

@app.get("/api/alerts/breakdown")
def alert_breakdown():
    sql = """
    SELECT alert_type AS label, COUNT(*) AS value
    FROM aml_db.alerts_clean
    GROUP BY alert_type
    ORDER BY COUNT(*) DESC
    LIMIT 14
    """
    return query(sql)

@app.get("/api/geo/high-risk")
def high_risk_geographies(limit: int = 8):
    """Top countries by suspicious transaction volume."""
    sql = f"""
    SELECT 
        country_origin AS country_code,
        COUNT(*) AS tx_count
    FROM aml_db.transactions_clean
    WHERE is_suspicious = TRUE
    AND country_origin IS NOT NULL
    GROUP BY country_origin
    ORDER BY COUNT(*) DESC
    LIMIT {limit}
    """
    rows = query(sql)

    # Country code → flag emoji + readable name
    country_meta = {
        "US": ("🇺🇸", "United States",     C_LOW),
        "GB": ("🇬🇧", "United Kingdom",    C_LOW),
        "DE": ("🇩🇪", "Germany",           C_LOW),
        "FR": ("🇫🇷", "France",            C_LOW),
        "NL": ("🇳🇱", "Netherlands",       C_LOW),
        "CH": ("🇨🇭", "Switzerland",       C_LOW),
        "JP": ("🇯🇵", "Japan",             C_LOW),
        "SG": ("🇸🇬", "Singapore",         C_LOW),
        "AU": ("🇦🇺", "Australia",         C_LOW),
        "CN": ("🇨🇳", "China",             C_MED),
        "CA": ("🇨🇦", "Canada",            C_LOW),
        # High-risk
        "KY": ("🇰🇾", "Cayman Islands",    C_HIGH),
        "PA": ("🇵🇦", "Panama",            C_HIGH),
        "BS": ("🇧🇸", "Bahamas",           C_HIGH),
        "CY": ("🇨🇾", "Cyprus",            C_HIGH),
        "RU": ("🇷🇺", "Russia",            C_HIGH),
        "AE": ("🇦🇪", "United Arab Emirates", C_HIGH),
        "HK": ("🇭🇰", "Hong Kong",         C_HIGH),
        "LV": ("🇱🇻", "Latvia",            C_HIGH),
        "MT": ("🇲🇹", "Malta",             C_HIGH),
        # Sanctioned
        "IR": ("🇮🇷", "Iran",              C_CRIT),
        "KP": ("🇰🇵", "North Korea",       C_CRIT),
        "MM": ("🇲🇲", "Myanmar",           C_CRIT),
        "SY": ("🇸🇾", "Syria",             C_CRIT),
        "YE": ("🇾🇪", "Yemen",             C_CRIT),
        "CU": ("🇨🇺", "Cuba",              C_CRIT),
        "VE": ("🇻🇪", "Venezuela",         C_CRIT),
    }

    out = []
    for r in rows:
        cc = r["country_code"]
        flag, name, color = country_meta.get(cc, ("🏳️", cc, C_LOW))
        out.append({
            "f": flag,
            "n": name,
            "v": int(r["tx_count"]),
            "c": color,
        })
    return out