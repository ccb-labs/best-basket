-- ============================================================
-- Phase 8: Shared Lists — Database Migration
-- Run this in the Supabase SQL Editor (supabase dashboard)
-- ============================================================
--
-- This migration does three things:
-- 1. Creates helper functions to look up users by email (needed because
--    auth.users isn't directly queryable from the client).
-- 2. Updates RLS (Row Level Security) policies on 7 tables so that
--    shared users can view and edit lists shared with them.
-- 3. The list_shares table and its RLS policies already exist —
--    no changes needed there.
-- ============================================================


-- ============================================
-- HELPER FUNCTIONS
-- ============================================
-- These use SECURITY DEFINER to access the auth.users table,
-- which isn't available to normal queries. SECURITY DEFINER means
-- the function runs with the permissions of the user who created it
-- (the database owner), not the user who calls it.
-- ============================================

-- Look up a user's ID by their email address.
-- Used when the list owner types an email to share with.
-- Returns null if no user exists with that email.
create or replace function get_user_id_by_email(lookup_email text)
returns uuid
language sql
security definer
set search_path = public
as $$
  select id from auth.users where email = lookup_email;
$$;

-- Get all lists shared with the current user, including the owner's email.
-- Used on the home page to show a "Shared with me" section.
create or replace function get_shared_lists()
returns table(id uuid, name text, created_at timestamptz, owner_email text)
language sql
security definer
set search_path = public
as $$
  select sl.id, sl.name, sl.created_at, u.email as owner_email
  from list_shares ls
  join shopping_lists sl on sl.id = ls.list_id
  join auth.users u on u.id = sl.user_id
  where ls.user_id = auth.uid()
    and sl.is_template = false
  order by sl.created_at desc;
$$;

-- Get the list of users a specific list is shared with (including their emails).
-- Only the list owner can call this (enforced by the EXISTS check).
-- Used in the share management section on the list detail page.
create or replace function get_list_shares_with_email(p_list_id uuid)
returns table(id uuid, user_id uuid, email text)
language sql
security definer
set search_path = public
as $$
  select ls.id, ls.user_id, u.email
  from list_shares ls
  join auth.users u on u.id = ls.user_id
  where ls.list_id = p_list_id
    and exists (
      select 1 from shopping_lists sl
      where sl.id = p_list_id
        and sl.user_id = auth.uid()
    );
$$;


-- ============================================
-- RLS POLICY UPDATES
-- ============================================
-- For each table, we drop the old policy and create a new one that
-- adds an OR condition for shared users. The pattern is:
--   existing condition OR EXISTS (check list_shares)
--
-- We use a reusable subquery pattern:
--   EXISTS (SELECT 1 FROM list_shares WHERE list_shares.list_id = ... AND list_shares.user_id = auth.uid())
-- ============================================


-- ── 1. shopping_lists ─────────────────────────────────────────────
-- Shared users can VIEW lists shared with them (but not update/delete)

drop policy "Users can view own lists" on shopping_lists;
create policy "Users can view own and shared lists"
  on shopping_lists for select
  using (
    user_id = auth.uid()
    or exists (
      select 1 from list_shares
      where list_shares.list_id = shopping_lists.id
        and list_shares.user_id = auth.uid()
    )
  );


-- ── 2. list_items ─────────────────────────────────────────────────
-- Shared users can fully CRUD items in shared lists

drop policy "Users can view items in own lists" on list_items;
create policy "Users can view items in own and shared lists"
  on list_items for select
  using (
    exists (
      select 1 from shopping_lists
      where shopping_lists.id = list_items.list_id
        and (
          shopping_lists.user_id = auth.uid()
          or exists (
            select 1 from list_shares
            where list_shares.list_id = shopping_lists.id
              and list_shares.user_id = auth.uid()
          )
        )
    )
  );

drop policy "Users can insert items in own lists" on list_items;
create policy "Users can insert items in own and shared lists"
  on list_items for insert
  with check (
    exists (
      select 1 from shopping_lists
      where shopping_lists.id = list_items.list_id
        and (
          shopping_lists.user_id = auth.uid()
          or exists (
            select 1 from list_shares
            where list_shares.list_id = shopping_lists.id
              and list_shares.user_id = auth.uid()
          )
        )
    )
  );

drop policy "Users can update items in own lists" on list_items;
create policy "Users can update items in own and shared lists"
  on list_items for update
  using (
    exists (
      select 1 from shopping_lists
      where shopping_lists.id = list_items.list_id
        and (
          shopping_lists.user_id = auth.uid()
          or exists (
            select 1 from list_shares
            where list_shares.list_id = shopping_lists.id
              and list_shares.user_id = auth.uid()
          )
        )
    )
  );

drop policy "Users can delete items in own lists" on list_items;
create policy "Users can delete items in own and shared lists"
  on list_items for delete
  using (
    exists (
      select 1 from shopping_lists
      where shopping_lists.id = list_items.list_id
        and (
          shopping_lists.user_id = auth.uid()
          or exists (
            select 1 from list_shares
            where list_shares.list_id = shopping_lists.id
              and list_shares.user_id = auth.uid()
          )
        )
    )
  );


-- ── 3. products ───────────────────────────────────────────────────
-- Shared users can view and create products in the list owner's catalog.
-- This is needed because when a shared user adds an item to a shared list,
-- the product must be in the owner's catalog (so prices stay consistent).

drop policy "Users can view own products" on products;
create policy "Users can view own and shared products"
  on products for select
  using (
    user_id = auth.uid()
    or exists (
      select 1 from list_shares ls
      join shopping_lists sl on sl.id = ls.list_id
      where ls.user_id = auth.uid()
        and sl.user_id = products.user_id
    )
  );

drop policy "Users can insert own products" on products;
create policy "Users can insert own and shared products"
  on products for insert
  with check (
    user_id = auth.uid()
    or exists (
      select 1 from list_shares ls
      join shopping_lists sl on sl.id = ls.list_id
      where ls.user_id = auth.uid()
        and sl.user_id = products.user_id
    )
  );


-- ── 4. stores ─────────────────────────────────────────────────────
-- Shared users can view the list owner's stores (to see store names
-- in prices and the comparison dashboard). They cannot create/edit/delete.

drop policy "Users can view own stores" on stores;
create policy "Users can view own and shared stores"
  on stores for select
  using (
    user_id = auth.uid()
    or exists (
      select 1 from list_shares ls
      join shopping_lists sl on sl.id = ls.list_id
      where ls.user_id = auth.uid()
        and sl.user_id = stores.user_id
    )
  );


-- ── 5. item_prices ────────────────────────────────────────────────
-- Shared users can view, add, update, and delete prices for products
-- in shared lists. The check goes through products → list_shares.

drop policy "Users can view prices for own products" on item_prices;
create policy "Users can view prices for own and shared products"
  on item_prices for select
  using (
    exists (
      select 1 from products
      where products.id = item_prices.product_id
        and (
          products.user_id = auth.uid()
          or exists (
            select 1 from list_shares ls
            join shopping_lists sl on sl.id = ls.list_id
            where ls.user_id = auth.uid()
              and sl.user_id = products.user_id
          )
        )
    )
  );

drop policy "Users can insert prices for own products" on item_prices;
create policy "Users can insert prices for own and shared products"
  on item_prices for insert
  with check (
    exists (
      select 1 from products
      where products.id = item_prices.product_id
        and (
          products.user_id = auth.uid()
          or exists (
            select 1 from list_shares ls
            join shopping_lists sl on sl.id = ls.list_id
            where ls.user_id = auth.uid()
              and sl.user_id = products.user_id
          )
        )
    )
  );

drop policy "Users can update prices for own products" on item_prices;
create policy "Users can update prices for own and shared products"
  on item_prices for update
  using (
    exists (
      select 1 from products
      where products.id = item_prices.product_id
        and (
          products.user_id = auth.uid()
          or exists (
            select 1 from list_shares ls
            join shopping_lists sl on sl.id = ls.list_id
            where ls.user_id = auth.uid()
              and sl.user_id = products.user_id
          )
        )
    )
  );

drop policy "Users can delete prices for own products" on item_prices;
create policy "Users can delete prices for own and shared products"
  on item_prices for delete
  using (
    exists (
      select 1 from products
      where products.id = item_prices.product_id
        and (
          products.user_id = auth.uid()
          or exists (
            select 1 from list_shares ls
            join shopping_lists sl on sl.id = ls.list_id
            where ls.user_id = auth.uid()
              and sl.user_id = products.user_id
          )
        )
    )
  );


-- ── 6. discounts ──────────────────────────────────────────────────
-- Shared users can view discounts (needed for price comparison).
-- They cannot create/edit/delete discounts — only the owner can.

drop policy "Users can view own discounts" on discounts;
create policy "Users can view own and shared discounts"
  on discounts for select
  using (
    user_id = auth.uid()
    or exists (
      select 1 from list_shares ls
      join shopping_lists sl on sl.id = ls.list_id
      where ls.user_id = auth.uid()
        and sl.user_id = discounts.user_id
    )
  );


-- ── 7. categories ─────────────────────────────────────────────────
-- Shared users can see the list owner's custom categories (so items
-- display correctly when a shared user views the list).

drop policy "Users can view default and own categories" on categories;
create policy "Users can view default own and shared categories"
  on categories for select
  using (
    user_id is null
    or user_id = auth.uid()
    or exists (
      select 1 from list_shares ls
      join shopping_lists sl on sl.id = ls.list_id
      where ls.user_id = auth.uid()
        and sl.user_id = categories.user_id
    )
  );
