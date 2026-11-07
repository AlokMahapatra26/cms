-- Migration number: 0004 	 2026-11-07T00:00:00.000Z

CREATE TABLE IF NOT EXISTS collections (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  fields TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_collections_slug ON collections(slug);

CREATE TABLE IF NOT EXISTS content_items (
  id TEXT PRIMARY KEY,
  collection_slug TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  data TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_content_collection ON content_items(collection_slug);
CREATE INDEX IF NOT EXISTS idx_content_status ON content_items(status);

-- Seed a sample "Products" collection
INSERT OR IGNORE INTO collections (id, slug, name, description, icon, fields, created_at, updated_at)
VALUES (
  'col_products_seed',
  'products',
  'Products',
  'Manage store items, pricing, inventory and product media.',
  'box',
  '[{"id":"f_name","key":"name","label":"Product Name","type":"text","required":true,"placeholder":"e.g. Wireless Noise-Cancelling Headphones"},{"id":"f_price","key":"price","label":"Price (USD)","type":"number","required":true,"placeholder":"99.99"},{"id":"f_desc","key":"description","label":"Description","type":"richtext","required":false},{"id":"f_image","key":"image","label":"Product Photo","type":"media","required":false},{"id":"f_instock","key":"in_stock","label":"In Stock","type":"boolean","required":false}]',
  datetime('now'),
  datetime('now')
);

-- Seed a sample product item
INSERT OR IGNORE INTO content_items (id, collection_slug, status, data, created_at, updated_at)
VALUES (
  'item_prod_seed_1',
  'products',
  'published',
  '{"name":"Edge Wireless Keyboard Pro","price":149.99,"description":"<p>Engineered for high-speed edge computing workflows with mechanical switches and PBT keycaps.</p>","in_stock":true,"image":null}',
  datetime('now'),
  datetime('now')
);
