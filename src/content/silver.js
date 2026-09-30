/** Schema v1 level. English is the base language; translated answers are keyed by stable ID. */
window.GameContent.registerLevel({
  id: "silver",
  name: "Silver Layer (SQL Transformations)",
  engine: "Spark SQL / ANSI SQL",
  description: "Write analytical SQL transformations to produce clean dimensional models and aggregated feature sets.",
  fuelToPlace: 2,
  tasks: [
    {
      id: "s_window",
      name: "WINDOW_RANKER",
      desc: "Isolate only the most recent status update per customer using an SQL window function.",
      tableHeaders: ["customer_id","status","updated_at"],
      tableRows: [
        ["C-1","ACTIVE","2026-04-01 10:00:00"],
        ["C-1","SUSPENDED","2026-04-02 12:00:00"],
        ["C-2","PENDING","2026-04-01 09:00:00"],
        ["C-2","ACTIVE","2026-04-03 15:00:00"]
      ],
      glitchIndices: [0,2],
      skills: [
        {
          id: "rank_latest_customer_update",
          code: "SELECT * FROM (SELECT *, ROW_NUMBER() OVER(PARTITION BY customer_id ORDER BY updated_at DESC) as rn FROM updates) WHERE rn = 1",
          label: "Window ROW_NUMBER() partitioned by customer descending",
          correct: true,
          explain: "ROW_NUMBER() partitioned by customer isolates the latest update record."
        },
        {
          id: "aggregate_latest_timestamp_only",
          code: "SELECT customer_id, MAX(updated_at) FROM updates GROUP BY customer_id",
          label: "GROUP BY with MAX(updated_at)",
          correct: false,
          explain: "status column omitted because it was not included in the GROUP BY clause."
        },
        {
          id: "limit_global_latest_updates",
          code: "SELECT * FROM updates ORDER BY updated_at DESC LIMIT 2",
          label: "Global ORDER BY updated_at DESC LIMIT 2",
          correct: false,
          explain: "LIMIT returns top 2 global rows regardless of customer groupings."
        },
        {
          id: "distinct_customer_statuses",
          code: "SELECT DISTINCT customer_id, status FROM updates",
          label: "SELECT DISTINCT customer_id, status",
          correct: false,
          explain: "Retains all historical status transitions since status values are distinct."
        }
      ],
      translations: {
        lt: {
          name: "WINDOW_RANKER",
          desc: "Atrinkti tik naujausią kiekvieno kliento būsenos atnaujinimą naudojant SQL lango funkciją.",
          skills: {
            rank_latest_customer_update: {
              label: "Lango funkcija ROW_NUMBER(), skaidoma pagal klientą mažėjimo tvarka",
              explain: "ROW_NUMBER() pagal klientą atrenka patį vėliausią atnaujinimo įrašą."
            },
            aggregate_latest_timestamp_only: {
              label: "GROUP BY su MAX(updated_at)",
              explain: "status stulpelis praleistas, nes nebuvo įtrauktas į GROUP BY sąlygą."
            },
            limit_global_latest_updates: {
              label: "Bendras ORDER BY updated_at DESC LIMIT 2",
              explain: "LIMIT grąžina 2 bendras eilutes, nepriklausomai nuo klientų grupių."
            },
            distinct_customer_statuses: {
              label: "SELECT DISTINCT customer_id, status",
              explain: "Išsaugo visus istorinius būsenų pasikeitimus, nes reikšmės unikalios."
            }
          }
        }
      }
    },
    {
      id: "s_having",
      name: "AGGREGATOR",
      desc: "Identify merchant accounts whose total transaction volume exceeds $10,000 using SQL aggregation.",
      tableHeaders: ["merchant_id","tx_count","total_volume"],
      tableRows: [
        ["M-80","150","$24,500.00"],
        ["M-81","12","$450.00"],
        ["M-82","310","$92,000.00"],
        ["M-83","5","$120.00"]
      ],
      glitchIndices: [1,3],
      skills: [
        {
          id: "filter_merchant_totals_with_having",
          code: "SELECT merchant_id, SUM(amount) as total FROM transactions GROUP BY merchant_id HAVING SUM(amount) > 10000",
          label: "GROUP BY merchant_id HAVING SUM(amount) > 10000",
          correct: true,
          explain: "HAVING clause filters aggregate sums after grouping."
        },
        {
          id: "filter_aggregate_in_where",
          code: "SELECT merchant_id, SUM(amount) as total FROM transactions WHERE SUM(amount) > 10000 GROUP BY merchant_id",
          label: "WHERE SUM(amount) > 10000 GROUP BY merchant_id",
          correct: false,
          explain: "Syntax error: aggregate functions cannot appear in a WHERE clause."
        },
        {
          id: "filter_individual_large_transactions",
          code: "SELECT merchant_id, amount FROM transactions WHERE amount > 10000",
          label: "Filter individual transactions > 10000",
          correct: false,
          explain: "Filters single transactions rather than aggregated volume per merchant."
        },
        {
          id: "group_merchants_without_threshold",
          code: "SELECT merchant_id FROM transactions GROUP BY merchant_id",
          label: "GROUP BY merchant_id without sum filter",
          correct: false,
          explain: "Returns all merchants without applying the volume threshold."
        }
      ],
      translations: {
        lt: {
          name: "AGGREGATOR",
          desc: "Nustatyti prekybininkų paskyras, kurių bendra transakcijų suma viršija $10,000, naudojant SQL agregaciją.",
          skills: {
            filter_merchant_totals_with_having: {
              label: "GROUP BY merchant_id HAVING SUM(amount) > 10000",
              explain: "HAVING sąlyga filtruoja agreguotas sumas po grupavimo."
            },
            filter_aggregate_in_where: {
              label: "WHERE SUM(amount) > 10000 GROUP BY merchant_id",
              explain: "Sintaksės klaida: agregavimo funkcijos negali būti WHERE sąlygoje."
            },
            filter_individual_large_transactions: {
              label: "Filtruoti atskiras transakcijas > 10000",
              explain: "Filtruoja pavienes transakcijas, o ne bendrą prekybininko apyvartą."
            },
            group_merchants_without_threshold: {
              label: "GROUP BY merchant_id be sumos filtro",
              explain: "Grąžina visus prekybininkus nepritaikius apyvartos ribos."
            }
          }
        }
      }
    },
    {
      id: "s_join",
      name: "ORPHAN_HUNTER",
      desc: "Identify all active users who have never completed an order using an SQL anti-join.",
      tableHeaders: ["user_id","email","has_orders"],
      tableRows: [
        ["U-10","alex@lab.io","Has 3 orders"],
        ["U-11","sam@lab.io","0 orders (orphan)"],
        ["U-12","eva@lab.io","Has 12 orders"],
        ["U-13","leo@lab.io","0 orders (orphan)"]
      ],
      glitchIndices: [1,3],
      skills: [
        {
          id: "find_users_without_orders",
          code: "SELECT u.user_id, u.email FROM users u LEFT JOIN orders o ON u.user_id = o.user_id WHERE o.order_id IS NULL",
          label: "LEFT JOIN ... WHERE o.order_id IS NULL",
          correct: true,
          explain: "Anti-join isolates unmatched users with null foreign keys."
        },
        {
          id: "join_users_with_orders",
          code: "SELECT u.user_id, u.email FROM users u INNER JOIN orders o ON u.user_id = o.user_id",
          label: "INNER JOIN users and orders",
          correct: false,
          explain: "Inner join returns users with orders instead of orphans."
        },
        {
          id: "exclude_users_with_not_in",
          code: "SELECT user_id, email FROM users WHERE user_id NOT IN (SELECT user_id FROM orders)",
          label: "WHERE user_id NOT IN (orders subquery)",
          correct: false,
          explain: "Vulnerable to NULL values: if orders contains a NULL user_id, NOT IN returns no rows."
        },
        {
          id: "cross_join_users_and_orders",
          code: "SELECT user_id FROM users CROSS JOIN orders",
          label: "CROSS JOIN users and orders",
          correct: false,
          explain: "Cartesian product produces an unindexed join multiplication."
        }
      ],
      translations: {
        lt: {
          name: "ORPHAN_HUNTER",
          desc: "Rasti visus aktyvius vartotojus, kurie niekada neatliko užsakymo, naudojant SQL anti-join.",
          skills: {
            find_users_without_orders: {
              label: "LEFT JOIN ... WHERE o.order_id IS NULL",
              explain: "Anti-join atrenka nesusietus vartotojus su NULL išoriniais raktais."
            },
            join_users_with_orders: {
              label: "INNER JOIN tarp vartotojų ir užsakymų",
              explain: "Vidinis sujungimas grąžina vartotojus su užsakymais, o ne be jų."
            },
            exclude_users_with_not_in: {
              label: "WHERE user_id NOT IN (užsakymų po-užklausa)",
              explain: "Pažeidžiama NULL reikšmėms: jei užsakymuose yra NULL, NOT IN negrąžina eilučių."
            },
            cross_join_users_and_orders: {
              label: "CROSS JOIN vartotojų ir užsakymų lentelėms",
              explain: "Dekarto sandauga sukuria nekontroliuojamą eilučių dauginimąsi."
            }
          }
        }
      }
    },
    {
      id: "s_case",
      name: "CLASSIFIER",
      desc: "Segment customers into 'VIP' (spend >= 1000), 'REGULAR' (spend >= 100), and 'NEW' using CASE WHEN.",
      tableHeaders: ["customer_id","lifetime_spend","target_tier"],
      tableRows: [
        ["C-501","$1,450.00","Should be VIP"],
        ["C-502","$340.00","Should be REGULAR"],
        ["C-503","$25.00","Should be NEW"],
        ["C-504","$2,100.00","Should be VIP"]
      ],
      glitchIndices: [0,1,2,3],
      skills: [
        {
          id: "classify_spend_highest_threshold_first",
          code: "SELECT customer_id, CASE WHEN lifetime_spend >= 1000 THEN 'VIP' WHEN lifetime_spend >= 100 THEN 'REGULAR' ELSE 'NEW' END AS tier FROM customers",
          label: "Evaluated CASE WHEN tier segmentation",
          correct: true,
          explain: "Cascading thresholds evaluate largest spend bounds first."
        },
        {
          id: "classify_spend_lowest_threshold_first",
          code: "SELECT customer_id, CASE WHEN lifetime_spend >= 100 THEN 'REGULAR' WHEN lifetime_spend >= 1000 THEN 'VIP' ELSE 'NEW' END AS tier FROM customers",
          label: "Inverted CASE WHEN order (>= 100 first)",
          correct: false,
          explain: "Spend >= 100 evaluates first, incorrectly classifying VIP accounts as REGULAR."
        },
        {
          id: "classify_spend_with_binary_if",
          code: "SELECT customer_id, IF(lifetime_spend >= 1000, 'VIP', 'REGULAR') AS tier FROM customers",
          label: "Binary IF statement",
          correct: false,
          explain: "Omits the 'NEW' tier, collapsing new accounts into REGULAR."
        },
        {
          id: "classify_every_customer_as_vip",
          code: "SELECT customer_id, 'VIP' AS tier FROM customers",
          label: "Hardcode all as 'VIP'",
          correct: false,
          explain: "Static literal labels zero-spend accounts as VIP."
        }
      ],
      translations: {
        lt: {
          name: "CLASSIFIER",
          desc: "Suskirstyti klientus į 'VIP' (išlaidos >= 1000), 'REGULAR' (>= 100) ir 'NEW' naudojant CASE WHEN.",
          skills: {
            classify_spend_highest_threshold_first: {
              label: "Nuoseklus CASE WHEN lygmenų skirstymas",
              explain: "Nuoseklios sąlygos pirmiausia patikrina didžiausias išlaidų ribas."
            },
            classify_spend_lowest_threshold_first: {
              label: "Apversta CASE WHEN tvarka (>= 100 pirma)",
              explain: "Išlaidos >= 100 tikrinamos pirmiausia, todėl VIP priskiriami REGULAR."
            },
            classify_spend_with_binary_if: {
              label: "Dvejetainė IF sąlyga",
              explain: "Praleidžiamas 'NEW' lygmuo, naujos paskyros tampa REGULAR."
            },
            classify_every_customer_as_vip: {
              label: "Priskirti visiems fiksuotą 'VIP'",
              explain: "Statinė reikšmė neturinčias išlaidų paskyras pažymi kaip VIP."
            }
          }
        }
      }
    },
    {
      id: "s_coalesce",
      name: "COALESCER",
      desc: "Standardize fallback contact info prioritizing mobile_phone -> work_phone -> email -> 'UNREACHABLE'.",
      tableHeaders: ["user_id","mobile_phone","work_phone","email"],
      tableRows: [
        ["U-90","NULL","+370-600-1111","test@corp.lt"],
        ["U-91","NULL","NULL","contact@web.io"],
        ["U-92","NULL","NULL","NULL"],
        ["U-93","+370-699-2222","NULL","ceo@corp.lt"]
      ],
      glitchIndices: [0,1,2],
      skills: [
        {
          id: "coalesce_contacts_in_priority_order",
          code: "SELECT user_id, COALESCE(mobile_phone, work_phone, email, 'UNREACHABLE') AS primary_contact FROM directory",
          label: "COALESCE(mobile, work, email, 'UNREACHABLE')",
          correct: true,
          explain: "COALESCE returns the first non-null contact value in precedence order."
        },
        {
          id: "nvl_mobile_and_email",
          code: "SELECT user_id, NVL(mobile_phone, email) AS primary_contact FROM directory",
          label: "NVL(mobile_phone, email)",
          correct: false,
          explain: "Omits work_phone and fails when both mobile and email are null."
        },
        {
          id: "concatenate_contact_fields",
          code: "SELECT user_id, CONCAT(mobile_phone, work_phone, email) AS primary_contact FROM directory",
          label: "CONCAT all contact columns",
          correct: false,
          explain: "In standard SQL, string concatenation with NULL returns NULL."
        },
        {
          id: "select_email_only",
          code: "SELECT user_id, email AS primary_contact FROM directory",
          label: "Select email only",
          correct: false,
          explain: "Ignores phone fallbacks and produces nulls for accounts without email."
        }
      ],
      translations: {
        lt: {
          name: "COALESCER",
          desc: "Standartizuoti atsarginį kontaktą pagal prioritetą: mobilusis -> darbo tel. -> el. paštas -> 'NEPASIEKIAMAS'.",
          skills: {
            coalesce_contacts_in_priority_order: {
              label: "COALESCE(mobile_phone, work_phone, email, 'NEPASIEKIAMAS')",
              explain: "COALESCE grąžina pirmą ne tuščią (non-null) reikšmę pagal nurodytą prioritetą."
            },
            nvl_mobile_and_email: {
              label: "NVL(mobile_phone, email)",
              explain: "Praleidžia darbo telefoną ir nepateikia atsarginio varianto, kai abu tušti."
            },
            concatenate_contact_fields: {
              label: "CONCAT visiems kontaktų stulpeliams",
              explain: "Standartiniame SQL eilučių jungimas su NULL grąžina NULL."
            },
            select_email_only: {
              label: "Pasirinkti tik el. paštą",
              explain: "Ignoruoja telefonus ir grąžina NULL paskyroms be el. pašto."
            }
          }
        }
      }
    }
  ],
  translations: {
    lt: {
      name: "Sidabro sluoksnis (SQL transformacijos)",
      description: "Kurkite analitines SQL transformacijas švariems dimensijų modeliams ir agreguotiems požymių rinkiniams."
    }
  }
});
