-- ============================================================
-- Best Basket — Database Schema (reference)
-- The actual migration is in supabase/migrations/.
-- Seed data (categories, units) is in supabase/seed.sql.
-- ============================================================

-- ============================================
-- CATEGORIES
-- Default categories have user_id = null (available to all users).
-- Users can also create their own categories (user_id is set).
-- ============================================
create table categories (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  name text not null,
  unique (name, user_id)
);

alter table categories enable row level security;

-- Users can see default categories (user_id is null), their own,
-- and categories belonging to users who shared a list with them
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
  (null, 'Limpeza'),
  (null, 'Bebidas'),
  (null, 'Frutas'),
  (null, 'Cereais'),
  (null, 'Higiene Pessoal'),
  (null, 'Leguminosas'),
  (null, 'Frutos Secos & Sementes'),
  (null, 'Condimentos'),
  (null, 'Snacks'),
  (null, 'Legumes'),
  (null, 'Congelados');


-- ============================================
-- SHOPPING LISTS
-- ============================================
create table shopping_lists (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  created_at timestamptz default now() not null,
  is_template boolean default false not null,
  recurrence text check (recurrence in ('weekly', 'monthly')),
  last_used_at timestamptz,
  source_template_id uuid references shopping_lists(id) on delete set null
);

alter table shopping_lists enable row level security;

-- Users can view their own lists AND lists shared with them
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
-- PRODUCTS
-- A "product" represents a real-world item the user buys (e.g., "Milk").
-- Products are user-level — each user has their own product catalog.
-- Prices are attached to products (not list items), so if "Milk" is in
-- multiple lists, the prices are shared automatically.
-- Products are created automatically when adding items to lists.
-- ============================================
create table products (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null
);

alter table products enable row level security;

-- Users can view their own products AND products belonging to users
-- who shared a list with them (so prices display correctly)
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

-- Users can create products in their own catalog OR in the catalog
-- of users who shared a list with them (for adding items to shared lists)
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

create policy "Users can update own products"
  on products for update
  using (user_id = auth.uid());

create policy "Users can delete own products"
  on products for delete
  using (user_id = auth.uid());


-- ============================================
-- UNITS
-- Global units of measurement (not user-scoped).
-- All authenticated users can read them, but only admins would add new ones.
-- ============================================
create table units (
  id uuid default gen_random_uuid() primary key,
  abbreviation text not null,
  name text not null,
  gender text not null check (gender in ('m', 'f'))
);

alter table units enable row level security;

-- All authenticated users can view units (they're global)
create policy "All users can view units"
  on units for select
  using (auth.uid() is not null);

-- Seed default units
insert into units (id, abbreviation, name, gender) values
  ('51f9dbbe-70f7-4add-8e50-38511b55b04e', 'Emb', 'Embalagem', 'f'),
  ('6795503d-8bef-442d-b26f-45a5a84df5a3', 'g', 'Grama', 'm'),
  ('35ff1667-e208-4284-a341-304e03b83f5b', 'L', 'Litro', 'm'),
  ('b4e95c64-f478-4004-b5bc-323725d44995', 'Kg', 'Quilo', 'm'),
  ('e4c6bbfe-6a53-40f2-825f-c8de66ff6bd5', 'Un', 'Unidade', 'f');


-- ============================================
-- LIST ITEMS
-- ============================================
create table list_items (
  id uuid default gen_random_uuid() primary key,
  list_id uuid references shopping_lists(id) on delete cascade not null,
  -- product_id links this list item to a shared product.
  -- Prices are on the product, so all list items pointing to the same
  -- product share the same prices automatically.
  product_id uuid references products(id) on delete set null,
  name text not null,
  quantity numeric default 1 not null,
  unit_id uuid references units(id) on delete set null,
  category_id uuid references categories(id) on delete set null,
  checked boolean default false not null  -- Phase 7: shopping mode check-off
);

alter table list_items enable row level security;

-- RLS for list_items checks that the parent shopping_list belongs to
-- the user OR is shared with them
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


-- ============================================
-- STORES
-- ============================================
create table stores (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null
);

alter table stores enable row level security;

-- Users can view their own stores AND stores belonging to users
-- who shared a list with them (so store names appear in prices)
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
-- Prices are linked to products (not list items), so they're shared
-- across all lists that contain the same product.
-- ============================================
create table item_prices (
  id uuid default gen_random_uuid() primary key,
  product_id uuid references products(id) on delete cascade not null,
  store_id uuid references stores(id) on delete cascade not null,
  price numeric not null check (price >= 0),
  -- Each product can only have one price per store
  unique (product_id, store_id)
);

alter table item_prices enable row level security;

-- RLS checks ownership through products.user_id, including shared access
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

-- Users can view their own discounts AND discounts belonging to users
-- who shared a list with them (needed for price comparison)
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

-- Both the list owner and the shared user can see the share.
-- Uses is_list_owner() function instead of a direct subquery on
-- shopping_lists to avoid infinite RLS recursion (shopping_lists
-- RLS references list_shares, so list_shares can't reference back).
create policy "List owners and shared users can view shares"
  on list_shares for select
  using (
    user_id = auth.uid()
    or is_list_owner(list_id)
  );

-- Only the list owner can share the list with others
create policy "List owners can insert shares"
  on list_shares for insert
  with check (is_list_owner(list_id));

-- Only the list owner can remove shares
create policy "List owners can delete shares"
  on list_shares for delete
  using (is_list_owner(list_id));


-- ============================================
-- LIST CATEGORY SORT ORDER
-- Stores a custom category display order per list/template.
-- When no rows exist for a list, categories fall back to alphabetical.
-- ============================================
create table list_category_sort_order (
  id uuid default gen_random_uuid() primary key,
  list_id uuid references shopping_lists(id) on delete cascade not null,
  category_id uuid references categories(id) on delete cascade not null,
  sort_order integer not null default 0,
  unique (list_id, category_id)
);

alter table list_category_sort_order enable row level security;

-- RLS mirrors list_items: access if user owns or is shared the parent list
create policy "Users can view sort order in own and shared lists"
  on list_category_sort_order for select
  using (
    exists (
      select 1 from shopping_lists
      where shopping_lists.id = list_category_sort_order.list_id
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

create policy "Users can insert sort order in own and shared lists"
  on list_category_sort_order for insert
  with check (
    exists (
      select 1 from shopping_lists
      where shopping_lists.id = list_category_sort_order.list_id
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

create policy "Users can update sort order in own and shared lists"
  on list_category_sort_order for update
  using (
    exists (
      select 1 from shopping_lists
      where shopping_lists.id = list_category_sort_order.list_id
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

create policy "Users can delete sort order in own and shared lists"
  on list_category_sort_order for delete
  using (
    exists (
      select 1 from shopping_lists
      where shopping_lists.id = list_category_sort_order.list_id
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


-- ============================================
-- HELPER FUNCTIONS
-- These use SECURITY DEFINER to run with elevated permissions.
-- Used for accessing auth.users (not directly queryable) and
-- for breaking RLS circular references.
-- ============================================

-- Check if the current user owns a specific list.
-- Used in list_shares RLS to avoid infinite recursion
-- (shopping_lists RLS → list_shares → is_list_owner bypasses RLS).
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

-- Look up a user's ID by their email address (for sharing)
create or replace function get_user_id_by_email(lookup_email text)
returns uuid
language sql
security definer
set search_path = public
as $$
  select id from auth.users where email = lookup_email;
$$;

-- Get all lists shared with the current user, including the owner's email
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

-- Get the list of users a specific list is shared with (owner only)
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

-- Bootstrap default categories into a user's account.
-- Copies all default categories (user_id = null) so the user owns them
-- and can freely edit or delete. Also migrates any list_items and
-- list_category_sort_order rows that reference defaults to the user's copies.
-- Idempotent: safe to call multiple times (uses ON CONFLICT DO NOTHING).
create or replace function bootstrap_user_categories(target_user_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  default_cat record;
  new_cat_id uuid;
begin
  for default_cat in
    select id, name from categories where user_id is null
  loop
    insert into categories (user_id, name)
    values (target_user_id, default_cat.name)
    on conflict (name, user_id) do nothing;

    select id into new_cat_id
    from categories
    where user_id = target_user_id and name = default_cat.name;

    update list_items
    set category_id = new_cat_id
    where category_id = default_cat.id
      and list_id in (
        select sl.id from shopping_lists sl
        where sl.user_id = target_user_id
      );

    update list_category_sort_order
    set category_id = new_cat_id
    where category_id = default_cat.id
      and list_id in (
        select sl.id from shopping_lists sl
        where sl.user_id = target_user_id
      );
  end loop;
end;
$$;
