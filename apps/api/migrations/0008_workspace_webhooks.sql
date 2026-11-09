-- Migration number: 0008 	 2026-11-09T00:00:00.000Z
-- Add deploy webhook fields to workspaces for instant frontend rebuilding

ALTER TABLE workspaces ADD COLUMN deploy_webhook_url TEXT;
ALTER TABLE workspaces ADD COLUMN auto_deploy INTEGER DEFAULT 1;
ALTER TABLE workspaces ADD COLUMN last_deployed_at TEXT;
ALTER TABLE workspaces ADD COLUMN last_deploy_status TEXT;
