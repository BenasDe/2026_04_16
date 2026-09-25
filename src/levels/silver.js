/** Silver level task definitions. */
window.SILVER_LEVEL = {
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
};
