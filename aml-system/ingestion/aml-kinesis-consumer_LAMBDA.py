import boto3
import json
import base64
import os
import uuid
from datetime import datetime, timezone, timedelta
from decimal import Decimal

# ===========================================================
# AWS CLIENTS
# ===========================================================
s3 = boto3.client("s3")
ddb = boto3.resource("dynamodb")

BUCKET = os.environ["ALERTS_BUCKET"]
STATE_TABLE = ddb.Table(os.environ["STATE_TABLE"])

# ===========================================================
# RULE THRESHOLDS
# ===========================================================
HIGH_VALUE_THRESHOLD = 10_000
CROSS_BORDER_THRESHOLD = 5_000

STRUCTURING_MIN_AMOUNT = 8_000
STRUCTURING_MAX_AMOUNT = 10_000
STRUCTURING_WINDOW_MIN = 30
STRUCTURING_MIN_COUNT = 3

VELOCITY_WINDOW_MIN = 10
VELOCITY_MIN_COUNT = 10

RAPID_WINDOW_MIN = 15
RAPID_MIN_AMOUNT = 20_000
RAPID_DIFF_PCT = 0.20

WINDOW_RETENTION_MIN = 60  # how long to keep a customer's history in DDB
MAX_WINDOW_SIZE = 50       # cap entries per customer to avoid runaway growth

HIGH_RISK_COUNTRIES = {"KY", "PA", "BS", "CY", "RU", "AE", "HK", "LV", "MT"}
SANCTIONED_COUNTRIES = {"IR", "KP", "MM", "SY", "YE", "CU", "VE"}


# ===========================================================
# STATELESS RULES (unchanged)
# ===========================================================
def detect_stateless(tx: dict) -> list[dict]:
    alerts = []
    amount = float(tx.get("amount", 0))
    origin = tx.get("country_origin", "")
    dest = tx.get("country_dest", "")

    if amount >= HIGH_VALUE_THRESHOLD:
        alerts.append({"alert_type": "HIGH_VALUE", "score": 85})

    if origin != dest and amount >= CROSS_BORDER_THRESHOLD:
        alerts.append({"alert_type": "CROSS_BORDER_HIGH", "score": 70})

    if origin in SANCTIONED_COUNTRIES or dest in SANCTIONED_COUNTRIES:
        alerts.append({"alert_type": "SANCTIONED_COUNTRY", "score": 95})
    elif origin in HIGH_RISK_COUNTRIES or dest in HIGH_RISK_COUNTRIES:
        alerts.append({"alert_type": "HIGH_RISK_COUNTRY", "score": 60})

    if str(tx.get("is_suspicious", "")).lower() == "true":
        alerts.append({
            "alert_type": tx.get("aml_pattern", "UPSTREAM_FLAG"),
            "score": int(float(tx.get("alert_score", 50))),
        })
    return alerts


# ===========================================================
# STATE MANAGEMENT (DynamoDB)
# ===========================================================
def load_window(customer_id: str) -> list[dict]:
    """Return the recent transaction window for this customer."""
    try:
        resp = STATE_TABLE.get_item(Key={"customer_id": customer_id})
    except Exception as e:
        print(f"DynamoDB get_item error for {customer_id}: {e}")
        return []
    item = resp.get("Item")
    if not item:
        return []
    # Entries stored as list of dicts {ts: epoch_seconds, amount: float, tx_id: str}
    return item.get("window", [])


def save_window(customer_id: str, window: list[dict]) -> None:
    """Persist the rolling window back to DynamoDB with TTL."""
    ttl = int((datetime.now(timezone.utc) + timedelta(hours=2)).timestamp())
    try:
        STATE_TABLE.put_item(Item={
            "customer_id": customer_id,
            "window": window,
            "ttl": ttl,
        })
    except Exception as e:
        print(f"DynamoDB put_item error for {customer_id}: {e}")


def prune_window(window: list[dict], now_ts: int) -> list[dict]:
    """Remove entries older than WINDOW_RETENTION_MIN; cap size."""
    cutoff = now_ts - (WINDOW_RETENTION_MIN * 60)
    pruned = [e for e in window if int(e["ts"]) >= cutoff]
    return pruned[-MAX_WINDOW_SIZE:]


# ===========================================================
# STATEFUL RULES
# ===========================================================
def detect_stateful(tx: dict, window: list[dict]) -> list[dict]:
    """
    Evaluate the updated window (which already includes the current tx).
    Returns alerts for patterns that require temporal memory.
    """
    alerts = []
    now_ts = int(datetime.now(timezone.utc).timestamp())

    # --- STRUCTURING ---
    # ≥3 amounts in the 8-10k band within the last 30 min
    struct_cutoff = now_ts - (STRUCTURING_WINDOW_MIN * 60)
    structuring_hits = [
        e for e in window
        if int(e["ts"]) >= struct_cutoff
        and STRUCTURING_MIN_AMOUNT <= float(e["amount"]) < STRUCTURING_MAX_AMOUNT
    ]
    if len(structuring_hits) >= STRUCTURING_MIN_COUNT:
        alerts.append({
            "alert_type": "STRUCTURING_WINDOW",
            "score": 90,
            "detail": f"{len(structuring_hits)} sub-CTR txns in {STRUCTURING_WINDOW_MIN}min",
        })

    # --- VELOCITY ---
    # ≥10 total transactions in the last 10 min
    velocity_cutoff = now_ts - (VELOCITY_WINDOW_MIN * 60)
    velocity_hits = [e for e in window if int(e["ts"]) >= velocity_cutoff]
    if len(velocity_hits) >= VELOCITY_MIN_COUNT:
        alerts.append({
            "alert_type": "VELOCITY_BURST",
            "score": 75,
            "detail": f"{len(velocity_hits)} txns in {VELOCITY_WINDOW_MIN}min",
        })

    # --- RAPID_MOVEMENT ---
    # Large amount in, similar large amount out within 15 min (any direction pair)
    rapid_cutoff = now_ts - (RAPID_WINDOW_MIN * 60)
    rapid_hits = [
        e for e in window
        if int(e["ts"]) >= rapid_cutoff and float(e["amount"]) >= RAPID_MIN_AMOUNT
    ]
    if len(rapid_hits) >= 2:
        amounts = [float(e["amount"]) for e in rapid_hits]
        hi, lo = max(amounts), min(amounts)
        if (hi - lo) / hi <= RAPID_DIFF_PCT:
            alerts.append({
                "alert_type": "RAPID_MOVEMENT",
                "score": 80,
                "detail": f"{len(rapid_hits)} large txns within {RAPID_WINDOW_MIN}min, diff<{int(RAPID_DIFF_PCT*100)}%",
            })

    return alerts


# ===========================================================
# LAMBDA HANDLER
# ===========================================================
def lambda_handler(event, context):
    alerts_to_write = []
    processed = 0
    failed = 0
    now_ts = int(datetime.now(timezone.utc).timestamp())

    # Group transactions by customer so we do one DDB roundtrip per customer per batch
    by_customer: dict[str, list[dict]] = {}
    for record in event.get("Records", []):
        processed += 1
        try:
            payload = base64.b64decode(record["kinesis"]["data"])
            tx = json.loads(payload)
        except Exception as e:
            print(f"Failed to parse record: {e}")
            failed += 1
            continue
        cust = tx.get("sender_customer", "UNKNOWN")
        by_customer.setdefault(cust, []).append(tx)

    for customer_id, txs in by_customer.items():
        # Load once per customer, mutate in-memory, save once at the end
        window = prune_window(load_window(customer_id), now_ts)

        for tx in txs:
            # Stateless rules
            for a in detect_stateless(tx):
                alerts_to_write.append(_build_alert(tx, a))

            # Update window with this tx
            window.append({
                "ts": now_ts,
                "amount": Decimal(str(tx.get("amount", 0))),  # DDB needs Decimal
                "tx_id": tx.get("transaction_id"),
            })
            window = prune_window(window, now_ts)

            # Stateful rules (on the updated window)
            for a in detect_stateful(tx, window):
                alerts_to_write.append(_build_alert(tx, a))

        save_window(customer_id, window)

    if alerts_to_write:
        today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
        key = f"aml-data/alerts/realtime/dt={today}/{context.aws_request_id}.jsonl"
        body = "\n".join(json.dumps(a, default=str) for a in alerts_to_write)
        s3.put_object(Bucket=BUCKET, Key=key, Body=body.encode("utf-8"))
        print(f"Wrote {len(alerts_to_write)} alerts to s3://{BUCKET}/{key}")

    print(f"Processed {processed}, failed {failed}, alerts {len(alerts_to_write)}, customers {len(by_customer)}")
    return {
        "processed": processed,
        "failed": failed,
        "alerted": len(alerts_to_write),
        "customers_touched": len(by_customer),
    }


def _build_alert(tx: dict, a: dict) -> dict:
    return {
        "alert_id": f"A-{uuid.uuid4().hex[:10].upper()}",
        "transaction_id": tx.get("transaction_id"),
        "customer_id": tx.get("sender_customer"),
        "alert_type": a["alert_type"],
        "alert_score": a["score"],
        "detail": a.get("detail"),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "status": "OPEN",
        "notes": f"Real-time alert for {tx.get('transaction_id')}",
    }