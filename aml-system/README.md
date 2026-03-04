# Repo Structure
``` bash
aml-system
│
├── infra
│   ├── docker-compose.yml            ← all infrastructure services
│   ├── docker-compose.override.yml   ← local dev overrides   
│   └── terraform/                    ← for transforming to cloud 
│   
├── ingestion
│   ├── kafka-configs/
│   └── debezium-connectors/
│
├── pipelines/
│   ├── dags/             ← Airflow DAGs
│   ├── flink-jobs/
│   ├── spark-jobs/
│   └── dbt/              ← transformations
│                    
├── services/
│   ├── transaction-service/
│   ├── screening-service/
│   ├── scoring-service/
│   ├── alert-service/
│   └── case-management-api/
│
├── ml/
│   ├── notebooks/
│   ├── models/
│   └── feature-store/
│
├── frontend/
│   └── aml-dashboard/
│
├── data-generators/          ← synthetic transaction simulator
│             
└── docs/
```