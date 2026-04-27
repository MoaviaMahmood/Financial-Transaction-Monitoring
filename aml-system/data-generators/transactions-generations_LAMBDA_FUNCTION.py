import io
import sys
import uuid
import random
import json
import csv
import os
import boto3
from datetime import datetime, timedelta, timezone
from dataclasses import dataclass, asdict

# Windows console safety
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

# ===========================================================
# S3 CONFIG
# ===========================================================
BUCKET = os.environ["BUCKET_NAME"]
PREFIX = os.environ.get("S3_PREFIX", "aml-data/")

KINESIS_STREAM = os.environ.get("KINESIS_STREAM_NAME", "transactions-data-stream")
kinesis = boto3.client("kinesis")

s3 = boto3.client("s3")

# ===========================================================
# CONFIGURATION
# ===========================================================

NUM_CUSTOMERS      = 300
NUM_ACCOUNTS       = 450
NUM_NORMAL_TXN     = 100
SUSPICIOUS_RATIO   = 0.08
REPORTING_THRESHOLD = 10_000

# ===========================================================
# REFERENCE DATA
# ===========================================================
FIRST_NAMES = [
    "James", "Maria", "Chen", "Ahmed", "Sophie", "Luca", "Yuki", "Omar",
    "Elena", "Carlos", "David", "Fatima", "Pierre", "Anna", "Raj", "Kim",
    "Miguel", "Aisha", "Ivan", "Lin", "Samuel", "Nadia", "Felix", "Sara"
]

LAST_NAMES = [
    "Smith", "Wang", "Patel", "Mueller", "Silva", "Johnson", "Dubois",
    "Kim", "Rossi", "Hassan", "Novak", "Williams", "Garcia", "Tanaka",
    "Brown", "Nguyen", "Ali", "Kowalski", "Fernandez", "Okafor"
]

BUSINESS_TYPES = [
    "RETAIL", "RESTAURANT", "CONSULTING", "IMPORT_EXPORT", "REAL_ESTATE",
    "CRYPTO_EXCHANGE", "SHELL_COMPANY", "INDIVIDUAL", "NGO", "LOGISTICS"
]

# Full location list — city + country code
LOCATIONS_LOW_RISK = [
    ("New York",   "US"), ("Los Angeles", "US"), ("Chicago",   "US"),
    ("Houston",    "US"), ("Miami",        "US"), ("Toronto",   "CA"),
    ("London",     "GB"), ("Frankfurt",    "DE"), ("Paris",     "FR"),
    ("Amsterdam",  "NL"), ("Zurich",       "CH"), ("Tokyo",     "JP"),
    ("Singapore",  "SG"), ("Sydney",       "AU"), ("Shanghai",  "CN"),
]

LOCATIONS_HIGH_RISK = [
    ("Cayman Islands", "KY"), ("Panama City", "PA"), ("Nassau",    "BS"),
    ("Nicosia",        "CY"), ("Moscow",      "RU"), ("Dubai",     "AE"),
    ("Hong Kong",      "HK"), ("Riga",        "LV"), ("Valletta",  "MT"),
]

ALL_LOCATIONS     = LOCATIONS_LOW_RISK + LOCATIONS_HIGH_RISK
HIGH_RISK_COUNTRY_CODES = {loc[1] for loc in LOCATIONS_HIGH_RISK}

# Sanctioned / very-high-risk jurisdictions (FATF blacklist proxies)
SANCTIONED_CODES  = {"IR", "KP", "MM", "SY", "YE", "CU", "VE"}
TXN_TYPES = ["WIRE", "ACH", "CASH_DEPOSIT", "CASH_WITHDRAWAL", "INTERNAL_TRANSFER", "TRADE_PAYMENT", "PAYMENT"]
CASH_TYPES = {"CASH_DEPOSIT", "CASH_WITHDRAWAL"}

MERCHANT_CATEGORIES = [
    "retail", "utilities", "groceries", "entertainment", "healthcare",
    "travel", "restaurants", "electronics", "fuel", "gambling",
    "cryptocurrency_exchange", "jewelry", "real_estate", "forex", "atm_cash"
]

HIGH_RISK_MERCHANT = ["gambling", "cryptocurrency_exchange", "forex", "atm_cash", "jewelry"]

CURRENCIES = ["USD"] * 6 + ["EUR", "GBP", "JPY", "CHF", "AED", "SGD"]
DEVICES    = ["mobile", "web", "atm", "pos"]

# ===========================================================
# DATA MODELS
# ===========================================================
@dataclass
class Customer:
    customer_id:   str
    first_name:    str
    last_name:     str
    country_code:  str
    city:          str
    risk_rating:   str
    business_type: str
    pep_flag:      bool
    created_date:  str
    is_suspicious: bool = False

@dataclass
class Account:
    account_id:    str
    customer_id:   str
    account_type:  str
    currency:      str
    balance:       float
    opened_date:   str
    country_code:  str
    city:          str
    is_active:     bool = True

@dataclass
class Transaction:
    transaction_id:    str
    timestamp:         str
    sender_account:    str
    receiver_account:  str
    sender_customer:   str
    receiver_customer: str
    amount:            float
    currency:          str
    transaction_type:  str
    merchant_category: str
    location_city:     str
    location_country:  str
    device_used:       str
    country_origin:    str
    country_dest:      str
    # Risk / label fields
    is_suspicious:     bool  = False
    aml_pattern:       str   = "NONE"
    alert_score:       float = 0.0

# ===========================================================
# HELPERS
# ===========================================================

def uid() -> str:
    return str(uuid.uuid4())[:12].upper()

def fmt(dt: datetime) -> str:
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")

def rand_name() -> str:
    return f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}"

def rand_location(high_risk: bool = False):
    pool = LOCATIONS_HIGH_RISK if high_risk else ALL_LOCATIONS
    return random.choice(pool)   # (city, country_code)

def compute_risk_rating(country_code: str, business_type: str, pep: bool) -> str:
    score = 0
    if country_code in SANCTIONED_CODES:
        score += 3
    elif country_code in HIGH_RISK_COUNTRY_CODES:
        score += 2
    if business_type in {"SHELL_COMPANY", "CRYPTO_EXCHANGE", "IMPORT_EXPORT"}:
        score += 2
    if pep:
        score += 2
    return "HIGH" if score >= 4 else "MEDIUM" if score >= 2 else "LOW"

def compute_alert_score(txn: Transaction, customer: Customer) -> float:
    score = 0.0
    if txn.amount >= REPORTING_THRESHOLD:
        score += 30
    if txn.country_origin in HIGH_RISK_COUNTRY_CODES | SANCTIONED_CODES:
        score += 20
    if txn.country_dest in HIGH_RISK_COUNTRY_CODES | SANCTIONED_CODES:
        score += 20
    if txn.transaction_type in CASH_TYPES:
        score += 15
    if txn.merchant_category in HIGH_RISK_MERCHANT:
        score += 10
    if customer.pep_flag:
        score += 20
    if customer.risk_rating == "HIGH":
        score += 15
    if txn.is_suspicious:
        score = min(100.0, score + 35)
    return round(min(score, 100.0), 2)

def other_account(accounts: list[Account], exclude_id: str) -> Account:
    filtered = [a for a in accounts if a.account_id != exclude_id]
    return random.choice(filtered)

def read_csv(name, cls):
    obj = s3.get_object(Bucket=BUCKET, Key=PREFIX+name)
    data = obj["Body"].read().decode()
    reader = csv.DictReader(io.StringIO(data))
    return [cls(**r) for r in reader]

# ===========================================================
# NORMAL TRANSACTION GENERATOR
# ===========================================================

def build_normal_transaction(
    accounts:  list[Account],
    cust_map:  dict,
) -> Transaction:
    src = random.choice(accounts)
    dst = other_account(accounts, src.account_id)
    # Realistic amount distribution: mostly small, occasionally large
    roll = random.random()
    if   roll < 0.60: amount = round(random.uniform(5,      500),    2)
    elif roll < 0.88: amount = round(random.uniform(500,    5_000),   2)
    elif roll < 0.97: amount = round(random.uniform(5_000,  25_000),  2)
    else:             amount = round(random.uniform(25_000, 100_000), 2)

    loc_city, loc_cc = rand_location()
    txn_type = random.choice(TXN_TYPES)
    ts       = datetime.now(timezone.utc)
    cust     = cust_map.get(src.customer_id)

    txn = Transaction(
        transaction_id    = "T-" + uid(),
        timestamp         = fmt(ts),
        sender_account    = src.account_id,
        receiver_account  = dst.account_id,
        sender_customer   = src.customer_id,
        receiver_customer = dst.customer_id,
        amount            = amount,
        currency          = src.currency,
        transaction_type  = txn_type,
        merchant_category = random.choice(MERCHANT_CATEGORIES),
        location_city     = loc_city,
        location_country  = loc_cc,
        device_used       = random.choice(DEVICES),
        country_origin    = src.country_code,
        country_dest      = dst.country_code,
        is_suspicious     = False,
        aml_pattern       = "NONE",
    )
    txn.alert_score = compute_alert_score(txn, cust) if cust else 0.0
    return txn

# ===========================================================
# AML PATTERN GENERATORS
# Each returns a list[Transaction] (patterns span multiple records)
# ===========================================================

def _make_txn(src: Account, dst: Account, amount: float,
                txn_type: str, ts: datetime, pattern: str,
                cust_map: dict, merchant: str = None, device: str = None,
                loc=None) -> Transaction:
    """Internal factory — builds a suspicious Transaction."""
    if loc is None:
        loc = rand_location(high_risk=True)
    city, cc = loc
    cust = cust_map.get(src.customer_id)
    txn = Transaction(
        transaction_id    = "T-" + uid(),
        timestamp         = fmt(ts),
        sender_account    = src.account_id,
        receiver_account  = dst.account_id,
        sender_customer   = src.customer_id,
        receiver_customer = dst.customer_id,
        amount            = round(amount, 2),
        currency          = "USD",
        transaction_type  = txn_type,
        merchant_category = merchant or random.choice(HIGH_RISK_MERCHANT),
        location_city     = city,
        location_country  = cc,
        device_used       = device or random.choice(["mobile", "web"]),
        country_origin    = src.country_code,
        country_dest      = dst.country_code,
        is_suspicious     = True,
        aml_pattern       = pattern,
    )
    txn.alert_score = compute_alert_score(txn, cust) if cust else 75.0
    if cust:
        cust.is_suspicious = True
    return txn


def gen_structuring(accounts, cust_map, n_clusters=40) -> list[Transaction]:
    """Multiple deposits just below $10k CTR threshold (smurfing)."""
    txns = []
    for _ in range(n_clusters):
        dst = random.choice(accounts)
        # Build a fake external "sender" account placeholder
        src = random.choice([a for a in accounts if a.account_id != dst.account_id])
        base_ts = datetime.now(timezone.utc) - timedelta(minutes=random.randint(5, 30))
        for i in range(random.randint(3, 8)):
            amount = random.uniform(8_500, 9_950)
            ts     = base_ts + timedelta(minutes=i * random.randint(5, 30))
            txns.append(_make_txn(src, dst, amount, "CASH_DEPOSIT", ts,
                                    "STRUCTURING", cust_map, device="atm",
                                    loc=rand_location(high_risk=False)))
    return txns


def gen_layering(accounts, cust_map, n_chains=25) -> list[Transaction]:
    """Large amount cycled through a chain of 3-7 accounts quickly."""
    txns = []
    for _ in range(n_chains):
        chain_len = random.randint(3, 7)
        chain     = random.sample(accounts, min(chain_len, len(accounts)))
        amount    = random.uniform(20_000, 250_000)
        base_ts = datetime.now(timezone.utc) - timedelta(minutes=random.randint(5, 30))
        for i in range(len(chain) - 1):
            ts     = base_ts + timedelta(minutes=random.randint(5, 120))
            amount *= random.uniform(0.85, 0.99)   # small haircut each hop
            txns.append(_make_txn(chain[i], chain[i+1], amount, "WIRE", ts, "LAYERING", cust_map))
            base_ts = ts
    return txns


def gen_round_trip(accounts, cust_map, n=30) -> list[Transaction]:
    """A -> B then B -> A within hours (same or near-same amount)."""
    txns = []
    for _ in range(n):
        acc_a   = random.choice(accounts)
        acc_b   = other_account(accounts, acc_a.account_id)
        amount  = random.uniform(10_000, 100_000)
        base_ts = datetime.now(timezone.utc) - timedelta(minutes=random.randint(5, 30))
        txns.append(_make_txn(acc_a, acc_b, amount, "WIRE", base_ts, "ROUND_TRIP", cust_map))
        return_ts = base_ts + timedelta(minutes=random.randint(30, 180))
        txns.append(_make_txn(acc_b, acc_a, amount * random.uniform(0.92, 0.99), "WIRE", return_ts, "ROUND_TRIP", cust_map))
    return txns


def gen_shell_company(accounts, customers, cust_map, n=25) -> list[Transaction]:
    """Route funds in and out of shell-company accounts."""
    shell_accs = [
        a for a in accounts
        if cust_map.get(a.customer_id)
        and cust_map[a.customer_id].business_type == "SHELL_COMPANY"
    ]
    if not shell_accs:
        return []
    txns = []
    for _ in range(n):
        shell   = random.choice(shell_accs)
        extern  = other_account(accounts, shell.account_id)
        amount  = random.uniform(50_000, 500_000)
        base_ts = datetime.now(timezone.utc) - timedelta(minutes=random.randint(5, 30))

        # money in
        txns.append(_make_txn(extern, shell, amount, "WIRE", base_ts, "SHELL_COMPANY", cust_map, merchant="real_estate"))

        # money out (slightly different amount to obscure)
        out_ts = base_ts + timedelta(days=random.randint(1, 4))
        txns.append(_make_txn(shell, extern, amount * random.uniform(0.9, 1.05),
                                "WIRE", out_ts, "SHELL_COMPANY", cust_map,
                                merchant="consulting"))
    return txns


def gen_trade_based(accounts, cust_map, n=25) -> list[Transaction]:
    """Over/under-invoicing: payment amount diverges wildly from invoice."""
    txns = []
    for _ in range(n):
        src    = random.choice(accounts)
        dst    = other_account(accounts, src.account_id)
        invoice = random.uniform(5_000, 50_000)
        factor  = random.choice([
            random.uniform(3.0, 10.0),    # over-invoicing
            random.uniform(0.05, 0.25),   # under-invoicing
        ])
        actual = invoice * factor
        ts = datetime.now(timezone.utc) - timedelta(minutes=random.randint(5, 30))
        txn    = _make_txn(src, dst, actual, "TRADE_PAYMENT", ts,
                            "TRADE_BASED", cust_map, merchant="real_estate")
        # embed declared vs actual in a description field via location_city hack
        # (reuse location_city as extra context — purely for analyst review)
        txns.append(txn)
    return txns


def gen_large_rapid(accounts, cust_map, n=30) -> list[Transaction]:
    """Single large wire to a high-risk jurisdiction — classic placement."""
    txns = []
    for _ in range(n):
        src = random.choice(accounts)
        dst = other_account(accounts, src.account_id)
        amount = random.uniform(50_000, 600_000)
        ts = datetime.now(timezone.utc) - timedelta(minutes=random.randint(5, 30))
        txns.append(_make_txn(src, dst, amount, "WIRE", ts,
                                "LARGE_RAPID", cust_map,
                                loc=rand_location(high_risk=True)))
    return txns


def gen_high_velocity(accounts, cust_map, n_bursts=25) -> list[Transaction]:
    """Burst of 8-15 payments from one account within 30 minutes."""
    txns = []
    for _ in range(n_bursts):
        src     = random.choice(accounts)
        base_ts = datetime.now(timezone.utc) - timedelta(minutes=random.randint(5, 30))
        for i in range(random.randint(8, 15)):
            dst = other_account(accounts, src.account_id)
            ts  = base_ts + timedelta(minutes=i * 2)
            txns.append(_make_txn(src, dst, random.uniform(100, 3_000),
                                    random.choice(["PAYMENT", "WIRE"]), ts,
                                    "HIGH_VELOCITY", cust_map, device="mobile",
                                    loc=rand_location(high_risk=False)))
    return txns


def gen_impossible_travel(accounts, cust_map, n=25) -> list[Transaction]:
    """Same account transacts in two geographically impossible cities minutes apart."""
    DISTANT_PAIRS = [
        (("New York",    "US"), ("Singapore",      "SG")),
        (("London",      "GB"), ("Sydney",          "AU")),
        (("Los Angeles", "US"), ("Tokyo",           "JP")),
        (("Miami",       "US"), ("Hong Kong",       "HK")),
        (("Frankfurt",   "DE"), ("New York",        "US")),
    ]
    txns = []
    for _ in range(n):
        src     = random.choice(accounts)
        base_ts = datetime.now(timezone.utc) - timedelta(minutes=random.randint(5, 30))
        loc_a, loc_b = random.choice(DISTANT_PAIRS)
        for loc in (loc_a, loc_b):
            dst = other_account(accounts, src.account_id)
            ts  = base_ts + timedelta(minutes=random.randint(5, 20))
            txns.append(_make_txn(src, dst, random.uniform(200, 5_000),
                                    "PAYMENT", ts, "IMPOSSIBLE_TRAVEL",
                                    cust_map, device="pos", loc=loc))
            base_ts = ts
    return txns

# ===========================================================
# S3 HELPERS
# ===========================================================

def publish_to_kinesis(transactions: list[Transaction]) -> dict:
    """
    Publish transactions to Kinesis in batches of 500 (put_records limit).
    Partition key = sender_customer so one customer's txs land on the
    same shard in order — important for stateful AML rules downstream.
    """
    if not transactions:
        return {"published": 0, "failed": 0}

    total_ok, total_failed = 0, 0

    for i in range(0, len(transactions), 500):
        batch = transactions[i:i + 500]
        records = [
            {
                "Data": json.dumps(asdict(tx), default=str).encode("utf-8"),
                "PartitionKey": tx.sender_customer,
            }
            for tx in batch
        ]
        resp = kinesis.put_records(StreamName=KINESIS_STREAM, Records=records)
        failed_count = resp.get("FailedRecordCount", 0)

        if failed_count:
            # Retry only the failed records once
            retry = [
                records[j] for j, r in enumerate(resp["Records"])
                if "ErrorCode" in r
            ]
            retry_resp = kinesis.put_records(
                StreamName=KINESIS_STREAM, Records=retry
            )
            total_failed += retry_resp.get("FailedRecordCount", 0)

        total_ok += len(batch) - failed_count

    return {"published": total_ok, "failed": total_failed}

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
    base, ext = os.path.splitext(name)
    folder_path = f"{folder}/" if folder else ""

    if partition_by_date:
        date_partition = now.strftime("%Y-%m-%d")           # 2026-04-27
        time_suffix    = now.strftime("%H-%M-%S-%f")        # 13-52-11-358152
        key = f"{PREFIX}{folder_path}dt={date_partition}/{base}_{time_suffix}{ext}"
    else:
        timestamp = now.strftime("%Y-%m-%d_%H-%M-%S-%f")
        key = f"{PREFIX}{folder_path}{base}_{timestamp}{ext}"

    s3.put_object(Bucket=BUCKET, Key=key, Body=buf.getvalue())

def get_latest_s3_key(prefix, base_name):
    paginator = s3.get_paginator("list_objects_v2")
    base = os.path.splitext(base_name)[0]
    matching = []
    for page in paginator.paginate(Bucket=BUCKET, Prefix=prefix):
        for obj in page.get("Contents", []):
            if os.path.basename(obj["Key"]).startswith(base):
                matching.append(obj)
    if not matching:
        raise FileNotFoundError(f"No matching objects for {base_name} in {prefix}")
    latest = max(matching, key=lambda o: o["LastModified"])
    return latest["Key"]

def read_latest_csv(base_name, cls, folder=""):
    folder_path = f"{folder}/" if folder else ""
    key = get_latest_s3_key(f"{PREFIX}{folder_path}", base_name)
    obj = s3.get_object(Bucket=BUCKET, Key=key)
    data = obj["Body"].read().decode()
    reader = csv.DictReader(io.StringIO(data))
    return [cls(**r) for r in reader]

# ===========================================================
# LAMBDA HANDLER
# ===========================================================

def lambda_handler(event, context):

    customers = read_latest_csv("customers.csv", Customer, folder="customers")
    accounts  = read_latest_csv("accounts.csv", Account, folder="accounts")

    cust_map  = {c.customer_id: c for c in customers}

    normal_txns = [
        build_normal_transaction(accounts, cust_map)
        for _ in range(NUM_NORMAL_TXN)
    ]

    suspicious_txns = []
    suspicious_txns += gen_structuring(accounts, cust_map, 2)
    suspicious_txns += gen_layering(accounts, cust_map, 2)
    suspicious_txns += gen_round_trip(accounts, cust_map, 2)
    suspicious_txns += gen_shell_company(accounts, customers, cust_map, 1)
    suspicious_txns += gen_trade_based(accounts, cust_map, 2)
    suspicious_txns += gen_large_rapid(accounts, cust_map, 2)
    suspicious_txns += gen_high_velocity(accounts, cust_map, 1)
    suspicious_txns += gen_impossible_travel(accounts, cust_map, 2)

    all_txns = normal_txns + suspicious_txns
    random.shuffle(all_txns)

    upload_csv(all_txns, "transactions.csv", folder="transactions", partition_by_date=True)

    # NEW — stream to Kinesis for real-time detection
    kinesis_result = publish_to_kinesis(all_txns)

    return {
        "status": "transactions generated",
        "total_txns": len(all_txns),
        "kinesis": kinesis_result,
    }