-- Migration number: 0001 	 2026-11-04T00:00:00.000Z
CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  excerpt TEXT,
  content TEXT NOT NULL,
  cover_image TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_posts_slug ON posts(slug);
CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);

-- Seed a sample published post
INSERT OR IGNORE INTO posts (id, slug, title, excerpt, content, cover_image, status, created_at, updated_at)
VALUES (
  'first-post-id',
  'hello-world',
  'Welcome to our Cloudflare Edge Blog',
  'A simple headless blog running on Hono, Cloudflare D1, R2, SvelteKit and Astro.',
  '## Hello World!\n\nThis blog post is served from **Cloudflare D1** SQLite database at the edge through a **Hono** API worker.\n\n- Zero cold starts\n- Minimalistic design\n- Headless CMS architecture',
  NULL,
  'published',
  datetime('now'),
  datetime('now')
);

