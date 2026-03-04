import sys
import uuid
import random
import json
import csv
import os
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict

# Windows console safety
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

# ===========================================================
# CONFIGURATION  — tweak these to resize the dataset
# ===========================================================
random.seed(42)

NUM_CUSTOMERS      = 300
NUM_ACCOUNTS       = 450     # ~1.5 accounts per customer on average
NUM_NORMAL_TXN     = 8_000
SUSPICIOUS_RATIO   = 0.08    # 8% of total transactions will be suspicious

REPORTING_THRESHOLD = 10_000  # USD — CTR filing threshold
START_DATE          = datetime(2023, 1, 1)
END_DATE            = datetime(2023, 12, 31)

OUTPUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "output")

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
    name:          str
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

def rand_date(start: datetime, end: datetime) -> datetime:
    delta = int((end - start).total_seconds())
    return start + timedelta(seconds=random.randint(0, delta))

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

# ===========================================================
# ENTITY GENERATORS
# ===========================================================

def generate_customers(n: int) -> list[Customer]:
    customers = []
    for _ in range(n):
        city, cc = rand_location()
        btype    = random.choice(BUSINESS_TYPES)
        pep      = random.random() < 0.05
        customers.append(Customer(
            customer_id   = "C-" + uid(),
            name          = rand_name(),
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
    ts       = rand_date(START_DATE, END_DATE)
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
        base_ts = rand_date(START_DATE, END_DATE - timedelta(hours=48))
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
        base_ts   = rand_date(START_DATE, END_DATE - timedelta(hours=12))
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
        base_ts = rand_date(START_DATE, END_DATE - timedelta(hours=6))
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
        base_ts = rand_date(START_DATE, END_DATE - timedelta(days=5))

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
        ts     = rand_date(START_DATE, END_DATE)
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
        ts     = rand_date(START_DATE, END_DATE)
        txns.append(_make_txn(src, dst, amount, "WIRE", ts,
                                "LARGE_RAPID", cust_map,
                                loc=rand_location(high_risk=True)))
    return txns


def gen_high_velocity(accounts, cust_map, n_bursts=25) -> list[Transaction]:
    """Burst of 8-15 payments from one account within 30 minutes."""
    txns = []
    for _ in range(n_bursts):
        src     = random.choice(accounts)
        base_ts = rand_date(START_DATE, END_DATE - timedelta(minutes=30))
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
        base_ts = rand_date(START_DATE, END_DATE - timedelta(minutes=30))
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
# ALERT GENERATOR
# ===========================================================

def generate_alerts(
    transactions: list[Transaction],
    acc_to_cust:  dict,
) -> list[Alert]:
    alerts = []
    for txn in transactions:
        if txn.alert_score >= 50 or txn.is_suspicious:
            cust_id = acc_to_cust.get(txn.sender_account, "UNKNOWN")
            status  = random.choices(
                ["OPEN", "REVIEWED", "ESCALATED", "CLOSED"],
                weights=[40, 25, 20, 15], k=1
            )[0]
            alerts.append(Alert(
                alert_id       = "ALT-" + uid(),
                transaction_id = txn.transaction_id,
                customer_id    = cust_id,
                alert_type     = txn.aml_pattern if txn.aml_pattern != "NONE" else "HIGH_RISK_TXN",
                alert_score    = txn.alert_score,
                created_at     = txn.timestamp,
                status         = status,
                notes          = (
                    f"Auto alert | pattern={txn.aml_pattern} "
                    f"| score={txn.alert_score} | type={txn.transaction_type}"
                ),
            ))
    return alerts

# ===========================================================
# OUTPUT WRITERS
# ===========================================================

def write_csv(data: list, filename: str):
    if not data:
        return
    path = os.path.join(OUTPUT_DIR, filename)
    rows = [asdict(d) for d in data]
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=rows[0].keys())
        writer.writeheader()
        writer.writerows(rows)
    size_kb = os.path.getsize(path) / 1024
    print(f"  [CSV]  {filename:<35} {len(rows):>6} rows   {size_kb:>8.1f} KB")


def write_json(data: list, filename: str):
    path = os.path.join(OUTPUT_DIR, filename)
    with open(path, "w", encoding="utf-8") as f:
        json.dump([asdict(d) for d in data], f, indent=2)
    size_kb = os.path.getsize(path) / 1024
    print(f"  [JSON] {filename:<35} {len(data):>6} records {size_kb:>8.1f} KB")


def write_labels(transactions: list[Transaction]):
    """Standalone ML ground-truth label file."""
    labels  = {
        t.transaction_id: t.aml_pattern
        for t in transactions if t.is_suspicious
    }
    summary: dict = {}
    for v in labels.values():
        summary[v] = summary.get(v, 0) + 1
    output = {
        "total_transactions": len(transactions),
        "total_suspicious":   len(labels),
        "suspicious_ratio":   round(len(labels) / len(transactions), 4),
        "pattern_summary":    summary,
        "labels":             labels,
    }
    path = os.path.join(OUTPUT_DIR, "suspicious_labels.json")
    with open(path, "w", encoding="utf-8") as f:
        json.dump(output, f, indent=2)
    size_kb = os.path.getsize(path) / 1024
    print(f"  [JSON] {'suspicious_labels.json':<35} {len(labels):>6} labels  {size_kb:>8.1f} KB")


def print_summary(customers, accounts, transactions, alerts):
    susp   = [t for t in transactions if t.is_suspicious]
    counts: dict = {}
    for t in susp:
        counts[t.aml_pattern] = counts.get(t.aml_pattern, 0) + 1

    print()
    print("=" * 60)
    print("     AML SYNTHETIC DATASET — FINAL SUMMARY")
    print("=" * 60)
    print(f"    Customers           : {len(customers):>6}")
    print(f"        HIGH risk       : {sum(1 for c in customers if c.risk_rating=='HIGH'):>6}")
    print(f"        PEP flagged     : {sum(1 for c in customers if c.pep_flag):>6}")
    print(f"        Flagged susp.   : {sum(1 for c in customers if c.is_suspicious):>6}")
    print(f"    Accounts            : {len(accounts):>6}")
    print(f"    Transactions        : {len(transactions):>6}")
    print(f"        Normal          : {len(transactions)-len(susp):>6}")
    print(f"        Suspicious      : {len(susp):>6}  ({100*len(susp)/len(transactions):.1f}%)")
    print(f"    Alerts              : {len(alerts):>6}")
    print()
    print("Pattern breakdown:")
    for pat, cnt in sorted(counts.items(), key=lambda x: -x[1]):
        bar = "#" * max(1, cnt // 8)
        print(f"    {pat:<25} {cnt:>4}  {bar}")
    print("=" * 60)

# ===========================================================
# MAIN
# ===========================================================

def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    print(f"\n[+] AML Synthetic Data Generator")
    print(f"    Output directory : {OUTPUT_DIR}")
    print(f"    Date range       : {START_DATE.date()} -> {END_DATE.date()}")
    print(f"    Customers        : {NUM_CUSTOMERS}")
    print(f"    Accounts         : {NUM_ACCOUNTS}")
    print(f"    Normal txns      : {NUM_NORMAL_TXN}")
    print(f"    Suspicious ratio : {SUSPICIOUS_RATIO*100:.0f}%\n")

    # ── Entities ──────────────────────────────────────────
    print("[1/4] Generating customers and accounts...")
    customers = generate_customers(NUM_CUSTOMERS)
    accounts  = generate_accounts(customers, NUM_ACCOUNTS)
    cust_map  = {c.customer_id: c for c in customers}
    acc_to_cust = {a.account_id: a.customer_id for a in accounts}

    # ── Normal transactions ────────────────────────────────
    print("[2/4] Generating normal transactions...")
    normal_txns = [
        build_normal_transaction(accounts, cust_map)
        for _ in range(NUM_NORMAL_TXN)
    ]

    # ── Suspicious / AML patterns ─────────────────────────
    print("[3/4] Injecting AML patterns...")
    suspicious_txns: list[Transaction] = []
    suspicious_txns += gen_structuring(accounts, cust_map,           n_clusters=40)
    suspicious_txns += gen_layering(accounts, cust_map,               n_chains=25)
    suspicious_txns += gen_round_trip(accounts, cust_map,             n=30)
    suspicious_txns += gen_shell_company(accounts, customers, cust_map, n=25)
    suspicious_txns += gen_trade_based(accounts, cust_map,            n=25)
    suspicious_txns += gen_large_rapid(accounts, cust_map,            n=30)
    suspicious_txns += gen_high_velocity(accounts, cust_map,          n_bursts=25)
    suspicious_txns += gen_impossible_travel(accounts, cust_map,      n=25)

    all_txns = normal_txns + suspicious_txns
    random.shuffle(all_txns)

    # Trim/pad suspicious count to match SUSPICIOUS_RATIO exactly
    target_susp = int(len(all_txns) * SUSPICIOUS_RATIO)
    actual_susp = sum(1 for t in all_txns if t.is_suspicious)
    print(f"    Suspicious transactions generated: {actual_susp}")

    # ── Alerts ─────────────────────────────────────────────
    print("[4/4] Generating alerts...")
    alerts = generate_alerts(all_txns, acc_to_cust)

    # ── Write outputs ──────────────────────────────────────
    print(f"\n[+] Writing output files to {OUTPUT_DIR}\n")
    write_csv(customers,  "customers.csv")
    write_csv(accounts,   "accounts.csv")
    write_csv(all_txns,   "transactions.csv")
    write_csv(alerts,     "alerts.csv")
    print()
    write_json(customers, "customers.json")
    write_json(accounts,  "accounts.json")
    write_json(all_txns,  "transactions.json")
    write_json(alerts,    "alerts.json")
    write_labels(all_txns)

    print_summary(customers, accounts, all_txns, alerts)
    print(f"\n[OK] Done. All files saved to:\n  {OUTPUT_DIR}\n")


if __name__ == "__main__":
    main()