-- ============================================================
-- Best Basket — Seed Data
-- Runs automatically after migrations on `supabase db reset`.
-- ============================================================

-- Default categories (user_id = null means available to all users)
insert into categories (user_id, name) values
  (null, 'Bebidas'),
  (null, 'Cereais'),
  (null, 'Condimentos'),
  (null, 'Congelados'),
  (null, 'Frutas'),
  (null, 'Frutos Secos & Sementes'),
  (null, 'Higiene Pessoal'),
  (null, 'Legumes'),
  (null, 'Leguminosas'),
  (null, 'Limpeza'),
  (null, 'Snacks');

-- Default units of measurement
insert into units (id, abbreviation, name, gender) values
  ('51f9dbbe-70f7-4add-8e50-38511b55b04e', 'Emb', 'Embalagem', 'f'),
  ('6795503d-8bef-442d-b26f-45a5a84df5a3', 'g', 'Grama', 'm'),
  ('35ff1667-e208-4284-a341-304e03b83f5b', 'L', 'Litro', 'm'),
  ('b4e95c64-f478-4004-b5bc-323725d44995', 'Kg', 'Quilo', 'm'),
  ('e4c6bbfe-6a53-40f2-825f-c8de66ff6bd5', 'Un', 'Unidade', 'f');
