# aml-system

The cloud-native AML pipeline. This folder contains everything that runs on AWS plus the React dashboard that consumes its output.

## Contents

```
aml-system/
├── data-generators/          Lambda source for entity, transaction, and alert generation
├── ingestion/                Kinesis consumer Lambda (real-time AML detection)
├── pipelines/                Step Functions state machine definitions
├── frontend/                 React + TypeScript dashboard (SENTINEL UI)
├── ml/                       Reserved for future ML-based scoring
├── services/                 Shared utility code
└── docs/                     Architecture diagrams, design notes
```

## What gets deployed where

| Component | AWS service | Trigger | Purpose |
|---|---|---|---|
| `Entities-Generator` | Lambda | Step Functions | Generate 300 customers + 450 accounts; write CSV to S3 |
| `GenerateTransactions` | Lambda | Step Functions | Read entities, build 100+ transactions, publish to Kinesis |
| `GenerateAlerts` | Lambda | Step Functions | Batch alerting layer (parallel to real-time path) |
| `AML Consumer` | Lambda | Kinesis stream | Apply 14 AML rules per transaction, write alerts to S3 |
| `aml-pipeline` | Step Functions | EventBridge (every 1 min) | Sequence transaction generation → batch alerting |
| `transactions-data-stream` | Kinesis | — | Real-time event bus |
| `aml-fyp-stream-bucket-...` | S3 | — | Data lake (raw + cleaned partitions) |

## AWS provisioning steps

The infrastructure is created manually in the AWS console (no IaC for the FYP submission). High-level order:

### 1. S3 bucket

Create a bucket in `eu-north-1` named `aml-fyp-stream-bucket-<account_id>-eu-north-1-an`. No prefix structure to create — Lambdas will write under `aml-data/` automatically.

### 2. Kinesis Data Stream

- Name: `transactions-data-stream`
- Capacity mode: On-demand
- Retention: 24 hours

### 3. IAM roles

Create three roles:

- `LambdaEntityGeneratorRole` — `AmazonS3FullAccess` + basic Lambda execution
- `LambdaTransactionsRole` — `AmazonS3FullAccess` + `AmazonKinesisFullAccess` + basic Lambda execution
- `LambdaConsumerRole` — same as above, plus `AmazonDynamoDBFullAccess` if stateful rules use DynamoDB

### 4. Lambdas

For each Lambda in `data-generators/` and `ingestion/`:

- Runtime: Python 3.11
- Handler: `lambda_function.lambda_handler`
- Timeout: 60 seconds
- Memory: 512 MB
- Environment variables:
  - `BUCKET_NAME` = your bucket name
  - `S3_PREFIX` = `aml-data/`
  - `KINESIS_STREAM_NAME` = `transactions-data-stream` (only for transaction generator)

Upload the source code as a ZIP or paste directly into the console.

### 5. EventBridge schedules

Scheduled rules:

| Rule name | Schedule | Target |
|---|---|---|
| `AML-pipeline-scheduler` | `rate(1 minute)` | `aml-pipeline` Step Function |

### 6. Step Functions

Create a state machine called `aml-pipeline` from the JSON definition in `pipelines/`. It runs `GenerateEntities` then `GenerateTransactions` then `GenerateAlerts` sequentially.

### 7. Kinesis trigger

Add the consumer Lambda as a Kinesis consumer:

- Source: `transactions-data-stream`
- Batch size: 100
- Starting position: `LATEST`

### 8. Glue Data Catalog

Create database `aml_db` and four crawlers (one per dataset). Each crawler points at one S3 prefix and writes to `aml_db`. Set schedule to **On demand** during development, **Hourly** for production.

| Crawler | S3 path | Output table |
|---|---|---|
| `aml-customers-crawler` | `aml-data/customers/` | `customers` |
| `aml-accounts-crawler` | `aml-data/accounts/` | `accounts` |
| `aml-transactions-crawler` | `aml-data/transactions/` | `transactions` |
| `aml-alerts-realtime-crawler` | `aml-data/alerts/realtime/` | `realtime` |

### 9. Athena cleaned views

After crawlers run, execute the SQL in `docs/sql/views.sql` to create the five cleaned views (`customers_clean`, `accounts_clean`, `transactions_clean`, `alerts_clean`, `alerts_enriched`).

The cleaned views handle:

- CSV string-to-boolean casting for `pep_flag` and `is_suspicious`
- ISO-string-to-`TIMESTAMP` parsing for date fields
- Filtering out invalid rows (negative amounts, self-transfers, future dates)
- Deduplicating customer snapshots to latest only
- Pre-joining alerts × customers × transactions

## Running it end-to-end

1. Confirm both EventBridge rules are **enabled** (turn them on for demos, off otherwise to save costs)
2. Wait ~5 minutes for the first cycle: customers + accounts → S3 → transactions → Kinesis → alerts → S3
3. Re-run the Glue crawlers (or wait if scheduled hourly)
4. Open Athena query editor against `aml_db`, run a quick check:
   ```sql
   SELECT COUNT(*) FROM aml_db.alerts_clean;
   ```

## Costs

All services used are within the AWS free tier for the load this project generates (a few thousand events per hour). Anticipate ~\$0–2/month if scheduler is left running 24/7. Turn schedulers off when not actively demoing.

## Subfolder docs

Each subfolder has its own README:

- [`data-generators/README.md`](./data-generators/README.md)
- [`ingestion/README.md`](./ingestion/README.md)
- [`pipelines/README.md`](./pipelines/README.md)
- [`frontend/README.md`](./frontend/README.md)
