import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Post, CreatePostInput, UpdatePostInput } from '@cms/shared';

type Bindings = {
  DB: D1Database;
  MEDIA_BUCKET: R2Bucket;
};

const app = new Hono<{ Bindings: Bindings }>();

// Enable CORS for frontend consumers (SvelteKit admin & Astro)
app.use('/*', cors());

// Health check
app.get('/health', (c) => c.json({ status: 'ok', runtime: 'cloudflare-workers' }));

// -------------------------------------------------------------
// PUBLIC CONTENT DELIVERY API (Astro / Public Frontends)
// -------------------------------------------------------------

// List published posts
app.get('/api/posts', async (c) => {
  const result = await c.env.DB.prepare(
    `SELECT id, slug, title, excerpt, cover_image, status, created_at, updated_at 
     FROM posts 
     WHERE status = 'published' 
     ORDER BY created_at DESC`
  ).all<Post>();

  return c.json(result.results || []);
});

// Get single published post by slug
app.get('/api/posts/:slug', async (c) => {
  const slug = c.req.param('slug');
  const post = await c.env.DB.prepare(
    `SELECT * FROM posts WHERE slug = ? AND status = 'published'`
  )
    .bind(slug)
    .first<Post>();

  if (!post) {
    return c.json({ error: 'Post not found' }, 404);
  }

  return c.json(post);
});

// -------------------------------------------------------------
// ADMIN CONTENT MANAGEMENT API (SvelteKit Admin)
// -------------------------------------------------------------

// List all posts (including drafts)
app.get('/api/admin/posts', async (c) => {
  const result = await c.env.DB.prepare(
    `SELECT * FROM posts ORDER BY created_at DESC`
  ).all<Post>();

  return c.json(result.results || []);
});

// Get post by id for editing
app.get('/api/admin/posts/:id', async (c) => {
  const id = c.req.param('id');
  const post = await c.env.DB.prepare(`SELECT * FROM posts WHERE id = ?`)
    .bind(id)
    .first<Post>();

  if (!post) {
    return c.json({ error: 'Post not found' }, 404);
  }

  return c.json(post);
});

// Create a new post
app.post('/api/admin/posts', async (c) => {
  try {
    const body = await c.req.json<CreatePostInput>();

    if (!body.title || !body.slug) {
      return c.json({ error: 'Title and Slug are required' }, 400);
    }

    // Check slug uniqueness
    const existing = await c.env.DB.prepare(
      `SELECT id FROM posts WHERE slug = ?`
    )
      .bind(body.slug)
      .first();

    if (existing) {
      return c.json({ error: 'A post with this slug already exists' }, 409);
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const status = body.status || 'draft';
    const excerpt = body.excerpt || null;
    const cover_image = body.cover_image || null;
    const content = body.content || '';

    await c.env.DB.prepare(
      `INSERT INTO posts (id, slug, title, excerpt, content, cover_image, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(id, body.slug, body.title, excerpt, content, cover_image, status, now, now)
      .run();

    const created = await c.env.DB.prepare(`SELECT * FROM posts WHERE id = ?`)
      .bind(id)
      .first<Post>();

    return c.json(created, 201);
  } catch (err: any) {
    return c.json({ error: err.message || 'Failed to create post' }, 500);
  }
});

// Update a post
app.put('/api/admin/posts/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const existing = await c.env.DB.prepare(`SELECT * FROM posts WHERE id = ?`)
      .bind(id)
      .first<Post>();

    if (!existing) {
      return c.json({ error: 'Post not found' }, 404);
    }

    const body = await c.req.json<UpdatePostInput>();
    const now = new Date().toISOString();

    const title = body.title ?? existing.title;
    const slug = body.slug ?? existing.slug;
    const excerpt = body.excerpt !== undefined ? body.excerpt : existing.excerpt;
    const content = body.content ?? existing.content;
    const cover_image = body.cover_image !== undefined ? body.cover_image : existing.cover_image;
    const status = body.status ?? existing.status;

    // Check slug collision if slug changed
    if (slug !== existing.slug) {
      const collision = await c.env.DB.prepare(
        `SELECT id FROM posts WHERE slug = ? AND id != ?`
      )
        .bind(slug, id)
        .first();

      if (collision) {
        return c.json({ error: 'A post with this slug already exists' }, 409);
      }
    }

    await c.env.DB.prepare(
      `UPDATE posts 
       SET title = ?, slug = ?, excerpt = ?, content = ?, cover_image = ?, status = ?, updated_at = ?
       WHERE id = ?`
    )
      .bind(title, slug, excerpt, content, cover_image, status, now, id)
      .run();

    const updated = await c.env.DB.prepare(`SELECT * FROM posts WHERE id = ?`)
      .bind(id)
      .first<Post>();

    return c.json(updated);
  } catch (err: any) {
    return c.json({ error: err.message || 'Failed to update post' }, 500);
  }
});

// Delete a post
app.delete('/api/admin/posts/:id', async (c) => {
  const id = c.req.param('id');
  await c.env.DB.prepare(`DELETE FROM posts WHERE id = ?`).bind(id).run();
  return c.json({ success: true, id });
});

// -------------------------------------------------------------
// MEDIA / R2 ASSET PIPELINE
// -------------------------------------------------------------

// Upload file to R2
app.post('/api/admin/upload', async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return c.json({ error: 'No file uploaded under key "file"' }, 400);
    }

    const cleanName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const key = `uploads/${Date.now()}-${cleanName}`;

    await c.env.MEDIA_BUCKET.put(key, file.stream(), {
      httpMetadata: {
        contentType: file.type || 'application/octet-stream',
      },
    });

    // Compute accessible media path
    const url = `/api/media/${key}`;

    return c.json({ key, url }, 201);
  } catch (err: any) {
    return c.json({ error: err.message || 'Upload failed' }, 500);
  }
});

// Serve media from R2
app.get('/api/media/*', async (c) => {
  const fullPath = c.req.path;
  const key = fullPath.replace('/api/media/', '');

  if (!key) {
    return c.text('Key required', 400);
  }

  const object = await c.env.MEDIA_BUCKET.get(key);

  if (!object) {
    return c.text('File not found', 404);
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('etag', object.httpEtag);
  headers.set('cache-control', 'public, max-age=31536000, immutable');

  return new Response(object.body, { headers });
});

export default app;

