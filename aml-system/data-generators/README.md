# AML Synthetic Data Generator
A comprehensive, realistic synthetic data generator for Anti-Money Laundering (AML) systems. Creates ML-ready datasets with customers, accounts, transactions, and alerts, including 8 distinct money laundering patterns.

## Features

- Complete entity generation: Customers (with risk profiles), Accounts, Transactions, and Alerts
- 8 AML patterns: Structuring, Layering, Round-Trip, Shell Company, Trade-Based, Large Rapid, High Velocity, and Impossible Travel
- Multiple output formats: CSV and JSON for all entities
- ML-ready: Includes ground-truth labels for suspicious transactions
- No external dependencies: Pure Python standard library

## Generated Data
### Entities
- Customers: Demographics, risk ratings (LOW/MEDIUM/HIGH), PEP flags, business types
- Accounts: Multi-currency, typed (CHECKING/SAVINGS/BUSINESS), linked to customers
- Transactions: Normal + 8 suspicious patterns with timestamps, locations, devices
- Alerts: Scored (0-100), triaged (OPEN/REVIEWED/ESCALATED/CLOSED), linked to transactions

### AML Patterns
``` bash
|   AML Pattern     | Description                                                  |
| ----------------- | ------------------------------------------------------------ |
| STRUCTURING       | Multiple deposits just below $10k CTR threshold (smurfing)   |
| LAYERING          | Funds cycled through 3–7 accounts quickly                    |
| ROUND_TRIP        | A → B → A loop within hours, similar amounts                 |
| SHELL_COMPANY     | Routing through shell company accounts                       |
| TRADE_BASED       | Over/under-invoicing in trade payments                       |
| LARGE_RAPID       | Single large wire to high-risk jurisdiction                  |
| HIGH_VELOCITY     | Burst of 8–15 payments within 30 minutes                     |
| IMPOSSIBLE_TRAVEL | Same account transacting in two distant cities minutes apart |
```
## Quick Start
``` bash
# Clone or download the script
python aml_synthetic_data_generator.py
```
Files are generated in ./output/ directory:

- customers.csv / customers.json
- accounts.csv / accounts.json
- transactions.csv / transactions.json
- alerts.csv / alerts.json
- suspicious_labels.json (ML ground-truth)

## Configuration
Edit these parameters at the top of the script:
``` bash
NUM_CUSTOMERS      = 300      # Number of customers
NUM_ACCOUNTS       = 450      # Number of accounts (~1.5 per customer)
NUM_NORMAL_TXN     = 8_000    # Normal transactions
SUSPICIOUS_RATIO   = 0.08     # 8% suspicious transactions
REPORTING_THRESHOLD = 10_000  # CTR filing threshold (USD)
START_DATE         = datetime(2023, 1, 1)
END_DATE           = datetime(2023, 12, 31)
```
## Data Schema
### Customer
``` bash
json
{
  "customer_id": "C-ABC123DEF456",
  "name": "James Smith",
  "country_code": "US",
  "city": "New York",
  "risk_rating": "MEDIUM",
  "business_type": "RETAIL",
  "pep_flag": false,
  "created_date": "2020-03-15T10:30:00Z",
  "is_suspicious": false
}
```
### Account
``` bash
json
{
  "account_id": "ACC00000042",
  "customer_id": "C-ABC123DEF456",
  "account_type": "CHECKING",
  "currency": "USD",
  "balance": 15750.25,
  "opened_date": "2021-06-01T09:15:00Z",
  "country_code": "US",
  "city": "New York",
  "is_active": true
}
```
### Transaction
``` bash
json
{
  "transaction_id": "T-XYZ789UVW012",
  "timestamp": "2023-08-22T14:35:00Z",
  "sender_account": "ACC00000042",
  "receiver_account": "ACC00000123",
  "sender_customer": "C-ABC123DEF456",
  "receiver_customer": "C-DEF789GHI012",
  "amount": 1250.75,
  "currency": "USD",
  "transaction_type": "WIRE",
  "merchant_category": "electronics",
  "location_city": "Chicago",
  "location_country": "US",
  "device_used": "web",
  "country_origin": "US",
  "country_dest": "US",
  "is_suspicious": false,
  "aml_pattern": "NONE",
  "alert_score": 15.5
}
```
### Alert
``` bash
json
{
  "alert_id": "ALT-456DEF789ABC",
  "transaction_id": "T-XYZ789UVW012",
  "customer_id": "C-ABC123DEF456",
  "alert_type": "HIGH_RISK_TXN",
  "alert_score": 75.0,
  "created_at": "2023-08-22T14:35:00Z",
  "status": "OPEN",
  "notes": "Auto alert | pattern=NONE | score=75.0 | type=WIRE"
}
```
## ML Ground Truth Labels
The suspicious_labels.json file contains:
``` bash
json
{
  "total_transactions": 8642,
  "total_suspicious": 687,
  "suspicious_ratio": 0.0795,
  "pattern_summary": {
    "STRUCTURING": 142,
    "LAYERING": 87,
    "ROUND_TRIP": 105,
    "SHELL_COMPANY": 88,
    "TRADE_BASED": 85,
    "LARGE_RAPID": 102,
    "HIGH_VELOCITY": 78,
    "IMPOSSIBLE_TRAVEL": 0
  },
  "labels": {
    "T-ABC123...": "STRUCTURING",
    "T-DEF456...": "LAYERING",
    ...
    }
}
```
## Use Cases
- **Model training**: Train ML models for suspicious transaction detection
- **System testing**: Validate AML monitoring systems with realistic data
- **Demonstrations**: Showcase AML analytics capabilities
- **Benchmarking**: Compare detection algorithms against known patterns

## Customization
**Adding New Patterns**

Extend the generator by adding new pattern functions following the signature:
``` bash
python
def gen_new_pattern(accounts, cust_map, **kwargs) -> list[Transaction]:
    # Generate suspicious transactions
    return transactions
``` 
**Modifying Risk Scoring**

Adjust compute_alert_score() and compute_risk_rating() functions to change risk calculation logic.

**Output Summary**

After generation, you'll see a summary like:
``` bash
============================================================
     AML SYNTHETIC DATASET — FINAL SUMMARY
============================================================
    Customers           :    300
        HIGH risk       :     42
        PEP flagged     :     15
        Flagged susp.   :     87
    Accounts            :    450
    Transactions        :   8642
        Normal          :   7955
        Suspicious      :    687  (7.9%)
    Alerts              :   1245

Pattern breakdown:
    STRUCTURING               142  ##################
    LAYERING                   87  ###########
    ROUND_TRIP                105  #############
    SHELL_COMPANY              88  ###########
    TRADE_BASED                85  ##########
    LARGE_RAPID                102  ############
    HIGH_VELOCITY              78  #########
    IMPOSSIBLE_TRAVEL           0  
============================================================
```
## Requirements
- Python 3.7+
- No external packages required

## License
MIT License - feel free to use, modify, and distribute.

## Notes
- All data is synthetic and does not represent real individuals or financial activity
- Random seed is set to 42 for reproducible generation (change or remove for randomness)
- The generator includes realistic edge cases like PEP flags, high-risk jurisdictions, and sanctioned countries