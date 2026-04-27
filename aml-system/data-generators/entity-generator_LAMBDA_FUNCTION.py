import sys
import uuid
import random
import json
import csv
import os
import boto3
import io
from datetime import datetime, timedelta, timezone
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
# CONFIGURATION
# ===========================================================
random.seed(42)

NUM_CUSTOMERS = 300
NUM_ACCOUNTS = 450
NUM_NORMAL_TXN = 8000
SUSPICIOUS_RATIO = 0.08

REPORTING_THRESHOLD = 10000
START_DATE = datetime(2023, 1, 1)
END_DATE = datetime(2023, 12, 31)

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
    risk_rating:   str   # LOW / MEDIUM / HIGH
    business_type: str
    pep_flag:      bool  # Politically Exposed Person
    created_date:  str
    is_suspicious: bool = False

@dataclass
class Account:
    account_id:    str
    customer_id:   str
    account_type:  str   # CHECKING / SAVINGS / BUSINESS
    currency:      str
    balance:       float
    opened_date:   str
    country_code:  str
    city:          str
    is_active:     bool = True

# ===========================================================
# HELPERS
# ===========================================================

def uid() -> str:
    return str(uuid.uuid4())[:12].upper()

def rand_date(start: datetime, end: datetime) -> datetime:
    delta = int((end - start).total_seconds())
    return start + timedelta(seconds=random.randint(0, delta))

def fmt(dt: datetime) -> str:
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")

def rand_name() -> tuple[str, str]:
    return random.choice(FIRST_NAMES), random.choice(LAST_NAMES)

def rand_location(high_risk: bool = False):
    pool = LOCATIONS_HIGH_RISK if high_risk else ALL_LOCATIONS
    return random.choice(pool)   # (city, country_code)

def other_account(accounts: list[Account], exclude_id: str) -> Account:
    filtered = [a for a in accounts if a.account_id != exclude_id]
    return random.choice(filtered)

# ===========================================================
# RISK RATING CALCULATION
# ===========================================================
SANCTIONED_CODES = {"IR", "KP", "MM", "SY", "YE", "CU", "VE"}
HIGH_RISK_COUNTRY_CODES = {"KY","PA","BS","CY","RU","AE","HK","LV","MT"}  # same as in transactions

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

# ===========================================================
# ENTITY GENERATORS
# ===========================================================

def generate_customers(n: int) -> list[Customer]:
    customers = []
    for _ in range(n):
        city, cc = rand_location()
        btype    = random.choice(BUSINESS_TYPES)
        pep      = random.random() < 0.05
        first_name, last_name = rand_name()  # unpack tuple
        customers.append(Customer(
            customer_id   = "C-" + uid(),
            first_name    = first_name,
            last_name     = last_name,
            country_code  = cc,
            city          = city,
            risk_rating   = compute_risk_rating(cc, btype, pep),
            business_type = btype,
            pep_flag      = pep,
            created_date  = fmt(rand_date(datetime(2015, 1, 1), datetime(2022, 12, 31))),
        ))
    return customers


def generate_accounts(customers: list[Customer], n: int) -> list[Account]:
    accounts = []
    for _ in range(n):
        cust = random.choice(customers)
        accounts.append(Account(
            account_id   = "ACC" + str(len(accounts) + 1).zfill(8),
            customer_id  = cust.customer_id,
            account_type = random.choice(["CHECKING", "SAVINGS", "BUSINESS"]),
            currency     = random.choice(CURRENCIES),
            balance      = round(random.uniform(500, 500_000), 2),
            opened_date  = fmt(rand_date(datetime(2015, 1, 1), datetime(2023, 1, 1))),
            country_code = cust.country_code,
            city         = cust.city,
        ))
    return accounts

# ===========================================================
# UPLOAD TO S3
# ===========================================================
def upload_csv(data, name, partition_by_date=False):
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
    folder = base  # customers / accounts

    if partition_by_date:
        date_partition = now.strftime("%Y-%m-%d")        # 2026-04-27
        time_suffix    = now.strftime("%H-%M-%S-%f")     # 13-48-42-123456
        key = f"{S3_PREFIX}{folder}/dt={date_partition}/{base}_{time_suffix}{ext}"
    else:
        timestamp = now.strftime("%Y-%m-%d_%H-%M-%S")
        key = f"{S3_PREFIX}{folder}/{base}_{timestamp}{ext}"

    s3.put_object(Bucket=S3_BUCKET, Key=key, Body=buf.getvalue())

# ===========================================================
# ULAMBDA HANDLER
# ===========================================================
def lambda_handler(event, context):
    customers = generate_customers(NUM_CUSTOMERS)
    accounts  = generate_accounts(customers, NUM_ACCOUNTS)

    upload_csv(customers, "customers.csv", partition_by_date=True)
    upload_csv(accounts,  "accounts.csv",  partition_by_date=True)

    return {
        "status": "entities generated",
        "customers": len(customers),
        "accounts": len(accounts)
    }