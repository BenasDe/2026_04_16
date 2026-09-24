/**
 * @file data.js
 * @description Data Engineering Anomaly Database, Mock DataFrames, and PySpark Skills.
 * Contains real-world data table bugs (duplicates, nulls, regex corruption, strings as floats, etc.)
 */

window.ANOMALY_DATABASE = [
  {
    id: 'dup_rows',
    name: '👥 DUPLICATE_ROWS_HYDRA',
    color: '#f85149',
    meshColor: 0xff4757,
    desc: 'Incoming stream contains duplicate rows due to message queue retry without idempotency!',
    tableHeaders: ['transaction_id', 'user_id', 'amount', 'timestamp'],
    tableRows: [
      ['TX-9901', 'USR_42', '$150.00', '10:00:01'],
      ['TX-9901', 'USR_42', '$150.00', '10:00:01'], // Corrupted duplicate
      ['TX-9902', 'USR_88', '$25.50', '10:00:04'],
      ['TX-9901', 'USR_42', '$150.00', '10:00:01']  // Corrupted duplicate
    ],
    glitchIndices: [1, 3],
    skills: [
      {
        code: "df.dropDuplicates(['transaction_id'])",
        label: "Drop duplicates by primary key",
        correct: true,
        explain: "Perfect! Removes redundant rows keeping exact unique transaction records."
      },
      {
        code: "df.select('transaction_id')",
        label: "Keep only transaction ID column",
        correct: false,
        explain: "Dropped all other columns (user_id, amount) causing data loss! (-15 Sanity)"
      },
      {
        code: "df.filter(col('amount') > 0)",
        label: "Filter positive amount",
        correct: false,
        explain: "Doesn't solve duplicate rows, rows still duplicated! (-15 Sanity)"
      },
      {
        code: "df.limit(1)",
        label: "Take top 1 row",
        correct: false,
        explain: "Destroys whole table except 1 row! Pipeline corrupted! (-20 Sanity)"
      }
    ]
  },
  {
    id: 'null_cells',
    name: '🕳️ NULL_POINTER_VOID',
    color: '#a371f7',
    meshColor: 0x9b59b6,
    desc: 'Critical column contains NULL and NaN values, which will crash downstream ML feature pipelines!',
    tableHeaders: ['customer_id', 'country', 'age', 'churn_risk'],
    tableRows: [
      ['CUST-10', 'LT', '29', '0.12'],
      ['CUST-11', 'NULL', 'NULL', '0.84'], // Corrupted nulls
      ['CUST-12', 'US', '41', '0.05'],
      ['CUST-13', 'NaN', '33', 'NULL']    // Corrupted nulls
    ],
    glitchIndices: [1, 3],
    skills: [
      {
        code: "df.fillna({'country': 'UNKNOWN', 'age': 0})",
        label: "Fill missing NULL values with sensible defaults",
        correct: true,
        explain: "Great! Imputes empty cells cleanly without dropping rows."
      },
      {
        code: "df.drop('country', 'age')",
        label: "Drop the columns with NULLs",
        correct: false,
        explain: "Deleted required features from schema! Sanity down! (-15 Sanity)"
      },
      {
        code: "df.na.drop()",
        label: "Drop all rows with any null value",
        correct: false,
        explain: "Aggressive drop wiped out valid business records! (-10 Sanity)"
      },
      {
        code: "df.withColumn('age', col('age') + 1)",
        label: "Increment age by 1",
        correct: false,
        explain: "NULL + 1 is still NULL! Bug persists. (-15 Sanity)"
      }
    ]
  },
  {
    id: 'garbled_symbols',
    name: '👾 UNICODE_CORRUPTION_GREMLIN',
    color: '#e36209',
    meshColor: 0xe67e22,
    desc: 'Names contaminated with random binary bytes and corrupt regex control symbols (e.g. #@$*\\x00)!',
    tableHeaders: ['user_id', 'raw_name', 'email'],
    tableRows: [
      ['101', 'Alice Stark', 'alice@corp.io'],
      ['102', 'Bb%#\\x00$mith', 'bob@corp.io'], // Corrupted string
      ['103', 'Carlos Vega', 'carlos@corp.io'],
      ['104', 'D@v!d_#99', 'david@corp.io']     // Corrupted string
    ],
    glitchIndices: [1, 3],
    skills: [
      {
        code: "df.withColumn('raw_name', regexp_replace(col('raw_name'), '[^a-zA-Z\\s]', ''))",
        label: "Sanitize using Regex replacement",
        correct: true,
        explain: "Brilliant! Strips garbled symbols while preserving valid alphabetic characters."
      },
      {
        code: "df.filter(col('raw_name').isNull())",
        label: "Filter for null names",
        correct: false,
        explain: "Returned empty dataframe! Empty dataset crash! (-20 Sanity)"
      },
      {
        code: "df.withColumn('raw_name', lower(col('raw_name')))",
        label: "Convert to lowercase",
        correct: false,
        explain: "Symbols still remain corrupted (bb%#\\x00...)! (-15 Sanity)"
      },
      {
        code: "df.distinct()",
        label: "Call distinct()",
        correct: false,
        explain: "Distinct does not clean strings inside columns! (-15 Sanity)"
      }
    ]
  },
  {
    id: 'type_mismatch',
    name: '🎭 STRINGIFIED_FLOAT_IMPOSTER',
    color: '#58a6ff',
    meshColor: 0x3498db,
    desc: 'Numerical revenue amounts were ingested as dirty String formats with currency symbols!',
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
        label: "Clean string and cast to Double",
        correct: true,
        explain: "Spot on! Strips symbols '$' and commas, then casts to numerical Double for aggregation."
      },
      {
        code: "df.withColumn('revenue', col('revenue_str').cast('double'))",
        label: "Directly cast dirty string to double",
        correct: false,
        explain: "Direct cast on '$1,250.00' yields all NULLs! Failed! (-15 Sanity)"
      },
      {
        code: "df.groupBy('revenue_str').sum()",
        label: "Sum the string column directly",
        correct: false,
        explain: "PySpark AnalysisException: cannot sum string type! (-20 Sanity)"
      },
      {
        code: "df.limit(0)",
        label: "Truncate table",
        correct: false,
        explain: "Deleted the whole dataset! (-25 Sanity)"
      }
    ]
  },
  {
    id: 'whitespace_phantom',
    name: '👻 TRAILING_WHITESPACE_PHANTOM',
    color: '#2ea043',
    meshColor: 0x2ecc71,
    desc: 'Hidden trailing spaces in join keys are causing joins to drop 60% of matched records!',
    tableHeaders: ['order_id', 'store_code', 'shipped'],
    tableRows: [
      ['ORD-1', 'STORE_NYC   ', 'true'],  // Corrupted whitespace
      ['ORD-2', '  STORE_LON ', 'true'],  // Corrupted whitespace
      ['ORD-3', 'STORE_TOK   ', 'false'], // Corrupted whitespace
      ['ORD-4', 'STORE_NYC', 'true']
    ],
    glitchIndices: [0, 1, 2],
    skills: [
      {
        code: "df.withColumn('store_code', trim(col('store_code')))",
        label: "Apply trim() on store_code",
        correct: true,
        explain: "Clean! Strips leading/trailing spaces and heals downstream joins."
      },
      {
        code: "df.filter(col('store_code') == 'STORE_NYC')",
        label: "Hardcode filter for one store",
        correct: false,
        explain: "Dropped all other stores (London, Tokyo)! (-15 Sanity)"
      },
      {
        code: "df.drop('store_code')",
        label: "Drop the store_code column",
        correct: false,
        explain: "Without join key, foreign table cannot be connected! (-15 Sanity)"
      },
      {
        code: "df.repartition(10)",
        label: "Repartition dataframe",
        correct: false,
        explain: "Repartitioning doesn't trim whitespace strings! (-10 Sanity)"
      }
    ]
  },
  {
    id: 'outlier_anomalies',
    name: '💥 OUT_OF_BOUNDS_BEHEMOTH',
    color: '#d29922',
    meshColor: 0xf1c40f,
    desc: 'Sensor readings have negative age values (-999) and impossible outliers corrupting analytics!',
    tableHeaders: ['sensor_id', 'device_age_days', 'temperature_c'],
    tableRows: [
      ['SNS-1', '120', '24.5'],
      ['SNS-2', '-999', '26.1'],   // Corrupted outlier
      ['SNS-3', '45', '9999.0'],   // Corrupted outlier
      ['SNS-4', '-42', '21.0']     // Corrupted outlier
    ],
    glitchIndices: [1, 2, 3],
    skills: [
      {
        code: "df.filter((col('device_age_days') >= 0) & (col('temperature_c').between(-50, 150)))",
        label: "Filter valid domain boundaries",
        correct: true,
        explain: "Excellent! Clamps and cleans invalid sensor readings effectively."
      },
      {
        code: "df.withColumn('temperature_c', lit(0))",
        label: "Set all temperatures to 0",
        correct: false,
        explain: "Wiped out legitimate sensor metrics! (-15 Sanity)"
      },
      {
        code: "df.sort('device_age_days')",
        label: "Sort dataframe",
        correct: false,
        explain: "Sorting keeps the bad outliers in the dataset! (-10 Sanity)"
      },
      {
        code: "df.sample(0.5)",
        label: "Randomly sample half of rows",
        correct: false,
        explain: "Outliers still present in the sample! (-15 Sanity)"
      }
    ]
  }
];
