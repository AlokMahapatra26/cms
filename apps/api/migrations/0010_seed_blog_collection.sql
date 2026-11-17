-- Migration number: 0010 	 2026-11-17T00:00:00.000Z
-- Seed 'blog' collection and sample blog posts for http://localhost:5173/content/blog

INSERT OR IGNORE INTO collections (id, workspace_id, slug, name, description, icon, fields, created_at, updated_at)
VALUES (
  'col_blog_seed',
  'ws_default',
  'blog',
  'Blog',
  'Publish articles, tutorials, and announcements',
  'file-text',
  '[{"id":"f_title","key":"title","label":"Article Title","type":"text","required":true,"placeholder":"e.g. Getting Started with EdgeCMS"},{"id":"f_slug","key":"slug","label":"URL Slug","type":"text","required":true,"placeholder":"e.g. getting-started-with-edgecms"},{"id":"f_excerpt","key":"excerpt","label":"Excerpt / Summary","type":"longtext","placeholder":"A short summary for previews and SEO"},{"id":"f_content","key":"content","label":"Article Content (Markdown / Rich Text)","type":"richtext","required":true},{"id":"f_cover","key":"cover_image","label":"Cover Image","type":"media"},{"id":"f_author","key":"author","label":"Author Name","type":"text","placeholder":"e.g. Aakash"},{"id":"f_category","key":"category","label":"Category","type":"select","options":["Engineering","Product","Tutorial","Announcements","Design"]},{"id":"f_tags","key":"tags","label":"Tags","type":"text","placeholder":"e.g. cloudflare, serverless, svelte"},{"id":"f_readtime","key":"read_time","label":"Reading Time (minutes)","type":"number","placeholder":"5"},{"id":"f_featured","key":"featured","label":"Featured Article","type":"boolean"}]',
  datetime('now'),
  datetime('now')
);

INSERT OR IGNORE INTO content_items (id, workspace_id, collection_slug, status, scheduled_at, locale, data, created_at, updated_at)
VALUES (
  'item_blog_seed_1',
  'ws_default',
  'blog',
  'published',
  NULL,
  'en',
  '{"title":"Getting Started with EdgeCMS & Cloudflare Workers","slug":"getting-started-with-edgecms","excerpt":"Learn how to build high-performance serverless web apps with EdgeCMS, Cloudflare D1, and SvelteKit.","content":"## Welcome to EdgeCMS!\n\nThis is a sample article demonstrating the **Blog** collection.\n\n### Key Highlights\n- **Edge Native:** Sub-50ms latency across Cloudflare global points of presence.\n- **D1 SQLite Database:** Fast relational queries directly at the edge.\n- **SvelteKit Admin Studio:** Modern Vercel Geist aesthetic with real-time editing and version history.\n\nHappy publishing!","author":"Aakash","category":"Engineering","tags":"cloudflare, edgecms, svelte","read_time":4,"featured":true,"cover_image":null}',
  datetime('now'),
  datetime('now')
);
