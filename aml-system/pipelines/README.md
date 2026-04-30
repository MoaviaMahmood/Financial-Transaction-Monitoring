# pipelines

AWS Step Functions state machine definitions that orchestrate the data generation Lambdas.

## File

`aml-pipeline.json` (or `aml-pipeline.yaml`) — the Amazon States Language definition for the `aml-pipeline` state machine.

## What it orchestrates

```
START
  │
  ▼
Entities-Generator (Lambda Invoke)
  │
  ▼
GenerateTransactions (Lambda Invoke)
  │
  ▼
GenerateAlerts (Lambda Invoke)
  │
  ▼
END
```
<img width="448" height="512" alt="Image" src="https://github.com/user-attachments/assets/0312c13d-e0fc-4bff-8a3d-8a46d60a2e64" />

Two Lambdas in sequence. Could have been one Lambda calling another, but Step Functions adds:

- **Visibility** — the AWS console shows each step's status, duration, and input/output for each run
- **Error handling** — built-in retry logic per step
- **Audit trail** — every execution is logged with full input/output history
- **No code coupling** — the two Lambdas don't import each other; the orchestrator wires them

## Trigger

Invoked by EventBridge rule `AML-pipeline-scheduler` every 1 minute. The schedule fires the state machine; the state machine invokes the Lambdas.

## Why every minute

A balance between:

- **Realism** — too slow (e.g., hourly) doesn't feel "real-time"
- **Cost** — too fast (e.g., every 10 seconds) burns Lambda invocations and Kinesis records
- **Demo pacing** — 1 minute means a fresh batch arrives every refresh cycle of the dashboard

For a production AML system, transactions would arrive on their own (no scheduled generator) and the Step Function wouldn't exist. This is purely a synthetic-data scaffold for the FYP.

## Required IAM permissions

The Step Functions execution role needs `lambda:InvokeFunction` for both Lambdas.

## Provisioning via console

1. AWS Console → Step Functions → Create state machine
2. Type: Standard
3. Definition: paste the contents of `aml-pipeline.json`
4. Name: `aml-pipeline`
5. Permissions: create new role (AWS auto-generates one with the right Lambda invoke perms)
6. Save

Then create the EventBridge rule that targets it:

1. EventBridge → Schedules → Create
2. Schedule: `rate(1 minute)`
3. Target: AWS service → Step Functions → `aml-pipeline`
4. Permissions: create new role

## Sample definition (Amazon States Language)

```json
{
    "Comment": "AML Data Generation Pipeline",
    "StartAt": "Entities",
    "States": {
        "Entities": {
            "Type": "Task",
            "Resource": "arn:aws:states:::lambda:invoke",
            "OutputPath": "$.Payload",
            "Parameters": {
                "Payload.$": "$",
                "FunctionName": "arn:aws:lambda:eu-north-1:<account>:function:Entities-Generator:$LATEST"
            },
            "Retry": [
                {
                    "ErrorEquals": [
                        "Lambda.ServiceException",
                        "Lambda.AWSLambdaException",
                        "Lambda.SdkClientException",
                        "Lambda.TooManyRequestsException"
                    ],
                    "IntervalSeconds": 1,
                    "MaxAttempts": 3,
                    "BackoffRate": 2,
                    "JitterStrategy": "FULL"
                }
            ],
            "Next": "GenerateTransactions"
        },
        "GenerateTransactions": {
            "Type": "Task",
            "Resource": "arn:aws:lambda:eu-north-1:<account>:function:Transactions-Generator:$LATEST",
            "TimeoutSeconds": 120,
            "Next": "GenerateAlerts"
        },
        "GenerateAlerts": {
            "Type": "Task",
            "Resource": "arn:aws:lambda:eu-north-1:<account>:function:Alerts-Generator:$LATEST",
            "TimeoutSeconds": 60,
            "End": true
        }
    }
}
```

Replace `<account>` with your AWS account ID.
