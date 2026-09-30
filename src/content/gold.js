/** Schema v1 level. English is the base language; translated answers are keyed by stable ID. */
window.GameContent.registerLevel({
  id: "gold",
  name: "Gold Layer (Production Optimization)",
  engine: "Delta Lake & Spark Catalyst",
  description: "Optimize high-volume big data pipelines. Eliminate shuffle skews, broadcast lookup dimensions, and execute Delta Lake merges.",
  fuelToPlace: 2,
  tasks: [
    {
      id: "g_broadcast",
      name: "BROADCAST_JOIN",
      desc: "A 500M row fact table joins a 50-row lookup dimension, generating network shuffle spills.",
      tableHeaders: ["query_type","fact_rows","dim_rows","shuffle_spill"],
      tableRows: [
        ["SortMergeJoin","500,000,000","50","42.8 GB SPILL"],
        ["SortMergeJoin","500,000,000","50","38.2 GB SPILL"],
        ["BroadcastJoin","500,000,000","50","Target: 0 GB"],
        ["SortMergeJoin","500,000,000","50","45.1 GB SPILL"]
      ],
      glitchIndices: [0,1,3],
      skills: [
        {
          id: "broadcast_small_lookup",
          code: "df_fact.join(broadcast(df_lookup), 'country_code', 'inner')",
          label: "Apply broadcast() hint on the small lookup table",
          correct: true,
          explain: "Broadcast Hash Join sends the 50-row table to all executors, eliminating shuffle spills."
        },
        {
          id: "broadcast_large_fact_table",
          code: "broadcast(df_fact).join(df_lookup, 'country_code', 'inner')",
          label: "Broadcast the 500M row fact table",
          correct: false,
          explain: "Broadcasting a 500M row table exhausts driver JVM memory."
        },
        {
          id: "repartition_fact_before_join",
          code: "df_fact.repartition(1000).join(df_lookup, 'country_code')",
          label: "Repartition fact table into 1000 partitions",
          correct: false,
          explain: "SortMergeJoin still performs a full network shuffle across partitions."
        },
        {
          id: "limit_fact_before_join",
          code: "df_fact.limit(1000).join(df_lookup, 'country_code')",
          label: "Limit fact table to 1,000 rows",
          correct: false,
          explain: "Limits dataset row count, discarding production records."
        }
      ],
      translations: {
        lt: {
          name: "BROADCAST_JOIN",
          desc: "500 mln. eilučių faktų lentelė jungiama su 50 eilučių dimensija, sukeldama tinklo perpildymo (shuffle spill) nuostolius.",
          skills: {
            broadcast_small_lookup: {
              label: "Pritaikyti broadcast() užuominą mažai žinyno lentelei",
              explain: "Broadcast Hash Join išsiunčia 50 eilučių lentelę visiems vykdytojams, panaikindamas duomenų perpildymą."
            },
            broadcast_large_fact_table: {
              label: "Transliuoti (broadcast) 500 mln. faktų lentelę",
              explain: "500 mln. eilučių lentelės transliavimas išeikvoja pagrindinio mazgo (driver) JVM atmintį."
            },
            repartition_fact_before_join: {
              label: "Perskirstyti faktų lentelę į 1000 skaidinių",
              explain: "SortMergeJoin vis tiek atlieka pilną duomenų persiuntimą per tinklą."
            },
            limit_fact_before_join: {
              label: "Apriboti faktų lentelę iki 1 000 eilučių",
              explain: "Apriboja eilučių skaičių ir atmeta produkcinius duomenis."
            }
          }
        }
      }
    },
    {
      id: "g_delta_merge",
      name: "DELTA_MERGE",
      desc: "Execute an atomic UPSERT on Delta Lake: update existing records and insert new rows on customer_id.",
      tableHeaders: ["target_table","source_table","action","status"],
      tableRows: [
        ["delta_silver.customers","updates_batch","UPSERT","Needs MERGE"],
        ["delta_silver.customers","updates_batch","UPDATE","Matches on ID"],
        ["delta_silver.customers","updates_batch","INSERT","New records"],
        ["delta_silver.customers","updates_batch","UPSERT","Needs MERGE"]
      ],
      glitchIndices: [0,3],
      skills: [
        {
          id: "merge_customers_by_id",
          code: "target.alias('t').merge(source.alias('s'), 't.customer_id = s.customer_id').whenMatchedUpdateAll().whenNotMatchedInsertAll().execute()",
          label: "Delta Lake MERGE INTO with matched update and unmatched insert",
          correct: true,
          explain: "Executes an atomic Delta ACID upsert: updates existing records and appends new rows."
        },
        {
          id: "overwrite_customers_with_batch",
          code: "source.write.format('delta').mode('overwrite').saveAsTable('delta_silver.customers')",
          label: "Overwrite target table with source batch",
          correct: false,
          explain: "Overwrote target table, deleting existing historical customer records."
        },
        {
          id: "append_customers_without_merge",
          code: "source.write.format('delta').mode('append').saveAsTable('delta_silver.customers')",
          label: "Append source batch directly to target table",
          correct: false,
          explain: "Appends duplicate rows for existing customer IDs without updating."
        },
        {
          id: "delete_non_null_customers",
          code: "target.filter('customer_id IS NOT NULL').delete()",
          label: "Delete all non-null customer rows",
          correct: false,
          explain: "Deleted all active rows from the target table."
        }
      ],
      translations: {
        lt: {
          name: "DELTA_MERGE",
          desc: "Atlikti atominį UPSERT Delta Lake: atnaujinti esamus ir įterpti naujus įrašus pagal customer_id.",
          skills: {
            merge_customers_by_id: {
              label: "Delta Lake MERGE INTO su atnaujinimu sutapus ir įterpimu nesutapus",
              explain: "Atlieka atominį Delta ACID atnaujinimą: atnaujina esamus ir prideda naujus įrašus."
            },
            overwrite_customers_with_batch: {
              label: "Perrašyti tikslinę lentelę šaltinio partija",
              explain: "Perrašė tikslinę lentelę, ištrindama esamus istorinius klientų įrašus."
            },
            append_customers_without_merge: {
              label: "Pridėti šaltinio partiją tiesiai prie tikslinės lentelės",
              explain: "Prideda dublikuotas eilutes esamiems klientams be atnaujinimo."
            },
            delete_non_null_customers: {
              label: "Ištrinti visas ne tuščias klientų eilutes",
              explain: "Ištrynė visas aktyvias eilutes iš tikslinės lentelės."
            }
          }
        }
      }
    },
    {
      id: "g_partition_prune",
      name: "PARTITION_PRUNING",
      desc: "Queries on a 100TB event lake trigger full table scans because filters don't align with partition keys.",
      tableHeaders: ["dataset_size","query_filter","scan_volume","latency"],
      tableRows: [
        ["100 TB","WHERE timestamp > now() - 1d","Full 100 TB scan","38 min"],
        ["100 TB","WHERE year=2026 AND month=4","Target: 250 GB","14 sec"],
        ["100 TB","WHERE date(timestamp) = today","Full 100 TB scan","41 min"],
        ["100 TB","WHERE substring(ts, 1, 4)='2026'","Full 100 TB scan","45 min"]
      ],
      glitchIndices: [0,2,3],
      skills: [
        {
          id: "filter_physical_partition_keys",
          code: "SELECT * FROM events WHERE year = 2026 AND month = 4 AND day = 16",
          label: "Filter directly on exact physical partition key columns",
          correct: true,
          explain: "Spark Catalyst prunes partitions, skipping non-matching storage paths."
        },
        {
          id: "cast_partition_key_to_string",
          code: "SELECT * FROM events WHERE CAST(year AS STRING) = '2026'",
          label: "Cast partition column to string in filter",
          correct: false,
          explain: "Function calls on partition columns can disable file-skipping metadata."
        },
        {
          id: "scan_events_without_filter",
          code: "SELECT * FROM events",
          label: "Run query with no WHERE filter",
          correct: false,
          explain: "Triggers full 100TB scan across all partitions."
        },
        {
          id: "sample_event_rows",
          code: "SELECT * FROM events TABLESAMPLE (1 PERCENT)",
          label: "Sample 1% of table rows",
          correct: false,
          explain: "TABLESAMPLE returns partial data and does not satisfy production queries."
        }
      ],
      translations: {
        lt: {
          name: "PARTITION_PRUNING",
          desc: "Užklausos 100 TB įvykių ežere atlieka pilną lentelės nuskaitymą, nes filtrai nesutampa su skaidinių raktais.",
          skills: {
            filter_physical_partition_keys: {
              label: "Filtruoti tiesiogiai pagal tikslius fizinių skaidinių stulpelius",
              explain: "Spark Catalyst atmeta nereikalingus skaidinius ir praleidžia neatitinkančius saugyklos kelius."
            },
            cast_partition_key_to_string: {
              label: "Konvertuoti skaidinio stulpelį į tekstą filtre",
              explain: "Funkcijos skaidinių stulpeliuose gali atjungti failų praleidimo metaduomenis."
            },
            scan_events_without_filter: {
              label: "Vykdyti užklausą be WHERE filtro",
              explain: "Sukelia pilną 100 TB nuskaitymą per visus skaidinius."
            },
            sample_event_rows: {
              label: "Atrinkti 1% lentelės eilučių imtį",
              explain: "TABLESAMPLE grąžina dalinius duomenis ir netinka produkcinei užklausai."
            }
          }
        }
      }
    },
    {
      id: "g_skew_salt",
      name: "KEY_SALTING",
      desc: "90% of traffic belongs to a single viral tenant, causing one Spark task to skew execution time.",
      tableHeaders: ["tenant_id","record_count","task_status","skew_ratio"],
      tableRows: [
        ["VIRAL_TENANT_X","85,000,000","Stuck 99%","Skew 90%"],
        ["TENANT_A","12,000","Finished (0.2s)","Normal"],
        ["TENANT_B","45,000","Finished (0.4s)","Normal"],
        ["VIRAL_TENANT_X","85,000,000","Stuck 99%","Skew 90%"]
      ],
      glitchIndices: [0,3],
      skills: [
        {
          id: "salt_and_repartition_tenant_keys",
          code: "df.withColumn('salt', (rand() * 16).cast('int')).repartition(col('tenant_id'), col('salt'))",
          label: "Salting: append randomized key to distribute heavy keys across partitions",
          correct: true,
          explain: "Salting splits the skewed key into uniform buckets across executors."
        },
        {
          id: "repartition_tenants_to_one",
          code: "df.repartition(1)",
          label: "Repartition entire dataframe to 1 partition",
          correct: false,
          explain: "Forces all 85 million records onto a single executor core."
        },
        {
          id: "remove_viral_tenant",
          code: "df.filter(col('tenant_id') != 'VIRAL_TENANT_X')",
          label: "Filter out the viral tenant completely",
          correct: false,
          explain: "Filtering out the skewed key drops valid production records."
        },
        {
          id: "coalesce_tenants_without_shuffle",
          code: "df.coalesce(200)",
          label: "Coalesce dataframe to 200 partitions",
          correct: false,
          explain: "coalesce() does not shuffle or rebalance skewed key distribution."
        }
      ],
      translations: {
        lt: {
          name: "KEY_SALTING",
          desc: "90% srauto tenka vienam populiariam klientui, todėl viena Spark užduotis smarkiai vėluoja (skew).",
          skills: {
            salt_and_repartition_tenant_keys: {
              label: "Sūdymas (Salting): pridėti atsitiktinį raktą tolygiam perskirstymui",
              explain: "Sūdymas išskaido perkrautą raktą į tolygias dalis tarp vykdytojų."
            },
            repartition_tenants_to_one: {
              label: "Perskirstyti visą duomenų rėmelį į 1 skaidinį",
              explain: "Priverčia visus 85 mln. įrašų apdoroti viename vykdytojo branduolyje."
            },
            remove_viral_tenant: {
              label: "Visiškai išfiltruoti didžiausią klientą",
              explain: "Išfiltravus perkrautą raktą prarandami galiojantys produkciniai duomenys."
            },
            coalesce_tenants_without_shuffle: {
              label: "Sumažinti skaidinių skaičių iki 200 su coalesce",
              explain: "coalesce() neatlieka perskirstymo ir nesubalansuoja netolygių raktų."
            }
          }
        }
      }
    },
    {
      id: "g_cache_unpersist",
      name: "PERSIST_UNPERSIST",
      desc: "An iterative computation reuses intermediate DataFrame df_clean across 10 actions. Optimize memory reuse.",
      tableHeaders: ["computation","action_count","storage_level","risk"],
      tableRows: [
        ["Iterative Loop","10 actions","Recomputing graph","10x redundant I/O"],
        ["Iterative Loop","10 actions","Target: MEMORY_AND_DISK","Fast reuse"],
        ["Iterative Loop","10 actions","No unpersist","OOM leak risk"],
        ["Iterative Loop","10 actions","Recomputing graph","10x redundant I/O"]
      ],
      glitchIndices: [0,3],
      skills: [
        {
          id: "persist_and_release_clean_frame",
          code: "df_clean.persist(StorageLevel.MEMORY_AND_DISK); ... ; df_clean.unpersist()",
          label: "Persist with MEMORY_AND_DISK, then unpersist() when loop completes",
          correct: true,
          explain: "Caches intermediate stages to avoid recomputation and releases JVM memory when done."
        },
        {
          id: "collect_clean_frame_to_driver",
          code: "df_clean.collect()",
          label: "Collect entire distributed dataset to driver memory",
          correct: false,
          explain: "collect() pulls the entire distributed dataset into driver JVM memory, causing OOM."
        },
        {
          id: "checkpoint_without_directory",
          code: "df_clean.checkpoint() without setting checkpoint dir",
          label: "Call checkpoint() directly",
          correct: false,
          explain: "checkpoint() fails when checkpoint directory has not been set in SparkContext."
        },
        {
          id: "cache_repeatedly_in_loop",
          code: "for i in range(10): df_clean.cache()",
          label: "Call .cache() 10 times in a loop",
          correct: false,
          explain: "Redundant cache() calls do not accelerate execution."
        }
      ],
      translations: {
        lt: {
          name: "PERSIST_UNPERSIST",
          desc: "Iteracinis skaičiavimas pakartotinai naudoja tarpinį duomenų rėmelį df_clean per 10 veiksmų. Optimizuokite atmintį.",
          skills: {
            persist_and_release_clean_frame: {
              label: "Išsaugoti su MEMORY_AND_DISK, o baigus ciklą iškviesti unpersist()",
              explain: "Išsaugo tarpinius etapus išvengiant perskaičiavimo ir atlaisvina JVM atmintį baigus."
            },
            collect_clean_frame_to_driver: {
              label: "Surinkti visus paskirstytus duomenis į pagrindinio mazgo (driver) atmintį",
              explain: "collect() atsiunčia visus paskirstytus duomenis į driver atmintį, sukeldamas OOM."
            },
            checkpoint_without_directory: {
              label: "Tiesiogiai iškviesti checkpoint()",
              explain: "checkpoint() nepavyksta, kai SparkContext nenurodytas kontrolinio taško katalogas."
            },
            cache_repeatedly_in_loop: {
              label: "Iškviesti .cache() 10 kartų cikle",
              explain: "Pertekliniai cache() iškvietimai nepagreitina vykdymo."
            }
          }
        }
      }
    }
  ],
  translations: {
    lt: {
      name: "Aukso sluoksnis (Produkcijos optimizavimas)",
      description: "Optimizuokite didelės apimties duomenų srautus. Pašalinkite duomenų perskirstymo (shuffle) iškraipymus ir atlikite Delta Lake sujungimus."
    }
  }
});
