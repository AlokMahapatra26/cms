-- Migration number: 0003 	 2026-11-06T00:00:00.000Z
ALTER TABLE posts ADD COLUMN meta_title TEXT;
ALTER TABLE posts ADD COLUMN meta_description TEXT;
ALTER TABLE posts ADD COLUMN og_image TEXT;
ALTER TABLE posts ADD COLUMN canonical_url TEXT;

