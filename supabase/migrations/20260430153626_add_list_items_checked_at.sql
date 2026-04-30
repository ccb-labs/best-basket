-- Track when each list item was checked off in shopping mode.
-- Used to order the "Done" section by recency (most recently checked
-- at the top), matching what the user just put in the basket.
-- Nullable: existing checked rows are left at null and fall to the
-- bottom of the Done list until they're toggled again.
alter table list_items
  add column checked_at timestamptz;
