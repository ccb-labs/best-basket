-- ============================================================
-- Best Basket — Database Schema
-- Run this in the Supabase SQL Editor (supabase dashboard)
-- ============================================================

-- ============================================
-- CATEGORIES
-- Default categories have user_id = null (available to all users).
-- Users can also create their own categories (user_id is set).
-- ============================================
create table categories (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  name text not null
);

alter table categories enable row level security;

-- Users can see default categories (user_id is null) and their own
create policy "Users can view default and own categories"
  on categories for select
  using (user_id is null or user_id = auth.uid());

create policy "Users can insert own categories"
  on categories for insert
  with check (user_id = auth.uid());

create policy "Users can update own categories"
  on categories for update
  using (user_id = auth.uid());

create policy "Users can delete own categories"
  on categories for delete
  using (user_id = auth.uid());

-- Seed default categories (user_id = null means they're shared)
insert into categories (user_id, name) values
  (null, 'Cleaning'),
  (null, 'Beverages'),
  (null, 'Fruits'),
  (null, 'Grains'),
  (null, 'Personal Care'),
  (null, 'Legumes'),
  (null, 'Nuts & Seeds'),
  (null, 'Condiments'),
  (null, 'Snacks'),
  (null, 'Vegetables'),
  (null, 'Frozen');


-- ============================================
-- SHOPPING LISTS
-- ============================================
create table shopping_lists (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  created_at timestamptz default now() not null,
  is_template boolean default false not null,
  recurrence text check (recurrence in ('weekly', 'monthly'))
);

alter table shopping_lists enable row level security;

create policy "Users can view own lists"
  on shopping_lists for select
  using (user_id = auth.uid());

create policy "Users can insert own lists"
  on shopping_lists for insert
  with check (user_id = auth.uid());

create policy "Users can update own lists"
  on shopping_lists for update
  using (user_id = auth.uid());

create policy "Users can delete own lists"
  on shopping_lists for delete
  using (user_id = auth.uid());


-- ============================================
-- LIST ITEMS
-- ============================================
create table list_items (
  id uuid default gen_random_uuid() primary key,
  list_id uuid references shopping_lists(id) on delete cascade not null,
  name text not null,
  quantity numeric default 1 not null,
  unit text,
  category_id uuid references categories(id) on delete set null
);

alter table list_items enable row level security;

-- RLS for list_items checks that the parent shopping_list belongs to the user
create policy "Users can view items in own lists"
  on list_items for select
  using (
    exists (
      select 1 from shopping_lists
      where shopping_lists.id = list_items.list_id
        and shopping_lists.user_id = auth.uid()
    )
  );

create policy "Users can insert items in own lists"
  on list_items for insert
  with check (
    exists (
      select 1 from shopping_lists
      where shopping_lists.id = list_items.list_id
        and shopping_lists.user_id = auth.uid()
    )
  );

create policy "Users can update items in own lists"
  on list_items for update
  using (
    exists (
      select 1 from shopping_lists
      where shopping_lists.id = list_items.list_id
        and shopping_lists.user_id = auth.uid()
    )
  );

create policy "Users can delete items in own lists"
  on list_items for delete
  using (
    exists (
      select 1 from shopping_lists
      where shopping_lists.id = list_items.list_id
        and shopping_lists.user_id = auth.uid()
    )
  );


-- ============================================
-- STORES
-- ============================================
create table stores (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null
);

alter table stores enable row level security;

create policy "Users can view own stores"
  on stores for select
  using (user_id = auth.uid());

create policy "Users can insert own stores"
  on stores for insert
  with check (user_id = auth.uid());

create policy "Users can update own stores"
  on stores for update
  using (user_id = auth.uid());

create policy "Users can delete own stores"
  on stores for delete
  using (user_id = auth.uid());


-- ============================================
-- ITEM PRICES
-- ============================================
create table item_prices (
  id uuid default gen_random_uuid() primary key,
  item_id uuid references list_items(id) on delete cascade not null,
  store_id uuid references stores(id) on delete cascade not null,
  price numeric not null check (price >= 0)
);

alter table item_prices enable row level security;

-- RLS joins through list_items → shopping_lists to check ownership
create policy "Users can view prices for own items"
  on item_prices for select
  using (
    exists (
      select 1 from list_items
      join shopping_lists on shopping_lists.id = list_items.list_id
      where list_items.id = item_prices.item_id
        and shopping_lists.user_id = auth.uid()
    )
  );

create policy "Users can insert prices for own items"
  on item_prices for insert
  with check (
    exists (
      select 1 from list_items
      join shopping_lists on shopping_lists.id = list_items.list_id
      where list_items.id = item_prices.item_id
        and shopping_lists.user_id = auth.uid()
    )
  );

create policy "Users can update prices for own items"
  on item_prices for update
  using (
    exists (
      select 1 from list_items
      join shopping_lists on shopping_lists.id = list_items.list_id
      where list_items.id = item_prices.item_id
        and shopping_lists.user_id = auth.uid()
    )
  );

create policy "Users can delete prices for own items"
  on item_prices for delete
  using (
    exists (
      select 1 from list_items
      join shopping_lists on shopping_lists.id = list_items.list_id
      where list_items.id = item_prices.item_id
        and shopping_lists.user_id = auth.uid()
    )
  );


-- ============================================
-- DISCOUNTS
-- Can apply to a whole store (item_price_id = null)
-- or to a specific item price (item_price_id set).
-- ============================================
create table discounts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  store_id uuid references stores(id) on delete cascade not null,
  item_price_id uuid references item_prices(id) on delete cascade,
  type text not null check (type in ('percentage', 'fixed')),
  value numeric not null check (value >= 0),
  description text
);

alter table discounts enable row level security;

create policy "Users can view own discounts"
  on discounts for select
  using (user_id = auth.uid());

create policy "Users can insert own discounts"
  on discounts for insert
  with check (user_id = auth.uid());

create policy "Users can update own discounts"
  on discounts for update
  using (user_id = auth.uid());

create policy "Users can delete own discounts"
  on discounts for delete
  using (user_id = auth.uid());


-- ============================================
-- LIST SHARES
-- Allows sharing a shopping list with other users.
-- ============================================
create table list_shares (
  id uuid default gen_random_uuid() primary key,
  list_id uuid references shopping_lists(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  -- Each user can only be shared a list once
  unique (list_id, user_id)
);

alter table list_shares enable row level security;

-- Both the list owner and the shared user can see the share
create policy "List owners and shared users can view shares"
  on list_shares for select
  using (
    user_id = auth.uid()
    or exists (
      select 1 from shopping_lists
      where shopping_lists.id = list_shares.list_id
        and shopping_lists.user_id = auth.uid()
    )
  );

-- Only the list owner can share the list with others
create policy "List owners can insert shares"
  on list_shares for insert
  with check (
    exists (
      select 1 from shopping_lists
      where shopping_lists.id = list_shares.list_id
        and shopping_lists.user_id = auth.uid()
    )
  );

-- Only the list owner can remove shares
create policy "List owners can delete shares"
  on list_shares for delete
  using (
    exists (
      select 1 from shopping_lists
      where shopping_lists.id = list_shares.list_id
        and shopping_lists.user_id = auth.uid()
    )
  );
