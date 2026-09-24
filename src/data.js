/**
 * @file data.js
 * @description Data Engineering Anomaly Database, Mock DataFrames, and PySpark Skills.
 * Thematic RPG single-word entity names in pure monochrome styling.
 */

window.ANOMALY_DATABASE = [
  {
    id: 'chimera',
    name: '🐉 CHIMERA',
    color: '#ffffff',
    meshColor: 0xffffff,
    desc: 'Accounting incident: Monthly subscription revenue is reporting 200% inflation on recurring customer charges!',
    tableHeaders: ['transaction_id', 'user_id', 'amount', 'timestamp'],
    tableRows: [
      ['TX-9901', 'USR_42', '$150.00', '10:00:01'],
      ['TX-9901', 'USR_42', '$150.00', '10:00:01'], // duplicate
      ['TX-9902', 'USR_88', '$25.50', '10:00:04'],
      ['TX-9901', 'USR_42', '$150.00', '10:00:01']  // duplicate
    ],
    glitchIndices: [1, 3],
    skills: [
      {
        code: "df.dropDuplicates(['transaction_id'])",
        label: "Deduplicate records by transaction primary key",
        correct: true,
        explain: "Spot on! Removes redundant duplicate records while preserving legitimate transactions."
      },
      {
        code: "df.select('transaction_id')",
        label: "Keep only the transaction_id column",
        correct: false,
        explain: "Dropped user_id, amount, and timestamp! Fatal schema loss. (-15 Sanity)"
      },
      {
        code: "df.filter(col('amount') > 0)",
        label: "Filter for positive payment amount",
        correct: false,
        explain: "All duplicate payments have positive amounts! Duplicates remain unfixed. (-15 Sanity)"
      },
      {
        code: "df.limit(1)",
        label: "Take top 1 row from the dataframe",
        correct: false,
        explain: "Truncated the entire database down to 1 record! Total pipeline disaster. (-25 Sanity)"
      }
    ]
  },
  {
    id: 'phantom',
    name: '👻 PHANTOM',
    color: '#ffffff',
    meshColor: 0xffffff,
    desc: 'ML Incident: Downstream feature engineering script crashed with "ValueError: Input contains NaN or Null".',
    tableHeaders: ['customer_id', 'country', 'age', 'churn_risk'],
    tableRows: [
      ['CUST-10', 'LT', '29', '0.12'],
      ['CUST-11', 'NULL', 'NULL', '0.84'], // null cells
      ['CUST-12', 'US', '41', '0.05'],
      ['CUST-13', 'NaN', '33', 'NULL']    // null cells
    ],
    glitchIndices: [1, 3],
    skills: [
      {
        code: "df.fillna({'country': 'UNKNOWN', 'age': 0})",
        label: "Impute missing values with standardized defaults",
        correct: true,
        explain: "Clean! Imputes empty cells safely without losing customer records."
      },
      {
        code: "df.drop('country', 'age')",
        label: "Drop the country and age columns from schema",
        correct: false,
        explain: "Deleted required features needed for downstream model training! (-15 Sanity)"
      },
      {
        code: "df.na.drop()",
        label: "Drop all rows containing any missing value",
        correct: false,
        explain: "Too destructive! Discarded valuable customer rows unnecessarily. (-10 Sanity)"
      },
      {
        code: "df.withColumn('age', col('age') + 1)",
        label: "Increment age by 1",
        correct: false,
        explain: "NULL + 1 in SQL evaluates to NULL! The bug persists. (-15 Sanity)"
      }
    ]
  },
  {
    id: 'wyrm',
    name: '🐍 WYRM',
    color: '#ffffff',
    meshColor: 0xffffff,
    desc: 'Service Alert: PDF invoice generation failed when parsing customer names contaminated with unescaped control bytes.',
    tableHeaders: ['user_id', 'raw_name', 'email'],
    tableRows: [
      ['101', 'Alice Stark', 'alice@corp.io'],
      ['102', 'Bb%#\\x00$mith', 'bob@corp.io'], // corrupted symbols
      ['103', 'Carlos Vega', 'carlos@corp.io'],
      ['104', 'D@v!d_#99', 'david@corp.io']     // corrupted symbols
    ],
    glitchIndices: [1, 3],
    skills: [
      {
        code: "df.withColumn('raw_name', regexp_replace(col('raw_name'), '[^a-zA-Z\\s]', ''))",
        label: "Sanitize strings using regex character class filter",
        correct: true,
        explain: "Brilliant! Strips garbled symbols and binary control bytes while keeping valid names."
      },
      {
        code: "df.filter(col('raw_name').isNull())",
        label: "Filter for null names",
        correct: false,
        explain: "Returned an empty DataFrame! Zero records produced. (-20 Sanity)"
      },
      {
        code: "df.withColumn('raw_name', lower(col('raw_name')))",
        label: "Convert names to lowercase",
        correct: false,
        explain: "Lowercasing does not eliminate control characters! (-15 Sanity)"
      },
      {
        code: "df.distinct()",
        label: "Call distinct() across all rows",
        correct: false,
        explain: "Distinct does not alter or clean string contents inside columns. (-15 Sanity)"
      }
    ]
  },
  {
    id: 'mimic',
    name: '🦎 MIMIC',
    color: '#ffffff',
    meshColor: 0xffffff,
    desc: 'Analytics Alert: Revenue aggregation returned lexicographical string sorting instead of arithmetic sum calculations!',
    tableHeaders: ['invoice_id', 'revenue_str', 'status'],
    tableRows: [
      ['INV-01', '$1,250.00', 'PAID'],
      ['INV-02', '$450.50', 'PAID'],
      ['INV-03', '$9,900.00', 'PENDING'],
      ['INV-04', 'N/A_FREE', 'REFUNDED']
    ],
    glitchIndices: [0, 1, 2, 3],
    skills: [
      {
        code: "df.withColumn('revenue', regexp_replace(col('revenue_str'), '[$,]', '').cast('double'))",
        label: "Strip currency formatting and cast to numerical Double",
        correct: true,
        explain: "Excellent! Strips '$' and commas, then safely casts to Double for analytical queries."
      },
      {
        code: "df.withColumn('revenue', col('revenue_str').cast('double'))",
        label: "Directly cast formatted string to double without cleaning",
        correct: false,
        explain: "Directly casting '$1,250.00' to double yields all NULLs! Failed! (-15 Sanity)"
      },
      {
        code: "df.groupBy('revenue_str').sum()",
        label: "Directly sum the string column",
        correct: false,
        explain: "AnalysisException: cannot resolve sum(revenue_str) on string type. (-20 Sanity)"
      },
      {
        code: "df.limit(0)",
        label: "Clear dataframe buffer",
        correct: false,
        explain: "Emptied the table completely! (-25 Sanity)"
      }
    ]
  },
  {
    id: 'stalker',
    name: '👤 STALKER',
    color: '#ffffff',
    meshColor: 0xffffff,
    desc: 'Warehouse Incident: Dimension table join on store codes dropped 70% of rows despite matching IDs visually existing in source tables!',
    tableHeaders: ['order_id', 'store_code', 'shipped'],
    tableRows: [
      ['ORD-1', 'STORE_NYC   ', 'true'],  // trailing whitespace
      ['ORD-2', '  STORE_LON ', 'true'],  // leading/trailing whitespace
      ['ORD-3', 'STORE_TOK   ', 'false'], // trailing whitespace
      ['ORD-4', 'STORE_NYC', 'true']
    ],
    glitchIndices: [0, 1, 2],
    skills: [
      {
        code: "df.withColumn('store_code', trim(col('store_code')))",
        label: "Apply trim() to sanitize leading and trailing whitespace",
        correct: true,
        explain: "Clean! Strips invisible spaces so join keys match accurately."
      },
      {
        code: "df.filter(col('store_code') == 'STORE_NYC')",
        label: "Hardcode filter for one store code",
        correct: false,
        explain: "Dropped all other stores (London, Tokyo) causing severe data loss! (-15 Sanity)"
      },
      {
        code: "df.drop('store_code')",
        label: "Drop the store_code column entirely",
        correct: false,
        explain: "Without the foreign key, relational joins are permanently broken! (-15 Sanity)"
      },
      {
        code: "df.repartition(10)",
        label: "Repartition dataframe partitions",
        correct: false,
        explain: "Repartitioning partitions does not modify string contents! (-10 Sanity)"
      }
    ]
  },
  {
    id: 'colossus',
    name: '🌋 COLOSSUS',
    color: '#ffffff',
    meshColor: 0xffffff,
    desc: 'IoT Telemetry Warning: Factory sensors are sending negative device ages and impossible temperature spikes corrupting KPI averages!',
    tableHeaders: ['sensor_id', 'device_age_days', 'temperature_c'],
    tableRows: [
      ['SNS-1', '120', '24.5'],
      ['SNS-2', '-999', '26.1'],   // outlier negative age
      ['SNS-3', '45', '9999.0'],   // outlier extreme temp
      ['SNS-4', '-42', '21.0']     // outlier negative age
    ],
    glitchIndices: [1, 2, 3],
    skills: [
      {
        code: "df.filter((col('device_age_days') >= 0) & (col('temperature_c').between(-50, 150)))",
        label: "Filter records within legitimate domain boundaries",
        correct: true,
        explain: "Spot on! Filters out impossible sentinel values (-999, 9999) safely."
      },
      {
        code: "df.withColumn('temperature_c', lit(0))",
        label: "Overwrite all temperatures to zero",
        correct: false,
        explain: "Destroyed all legitimate telemetry temperature readings! (-15 Sanity)"
      },
      {
        code: "df.sort('device_age_days')",
        label: "Sort records by device age",
        correct: false,
        explain: "Sorting does not eliminate corrupt outliers! (-10 Sanity)"
      },
      {
        code: "df.sample(0.5)",
        label: "Randomly sample half the dataset",
        correct: false,
        explain: "Random sampling leaves corrupt outliers in the pipeline! (-15 Sanity)"
      }
    ]
  },
  {
    id: 'chronos',
    name: '⏳ CHRONOS',
    color: '#ffffff',
    meshColor: 0xffffff,
    desc: 'Ingestion Anomaly: Date partition creation failed because the raw date field mixes ISO-8601 (yyyy-MM-dd) and European (dd/MM/yyyy) formats!',
    tableHeaders: ['event_id', 'raw_date_str', 'user_id'],
    tableRows: [
      ['EVT-01', '2026-04-16', 'U100'],
      ['EVT-02', '16/04/2026', 'U101'], // dd/MM/yyyy format
      ['EVT-03', '2026-04-17', 'U102'],
      ['EVT-04', '30/12/2025', 'U103']  // dd/MM/yyyy format
    ],
    glitchIndices: [1, 3],
    skills: [
      {
        code: "df.withColumn('event_date', coalesce(to_date(col('raw_date_str'), 'yyyy-MM-dd'), to_date(col('raw_date_str'), 'dd/MM/yyyy')))",
        label: "Parse multiple formats with coalesce and to_date",
        correct: true,
        explain: "Masterful! Coalesce cleanly handles heterogeneous date patterns into a unified DateType."
      },
      {
        code: "df.withColumn('event_date', to_date(col('raw_date_str'), 'yyyy-MM-dd'))",
        label: "Strictly parse as yyyy-MM-dd only",
        correct: false,
        explain: "Turned European dates ('16/04/2026') into NULL values! (-15 Sanity)"
      },
      {
        code: "df.withColumn('event_date', col('raw_date_str').cast('date'))",
        label: "Blindly cast string to date type",
        correct: false,
        explain: "Inconsistent string formats resulted in nullified partitions! (-15 Sanity)"
      },
      {
        code: "df.drop('raw_date_str')",
        label: "Drop the raw date string column",
        correct: false,
        explain: "Without event dates, time-series partition pruning is impossible! (-20 Sanity)"
      }
    ]
  },
  {
    id: 'doppelganger',
    name: '🎭 DOPPELGÄNGER',
    color: '#ffffff',
    meshColor: 0xffffff,
    desc: 'BI Dashboard Issue: Executive report displays 5 fragmented category bars for account status instead of active vs inactive!',
    tableHeaders: ['account_id', 'status', 'tier'],
    tableRows: [
      ['ACC-1', 'Active', 'ENTERPRISE'],
      ['ACC-2', 'active', 'STARTUP'],    // lowercase
      ['ACC-3', 'ACTIVE ', 'GROWTH'],    // uppercase with space
      ['ACC-4', 'INACTIVE', 'FREE']
    ],
    glitchIndices: [0, 1, 2],
    skills: [
      {
        code: "df.withColumn('status', upper(trim(col('status'))))",
        label: "Standardize status with upper() and trim()",
        correct: true,
        explain: "Clean! Normalizes all variations ('active', 'Active', 'ACTIVE ') into unified 'ACTIVE'."
      },
      {
        code: "df.filter(col('status') == 'ACTIVE')",
        label: "Filter strictly for status == 'ACTIVE'",
        correct: false,
        explain: "Filtered out 'Active' and 'active' accounts, losing valid customers! (-15 Sanity)"
      },
      {
        code: "df.drop('status')",
        label: "Drop the status column",
        correct: false,
        explain: "Removed core account status metric! (-15 Sanity)"
      },
      {
        code: "df.distinct()",
        label: "Call distinct()",
        correct: false,
        explain: "Distinct treats 'Active' and 'active' as separate unique rows! (-10 Sanity)"
      }
    ]
  },
  {
    id: 'golem',
    name: '🗿 GOLEM',
    color: '#ffffff',
    meshColor: 0xffffff,
    desc: 'Pipeline Glitch: Event logs are displaying timestamps in the year 58492 due to raw millisecond Unix epoch ingestion!',
    tableHeaders: ['log_id', 'unix_ts', 'service'],
    tableRows: [
      ['LOG-1', '1776340800000', 'AUTH_SVC'], // millisecond timestamp
      ['LOG-2', '1776340805000', 'PAY_SVC'],  // millisecond timestamp
      ['LOG-3', '1776340810000', 'API_GW'],   // millisecond timestamp
      ['LOG-4', '1776340815000', 'DB_ROUTER'] // millisecond timestamp
    ],
    glitchIndices: [0, 1, 2, 3],
    skills: [
      {
        code: "df.withColumn('event_time', (col('unix_ts') / 1000).cast('timestamp'))",
        label: "Convert milliseconds to seconds before timestamp casting",
        correct: true,
        explain: "Brilliant! Normalizes epoch milliseconds to seconds for valid 2026 timestamps."
      },
      {
        code: "df.withColumn('event_time', col('unix_ts').cast('timestamp'))",
        label: "Directly cast raw milliseconds to timestamp",
        correct: false,
        explain: "Spark assumes seconds, yielding timestamps in year +58000! (-15 Sanity)"
      },
      {
        code: "df.withColumn('event_time', current_timestamp())",
        label: "Overwrite with current server timestamp",
        correct: false,
        explain: "Overwrote historical event timestamps with current ingestion time! (-20 Sanity)"
      },
      {
        code: "df.filter(col('unix_ts') < 2000000000)",
        label: "Filter unix_ts below 2 billion",
        correct: false,
        explain: "Wiped out the entire dataset because millisecond numbers exceed 1.7 trillion! (-25 Sanity)"
      }
    ]
  },
  {
    id: 'spectre',
    name: '⚡ SPECTRE',
    color: '#ffffff',
    meshColor: 0xffffff,
    desc: 'Data Contract Breach: Fraud classifier fails because boolean verification flag arrives as mixed strings: "Y", "N", "true", "1", "0"!',
    tableHeaders: ['user_id', 'verified_flag_raw', 'tier'],
    tableRows: [
      ['USR-1', 'Y', 'GOLD'],     // 'Y' representation
      ['USR-2', 'true', 'SILVER'],// 'true' representation
      ['USR-3', '0', 'BRONZE'],   // '0' representation
      ['USR-4', '1', 'GOLD']      // '1' representation
    ],
    glitchIndices: [0, 1, 2, 3],
    skills: [
      {
        code: "df.withColumn('is_verified', when(upper(trim(col('verified_flag_raw'))).isin('Y', 'TRUE', '1'), True).otherwise(False))",
        label: "Normalize truthy variants with when().otherwise() to Boolean",
        correct: true,
        explain: "Perfect! Robustly standardizes heterogeneous truthy values ('Y', 'true', '1') into clean Booleans."
      },
      {
        code: "df.withColumn('is_verified', col('verified_flag_raw').cast('boolean'))",
        label: "Directly cast string column to boolean",
        correct: false,
        explain: "Casting 'Y' or '1' directly to boolean produces NULL or FALSE in Spark SQL! (-15 Sanity)"
      },
      {
        code: "df.filter(col('verified_flag_raw') == 'true')",
        label: "Filter strictly for verified_flag_raw == 'true'",
        correct: false,
        explain: "Discarded legitimate users with 'Y' or '1' flags! (-15 Sanity)"
      },
      {
        code: "df.drop('verified_flag_raw')",
        label: "Drop verification column",
        correct: false,
        explain: "Without the verification flag, fraud detection models cannot operate! (-20 Sanity)"
      }
    ]
  }
];
