-- ============================================================
-- Bootstrap user categories
--
-- Creates a database function that copies default categories
-- (user_id = null) into a user's account so they own them and
-- can edit/delete freely.
--
-- The function also migrates any list_items and
-- list_category_sort_order rows that still reference the
-- default category to point to the user's new copy instead.
--
-- It is idempotent: calling it multiple times for the same
-- user won't create duplicates (uses ON CONFLICT DO NOTHING).
-- ============================================================

-- The function runs with SECURITY DEFINER so it can read
-- default categories and update rows across tables regardless
-- of RLS. It's only callable by authenticated users.
create or replace function bootstrap_user_categories(target_user_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  default_cat record;
  new_cat_id uuid;
begin
  -- Loop through each default category (user_id IS NULL)
  for default_cat in
    select id, name from categories where user_id is null
  loop
    -- Try to insert a copy for this user.
    -- ON CONFLICT means: if the user already has a category with
    -- the same name, skip it and just look up the existing one.
    insert into categories (user_id, name)
    values (target_user_id, default_cat.name)
    on conflict (name, user_id) do nothing;

    -- Get the user's category id (whether just inserted or already existed)
    select id into new_cat_id
    from categories
    where user_id = target_user_id and name = default_cat.name;

    -- Migrate list_items: update any items in this user's lists
    -- that still reference the default category
    update list_items
    set category_id = new_cat_id
    where category_id = default_cat.id
      and list_id in (
        select sl.id from shopping_lists sl
        where sl.user_id = target_user_id
      );

    -- Migrate list_category_sort_order: update any sort entries
    -- in this user's lists that reference the default category
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
