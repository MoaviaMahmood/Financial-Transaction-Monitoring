-- =============================================================================
-- evaluation_dataset.sql
-- =============================================================================
-- Purpose: Build a single row-per-transaction view that joins ground truth
--          (from transactions_clean) to predictions (from alerts_clean), so
--          the evaluation notebook can compute precision / recall / F1 / ROC.
--
-- Output : One row per transaction with the following columns:
--   transaction_id          : unique transaction identifier
--   timestamp               : when the transaction occurred
--   amount                  : transaction amount (for slicing later)
--   sender_customer         : customer who initiated the tx
--   is_suspicious_truth     : ground-truth label from the generator (BOOLEAN)
--   aml_pattern_truth       : the pattern the generator stamped (e.g. STRUCTURING),
--                             NULL for legitimate transactions
--   was_flagged             : did ANY of the 14 rules fire on this tx? (BOOLEAN)
--   num_alerts              : how many rules fired (0 if none)
--   max_alert_score         : highest severity score across firing rules (0..100,
--                             0 if not flagged) -- this is the continuous classifier
--                             score used for the ROC curve
--   fired_rules             : array of rule names that fired (empty if none)
--
-- Run this once in the Athena query editor (workgroup: primary, database: aml_db).
-- Re-run whenever you want a fresh evaluation snapshot.
-- =============================================================================

CREATE OR REPLACE VIEW aml_db.evaluation_dataset AS
WITH
    alerts_agg
    AS
    (
        -- Roll up the alerts table so each transaction has at most one row.
        -- A transaction can trigger multiple rules; we want the count, the max
        -- severity, and the list of rule names that fired.
        SELECT
            transaction_id,
            COUNT(*)                          AS num_alerts,
            MAX(CAST(alert_score AS DOUBLE))  AS max_alert_score,
            ARRAY_AGG(alert_type)             AS fired_rules
        FROM aml_db.alerts_clean
        WHERE transaction_id IS NOT NULL
        GROUP BY transaction_id
    )
SELECT
    t.transaction_id,
    t.timestamp,
    t.amount,
    t.sender_customer,
    -- Ground truth from the generator
    t.is_suspicious                                 AS is_suspicious_truth,
    t.aml_pattern                                   AS aml_pattern_truth,
    -- Predictions from the AML consumer
    (a.transaction_id IS NOT NULL)                  AS was_flagged,
    COALESCE(a.num_alerts,        0)                AS num_alerts,
    COALESCE(a.max_alert_score,   0.0)              AS max_alert_score,
    COALESCE(a.fired_rules,       ARRAY[] )          AS fired_rules
FROM aml_db.transactions_clean t
LEFT JOIN alerts_agg a
       ON a.transaction_id = t.transaction_id;


-- =============================================================================
-- SANITY CHECKS
-- Run these AFTER creating the view to validate the join worked correctly.
-- Save the screenshots; they're useful evidence for Section 10.4.1 of the report.
-- =============================================================================

-- Check 1: total rows == number of transactions in transactions_clean
-- If these don't match, the LEFT JOIN duplicated rows somewhere.
SELECT
    (SELECT COUNT(*)
    FROM aml_db.transactions_clean) AS tx_count,
    (SELECT COUNT(*)
    FROM aml_db.evaluation_dataset)AS eval_count;

-- Check 2: ground-truth distribution -- how balanced is the dataset?
-- Realistic AML datasets are heavily imbalanced (suspicious << legitimate).
SELECT
    is_suspicious_truth,
    COUNT(*) AS count,
    ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) AS pct
FROM aml_db.evaluation_dataset
GROUP BY is_suspicious_truth;

-- Check 3: confusion-matrix preview (the four cells precision/recall need)
SELECT
    is_suspicious_truth,
    was_flagged,
    COUNT(*) AS n
FROM aml_db.evaluation_dataset
GROUP BY is_suspicious_truth, was_flagged
ORDER BY is_suspicious_truth, was_flagged;

-- Check 4: per-pattern recall preview (what fraction of each pattern is caught)
SELECT
    aml_pattern_truth,
    COUNT(*) AS total,
    SUM(CASE WHEN was_flagged THEN 1 ELSE 0 END) AS flagged,
    ROUND(100.0 * SUM(CASE WHEN was_flagged THEN 1 ELSE 0 END)
                / COUNT(*), 2) AS recall_pct
FROM aml_db.evaluation_dataset
WHERE is_suspicious_truth = TRUE
GROUP BY aml_pattern_truth
ORDER BY recall_pct DESC;

-- Check 5: alert-score distribution among flagged transactions
-- This is the data the ROC curve will sweep over.
SELECT
    CASE
        WHEN max_alert_score = 0    THEN '0  (not flagged)'
        WHEN max_alert_score < 50   THEN '01-49'
        WHEN max_alert_score < 70   THEN '50-69'
        WHEN max_alert_score < 85   THEN '70-84'
        WHEN max_alert_score < 100  THEN '85-99'
        ELSE                              '100'
    END AS score_bucket,
    COUNT(*) AS n
FROM aml_db.evaluation_dataset
GROUP BY 1
ORDER BY 1;