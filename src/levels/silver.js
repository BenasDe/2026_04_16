window.SILVER_LEVEL = {
  level: 2,
  name: "Silver Layer (SQL Transformations)",
  engine: "Spark SQL / ANSI SQL",
  description: "Write analytical SQL transformations to produce clean dimensional models and aggregated feature sets.",
  espressoToPlace: 2,
  redBullsToPlace: 2,
  tasks: [
    {
      id: "s_window",
      name: "WINDOW_RANKER",
      desc: "Isolate only the most recent status update per customer using an SQL window function.",
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
          explain: "ROW_NUMBER() partitioned by customer isolates the latest update record."
        },
        {
          code: "SELECT customer_id, MAX(updated_at) FROM updates GROUP BY customer_id",
          label: "GROUP BY with MAX(updated_at)",
          correct: false,
          explain: "status column omitted because it was not included in the GROUP BY clause."
        },
        {
          code: "SELECT * FROM updates ORDER BY updated_at DESC LIMIT 2",
          label: "Global ORDER BY updated_at DESC LIMIT 2",
          correct: false,
          explain: "LIMIT returns top 2 global rows regardless of customer groupings."
        },
        {
          code: "SELECT DISTINCT customer_id, status FROM updates",
          label: "SELECT DISTINCT customer_id, status",
          correct: false,
          explain: "Retains all historical status transitions since status values are distinct."
        }
      ]
    },
    {
      id: "s_having",
      name: "AGGREGATOR",
      desc: "Identify merchant accounts whose total transaction volume exceeds $10,000 using SQL aggregation.",
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
          explain: "HAVING clause filters aggregate sums after grouping."
        },
        {
          code: "SELECT merchant_id, SUM(amount) as total FROM transactions WHERE SUM(amount) > 10000 GROUP BY merchant_id",
          label: "WHERE SUM(amount) > 10000 GROUP BY merchant_id",
          correct: false,
          explain: "Syntax error: aggregate functions cannot appear in a WHERE clause."
        },
        {
          code: "SELECT merchant_id, amount FROM transactions WHERE amount > 10000",
          label: "Filter individual transactions > 10000",
          correct: false,
          explain: "Filters single transactions rather than aggregated volume per merchant."
        },
        {
          code: "SELECT merchant_id FROM transactions GROUP BY merchant_id",
          label: "GROUP BY merchant_id without sum filter",
          correct: false,
          explain: "Returns all merchants without applying the volume threshold."
        }
      ]
    },
    {
      id: "s_join",
      name: "ORPHAN_HUNTER",
      desc: "Identify all active users who have never completed an order using an SQL anti-join.",
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
          explain: "Anti-join isolates unmatched users with null foreign keys."
        },
        {
          code: "SELECT u.user_id, u.email FROM users u INNER JOIN orders o ON u.user_id = o.user_id",
          label: "INNER JOIN users and orders",
          correct: false,
          explain: "Inner join returns users with orders instead of orphans."
        },
        {
          code: "SELECT user_id, email FROM users WHERE user_id NOT IN (SELECT user_id FROM orders)",
          label: "WHERE user_id NOT IN (orders subquery)",
          correct: false,
          explain: "Vulnerable to NULL values: if orders contains a NULL user_id, NOT IN returns no rows."
        },
        {
          code: "SELECT user_id FROM users CROSS JOIN orders",
          label: "CROSS JOIN users and orders",
          correct: false,
          explain: "Cartesian product produces an unindexed join multiplication."
        }
      ]
    },
    {
      id: "s_case",
      name: "CLASSIFIER",
      desc: "Segment customers into 'VIP' (spend >= 1000), 'REGULAR' (spend >= 100), and 'NEW' using CASE WHEN.",
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
          explain: "Cascading thresholds evaluate largest spend bounds first."
        },
        {
          code: "SELECT customer_id, CASE WHEN lifetime_spend >= 100 THEN 'REGULAR' WHEN lifetime_spend >= 1000 THEN 'VIP' ELSE 'NEW' END AS tier FROM customers",
          label: "Inverted CASE WHEN order (>= 100 first)",
          correct: false,
          explain: "Spend >= 100 evaluates first, incorrectly classifying VIP accounts as REGULAR."
        },
        {
          code: "SELECT customer_id, IF(lifetime_spend >= 1000, 'VIP', 'REGULAR') AS tier FROM customers",
          label: "Binary IF statement",
          correct: false,
          explain: "Omits the 'NEW' tier, collapsing new accounts into REGULAR."
        },
        {
          code: "SELECT customer_id, 'VIP' AS tier FROM customers",
          label: "Hardcode all as 'VIP'",
          correct: false,
          explain: "Static literal labels zero-spend accounts as VIP."
        }
      ]
    },
    {
      id: "s_coalesce",
      name: "COALESCER",
      desc: "Standardize fallback contact info prioritizing mobile_phone -> work_phone -> email -> 'UNREACHABLE'.",
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
          explain: "COALESCE returns the first non-null contact value in precedence order."
        },
        {
          code: "SELECT user_id, NVL(mobile_phone, email) AS primary_contact FROM directory",
          label: "NVL(mobile_phone, email)",
          correct: false,
          explain: "Omits work_phone and fails when both mobile and email are null."
        },
        {
          code: "SELECT user_id, CONCAT(mobile_phone, work_phone, email) AS primary_contact FROM directory",
          label: "CONCAT all contact columns",
          correct: false,
          explain: "In standard SQL, string concatenation with NULL returns NULL."
        },
        {
          code: "SELECT user_id, email AS primary_contact FROM directory",
          label: "Select email only",
          correct: false,
          explain: "Ignores phone fallbacks and produces nulls for accounts without email."
        }
      ]
    }
  ]
};
