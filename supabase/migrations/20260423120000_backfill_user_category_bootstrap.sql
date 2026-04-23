-- ============================================================
-- Backfill: bootstrap default categories for existing users
--
-- Context: when bootstrap_user_categories() was introduced
-- (migration 20260408120000), the protected layout only called
-- it when the user had zero categories. Users who had already
-- created their own categories were skipped, so their default
-- categories were never copied into their account.
--
-- This migration runs the bootstrap once for every existing
-- user to fix those accounts. It's safe to include in a fresh
-- db reset too — the function uses ON CONFLICT DO NOTHING, so
-- re-runs are idempotent.
-- ============================================================

do $$
declare
  u record;
begin
  for u in select id from auth.users loop
    perform bootstrap_user_categories(u.id);
  end loop;
end $$;
