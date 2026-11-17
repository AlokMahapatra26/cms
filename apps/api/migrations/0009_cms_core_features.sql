-- Migration number: 0009 	 2026-11-17T00:00:00.000Z
-- Core CMS Features: Scheduled Publishing, i18n, Version History, Audit Logs, and Media Metadata

-- 1. Extend content_items with scheduled_at and locale
ALTER TABLE content_items ADD COLUMN scheduled_at TEXT;
ALTER TABLE content_items ADD COLUMN locale TEXT DEFAULT 'en';

CREATE INDEX IF NOT EXISTS idx_content_scheduled ON content_items(status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_content_locale ON content_items(locale);

-- 2. Version History for Content Items (1-Click Rollbacks)
CREATE TABLE IF NOT EXISTS content_versions (
  id TEXT PRIMARY KEY,
  content_item_id TEXT NOT NULL,
  collection_slug TEXT NOT NULL,
  workspace_id TEXT DEFAULT 'ws_default',
  version_number INTEGER NOT NULL,
  status TEXT NOT NULL,
  scheduled_at TEXT,
  locale TEXT,
  data TEXT NOT NULL,
  author_id TEXT,
  author_name TEXT,
  change_summary TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_content_versions_item ON content_versions(content_item_id);
CREATE INDEX IF NOT EXISTS idx_content_versions_created ON content_versions(created_at);

-- 3. Audit Logs (Enterprise Governance & Activity Tracking)
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  workspace_id TEXT DEFAULT 'ws_default',
  user_id TEXT,
  user_name TEXT,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  details TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_ws ON audit_logs(workspace_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);

-- 4. Media Metadata (Alt Text, Captions, Dimensions, Tags)
CREATE TABLE IF NOT EXISTS media_metadata (
  key TEXT PRIMARY KEY,
  workspace_id TEXT DEFAULT 'ws_default',
  alt_text TEXT,
  caption TEXT,
  tags TEXT,
  width INTEGER,
  height INTEGER,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_media_metadata_ws ON media_metadata(workspace_id);
