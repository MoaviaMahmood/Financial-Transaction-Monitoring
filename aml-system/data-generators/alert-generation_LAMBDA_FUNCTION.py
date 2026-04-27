import io
import sys
import uuid
import random
import json
import csv
import os
import boto3
from datetime import datetime, timezone
from dataclasses import dataclass, asdict

# Windows console safety
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

# ===========================================================
# S3 CONFIG
# ===========================================================
S3_BUCKET = os.environ["BUCKET_NAME"]
S3_PREFIX = os.environ.get("S3_PREFIX", "aml-data/")

s3 = boto3.client("s3")

# ===========================================================
# DATA MODELS
# ===========================================================
@dataclass
class Alert:
    alert_id:       str
    transaction_id: str
    customer_id:    str
    alert_type:     str
    alert_score:    float
    created_at:     str
    status:         str   # OPEN / REVIEWED / ESCALATED / CLOSED
    notes:          str

# ===========================================================
# HELPERS
# ===========================================================
def uid() -> str:
    return str(uuid.uuid4())[:12].upper()

def fmt(dt: datetime) -> str:
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")

def get_latest_s3_key(prefix, base_name):
    paginator = s3.get_paginator("list_objects_v2")
    base = os.path.splitext(base_name)[0]
    matching = []
    for page in paginator.paginate(Bucket=S3_BUCKET, Prefix=prefix):
        for obj in page.get("Contents", []):
            if os.path.basename(obj["Key"]).startswith(base):
                matching.append(obj)
    if not matching:
        raise FileNotFoundError(f"No matching objects for {base_name} in {prefix}")
    latest = max(matching, key=lambda o: o["LastModified"])
    return latest["Key"]

def read_latest_csv(base_name, folder=""):
    folder_path = f"{folder}/" if folder else ""
    key = get_latest_s3_key(S3_PREFIX + folder_path, base_name)
    obj = s3.get_object(Bucket=S3_BUCKET, Key=key)
    data = obj["Body"].read().decode()
    reader = csv.DictReader(io.StringIO(data))
    return [r for r in reader]

def upload_csv(data, name, folder="", partition_by_date=False):
    if not data:
        print(f"No data to upload for {name}")
        return
    rows = [asdict(d) for d in data]
    buf = io.StringIO()
    writer = csv.DictWriter(buf, fieldnames=rows[0].keys())
    writer.writeheader()
    writer.writerows(rows)

    now = datetime.now(timezone.utc)
    folder_path = f"{folder}/" if folder else ""
    base, ext = os.path.splitext(name)

    if partition_by_date:
        date_partition = now.strftime("%Y-%m-%d")
        time_suffix    = now.strftime("%H-%M-%S-%f")
        key = f"{S3_PREFIX}{folder_path}dt={date_partition}/{base}_{time_suffix}{ext}"
    else:
        timestamp = now.strftime("%Y-%m-%d_%H-%M-%S")
        key = f"{S3_PREFIX}{folder_path}{base}_{timestamp}{ext}"

    s3.put_object(Bucket=S3_BUCKET, Key=key, Body=buf.getvalue())

# ===========================================================
# ALERT GENERATOR
# ===========================================================
def generate_alerts(transactions):
    alerts = []
    for txn in transactions:
        if float(txn.get("alert_score", 0)) >= 50:  # threshold for alert
            alerts.append(Alert(
                alert_id       = "A-" + uid(),
                transaction_id = txn["transaction_id"],
                customer_id    = txn["sender_customer"],
                alert_type     = txn.get("aml_pattern", "SUSPICIOUS_TXN"),
                alert_score    = float(txn.get("alert_score", 0)),
                created_at     = fmt(datetime.now(timezone.utc)),
                status         = "OPEN",
                notes          = f"Auto-generated alert for transaction {txn['transaction_id']}"
            ))
    return alerts

# ===========================================================
# LAMBDA HANDLER
# ===========================================================
def lambda_handler(event, context):
    # Read the latest transactions CSV from S3
    transactions = read_latest_csv("transactions.csv", folder="transactions")
    
    # Generate alerts
    alerts = generate_alerts(transactions)
    
    # Upload alerts to S3 inside aml-data/alerts/ with timestamp
    upload_csv(alerts, "alerts.csv", folder="alerts/batch", partition_by_date=True)
    
    return {"status": "alerts generated", "total_alerts": len(alerts)}