-- ============================================================
-- Phase 9: Template Lists
--
-- Adds a last_used_at column to shopping_lists so we can track
-- when a template was last used to create a new list. This powers
-- the recurrence reminder ("time to create a new list!").
-- ============================================================

ALTER TABLE shopping_lists ADD COLUMN last_used_at timestamptz;
