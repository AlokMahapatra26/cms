-- Migration number: 0006 	 2026-11-09T00:00:00.000Z

-- Drop old index if exists
DROP INDEX IF EXISTS idx_collections_slug;

-- Recreate collections table with composite unique constraint (workspace_id, slug)
CREATE TABLE IF NOT EXISTS collections_new (
  id TEXT PRIMARY KEY,
  workspace_id TEXT DEFAULT 'ws_default',
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  fields TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(workspace_id, slug)
);

INSERT INTO collections_new (id, workspace_id, slug, name, description, icon, fields, created_at, updated_at)
SELECT id, COALESCE(workspace_id, 'ws_default'), slug, name, description, icon, fields, created_at, updated_at
FROM collections;

DROP TABLE collections;
ALTER TABLE collections_new RENAME TO collections;

CREATE INDEX IF NOT EXISTS idx_collections_ws_slug ON collections(workspace_id, slug);

