/** Gold level task definitions. */
window.GOLD_LEVEL = {
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
};
