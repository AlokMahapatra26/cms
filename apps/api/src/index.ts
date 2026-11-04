import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type {
  Post,
  CreatePostInput,
  UpdatePostInput,
  User,
  LoginInput,
  SetupInput,
  AuthResponse,
  UpdateProfileInput,
  ChangePasswordInput
} from '@cms/shared';
import {
  generateSalt,
  generateSessionToken,
  hashPassword,
  verifyPassword
} from './crypto';

type Bindings = {
  DB: D1Database;
  MEDIA_BUCKET: R2Bucket;
};

type Variables = {
  user?: User;
};

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Enable CORS for frontend consumers (SvelteKit admin & Astro)
app.use('/*', cors());

// Health check
app.get('/health', (c) => c.json({ status: 'ok', runtime: 'cloudflare-workers' }));

// -------------------------------------------------------------
// AUTHENTICATION & ACCESS CONTROL API
// -------------------------------------------------------------

// Check if first-time admin setup is required
app.get('/api/auth/setup-status', async (c) => {
  const result = await c.env.DB.prepare(
    `SELECT count(*) as count FROM users`
  ).first<{ count: number }>();

  const needsSetup = (result?.count || 0) === 0;
  return c.json({ needsSetup });
});

// Initial Super Admin onboarding (only available when 0 users exist)
app.post('/api/auth/setup', async (c) => {
  try {
    const userCountResult = await c.env.DB.prepare(
      `SELECT count(*) as count FROM users`
    ).first<{ count: number }>();

    if ((userCountResult?.count || 0) > 0) {
      return c.json({ error: 'Admin setup has already been completed' }, 400);
    }

    const body = await c.req.json<SetupInput>();
    const email = body.email?.trim().toLowerCase();
    const name = body.name?.trim();
    const password = body.password;

    if (!email || !email.includes('@')) {
      return c.json({ error: 'A valid email address is required' }, 400);
    }
    if (!name || name.length < 2) {
      return c.json({ error: 'Full name is required (min 2 characters)' }, 400);
    }
    if (!password || password.length < 6) {
      return c.json({ error: 'Password must be at least 6 characters' }, 400);
    }

    const userId = crypto.randomUUID();
    const salt = generateSalt();
    const passwordHash = await hashPassword(password, salt);
    const now = new Date().toISOString();

    // Insert primary super admin
    await c.env.DB.prepare(
      `INSERT INTO users (id, email, password_hash, salt, name, role, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'admin', ?, ?)`
    )
      .bind(userId, email, passwordHash, salt, name, now, now)
      .run();

    // Create initial 7-day session
    const sessionId = crypto.randomUUID();
    const token = generateSessionToken();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    await c.env.DB.prepare(
      `INSERT INTO sessions (id, user_id, token, expires_at, created_at)
       VALUES (?, ?, ?, ?, ?)`
    )
      .bind(sessionId, userId, token, expiresAt, now)
      .run();

    const user: User = {
      id: userId,
      email,
      name,
      role: 'admin',
      created_at: now,
      updated_at: now
    };

    const response: AuthResponse = { token, user };
    return c.json(response, 201);
  } catch (err: any) {
    return c.json({ error: err.message || 'Setup failed' }, 500);
  }
});

// Login with email and password
app.post('/api/auth/login', async (c) => {
  try {
    const body = await c.req.json<LoginInput>();
    const email = body.email?.trim().toLowerCase();
    const password = body.password;

    if (!email || !password) {
      return c.json({ error: 'Email and password are required' }, 400);
    }

    interface UserRow {
      id: string;
      email: string;
      password_hash: string;
      salt: string;
      name: string;
      role: 'admin' | 'editor' | 'author';
      created_at: string;
      updated_at: string;
    }

    const userRecord = await c.env.DB.prepare(
      `SELECT * FROM users WHERE email = ?`
    )
      .bind(email)
      .first<UserRow>();

    if (!userRecord) {
      return c.json({ error: 'Invalid email or password' }, 401);
    }

    const isValid = await verifyPassword(password, userRecord.password_hash, userRecord.salt);
    if (!isValid) {
      return c.json({ error: 'Invalid email or password' }, 401);
    }

    // Generate session token (7-day validity)
    const sessionId = crypto.randomUUID();
    const token = generateSessionToken();
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    await c.env.DB.prepare(
      `INSERT INTO sessions (id, user_id, token, expires_at, created_at)
       VALUES (?, ?, ?, ?, ?)`
    )
      .bind(sessionId, userRecord.id, token, expiresAt, now)
      .run();

    const user: User = {
      id: userRecord.id,
      email: userRecord.email,
      name: userRecord.name,
      role: userRecord.role,
      created_at: userRecord.created_at,
      updated_at: userRecord.updated_at
    };

    const response: AuthResponse = { token, user };
    return c.json(response);
  } catch (err: any) {
    return c.json({ error: err.message || 'Login failed' }, 500);
  }
});

// Logout session
app.post('/api/auth/logout', async (c) => {
  const authHeader = c.req.header('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    await c.env.DB.prepare(`DELETE FROM sessions WHERE token = ?`).bind(token).run();
  }
  return c.json({ success: true });
});

// Verify token and get current user info
app.get('/api/auth/me', async (c) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized: Missing or invalid token' }, 401);
  }
  const token = authHeader.substring(7).trim();
  const now = new Date().toISOString();

  const user = await c.env.DB.prepare(
    `SELECT u.id, u.email, u.name, u.role, u.created_at, u.updated_at
     FROM sessions s
     JOIN users u ON s.user_id = u.id
     WHERE s.token = ? AND s.expires_at > ?`
  )
    .bind(token, now)
    .first<User>();

  if (!user) {
    return c.json({ error: 'Unauthorized: Session expired or invalid' }, 401);
  }

  return c.json({ user });
});

// -------------------------------------------------------------
// PUBLIC CONTENT DELIVERY API (Astro / Public Frontends)
// No authentication required. Fast edge retrieval.
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
// ADMIN AUTHENTICATION MIDDLEWARE
// Enforces valid session token for all /api/admin/* endpoints
// -------------------------------------------------------------
app.use('/api/admin/*', async (c, next) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized: Missing session token' }, 401);
  }

  const token = authHeader.substring(7).trim();
  const now = new Date().toISOString();

  const user = await c.env.DB.prepare(
    `SELECT u.id, u.email, u.name, u.role, u.created_at, u.updated_at
     FROM sessions s
     JOIN users u ON s.user_id = u.id
     WHERE s.token = ? AND s.expires_at > ?`
  )
    .bind(token, now)
    .first<User>();

  if (!user) {
    return c.json({ error: 'Unauthorized: Invalid or expired session' }, 401);
  }

  c.set('user', user);
  await next();
});

// -------------------------------------------------------------
// USER CREDENTIALS & PROFILE MANAGEMENT
// -------------------------------------------------------------

// Update current user profile credentials (name & email)
app.put('/api/admin/profile', async (c) => {
  try {
    const currentUser = c.get('user');
    if (!currentUser) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const body = await c.req.json<UpdateProfileInput>();
    const name = body.name?.trim();
    const email = body.email?.trim().toLowerCase();

    if (name !== undefined && name.length < 2) {
      return c.json({ error: 'Name must be at least 2 characters' }, 400);
    }

    if (email !== undefined && (!email || !email.includes('@'))) {
      return c.json({ error: 'A valid email address is required' }, 400);
    }

    // Check collision if email is being changed
    if (email && email !== currentUser.email) {
      const collision = await c.env.DB.prepare(
        `SELECT id FROM users WHERE email = ? AND id != ?`
      )
        .bind(email, currentUser.id)
        .first();

      if (collision) {
        return c.json({ error: 'Email address is already in use by another user' }, 409);
      }
    }

    const finalName = name ?? currentUser.name;
    const finalEmail = email ?? currentUser.email;
    const now = new Date().toISOString();

    await c.env.DB.prepare(
      `UPDATE users SET name = ?, email = ?, updated_at = ? WHERE id = ?`
    )
      .bind(finalName, finalEmail, now, currentUser.id)
      .run();

    const updatedUser = await c.env.DB.prepare(
      `SELECT id, email, name, role, created_at, updated_at FROM users WHERE id = ?`
    )
      .bind(currentUser.id)
      .first<User>();

    return c.json(updatedUser);
  } catch (err: any) {
    return c.json({ error: err.message || 'Failed to update profile' }, 500);
  }
});

// Change password for the current authenticated user
app.put('/api/admin/password', async (c) => {
  try {
    const currentUser = c.get('user');
    if (!currentUser) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    const body = await c.req.json<ChangePasswordInput>();
    const currentPassword = body.current_password;
    const newPassword = body.new_password;

    if (!currentPassword) {
      return c.json({ error: 'Current password is required' }, 400);
    }

    if (!newPassword || newPassword.length < 6) {
      return c.json({ error: 'New password must be at least 6 characters long' }, 400);
    }

    // Retrieve stored password_hash and salt
    interface StoredCredentials {
      password_hash: string;
      salt: string;
    }

    const credentials = await c.env.DB.prepare(
      `SELECT password_hash, salt FROM users WHERE id = ?`
    )
      .bind(currentUser.id)
      .first<StoredCredentials>();

    if (!credentials) {
      return c.json({ error: 'User not found' }, 404);
    }

    const isMatch = await verifyPassword(currentPassword, credentials.password_hash, credentials.salt);
    if (!isMatch) {
      return c.json({ error: 'Current password is incorrect' }, 400);
    }

    const newSalt = generateSalt();
    const newHash = await hashPassword(newPassword, newSalt);
    const now = new Date().toISOString();

    await c.env.DB.prepare(
      `UPDATE users SET password_hash = ?, salt = ?, updated_at = ? WHERE id = ?`
    )
      .bind(newHash, newSalt, now, currentUser.id)
      .run();

    return c.json({ success: true, message: 'Password updated successfully' });
  } catch (err: any) {
    return c.json({ error: err.message || 'Failed to update password' }, 500);
  }
});

// -------------------------------------------------------------
// ADMIN CONTENT MANAGEMENT API (Protected)
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
// MEDIA / R2 ASSET PIPELINE (Protected for uploads & list)
// -------------------------------------------------------------

// List uploaded media from R2
app.get('/api/admin/media', async (c) => {
  try {
    const listResult = await c.env.MEDIA_BUCKET.list({ limit: 100 });
    const items = listResult.objects.map((obj) => ({
      key: obj.key,
      size: obj.size,
      uploaded: obj.uploaded.toISOString(),
      url: `/api/media/${obj.key}`
    }));
    return c.json(items);
  } catch (err: any) {
    return c.json({ error: err.message || 'Failed to list media' }, 500);
  }
});

// Upload file to R2 (under /api/admin/upload so protected by auth middleware)
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

    const url = `/api/media/${key}`;
    return c.json({ key, url }, 201);
  } catch (err: any) {
    return c.json({ error: err.message || 'Upload failed' }, 500);
  }
});

// Serve media from R2 (Public, cached)
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
