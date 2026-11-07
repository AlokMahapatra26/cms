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
  ChangePasswordInput,
  RenameMediaInput,
  Collection,
  CreateCollectionInput,
  UpdateCollectionInput,
  ContentItem,
  CreateContentItemInput,
  UpdateContentItemInput,
  PaginationInfo,
  PaginatedResponse
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

// List published posts (supports ?page, ?limit, ?paginate, ?search, ?sort, ?order)
app.get('/api/posts', async (c) => {
  const pageQuery = c.req.query('page');
  const limitQuery = c.req.query('limit');
  const paginateQuery = c.req.query('paginate');
  const isPaginated = pageQuery !== undefined || limitQuery !== undefined || paginateQuery === 'true';

  const page = Math.max(1, parseInt(pageQuery || '1', 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(limitQuery || '20', 10) || 20));
  const offset = (page - 1) * limit;

  const search = c.req.query('search')?.trim() || '';
  const sort = c.req.query('sort')?.trim() || 'created_at';
  const order = c.req.query('order')?.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  const conditions: string[] = ["status = 'published'"];
  const params: any[] = [];

  if (search) {
    conditions.push('(title LIKE ? OR excerpt LIKE ? OR content LIKE ?)');
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  const whereClause = conditions.join(' AND ');

  const countRow = await c.env.DB.prepare(
    `SELECT count(*) as count FROM posts WHERE ${whereClause}`
  ).bind(...params).first<{ count: number }>();
  const total = countRow?.count || 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  let orderCol = 'created_at';
  if (sort === 'title' || sort === 'updated_at' || sort === 'created_at') {
    orderCol = sort;
  }

  let sql = `SELECT id, slug, title, excerpt, cover_image, status, created_at, updated_at FROM posts WHERE ${whereClause} ORDER BY ${orderCol} ${order}`;
  const queryParams = [...params];

  if (isPaginated) {
    sql += ` LIMIT ? OFFSET ?`;
    queryParams.push(limit, offset);
  }

  const result = await c.env.DB.prepare(sql).bind(...queryParams).all<Post>();
  const posts = result.results || [];

  c.header('X-Total-Count', String(total));
  c.header('X-Total-Pages', String(totalPages));
  c.header('X-Current-Page', String(page));

  if (isPaginated) {
    return c.json<PaginatedResponse<Post>>({
      data: posts,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  }

  return c.json(posts);
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
    const meta_title = body.meta_title?.trim() || null;
    const meta_description = body.meta_description?.trim() || null;
    const og_image = body.og_image?.trim() || null;
    const canonical_url = body.canonical_url?.trim() || null;

    await c.env.DB.prepare(
      `INSERT INTO posts (id, slug, title, excerpt, content, cover_image, status, meta_title, meta_description, og_image, canonical_url, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(id, body.slug, body.title, excerpt, content, cover_image, status, meta_title, meta_description, og_image, canonical_url, now, now)
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
    const meta_title = body.meta_title !== undefined ? (body.meta_title?.trim() || null) : existing.meta_title;
    const meta_description = body.meta_description !== undefined ? (body.meta_description?.trim() || null) : existing.meta_description;
    const og_image = body.og_image !== undefined ? (body.og_image?.trim() || null) : existing.og_image;
    const canonical_url = body.canonical_url !== undefined ? (body.canonical_url?.trim() || null) : existing.canonical_url;

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
       SET title = ?, slug = ?, excerpt = ?, content = ?, cover_image = ?, status = ?, meta_title = ?, meta_description = ?, og_image = ?, canonical_url = ?, updated_at = ?
       WHERE id = ?`
    )
      .bind(title, slug, excerpt, content, cover_image, status, meta_title, meta_description, og_image, canonical_url, now, id)
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

// Rename media in R2 and update any article references
app.post('/api/admin/media/rename', async (c) => {
  try {
    const body = await c.req.json<RenameMediaInput>();
    const oldKey = body.oldKey?.trim();
    let newName = body.newName?.trim();

    if (!oldKey || !newName) {
      return c.json({ error: 'Both oldKey and newName are required' }, 400);
    }

    // Extract directory prefix and original extension
    const oldFileName = oldKey.includes('/') ? oldKey.substring(oldKey.lastIndexOf('/') + 1) : oldKey;
    const dirPrefix = oldKey.includes('/') ? oldKey.substring(0, oldKey.lastIndexOf('/') + 1) : '';
    const oldExt = oldFileName.includes('.') ? oldFileName.substring(oldFileName.lastIndexOf('.')) : '';

    // If newName doesn't have an extension, preserve original extension
    if (oldExt && !newName.includes('.')) {
      newName += oldExt;
    }

    // Sanitize new file name (keep letters, digits, hyphen, underscore, period)
    const sanitizedFileName = newName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const newKey = `${dirPrefix}${sanitizedFileName}`;

    // If unchanged, return current info
    if (newKey === oldKey) {
      return c.json({
        key: oldKey,
        url: `/api/media/${oldKey}`
      });
    }

    // Check if destination key already exists in R2
    const existing = await c.env.MEDIA_BUCKET.head(newKey);
    if (existing) {
      return c.json({ error: `An asset named "${sanitizedFileName}" already exists in R2` }, 409);
    }

    // Retrieve original object from R2
    const oldObj = await c.env.MEDIA_BUCKET.get(oldKey);
    if (!oldObj) {
      return c.json({ error: 'Original asset not found in R2' }, 404);
    }

    // Copy to new key in R2
    await c.env.MEDIA_BUCKET.put(newKey, oldObj.body, {
      httpMetadata: oldObj.httpMetadata,
      customMetadata: oldObj.customMetadata,
    });

    // Delete old key in R2
    await c.env.MEDIA_BUCKET.delete(oldKey);

    // Update references in blog posts (cover_image and content)
    const oldUrl = `/api/media/${oldKey}`;
    const newUrl = `/api/media/${newKey}`;

    await c.env.DB.prepare(
      `UPDATE posts SET cover_image = replace(cover_image, ?, ?) WHERE cover_image LIKE ?`
    ).bind(oldUrl, newUrl, `%${oldKey}%`).run();

    await c.env.DB.prepare(
      `UPDATE posts SET content = replace(content, ?, ?) WHERE content LIKE ?`
    ).bind(oldUrl, newUrl, `%${oldKey}%`).run();

    return c.json({
      key: newKey,
      size: oldObj.size,
      uploaded: new Date().toISOString(),
      url: `/api/media/${newKey}`
    });
  } catch (err: any) {
    return c.json({ error: err.message || 'Failed to rename media' }, 500);
  }
});

// Delete media from R2 (under /api/admin/media/* so protected by auth middleware)
app.delete('/api/admin/media/*', async (c) => {
  try {
    const fullPath = c.req.path;
    const key = fullPath.replace('/api/admin/media/', '');

    if (!key) {
      return c.json({ error: 'Key is required' }, 400);
    }

    await c.env.MEDIA_BUCKET.delete(key);
    return c.json({ success: true, key });
  } catch (err: any) {
    return c.json({ error: err.message || 'Failed to delete media' }, 500);
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

// -------------------------------------------------------------
// DYNAMIC SCHEMA BUILDER & CONTENT ENGINE API
// -------------------------------------------------------------

// List all collections (Content Types)
app.get('/api/admin/collections', async (c) => {
  try {
    const rows = await c.env.DB.prepare(
      `SELECT * FROM collections ORDER BY name ASC`
    ).all();

    const collections = rows.results.map((r: any) => ({
      ...r,
      fields: JSON.parse(r.fields || '[]')
    }));

    return c.json(collections);
  } catch (err: any) {
    return c.json({ error: err.message || 'Failed to fetch collections' }, 500);
  }
});

// Get single collection by slug
app.get('/api/admin/collections/:slug', async (c) => {
  try {
    const slug = c.req.param('slug');
    const row = await c.env.DB.prepare(
      `SELECT * FROM collections WHERE slug = ?`
    ).bind(slug).first<any>();

    if (!row) {
      return c.json({ error: 'Collection not found' }, 404);
    }

    return c.json({
      ...row,
      fields: JSON.parse(row.fields || '[]')
    });
  } catch (err: any) {
    return c.json({ error: err.message || 'Failed to fetch collection' }, 500);
  }
});

// Create a new collection schema
app.post('/api/admin/collections', async (c) => {
  try {
    const body = await c.req.json<CreateCollectionInput>();
    const name = body.name?.trim();
    let slug = body.slug?.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '-').replace(/-+/g, '-');

    if (!name || !slug) {
      return c.json({ error: 'Collection name and slug are required' }, 400);
    }

    // Check slug uniqueness
    const existing = await c.env.DB.prepare(
      `SELECT id FROM collections WHERE slug = ?`
    ).bind(slug).first();

    if (existing) {
      return c.json({ error: `A collection with slug "${slug}" already exists` }, 409);
    }

    const id = `col_${Date.now()}`;
    const now = new Date().toISOString();
    const description = body.description?.trim() || null;
    const icon = body.icon?.trim() || 'box';
    const fields = JSON.stringify(body.fields || []);

    await c.env.DB.prepare(
      `INSERT INTO collections (id, slug, name, description, icon, fields, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(id, slug, name, description, icon, fields, now, now).run();

    return c.json({
      id,
      slug,
      name,
      description,
      icon,
      fields: body.fields || [],
      created_at: now,
      updated_at: now
    }, 201);
  } catch (err: any) {
    return c.json({ error: err.message || 'Failed to create collection' }, 500);
  }
});

// Update an existing collection schema
app.put('/api/admin/collections/:slug', async (c) => {
  try {
    const currentSlug = c.req.param('slug');
    const existing = await c.env.DB.prepare(
      `SELECT * FROM collections WHERE slug = ?`
    ).bind(currentSlug).first<any>();

    if (!existing) {
      return c.json({ error: 'Collection not found' }, 404);
    }

    const body = await c.req.json<UpdateCollectionInput>();
    const name = body.name?.trim() || existing.name;
    const description = body.description !== undefined ? (body.description?.trim() || null) : existing.description;
    const icon = body.icon !== undefined ? (body.icon?.trim() || 'box') : existing.icon;
    const fields = body.fields !== undefined ? JSON.stringify(body.fields) : existing.fields;
    const now = new Date().toISOString();

    let newSlug = existing.slug;
    if (body.slug && body.slug.trim() !== existing.slug) {
      newSlug = body.slug.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '-').replace(/-+/g, '-');
      // check collision
      const collision = await c.env.DB.prepare(
        `SELECT id FROM collections WHERE slug = ? AND id != ?`
      ).bind(newSlug, existing.id).first();

      if (collision) {
        return c.json({ error: `A collection with slug "${newSlug}" already exists` }, 409);
      }

      // cascade update content items collection_slug
      await c.env.DB.prepare(
        `UPDATE content_items SET collection_slug = ? WHERE collection_slug = ?`
      ).bind(newSlug, currentSlug).run();
    }

    await c.env.DB.prepare(
      `UPDATE collections SET name = ?, slug = ?, description = ?, icon = ?, fields = ?, updated_at = ? WHERE id = ?`
    ).bind(name, newSlug, description, icon, fields, now, existing.id).run();

    return c.json({
      id: existing.id,
      slug: newSlug,
      name,
      description,
      icon,
      fields: JSON.parse(fields),
      created_at: existing.created_at,
      updated_at: now
    });
  } catch (err: any) {
    return c.json({ error: err.message || 'Failed to update collection' }, 500);
  }
});

// Delete a collection schema and its items
app.delete('/api/admin/collections/:slug', async (c) => {
  try {
    const slug = c.req.param('slug');
    await c.env.DB.prepare(`DELETE FROM content_items WHERE collection_slug = ?`).bind(slug).run();
    await c.env.DB.prepare(`DELETE FROM collections WHERE slug = ?`).bind(slug).run();
    return c.json({ success: true, slug });
  } catch (err: any) {
    return c.json({ error: err.message || 'Failed to delete collection' }, 500);
  }
});

// -------------------------------------------------------------
// DYNAMIC CONTENT ITEMS (Records in collections)
// -------------------------------------------------------------

// List content items in collection (supports ?page, ?limit, ?status, ?search, ?sort, ?order)
app.get('/api/admin/content/:collectionSlug', async (c) => {
  try {
    const slug = c.req.param('collectionSlug');
    const pageQuery = c.req.query('page');
    const limitQuery = c.req.query('limit');
    const paginateQuery = c.req.query('paginate');
    const isPaginated = pageQuery !== undefined || limitQuery !== undefined || paginateQuery === 'true';

    const page = Math.max(1, parseInt(pageQuery || '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(limitQuery || '20', 10) || 20));
    const offset = (page - 1) * limit;

    const status = c.req.query('status')?.toLowerCase(); // 'all', 'published', 'draft'
    const search = c.req.query('search')?.trim() || '';
    const sort = c.req.query('sort')?.trim() || 'created_at';
    const order = c.req.query('order')?.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    const conditions: string[] = ['collection_slug = ?'];
    const params: any[] = [slug];

    if (status && status !== 'all') {
      conditions.push('status = ?');
      params.push(status);
    }

    if (search) {
      conditions.push('(data LIKE ? OR id LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    const whereClause = conditions.join(' AND ');

    // 1. Total Count
    const countRow = await c.env.DB.prepare(
      `SELECT count(*) as count FROM content_items WHERE ${whereClause}`
    ).bind(...params).first<{ count: number }>();
    const total = countRow?.count || 0;
    const totalPages = Math.max(1, Math.ceil(total / limit));

    // 2. Sorting clause
    let orderClause = 'created_at DESC';
    if (sort === 'created_at' || sort === 'updated_at' || sort === 'id' || sort === 'status') {
      orderClause = `${sort} ${order}`;
    } else if (/^[a-zA-Z0-9_]+$/.test(sort)) {
      orderClause = `json_extract(data, '$.' || '${sort}') ${order}, created_at DESC`;
    }

    let sql = `SELECT * FROM content_items WHERE ${whereClause} ORDER BY ${orderClause}`;
    const queryParams = [...params];

    if (isPaginated) {
      sql += ` LIMIT ? OFFSET ?`;
      queryParams.push(limit, offset);
    }

    const rows = await c.env.DB.prepare(sql).bind(...queryParams).all();

    const items = rows.results.map((r: any) => ({
      ...r,
      data: JSON.parse(r.data || '{}')
    }));

    c.header('X-Total-Count', String(total));
    c.header('X-Total-Pages', String(totalPages));
    c.header('X-Current-Page', String(page));

    if (isPaginated) {
      return c.json<PaginatedResponse<ContentItem>>({
        data: items,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      });
    }

    return c.json(items);
  } catch (err: any) {
    return c.json({ error: err.message || 'Failed to list content items' }, 500);
  }
});

// Get single content item by ID
app.get('/api/admin/content/:collectionSlug/:id', async (c) => {
  try {
    const { collectionSlug, id } = c.req.param();
    const row = await c.env.DB.prepare(
      `SELECT * FROM content_items WHERE collection_slug = ? AND id = ?`
    ).bind(collectionSlug, id).first<any>();

    if (!row) {
      return c.json({ error: 'Content item not found' }, 404);
    }

    return c.json({
      ...row,
      data: JSON.parse(row.data || '{}')
    });
  } catch (err: any) {
    return c.json({ error: err.message || 'Failed to fetch content item' }, 500);
  }
});

// Create content item in collection
app.post('/api/admin/content/:collectionSlug', async (c) => {
  try {
    const slug = c.req.param('collectionSlug');
    const body = await c.req.json<CreateContentItemInput>();

    // Check collection exists
    const collection = await c.env.DB.prepare(
      `SELECT id FROM collections WHERE slug = ?`
    ).bind(slug).first();

    if (!collection) {
      return c.json({ error: `Collection "${slug}" not found` }, 404);
    }

    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const status = body.status || 'draft';
    const data = JSON.stringify(body.data || {});

    await c.env.DB.prepare(
      `INSERT INTO content_items (id, collection_slug, status, data, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    ).bind(id, slug, status, data, now, now).run();

    return c.json({
      id,
      collection_slug: slug,
      status,
      data: body.data || {},
      created_at: now,
      updated_at: now
    }, 201);
  } catch (err: any) {
    return c.json({ error: err.message || 'Failed to create content item' }, 500);
  }
});

// Update content item in collection
app.put('/api/admin/content/:collectionSlug/:id', async (c) => {
  try {
    const { collectionSlug, id } = c.req.param();
    const existing = await c.env.DB.prepare(
      `SELECT * FROM content_items WHERE collection_slug = ? AND id = ?`
    ).bind(collectionSlug, id).first<any>();

    if (!existing) {
      return c.json({ error: 'Content item not found' }, 404);
    }

    const body = await c.req.json<UpdateContentItemInput>();
    const now = new Date().toISOString();
    const status = body.status ?? existing.status;
    const existingData = JSON.parse(existing.data || '{}');
    const updatedData = body.data !== undefined ? { ...existingData, ...body.data } : existingData;

    await c.env.DB.prepare(
      `UPDATE content_items SET status = ?, data = ?, updated_at = ? WHERE id = ?`
    ).bind(status, JSON.stringify(updatedData), now, id).run();

    return c.json({
      id,
      collection_slug: collectionSlug,
      status,
      data: updatedData,
      created_at: existing.created_at,
      updated_at: now
    });
  } catch (err: any) {
    return c.json({ error: err.message || 'Failed to update content item' }, 500);
  }
});

// Delete content item in collection
app.delete('/api/admin/content/:collectionSlug/:id', async (c) => {
  try {
    const { collectionSlug, id } = c.req.param();
    await c.env.DB.prepare(
      `DELETE FROM content_items WHERE collection_slug = ? AND id = ?`
    ).bind(collectionSlug, id).run();

    return c.json({ success: true, id });
  } catch (err: any) {
    return c.json({ error: err.message || 'Failed to delete content item' }, 500);
  }
});

// -------------------------------------------------------------
// PUBLIC DYNAMIC CONTENT API (For Frontends / Astro / Static Site Gen)
// -------------------------------------------------------------

// Public: Get published items of a collection (supports ?page, ?limit, ?paginate, ?search, ?sort, ?order)
app.get('/api/content/:collectionSlug', async (c) => {
  try {
    const slug = c.req.param('collectionSlug');
    const pageQuery = c.req.query('page');
    const limitQuery = c.req.query('limit');
    const paginateQuery = c.req.query('paginate');
    const isPaginated = pageQuery !== undefined || limitQuery !== undefined || paginateQuery === 'true';

    const page = Math.max(1, parseInt(pageQuery || '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(limitQuery || '20', 10) || 20));
    const offset = (page - 1) * limit;

    const search = c.req.query('search')?.trim() || '';
    const sort = c.req.query('sort')?.trim() || 'created_at';
    const order = c.req.query('order')?.toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    const conditions: string[] = ['collection_slug = ?', "status = 'published'"];
    const params: any[] = [slug];

    if (search) {
      conditions.push('(data LIKE ? OR id LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }

    const whereClause = conditions.join(' AND ');

    // 1. Total Count of matching published items
    const countRow = await c.env.DB.prepare(
      `SELECT count(*) as count FROM content_items WHERE ${whereClause}`
    ).bind(...params).first<{ count: number }>();
    const total = countRow?.count || 0;
    const totalPages = Math.max(1, Math.ceil(total / limit));

    // 2. Sorting clause
    let orderClause = 'created_at DESC';
    if (sort === 'created_at' || sort === 'updated_at' || sort === 'id') {
      orderClause = `${sort} ${order}`;
    } else if (/^[a-zA-Z0-9_]+$/.test(sort)) {
      orderClause = `json_extract(data, '$.' || '${sort}') ${order}, created_at DESC`;
    }

    let sql = `SELECT * FROM content_items WHERE ${whereClause} ORDER BY ${orderClause}`;
    const queryParams = [...params];

    if (isPaginated) {
      sql += ` LIMIT ? OFFSET ?`;
      queryParams.push(limit, offset);
    }

    const rows = await c.env.DB.prepare(sql).bind(...queryParams).all();

    const items = rows.results.map((r: any) => ({
      id: r.id,
      collection_slug: r.collection_slug,
      data: JSON.parse(r.data || '{}'),
      created_at: r.created_at,
      updated_at: r.updated_at
    }));

    c.header('X-Total-Count', String(total));
    c.header('X-Total-Pages', String(totalPages));
    c.header('X-Current-Page', String(page));

    if (isPaginated) {
      return c.json<PaginatedResponse<any>>({
        data: items,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      });
    }

    return c.json(items);
  } catch (err: any) {
    return c.json({ error: err.message || 'Failed to fetch published content' }, 500);
  }
});

// Public: Get single published item
app.get('/api/content/:collectionSlug/:id', async (c) => {
  try {
    const { collectionSlug, id } = c.req.param();
    const row = await c.env.DB.prepare(
      `SELECT * FROM content_items WHERE collection_slug = ? AND id = ? AND status = 'published'`
    ).bind(collectionSlug, id).first<any>();

    if (!row) {
      return c.json({ error: 'Content item not found' }, 404);
    }

    return c.json({
      id: row.id,
      collection_slug: row.collection_slug,
      data: JSON.parse(row.data || '{}'),
      created_at: row.created_at,
      updated_at: row.updated_at
    });
  } catch (err: any) {
    return c.json({ error: err.message || 'Failed to fetch content item' }, 500);
  }
});

export default app;
