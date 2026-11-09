-- Migration number: 0005 	 2026-11-09T00:00:00.000Z

CREATE TABLE IF NOT EXISTS workspaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  api_key TEXT UNIQUE NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_workspaces_slug ON workspaces(slug);
CREATE INDEX IF NOT EXISTS idx_workspaces_api_key ON workspaces(api_key);

-- Seed default primary workspace
INSERT OR IGNORE INTO workspaces (id, name, slug, api_key, created_at, updated_at)
VALUES (
  'ws_default',
  'Default Workspace',
  'default',
  'cf_live_default_key',
  datetime('now'),
  datetime('now')
);

-- Add workspace_id column to collections and content_items if not present
ALTER TABLE collections ADD COLUMN workspace_id TEXT DEFAULT 'ws_default';
ALTER TABLE content_items ADD COLUMN workspace_id TEXT DEFAULT 'ws_default';

CREATE INDEX IF NOT EXISTS idx_collections_workspace ON collections(workspace_id);
CREATE INDEX IF NOT EXISTS idx_content_workspace ON content_items(workspace_id);

