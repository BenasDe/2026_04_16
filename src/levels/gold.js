window.GOLD_LEVEL = {
  level: 3,
  name: "Gold Layer (Production Optimization)",
  engine: "Delta Lake & Spark Catalyst",
  description: "Optimize high-volume big data pipelines. Eliminate shuffle skews, broadcast lookup dimensions, and execute Delta Lake merges.",
  redBullsToPlace: 2,
  tasks: [
    {
      id: "g_broadcast",
      name: "BROADCAST_JOIN",
      desc: "A 500M row fact table joins a 50-row lookup dimension, generating network shuffle spills.",
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
          explain: "Broadcast Hash Join sends the 50-row table to all executors, eliminating shuffle spills."
        },
        {
          code: "broadcast(df_fact).join(df_lookup, 'country_code', 'inner')",
          label: "Broadcast the 500M row fact table",
          correct: false,
          explain: "Broadcasting a 500M row table exhausts driver JVM memory."
        },
        {
          code: "df_fact.repartition(1000).join(df_lookup, 'country_code')",
          label: "Repartition fact table into 1000 partitions",
          correct: false,
          explain: "SortMergeJoin still performs a full network shuffle across partitions."
        },
        {
          code: "df_fact.limit(1000).join(df_lookup, 'country_code')",
          label: "Limit fact table to 1,000 rows",
          correct: false,
          explain: "Limits dataset row count, discarding production records."
        }
      ]
    },
    {
      id: "g_delta_merge",
      name: "DELTA_MERGE",
      desc: "Execute an atomic UPSERT on Delta Lake: update existing records and insert new rows on customer_id.",
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
          label: "Delta Lake MERGE INTO with matched update and unmatched insert",
          correct: true,
          explain: "Executes an atomic Delta ACID upsert: updates existing records and appends new rows."
        },
        {
          code: "source.write.format('delta').mode('overwrite').saveAsTable('delta_silver.customers')",
          label: "Overwrite target table with source batch",
          correct: false,
          explain: "Overwrote target table, deleting existing historical customer records."
        },
        {
          code: "source.write.format('delta').mode('append').saveAsTable('delta_silver.customers')",
          label: "Append source batch directly to target table",
          correct: false,
          explain: "Appends duplicate rows for existing customer IDs without updating."
        },
        {
          code: "target.filter('customer_id IS NOT NULL').delete()",
          label: "Delete all non-null customer rows",
          correct: false,
          explain: "Deleted all active rows from the target table."
        }
      ]
    },
    {
      id: "g_partition_prune",
      name: "PARTITION_PRUNING",
      desc: "Queries on a 100TB event lake trigger full table scans because filters don't align with partition keys.",
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
          explain: "Spark Catalyst prunes partitions, skipping non-matching storage paths."
        },
        {
          code: "SELECT * FROM events WHERE CAST(year AS STRING) = '2026'",
          label: "Cast partition column to string in filter",
          correct: false,
          explain: "Function calls on partition columns can disable file-skipping metadata."
        },
        {
          code: "SELECT * FROM events",
          label: "Run query with no WHERE filter",
          correct: false,
          explain: "Triggers full 100TB scan across all partitions."
        },
        {
          code: "SELECT * FROM events TABLESAMPLE (1 PERCENT)",
          label: "Sample 1% of table rows",
          correct: false,
          explain: "TABLESAMPLE returns partial data and does not satisfy production queries."
        }
      ]
    },
    {
      id: "g_skew_salt",
      name: "KEY_SALTING",
      desc: "90% of traffic belongs to a single viral tenant, causing one Spark task to skew execution time.",
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
          explain: "Salting splits the skewed key into uniform buckets across executors."
        },
        {
          code: "df.repartition(1)",
          label: "Repartition entire dataframe to 1 partition",
          correct: false,
          explain: "Forces all 85 million records onto a single executor core."
        },
        {
          code: "df.filter(col('tenant_id') != 'VIRAL_TENANT_X')",
          label: "Filter out the viral tenant completely",
          correct: false,
          explain: "Filtering out the skewed key drops valid production records."
        },
        {
          code: "df.coalesce(200)",
          label: "Coalesce dataframe to 200 partitions",
          correct: false,
          explain: "coalesce() does not shuffle or rebalance skewed key distribution."
        }
      ]
    },
    {
      id: "g_cache_unpersist",
      name: "PERSIST_UNPERSIST",
      desc: "An iterative computation reuses intermediate DataFrame df_clean across 10 actions. Optimize memory reuse.",
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
          explain: "Caches intermediate stages to avoid recomputation and releases JVM memory when done."
        },
        {
          code: "df_clean.collect()",
          label: "Collect entire distributed dataset to driver memory",
          correct: false,
          explain: "collect() pulls the entire distributed dataset into driver JVM memory, causing OOM."
        },
        {
          code: "df_clean.checkpoint() without setting checkpoint dir",
          label: "Call checkpoint() directly",
          correct: false,
          explain: "checkpoint() fails when checkpoint directory has not been set in SparkContext."
        },
        {
          code: "for i in range(10): df_clean.cache()",
          label: "Call .cache() 10 times in a loop",
          correct: false,
          explain: "Redundant cache() calls do not accelerate execution."
        }
      ]
    }
  ]
};
