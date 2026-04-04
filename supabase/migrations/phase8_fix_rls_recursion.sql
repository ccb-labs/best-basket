-- ============================================================
-- Phase 8 FIX: Break RLS infinite recursion
-- Run this in the Supabase SQL Editor AFTER phase8_shared_lists.sql
-- ============================================================
--
-- The Problem:
-- shopping_lists RLS references list_shares, and list_shares RLS
-- references shopping_lists. PostgreSQL detects this circular
-- dependency and blocks ALL queries with:
--   "infinite recursion detected in policy for relation shopping_lists"
--
-- The Fix:
-- Create a SECURITY DEFINER function (is_list_owner) that checks
-- list ownership WITHOUT triggering RLS. Then update list_shares
-- policies to use this function instead of a direct subquery on
-- shopping_lists. This breaks the cycle:
--   shopping_lists → list_shares → is_list_owner() (no RLS) ✓
-- ============================================================

-- Helper function: checks if the current user owns a list.
-- SECURITY DEFINER means this function bypasses RLS when querying
-- shopping_lists, which prevents the circular reference.
create or replace function is_list_owner(p_list_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from shopping_lists
    where id = p_list_id and user_id = auth.uid()
  );
$$;

-- Update list_shares policies to use is_list_owner() instead of
-- a direct subquery on shopping_lists.

drop policy "List owners and shared users can view shares" on list_shares;
create policy "List owners and shared users can view shares"
  on list_shares for select
  using (
    user_id = auth.uid()
    or is_list_owner(list_id)
  );

drop policy "List owners can insert shares" on list_shares;
create policy "List owners can insert shares"
  on list_shares for insert
  with check (is_list_owner(list_id));

drop policy "List owners can delete shares" on list_shares;
create policy "List owners can delete shares"
  on list_shares for delete
  using (is_list_owner(list_id));
