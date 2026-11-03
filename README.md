# Cloudflare Edge CMS (Headless Blog)

A lightweight, edge-native headless blog built on Cloudflare Workers, Hono, D1 (SQLite), R2 (Object Storage), SvelteKit (Admin Dashboard), and Astro (Static Website).

The UI is intentionally bare-minimum, raw HTML elements with zero bloated styles.

---

## Architecture Overview

```
apps/
├── api/       # Cloudflare Worker running Hono (D1 database + R2 bucket)
├── admin/     # SvelteKit Admin Dashboard (Bare-minimum raw HTML)
└── web/       # Astro Static Website (Consumes Hono Content API)
packages/
└── shared/    # Shared TypeScript interfaces (Post, CreatePostInput, etc.)
```

---

## Ports & Services

* **Hono API Worker**: `http://localhost:8787`
  * `GET /api/posts` - List published posts
  * `GET /api/posts/:slug` - Single published post
  * `GET /api/admin/posts` - List all posts (including drafts)
  * `POST /api/admin/posts` - Create post
  * `PUT /api/admin/posts/:id` - Update post
  * `DELETE /api/admin/posts/:id` - Delete post
  * `POST /api/admin/upload` - Direct file upload to Cloudflare R2
  * `GET /api/media/*` - Stream file from Cloudflare R2
* **SvelteKit Admin CMS**: `http://localhost:5173`
  * Bare-minimum raw HTML table, inputs, textareas, file upload to R2
* **Astro Static Blog**: `http://localhost:4321`
  * Clean, minimal blog consuming the Hono API and rendering markdown

---

## Quickstart (Local Development)

### 1. Apply D1 Migrations (Local SQLite)
```bash
pnpm migrate:local
```

### 2. Run the Hono API (Cloudflare Worker)
```bash
pnpm dev:api
```
*(Runs on `http://localhost:8787` with local D1 and R2 persistence)*

### 3. Run the SvelteKit Admin Dashboard
In a new terminal:
```bash
pnpm dev:admin
```
*(Open `http://localhost:5173` to manage posts and upload cover images)*

### 4. Run the Astro Static Blog
In a new terminal:
```bash
pnpm dev:web
```
*(Open `http://localhost:4321` to view published blog posts)*

---

## Deploying to Cloudflare

1. **Create D1 Database & R2 Bucket**:
   ```bash
   npx wrangler d1 create cms-d1
   npx wrangler r2 bucket create cms-media
   ```
2. Put your database ID in `apps/api/wrangler.toml`.
3. Apply migrations to Cloudflare:
   ```bash
   pnpm --filter @cms/api migrate:remote
   ```
4. Deploy the API Worker:
   ```bash
   pnpm --filter @cms/api deploy
   ```
5. Deploy `apps/admin` and `apps/web` to **Cloudflare Pages**.

