-- Migration number: 0007 	 2026-11-09T00:00:00.000Z
-- Add workspace_id column to users table for Client Sub-User Login & RBAC

ALTER TABLE users ADD COLUMN workspace_id TEXT;
CREATE INDEX IF NOT EXISTS idx_users_workspace_id ON users(workspace_id);

