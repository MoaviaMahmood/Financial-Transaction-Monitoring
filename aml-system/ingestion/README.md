``` bash
Kafka Source
     │
     ▼
Deserialize JSON
     │
     ▼
Validation & Filtering
     │
     ▼
Key By Account ID
     │
     ▼
Stateful AML Detection Engine
     │
     ├── Rule Engine
     ├── Window Analysis
     ├── CEP Patterns
     └── Risk Scoring
     │
     ▼
Alert Generator
     │
     ├── Alerts Topic (Kafka)
     └── PostgreSQL Sink
```

``` bash
flink-aml-job/
│
├── src/
│   ├── model/
│   │   ├── Transaction.java
│   │   └── Alert.java
│   │
│   ├── rules/
│   │   ├── StructuringRule.java
│   │   ├── LayeringRule.java
│   │   └── CountryRiskRule.java
│   │
│   ├── scoring/
│   │   └── RiskScorer.java
│   │
│   ├── pipeline/
│   │   └── AmlStreamingJob.java
│   │
│   └── utils/
│
└── pom.xml
```