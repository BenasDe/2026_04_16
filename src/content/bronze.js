/** Schema v1 level. English is the base language; translated answers are keyed by stable ID. */
window.GameContent.registerLevel({
  id: "bronze",
  name: "Bronze Layer (Raw Ingestion)",
  engine: "PySpark 3.5.0",
  description: "Sanitize raw ingestion tables from Kafka and landing buckets before bronze tables corrupt downstream schemas.",
  fuelToPlace: 2,
  tasks: [
    {
      id: "b_chimera",
      name: "CHIMERA",
      desc: "Upstream retry storm caused identical payment transactions to be ingested multiple times.",
      tableHeaders: ["transaction_id","user_id","amount","timestamp"],
      tableRows: [
        ["TX-9901","USR_42","$150.00","10:00:01"],
        ["TX-9901","USR_42","$150.00","10:00:01"],
        ["TX-9902","USR_88","$25.50","10:00:04"],
        ["TX-9901","USR_42","$150.00","10:00:01"]
      ],
      glitchIndices: [1,3],
      skills: [
        {
          id: "deduplicate_by_transaction_id",
          code: "df.dropDuplicates(['transaction_id'])",
          label: "Deduplicate rows by transaction primary key",
          correct: true,
          explain: "Deduplicated rows by transaction ID without dropping unique transactions."
        },
        {
          id: "select_transaction_id_only",
          code: "df.select('transaction_id')",
          label: "Keep only transaction_id column",
          correct: false,
          explain: "Discarded user_id, amount, and timestamp columns."
        },
        {
          id: "filter_positive_amounts",
          code: "df.filter(col('amount') > 0)",
          label: "Filter for positive payment amount",
          correct: false,
          explain: "Duplicate transactions still have positive amounts; duplicates remain."
        },
        {
          id: "limit_transactions_to_one",
          code: "df.limit(1)",
          label: "Take top 1 row from dataframe",
          correct: false,
          explain: "Truncated the entire dataframe down to 1 record."
        }
      ],
      translations: {
        lt: {
          name: "CHIMERA",
          desc: "Pakartotinių užklausų banga lėmė identiškų mokėjimo transakcijų pasikartojantį įrašymą.",
          skills: {
            deduplicate_by_transaction_id: {
              label: "Panaikinti pasikartojančias eilutes pagal transakcijos raktą",
              explain: "Pasikartojančios eilutės pašalintos pagal transakcijos ID, išsaugant unikalius įrašus."
            },
            select_transaction_id_only: {
              label: "Palikti tik transaction_id stulpelį",
              explain: "Atmesti user_id, amount ir timestamp stulpeliai."
            },
            filter_positive_amounts: {
              label: "Filtruoti pagal teigiamą mokėjimo sumą",
              explain: "Pasikartojančios transakcijos turi teigiamas sumas; dublikatai lieka."
            },
            limit_transactions_to_one: {
              label: "Paimti tik 1 viršutinę eilutę iš duomenų rėmelio",
              explain: "Visas duomenų rėmelis sutrumpintas iki 1 įrašo."
            }
          }
        }
      }
    },
    {
      id: "b_phantom",
      name: "PHANTOM",
      desc: "Feature pipeline failed: customer records arrived with missing country codes and null ages.",
      tableHeaders: ["customer_id","country","age","churn_risk"],
      tableRows: [
        ["CUST-10","LT","29","0.12"],
        ["CUST-11","NULL","NULL","0.84"],
        ["CUST-12","US","41","0.05"],
        ["CUST-13","NaN","33","NULL"]
      ],
      glitchIndices: [1,3],
      skills: [
        {
          id: "fill_missing_country_and_age",
          code: "df.fillna({'country': 'UNKNOWN', 'age': 0})",
          label: "Impute missing values with standardized defaults",
          correct: true,
          explain: "Imputed missing fields cleanly without discarding customer records."
        },
        {
          id: "drop_country_and_age",
          code: "df.drop('country', 'age')",
          label: "Drop country and age columns from schema",
          correct: false,
          explain: "Deleted required features needed for downstream pipelines."
        },
        {
          id: "drop_null_customers",
          code: "df.na.drop()",
          label: "Drop all rows containing any null values",
          correct: false,
          explain: "Discarded 50% of valid customer records."
        },
        {
          id: "increment_customer_age",
          code: "df.withColumn('age', col('age') + 1)",
          label: "Increment age column by 1",
          correct: false,
          explain: "NULL + 1 remains NULL in Spark SQL."
        }
      ],
      translations: {
        lt: {
          name: "PHANTOM",
          desc: "Požymių srautas sugedo: klientų įrašai atvyko be šalies kodų ir su tuščiomis (NULL) amžiaus reikšmėmis.",
          skills: {
            fill_missing_country_and_age: {
              label: "Užpildyti trūkstamas reikšmes standartinėmis numatytosiomis",
              explain: "Trūkstami laukai tvarkingai užpildyti neatmetant klientų įrašų."
            },
            drop_country_and_age: {
              label: "Pašalinti šalies ir amžiaus stulpelius iš schemos",
              explain: "Ištrinti reikalingi požymiai, būtini tolesniems srautams."
            },
            drop_null_customers: {
              label: "Atmesti visas eilutes, turinčias bent vieną NULL reikšmę",
              explain: "Atmesta 50% galiojančių klientų įrašų."
            },
            increment_customer_age: {
              label: "Padidinti amžiaus stulpelį 1",
              explain: "NULL + 1 Spark SQL lieka NULL."
            }
          }
        }
      }
    },
    {
      id: "b_wyrm",
      name: "WYRM",
      desc: "Customer names contaminated with unescaped control bytes and binary regex symbols (\\x00, @#$).",
      tableHeaders: ["user_id","raw_name","email"],
      tableRows: [
        ["101","Alice Stark","alice@corp.io"],
        ["102","Bb%#\\x00$mith","bob@corp.io"],
        ["103","Carlos Vega","carlos@corp.io"],
        ["104","D@v!d_#99","david@corp.io"]
      ],
      glitchIndices: [1,3],
      skills: [
        {
          id: "remove_invalid_name_characters",
          code: "df.withColumn('raw_name', regexp_replace(col('raw_name'), '[^a-zA-Z\\s]', ''))",
          label: "Sanitize strings using regex character class filter",
          correct: true,
          explain: "Stripped illegal control characters while preserving alphabetical names."
        },
        {
          id: "select_null_names",
          code: "df.filter(col('raw_name').isNull())",
          label: "Filter for null names",
          correct: false,
          explain: "Filtered out valid names, returning an empty DataFrame."
        },
        {
          id: "lowercase_raw_names",
          code: "df.withColumn('raw_name', lower(col('raw_name')))",
          label: "Convert names to lowercase",
          correct: false,
          explain: "Lowercasing retains unescaped binary control characters."
        },
        {
          id: "distinct_name_rows",
          code: "df.distinct()",
          label: "Call distinct() across all rows",
          correct: false,
          explain: "distinct() does not sanitize column string contents."
        }
      ],
      translations: {
        lt: {
          name: "WYRM",
          desc: "Klientų vardai užteršti neapdorotais valdymo baitais ir specialiais simboliais (\\x00, @#$).",
          skills: {
            remove_invalid_name_characters: {
              label: "Išvalyti eilutes naudojant reguliariosios išraiškos filtrą",
              explain: "Pašalinti neleistini valdymo simboliai, išsaugant raidinius vardus."
            },
            select_null_names: {
              label: "Filtruoti tik tuščius (NULL) vardus",
              explain: "Atmesti visi teisingi vardai, grąžintas tuščias duomenų rėmelis."
            },
            lowercase_raw_names: {
              label: "Paversti vardus mažosiomis raidėmis",
              explain: "Mažosios raidės nepašalina neapdorotų binarinių valdymo simbolių."
            },
            distinct_name_rows: {
              label: "Iškviesti distinct() visoms eilutėms",
              explain: "distinct() neišvalo stulpelių tekstinio turinio."
            }
          }
        }
      }
    },
    {
      id: "b_mimic",
      name: "MIMIC",
      desc: "Revenue metrics arrived as formatted currency strings ('$1,250.00'), breaking numeric aggregations.",
      tableHeaders: ["invoice_id","revenue_str","status"],
      tableRows: [
        ["INV-01","$1,250.00","PAID"],
        ["INV-02","$450.50","PAID"],
        ["INV-03","$9,900.00","PENDING"],
        ["INV-04","N/A_FREE","REFUNDED"]
      ],
      glitchIndices: [0,1,2,3],
      skills: [
        {
          id: "clean_and_cast_revenue",
          code: "df.withColumn('revenue', regexp_replace(col('revenue_str'), '[$,]', '').cast('double'))",
          label: "Strip currency symbols and cast to Double",
          correct: true,
          explain: "Stripped currency symbols and cast string to numeric Double."
        },
        {
          id: "cast_formatted_revenue_directly",
          code: "df.withColumn('revenue', col('revenue_str').cast('double'))",
          label: "Directly cast string to double",
          correct: false,
          explain: "Direct cast on formatted '$1,250.00' evaluates to NULL in Spark SQL."
        },
        {
          id: "sum_revenue_strings",
          code: "df.groupBy('revenue_str').sum()",
          label: "Directly sum the string column",
          correct: false,
          explain: "AnalysisException: cannot resolve sum() on string data type."
        },
        {
          id: "remove_all_revenue_rows",
          code: "df.limit(0)",
          label: "Truncate dataframe buffer",
          correct: false,
          explain: "Emptied the entire table."
        }
      ],
      translations: {
        lt: {
          name: "MIMIC",
          desc: "Pajamų rodikliai atvyko kaip formatuotas tekstas ('$1,250.00'), stabdantis skaitinę agregaciją.",
          skills: {
            clean_and_cast_revenue: {
              label: "Pašalinti valiutos simbolius ir konvertuoti į Double tipą",
              explain: "Valiutos simboliai pašalinti, tekstas konvertuotas į skaitinį Double tipą."
            },
            cast_formatted_revenue_directly: {
              label: "Tiesiogiai konvertuoti tekstą į Double",
              explain: "Tiesioginė formatuoto '$1,250.00' konversija Spark SQL grąžina NULL."
            },
            sum_revenue_strings: {
              label: "Tiesiogiai sumuoti tekstinį stulpelį",
              explain: "AnalysisException: negalima atlikti sum() tekstinio tipo stulpeliui."
            },
            remove_all_revenue_rows: {
              label: "Išvalyti duomenų rėmelio buferį",
              explain: "Išvalyta visa lentelė."
            }
          }
        }
      }
    },
    {
      id: "b_stalker",
      name: "STALKER",
      desc: "Foreign key join dropped rows due to unescaped leading and trailing whitespace in store codes.",
      tableHeaders: ["order_id","store_code","shipped"],
      tableRows: [
        ["ORD-1","STORE_NYC   ","true"],
        ["ORD-2","  STORE_LON ","true"],
        ["ORD-3","STORE_TOK   ","false"],
        ["ORD-4","STORE_NYC","true"]
      ],
      glitchIndices: [0,1,2],
      skills: [
        {
          id: "trim_store_codes",
          code: "df.withColumn('store_code', trim(col('store_code')))",
          label: "Apply trim() to strip leading and trailing spaces",
          correct: true,
          explain: "Trimmed whitespace padding, restoring join key alignment."
        },
        {
          id: "keep_only_new_york_store",
          code: "df.filter(col('store_code') == 'STORE_NYC')",
          label: "Hardcode filter for single store code",
          correct: false,
          explain: "Filtered out London and Tokyo stores, resulting in data loss."
        },
        {
          id: "drop_store_code",
          code: "df.drop('store_code')",
          label: "Drop the store_code column entirely",
          correct: false,
          explain: "Dropped the foreign key required for downstream joins."
        },
        {
          id: "repartition_store_rows",
          code: "df.repartition(10)",
          label: "Repartition dataframe into 10 partitions",
          correct: false,
          explain: "Repartitioning changes partition distribution, not column whitespace."
        }
      ],
      translations: {
        lt: {
          name: "STALKER",
          desc: "Išorinio rakto sujungimas prarado eilutes dėl nepašalintų tarpų parduotuvių koduose.",
          skills: {
            trim_store_codes: {
              label: "Pritaikyti trim() pradžios ir pabaigos tarpų pašalinimui",
              explain: "Tarpai pašalinti, sujungimo raktai vėl sutampa."
            },
            keep_only_new_york_store: {
              label: "Filtruoti tik vieną konkrečios parduotuvės kodą",
              explain: "Atmestos Londono ir Tokijo parduotuvės, prarasti duomenys."
            },
            drop_store_code: {
              label: "Visiškai pašalinti store_code stulpelį",
              explain: "Pašalintas išorinis raktas, būtinas tolesniems sujungimams."
            },
            repartition_store_rows: {
              label: "Perskirstyti duomenų rėmelį į 10 skaidinių",
              explain: "Perskirstymas keičia skaidinius, bet nepašalina tarpų reikšmėse."
            }
          }
        }
      }
    }
  ],
  translations: {
    lt: {
      name: "Bronzos sluoksnis (Neapdorotų duomenų gavimas)",
      description: "Išvalykite neapdorotas lenteles iš Kafka ir talpyklų, kol klaidingos schemos nesugadino tolesnių procesų."
    }
  }
});
