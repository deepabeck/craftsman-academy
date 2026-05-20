-- Migration 034: Allow negative points in points_log
--
-- The original CHECK (points > 0) constraint was added in 014 when points
-- were only earned. Marketplace purchase deductions (added in 015/016) insert
-- negative values to represent Cogs spent. The app design explicitly allows
-- the balance to go negative after purchases.
--
-- Replace the constraint with CHECK (points <> 0) so zero is still blocked
-- (accidental no-op entries) but negative deductions are allowed.

ALTER TABLE points_log DROP CONSTRAINT IF EXISTS points_log_points_check;
ALTER TABLE points_log ADD CONSTRAINT points_log_points_check CHECK (points <> 0);
