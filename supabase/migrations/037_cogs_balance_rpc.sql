-- Migration 037: get_cogs_balances() — safe aggregate Cogs totals
--
-- Root cause of the Command Center Cogs-total mismatch: the dashboard was
-- fetching every points_log row for a household with .select("student_id,
-- points").in("student_id", ids) and summing in JS. PostgREST silently caps
-- unbounded selects at 1000 rows with no ORDER BY, so once a household's
-- combined ledger passed 1000 rows, some rows (not reliably the oldest —
-- whatever didn't fit in the scan) were dropped from the sum. The dropped
-- rows happened to skew negative, so totals read HIGHER than the true
-- balance, and identically on every refresh since the cap is deterministic.
--
-- Fix: aggregate in Postgres and return only the per-student sums (2 rows,
-- not 1000+), so this can never be truncated no matter how large the ledger
-- grows.
CREATE OR REPLACE FUNCTION get_cogs_balances(p_student_ids uuid[])
RETURNS TABLE (student_id uuid, balance bigint)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT pl.student_id, COALESCE(sum(pl.points), 0) AS balance
  FROM points_log pl
  WHERE pl.student_id = ANY(p_student_ids)
  GROUP BY pl.student_id;
$$;

-- Server-only (called via service role from Next.js server components).
REVOKE EXECUTE ON FUNCTION get_cogs_balances(uuid[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION get_cogs_balances(uuid[]) TO service_role;
