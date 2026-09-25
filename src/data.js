/**
 * @file data.js
 * @description Multi-Level Data Engineering Tasks (PySpark & SQL) for Pipeline Survivor.
 * Contains:
 * - Level 1 (Bronze Layer): PySpark Data Cleaning (Duplicates, Nulls, Regex, Type Cast, Whitespace)
 * - Level 2 (Silver Layer): SQL Transformations (WINDOW ROW_NUMBER, GROUP BY HAVING, COALESCE, JOIN ON, CASE WHEN)
 * - Level 3 (Gold Layer): Production Spark & SQL Optimization (BROADCAST JOIN, DELTA MERGE, PARTITION PRUNING, SALTED KEYS)
 */

window.GAME_LEVELS = [
  // =========================================================================
  // LEVEL 1: BRONZE LAYER (RAW INGESTION & PYSPARK CLEANING)
  // =========================================================================
  {
    level: 1,
    name: "Bronze Layer (Raw Ingestion)",
    engine: "PySpark 3.5.0",
    description: "Sanitize raw ingestion tables from Kafka & S3 landing buckets before bronze tables corrupt downstream schemas.",
    redBullsToPlace: 2,
    tasks: [
      {
        id: "b_chimera",
        name: "🐉 CHIMERA",
        desc: "Upstream retry storm caused identical payment transactions to be ingested multiple times!",
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
            explain: "Accurately deduplicated rows by primary key without dropping unique transactions."
          },
          {
            code: "df.select('transaction_id')",
            label: "Keep only transaction_id column",
            correct: false,
            explain: "Dropped user_id, amount, and timestamp! Critical column loss."
          },
          {
            code: "df.filter(col('amount') > 0)",
            label: "Filter for positive payment amount",
            correct: false,
            explain: "Duplicate transactions still have positive amounts. Duplicates remained."
          },
          {
            code: "df.limit(1)",
            label: "Take top 1 row from dataframe",
            correct: false,
            explain: "Truncated the entire dataframe down to 1 record!"
          }
        ]
      },
      {
        id: "b_phantom",
        name: "👻 PHANTOM",
        desc: "Feature pipeline failed: customer records arrived with missing country codes and null ages!",
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
            explain: "Deleted required features needed for downstream machine learning."
          },
          {
            code: "df.na.drop()",
            label: "Drop all rows containing any null values",
            correct: false,
            explain: "Overly destructive: discarded 50% of legitimate business records."
          },
          {
            code: "df.withColumn('age', col('age') + 1)",
            label: "Increment age column by 1",
            correct: false,
            explain: "NULL + 1 remains NULL in SQL. The bug persists."
          }
        ]
      },
      {
        id: "b_wyrm",
        name: "🐍 WYRM",
        desc: "Customer names contaminated with unescaped control bytes and binary regex symbols (\\x00, @#$)!",
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
            explain: "Cleaned illegal control characters while preserving alphabetical customer names."
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
            explain: "Lowercasing retains illegal binary control characters."
          },
          {
            code: "df.distinct()",
            label: "Call distinct() across all rows",
            correct: false,
            explain: "Distinct does not alter or sanitize string contents."
          }
        ]
      },
      {
        id: "b_mimic",
        name: "🦎 MIMIC",
        desc: "Revenue metrics arrived as dirty formatted currency strings ('$1,250.00'), breaking arithmetic queries!",
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
            explain: "Cleaned formatted currency symbols and cast to numeric Double."
          },
          {
            code: "df.withColumn('revenue', col('revenue_str').cast('double'))",
            label: "Directly cast dirty string to double",
            correct: false,
            explain: "Direct cast on formatted '$1,250.00' yields all NULLs in Spark SQL."
          },
          {
            code: "df.groupBy('revenue_str').sum()",
            label: "Directly sum the string column",
            correct: false,
            explain: "AnalysisException: cannot resolve sum() on string type."
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
        name: "👤 STALKER",
        desc: "Foreign key join dropped 70% of rows due to invisible leading and trailing whitespace in store codes!",
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
            explain: "Cleaned invisible spaces, restoring join fidelity."
          },
          {
            code: "df.filter(col('store_code') == 'STORE_NYC')",
            label: "Hardcode filter for single store code",
            correct: false,
            explain: "Discarded London and Tokyo stores, resulting in massive data loss."
          },
          {
            code: "df.drop('store_code')",
            label: "Drop the store_code column entirely",
            correct: false,
            explain: "Deleted the foreign key needed for relational join."
          },
          {
            code: "df.repartition(10)",
            label: "Repartition dataframe into 10 partitions",
            correct: false,
            explain: "Repartitioning does not alter string whitespace."
          }
        ]
      }
    ]
  },

  // =========================================================================
  // LEVEL 2: SILVER LAYER (ANALYTICAL SQL TRANSFORMATIONS)
  // =========================================================================
  {
    level: 2,
    name: "Silver Layer (SQL Transformations)",
    engine: "Spark SQL / ANSI SQL",
    description: "Write rigorous analytical SQL transformations to produce clean dimensional models and aggregated feature sets.",
    redBullsToPlace: 2,
    tasks: [
      {
        id: "s_window",
        name: "🪟 WINDOW_RANKER",
        desc: "Task: Keep only the most recent status update per customer using an SQL Window Function.",
        tableHeaders: ["customer_id", "status", "updated_at"],
        tableRows: [
          ["C-1", "ACTIVE", "2026-04-01 10:00:00"],
          ["C-1", "SUSPENDED", "2026-04-02 12:00:00"],
          ["C-2", "PENDING", "2026-04-01 09:00:00"],
          ["C-2", "ACTIVE", "2026-04-03 15:00:00"]
        ],
        glitchIndices: [0, 2],
        skills: [
          {
            code: "SELECT * FROM (SELECT *, ROW_NUMBER() OVER(PARTITION BY customer_id ORDER BY updated_at DESC) as rn FROM updates) WHERE rn = 1",
            label: "Window ROW_NUMBER() partitioned by customer descending",
            correct: true,
            explain: "Correct! Exactly isolates the latest update record per customer."
          },
          {
            code: "SELECT customer_id, MAX(updated_at) FROM updates GROUP BY customer_id",
            label: "GROUP BY with MAX(updated_at)",
            correct: false,
            explain: "Dropped the 'status' column because it wasn't in GROUP BY."
          },
          {
            code: "SELECT * FROM updates ORDER BY updated_at DESC LIMIT 2",
            label: "Global ORDER BY updated_at DESC LIMIT 2",
            correct: false,
            explain: "Limit only takes top 2 global rows regardless of customer count."
          },
          {
            code: "SELECT DISTINCT customer_id, status FROM updates",
            label: "SELECT DISTINCT customer_id, status",
            correct: false,
            explain: "Retains all historical status transitions since statuses are distinct."
          }
        ]
      },
      {
        id: "s_having",
        name: "⚖️ AGGREGATOR",
        desc: "Task: Identify merchant accounts whose total transaction volume exceeds $10,000 using SQL aggregation.",
        tableHeaders: ["merchant_id", "tx_count", "total_volume"],
        tableRows: [
          ["M-80", "150", "$24,500.00"],
          ["M-81", "12", "$450.00"],
          ["M-82", "310", "$92,000.00"],
          ["M-83", "5", "$120.00"]
        ],
        glitchIndices: [1, 3],
        skills: [
          {
            code: "SELECT merchant_id, SUM(amount) as total FROM transactions GROUP BY merchant_id HAVING SUM(amount) > 10000",
            label: "GROUP BY merchant_id HAVING SUM(amount) > 10000",
            correct: true,
            explain: "Accurately applies post-aggregation HAVING filter to aggregate amounts."
          },
          {
            code: "SELECT merchant_id, SUM(amount) as total FROM transactions WHERE SUM(amount) > 10000 GROUP BY merchant_id",
            label: "WHERE SUM(amount) > 10000 GROUP BY merchant_id",
            correct: false,
            explain: "SQL Syntax Error: Aggregate functions like SUM() cannot appear in WHERE clauses."
          },
          {
            code: "SELECT merchant_id, amount FROM transactions WHERE amount > 10000",
            label: "Filter individual transactions > 10000",
            correct: false,
            explain: "Filters single transactions instead of calculating aggregate volume per merchant."
          },
          {
            code: "SELECT merchant_id FROM transactions GROUP BY merchant_id",
            label: "GROUP BY merchant_id without sum filter",
            correct: false,
            explain: "Returns all merchants including small accounts under $10,000."
          }
        ]
      },
      {
        id: "s_join",
        name: "🔗 ORPHAN_HUNTER",
        desc: "Task: Find all active users who have NEVER completed an order using an SQL Anti-Join.",
        tableHeaders: ["user_id", "email", "has_orders"],
        tableRows: [
          ["U-10", "alex@lab.io", "Has 3 orders"],
          ["U-11", "sam@lab.io", "0 orders (orphan)"],
          ["U-12", "eva@lab.io", "Has 12 orders"],
          ["U-13", "leo@lab.io", "0 orders (orphan)"]
        ],
        glitchIndices: [1, 3],
        skills: [
          {
            code: "SELECT u.user_id, u.email FROM users u LEFT JOIN orders o ON u.user_id = o.user_id WHERE o.order_id IS NULL",
            label: "LEFT JOIN ... WHERE o.order_id IS NULL",
            correct: true,
            explain: "Classic anti-join pattern: isolates unmatched users with null foreign keys."
          },
          {
            code: "SELECT u.user_id, u.email FROM users u INNER JOIN orders o ON u.user_id = o.user_id",
            label: "INNER JOIN users and orders",
            correct: false,
            explain: "Inner join returns users WITH orders, the exact opposite of the requirement."
          },
          {
            code: "SELECT user_id, email FROM users WHERE user_id NOT IN (SELECT user_id FROM orders)",
            label: "WHERE user_id NOT IN (orders subquery)",
            correct: false,
            explain: "Vulnerable to NULL hazard: if orders contains a single NULL user_id, NOT IN evaluates to empty!"
          },
          {
            code: "SELECT user_id FROM users CROSS JOIN orders",
            label: "CROSS JOIN users and orders",
            correct: false,
            explain: "Cartesian product: causes memory explosion without filtering orphans."
          }
        ]
      },
      {
        id: "s_case",
        name: "🏷️ CLASSIFIER",
        desc: "Task: Segment customers into 'VIP' (spend >= 1000), 'REGULAR' (spend >= 100), and 'NEW' using CASE WHEN.",
        tableHeaders: ["customer_id", "lifetime_spend", "target_tier"],
        tableRows: [
          ["C-501", "$1,450.00", "Should be VIP"],
          ["C-502", "$340.00", "Should be REGULAR"],
          ["C-503", "$25.00", "Should be NEW"],
          ["C-504", "$2,100.00", "Should be VIP"]
        ],
        glitchIndices: [0, 1, 2, 3],
        skills: [
          {
            code: "SELECT customer_id, CASE WHEN lifetime_spend >= 1000 THEN 'VIP' WHEN lifetime_spend >= 100 THEN 'REGULAR' ELSE 'NEW' END AS tier FROM customers",
            label: "Evaluated CASE WHEN tier segmentation",
            correct: true,
            explain: "Correctly ordered cascading thresholds classify all cohorts cleanly."
          },
          {
            code: "SELECT customer_id, CASE WHEN lifetime_spend >= 100 THEN 'REGULAR' WHEN lifetime_spend >= 1000 THEN 'VIP' ELSE 'NEW' END AS tier FROM customers",
            label: "Inverted CASE WHEN order (>= 100 first)",
            correct: false,
            explain: "Bug: Anyone with spend >= 1000 also matches >= 100, so VIPs are labeled REGULAR!"
          },
          {
            code: "SELECT customer_id, IF(lifetime_spend >= 1000, 'VIP', 'REGULAR') AS tier FROM customers",
            label: "Binary IF statement",
            correct: false,
            explain: "Misses the 'NEW' tier entirely, grouping newcomers into REGULAR."
          },
          {
            code: "SELECT customer_id, 'VIP' AS tier FROM customers",
            label: "Hardcode all as 'VIP'",
            correct: false,
            explain: "Incorrectly classifies zero-spend accounts as VIP."
          }
        ]
      },
      {
        id: "s_coalesce",
        name: "🛡️ COALESCER",
        desc: "Task: Standardize fallback contact info prioritizing mobile_phone -> work_phone -> email -> 'UNREACHABLE'.",
        tableHeaders: ["user_id", "mobile_phone", "work_phone", "email"],
        tableRows: [
          ["U-90", "NULL", "+370-600-1111", "test@corp.lt"],
          ["U-91", "NULL", "NULL", "contact@web.io"],
          ["U-92", "NULL", "NULL", "NULL"],
          ["U-93", "+370-699-2222", "NULL", "ceo@corp.lt"]
        ],
        glitchIndices: [0, 1, 2],
        skills: [
          {
            code: "SELECT user_id, COALESCE(mobile_phone, work_phone, email, 'UNREACHABLE') AS primary_contact FROM directory",
            label: "COALESCE(mobile, work, email, 'UNREACHABLE')",
            correct: true,
            explain: "Returns the first non-null contact method across the hierarchy."
          },
          {
            code: "SELECT user_id, NVL(mobile_phone, email) AS primary_contact FROM directory",
            label: "NVL(mobile_phone, email)",
            correct: false,
            explain: "Ignores work_phone and crashes if both mobile and email are null."
          },
          {
            code: "SELECT user_id, CONCAT(mobile_phone, work_phone, email) AS primary_contact FROM directory",
            label: "CONCAT all contact columns",
            correct: false,
            explain: "In standard SQL, concatenating with NULL produces NULL."
          },
          {
            code: "SELECT user_id, email AS primary_contact FROM directory",
            label: "Select email only",
            correct: false,
            explain: "Fails fallback logic and yields nulls for accounts without email."
          }
        ]
      }
    ]
  },

  // =========================================================================
  // LEVEL 3: GOLD LAYER (PRODUCTION SPARK & SQL WAREHOUSE OPTIMIZATION)
  // =========================================================================
  {
    level: 3,
    name: "Gold Layer (Production Optimization)",
    engine: "Delta Lake & Spark Catalyst",
    description: "Architect high-performance enterprise pipelines. Eliminate shuffle skews, broadcast lookup dimensions, and execute Delta Lake merges.",
    redBullsToPlace: 2,
    tasks: [
      {
        id: "g_broadcast",
        name: "📡 BROADCAST_TITAN",
        desc: "Issue: Large 500M row fact table is joining a tiny 50-row lookup dimension, causing massive network shuffle spills!",
        tableHeaders: ["query_type", "fact_rows", "dim_rows", "shuffle_spill"],
        tableRows: [
          ["SortMergeJoin", "500,000,000", "50", "42.8 GB SPILL"],
          ["SortMergeJoin", "500,000,000", "50", "38.2 GB SPILL"],
          ["BroadcastJoin", "500,000,000", "50", "Target: 0 GB"],
          ["SortMergeJoin", "500,000,000", "50", "45.1 GB SPILL"]
        ],
        glitchIndices: [0, 1, 3],
        skills: [
          {
            code: "df_fact.join(broadcast(df_lookup), 'country_code', 'inner')",
            label: "Apply broadcast() hint on the small lookup table",
            correct: true,
            explain: "Broadcast Hash Join sends the 50-row table to all executors, eliminating all 40GB shuffle spills!"
          },
          {
            code: "broadcast(df_fact).join(df_lookup, 'country_code', 'inner')",
            label: "Broadcast the 500M row fact table",
            correct: false,
            explain: "Fatal Out of Memory! Broadcasting a 500M row table crashes the driver JVM."
          },
          {
            code: "df_fact.repartition(1000).join(df_lookup, 'country_code')",
            label: "Repartition fact table into 1000 partitions",
            correct: false,
            explain: "Still performs expensive SortMergeJoin across network executors."
          },
          {
            code: "df_fact.limit(1000).join(df_lookup, 'country_code')",
            label: "Limit fact table to 1,000 rows",
            correct: false,
            explain: "Data loss: discarded 499,999,000 production records."
          }
        ]
      },
      {
        id: "g_delta_merge",
        name: "🧬 DELTA_MERGER",
        desc: "Task: Perform an ACID UPSERT on Delta Lake: update existing customer records and insert new ones based on customer_id.",
        tableHeaders: ["target_table", "source_table", "action", "status"],
        tableRows: [
          ["delta_silver.customers", "updates_batch", "UPSERT", "Needs MERGE"],
          ["delta_silver.customers", "updates_batch", "UPDATE", "Matches on ID"],
          ["delta_silver.customers", "updates_batch", "INSERT", "New records"],
          ["delta_silver.customers", "updates_batch", "UPSERT", "Needs MERGE"]
        ],
        glitchIndices: [0, 3],
        skills: [
          {
            code: "target.alias('t').merge(source.alias('s'), 't.customer_id = s.customer_id').whenMatchedUpdateAll().whenNotMatchedInsertAll().execute()",
            label: "Delta Lake MERGE INTO with matched update & unmatched insert",
            correct: true,
            explain: "Executes atomic Delta ACID upsert: updates existing records and appends new arrivals."
          },
          {
            code: "source.write.format('delta').mode('overwrite').saveAsTable('delta_silver.customers')",
            label: "Overwrite target table with source batch",
            correct: false,
            explain: "Overwrote the target table, destroying all historical customers not present in the batch!"
          },
          {
            code: "source.write.format('delta').mode('append').saveAsTable('delta_silver.customers')",
            label: "Append source batch directly to target table",
            correct: false,
            explain: "Appends duplicates for existing customers without updating records."
          },
          {
            code: "target.filter('customer_id IS NOT NULL').delete()",
            label: "Delete all non-null customer rows",
            correct: false,
            explain: "Wiped out the entire target customer table."
          }
        ]
      },
      {
        id: "g_partition_prune",
        name: "✂️ PARTITION_PRUNER",
        desc: "Issue: Queries on 100TB event lake are performing full table scans because filters don't align with partition keys (year/month/day).",
        tableHeaders: ["dataset_size", "query_filter", "scan_volume", "latency"],
        tableRows: [
          ["100 TB", "WHERE timestamp > now() - 1d", "Full 100 TB scan", "38 min"],
          ["100 TB", "WHERE year=2026 AND month=4", "Target: 250 GB", "14 sec"],
          ["100 TB", "WHERE date(timestamp) = today", "Full 100 TB scan", "41 min"],
          ["100 TB", "WHERE substring(ts, 1, 4)='2026'", "Full 100 TB scan", "45 min"]
        ],
        glitchIndices: [0, 2, 3],
        skills: [
          {
            code: "SELECT * FROM events WHERE year = 2026 AND month = 4 AND day = 16",
            label: "Filter directly on exact physical partition key columns",
            correct: true,
            explain: "Spark Catalyst performs Partition Pruning, skipping 99.8% of files on cloud storage!"
          },
          {
            code: "SELECT * FROM events WHERE CAST(year AS STRING) = '2026'",
            label: "Cast partition column to string in filter",
            correct: false,
            explain: "Applying functions or casts to partition columns can disable file-skipping metadata."
          },
          {
            code: "SELECT * FROM events",
            label: "Run query with no WHERE filter",
            correct: false,
            explain: "Triggers full 100TB scan across all historical storage buckets."
          },
          {
            code: "SELECT * FROM events TABLESAMPLE (1 PERCENT)",
            label: "Sample 1% of table rows",
            correct: false,
            explain: "Returns incomplete, non-deterministic sample data."
          }
        ]
      },
      {
        id: "g_skew_salt",
        name: "🧂 SKEW_SALTER",
        desc: "Issue: 90% of web traffic belongs to a single viral tenant, causing 1 Spark task to hang for hours while other 999 finish instantly!",
        tableHeaders: ["tenant_id", "record_count", "task_status", "skew_ratio"],
        tableRows: [
          ["VIRAL_TENANT_X", "85,000,000", "Stuck 99%", "Skew 90%"],
          ["TENANT_A", "12,000", "Finished (0.2s)", "Normal"],
          ["TENANT_B", "45,000", "Finished (0.4s)", "Normal"],
          ["VIRAL_TENANT_X", "85,000,000", "Stuck 99%", "Skew 90%"]
        ],
        glitchIndices: [0, 3],
        skills: [
          {
            code: "df.withColumn('salt', (rand() * 16).cast('int')).repartition(col('tenant_id'), col('salt'))",
            label: "Salting: append randomized key to distribute heavy keys across partitions",
            correct: true,
            explain: "Salting fractures the skewed key into 16 uniform buckets, distributing work evenly across all executors!"
          },
          {
            code: "df.repartition(1)",
            label: "Repartition entire dataframe to 1 partition",
            correct: false,
            explain: "Forces all 85 million records into a single CPU core, worsening the bottleneck."
          },
          {
            code: "df.filter(col('tenant_id') != 'VIRAL_TENANT_X')",
            label: "Filter out the viral tenant completely",
            correct: false,
            explain: "Dropped your largest customer, causing catastrophic production data loss!"
          },
          {
            code: "df.coalesce(200)",
            label: "Coalesce dataframe to 200 partitions",
            correct: false,
            explain: "Coalesce does not shuffle or solve key-skew distributions."
          }
        ]
      },
      {
        id: "g_cache_unpersist",
        name: "💾 CACHE_TITAN",
        desc: "Task: An iterative graph computation reuses intermediate DataFrame df_clean across 10 actions. Optimize memory & disk spills.",
        tableHeaders: ["computation", "action_count", "storage_level", "risk"],
        tableRows: [
          ["Iterative Loop", "10 actions", "Recomputing graph", "10x redundant I/O"],
          ["Iterative Loop", "10 actions", "Target: MEMORY_AND_DISK", "Fast reuse"],
          ["Iterative Loop", "10 actions", "No unpersist", "OOM leak risk"],
          ["Iterative Loop", "10 actions", "Recomputing graph", "10x redundant I/O"]
        ],
        glitchIndices: [0, 3],
        skills: [
          {
            code: "df_clean.persist(StorageLevel.MEMORY_AND_DISK); ... ; df_clean.unpersist()",
            label: "Persist with MEMORY_AND_DISK, then unpersist() when loop completes",
            correct: true,
            explain: "Best practice: caches reusable stages to prevent recomputation and releases JVM memory when done."
          },
          {
            code: "df_clean.collect()",
            label: "Collect entire distributed dataset to driver memory",
            correct: false,
            explain: "Driver OutOfMemoryError: collecting large datasets to single driver node crashes the Spark session."
          },
          {
            code: "df_clean.checkpoint() without setting checkpoint dir",
            label: "Call checkpoint() directly",
            correct: false,
            explain: "Spark AnalysisException: Checkpoint directory has not been set in the SparkContext."
          },
          {
            code: "for i in range(10): df_clean.cache()",
            label: "Call .cache() 10 times in a loop",
            correct: false,
            explain: "Redundant calls do not accelerate execution and clutter memory tracking."
          }
        ]
      }
    ]
  }
];
