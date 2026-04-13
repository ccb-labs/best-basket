-- Track which template a shopping list was created from.
-- This lets us show "lists from this template" when the user adds a
-- product to a template and wants to propagate it to existing lists.
-- ON DELETE SET NULL: if the template is deleted, derived lists keep
-- working — they just lose the link back to the source template.
alter table shopping_lists
  add column source_template_id uuid references shopping_lists(id) on delete set null;
