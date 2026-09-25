window.BRONZE_LEVEL = {
  level: 1,
  name: "Bronze Layer (Raw Ingestion)",
  engine: "PySpark 3.5.0",
  description: "Sanitize raw ingestion tables from Kafka and landing buckets before bronze tables corrupt downstream schemas.",
  espressoToPlace: 2,
  redBullsToPlace: 2,
  tasks: [
    {
      id: "b_chimera",
      name: "CHIMERA",
      desc: "Upstream retry storm caused identical payment transactions to be ingested multiple times.",
      tableHeaders: ["transaction_id", "user_id", "amount", "timestamp"],
      tableRows: [
        ["TX-9901", "USR_42", "$150.00", "10:00:01"],
        ["TX-9901", "USR_42", "$150.00", "10:00:01"],
        ["TX-9902", "USR_88", "$25.50", "10:00:04"],
        ["TX-9901", "USR_42", "$150.00", "10:00:01"]
      ],
      glitchIndices: [1, 3],
      skills: [
        {
          code: "df.dropDuplicates(['transaction_id'])",
          label: "Deduplicate rows by transaction primary key",
          correct: true,
          explain: "Deduplicated rows by transaction ID without dropping unique transactions."
        },
        {
          code: "df.select('transaction_id')",
          label: "Keep only transaction_id column",
          correct: false,
          explain: "Discarded user_id, amount, and timestamp columns."
        },
        {
          code: "df.filter(col('amount') > 0)",
          label: "Filter for positive payment amount",
          correct: false,
          explain: "Duplicate transactions still have positive amounts; duplicates remain."
        },
        {
          code: "df.limit(1)",
          label: "Take top 1 row from dataframe",
          correct: false,
          explain: "Truncated the entire dataframe down to 1 record."
        }
      ]
    },
    {
      id: "b_phantom",
      name: "PHANTOM",
      desc: "Feature pipeline failed: customer records arrived with missing country codes and null ages.",
      tableHeaders: ["customer_id", "country", "age", "churn_risk"],
      tableRows: [
        ["CUST-10", "LT", "29", "0.12"],
        ["CUST-11", "NULL", "NULL", "0.84"],
        ["CUST-12", "US", "41", "0.05"],
        ["CUST-13", "NaN", "33", "NULL"]
      ],
      glitchIndices: [1, 3],
      skills: [
        {
          code: "df.fillna({'country': 'UNKNOWN', 'age': 0})",
          label: "Impute missing values with standardized defaults",
          correct: true,
          explain: "Imputed missing fields cleanly without discarding customer records."
        },
        {
          code: "df.drop('country', 'age')",
          label: "Drop country and age columns from schema",
          correct: false,
          explain: "Deleted required features needed for downstream pipelines."
        },
        {
          code: "df.na.drop()",
          label: "Drop all rows containing any null values",
          correct: false,
          explain: "Discarded 50% of valid customer records."
        },
        {
          code: "df.withColumn('age', col('age') + 1)",
          label: "Increment age column by 1",
          correct: false,
          explain: "NULL + 1 remains NULL in Spark SQL."
        }
      ]
    },
    {
      id: "b_wyrm",
      name: "WYRM",
      desc: "Customer names contaminated with unescaped control bytes and binary regex symbols (\\x00, @#$).",
      tableHeaders: ["user_id", "raw_name", "email"],
      tableRows: [
        ["101", "Alice Stark", "alice@corp.io"],
        ["102", "Bb%#\\x00$mith", "bob@corp.io"],
        ["103", "Carlos Vega", "carlos@corp.io"],
        ["104", "D@v!d_#99", "david@corp.io"]
      ],
      glitchIndices: [1, 3],
      skills: [
        {
          code: "df.withColumn('raw_name', regexp_replace(col('raw_name'), '[^a-zA-Z\\s]', ''))",
          label: "Sanitize strings using regex character class filter",
          correct: true,
          explain: "Stripped illegal control characters while preserving alphabetical names."
        },
        {
          code: "df.filter(col('raw_name').isNull())",
          label: "Filter for null names",
          correct: false,
          explain: "Filtered out valid names, returning an empty DataFrame."
        },
        {
          code: "df.withColumn('raw_name', lower(col('raw_name')))",
          label: "Convert names to lowercase",
          correct: false,
          explain: "Lowercasing retains unescaped binary control characters."
        },
        {
          code: "df.distinct()",
          label: "Call distinct() across all rows",
          correct: false,
          explain: "distinct() does not sanitize column string contents."
        }
      ]
    },
    {
      id: "b_mimic",
      name: "MIMIC",
      desc: "Revenue metrics arrived as formatted currency strings ('$1,250.00'), breaking numeric aggregations.",
      tableHeaders: ["invoice_id", "revenue_str", "status"],
      tableRows: [
        ["INV-01", "$1,250.00", "PAID"],
        ["INV-02", "$450.50", "PAID"],
        ["INV-03", "$9,900.00", "PENDING"],
        ["INV-04", "N/A_FREE", "REFUNDED"]
      ],
      glitchIndices: [0, 1, 2, 3],
      skills: [
        {
          code: "df.withColumn('revenue', regexp_replace(col('revenue_str'), '[$,]', '').cast('double'))",
          label: "Strip currency symbols and cast to Double",
          correct: true,
          explain: "Stripped currency symbols and cast string to numeric Double."
        },
        {
          code: "df.withColumn('revenue', col('revenue_str').cast('double'))",
          label: "Directly cast string to double",
          correct: false,
          explain: "Direct cast on formatted '$1,250.00' evaluates to NULL in Spark SQL."
        },
        {
          code: "df.groupBy('revenue_str').sum()",
          label: "Directly sum the string column",
          correct: false,
          explain: "AnalysisException: cannot resolve sum() on string data type."
        },
        {
          code: "df.limit(0)",
          label: "Truncate dataframe buffer",
          correct: false,
          explain: "Emptied the entire table."
        }
      ]
    },
    {
      id: "b_stalker",
      name: "STALKER",
      desc: "Foreign key join dropped rows due to unescaped leading and trailing whitespace in store codes.",
      tableHeaders: ["order_id", "store_code", "shipped"],
      tableRows: [
        ["ORD-1", "STORE_NYC   ", "true"],
        ["ORD-2", "  STORE_LON ", "true"],
        ["ORD-3", "STORE_TOK   ", "false"],
        ["ORD-4", "STORE_NYC", "true"]
      ],
      glitchIndices: [0, 1, 2],
      skills: [
        {
          code: "df.withColumn('store_code', trim(col('store_code')))",
          label: "Apply trim() to strip leading and trailing spaces",
          correct: true,
          explain: "Trimmed whitespace padding, restoring join key alignment."
        },
        {
          code: "df.filter(col('store_code') == 'STORE_NYC')",
          label: "Hardcode filter for single store code",
          correct: false,
          explain: "Filtered out London and Tokyo stores, resulting in data loss."
        },
        {
          code: "df.drop('store_code')",
          label: "Drop the store_code column entirely",
          correct: false,
          explain: "Dropped the foreign key required for downstream joins."
        },
        {
          code: "df.repartition(10)",
          label: "Repartition dataframe into 10 partitions",
          correct: false,
          explain: "Repartitioning changes partition distribution, not column whitespace."
        }
      ]
    }
  ]
};
