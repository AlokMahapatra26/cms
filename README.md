# Cloudflare Edge CMS (Headless Blog)

A high-performance, edge-native headless CMS built with **Cloudflare Workers**, **Hono**, **Cloudflare D1** (SQLite), **Cloudflare R2** (Object Storage), **SvelteKit** (Admin Dashboard with Shopify Polaris design), and **Astro** (Public Static Storefront).

---

## Architecture Overview

```
apps/
├── api/       # Cloudflare Worker running Hono (D1 database + R2 bucket)
├── admin/     # SvelteKit Admin Dashboard (Shopify Polaris UI theme)
└── web/       # Astro Storefront / Blog (Consumes Hono Content API)
packages/
└── shared/    # Shared TypeScript interfaces (Post, User, Auth, etc.)
```

---

## First-Time Setup & Authentication Flow

When anyone clones or downloads this repository, the database contains **0 users**.

1. When you run the admin dashboard and visit `http://localhost:5173`, EdgeCMS automatically detects that no admin exists.
2. It immediately routes you to the **First-Time Setup Wizard** at `/setup`.
3. You fill out:
   - **Full Name**
   - **Admin Email**
   - **Password** (minimum 6 characters)
4. EdgeCMS hashes the password using edge-native **Web Crypto PBKDF2** with a unique salt, saves your Super Admin account in Cloudflare D1, creates an active 7-day session token, and automatically redirects you into the dashboard.
5. Once this first user is created, the `/setup` endpoint is locked permanently and future visits will ask for your login credentials at `/login`.

---

## Ports & Services

* **Hono API Worker**: `http://localhost:8787`
  * **Public Endpoints** (Zero auth needed - for Astro & external frontends):
    * `GET /api/posts` - List published articles
    * `GET /api/posts/:slug` - Get single published article
    * `GET /api/media/*` - Stream images/media from Cloudflare R2
    * `GET /health` - Worker health status
  * **Auth Endpoints**:
    * `GET /api/auth/setup-status` - Check if initial setup is needed
    * `POST /api/auth/setup` - Create primary Super Admin
    * `POST /api/auth/login` - Authenticate admin & receive session token
    * `POST /api/auth/logout` - Invalidate session token
    * `GET /api/auth/me` - Validate session & get current user profile
  * **Protected Admin Endpoints** (Requires `Authorization: Bearer <token>`):
    * `GET /api/admin/posts` - List all posts (drafts and published)
    * `POST /api/admin/posts` - Create post
    * `GET /api/admin/posts/:id` - Fetch post by ID
    * `PUT /api/admin/posts/:id` - Update post
    * `DELETE /api/admin/posts/:id` - Delete post
    * `POST /api/admin/upload` - Upload media to Cloudflare R2
* **SvelteKit Admin CMS**: `http://localhost:5173`
  * First-time setup wizard (`/setup`), login screen (`/login`), article publisher, interactive markdown editor, R2 cover image uploader, and live API documentation (`/api`).
* **Astro Public Blog**: `http://localhost:4321`
  * Fast static blog consuming the Hono API and rendering markdown.

---

## Quickstart (Local Development)

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Apply D1 Migrations (Local SQLite)
```bash
pnpm migrate:local
```

### 3. Run Development Servers
Start all services (Cloudflare API, Admin Dashboard & Web Storefront) together with a **single command**:

```bash
pnpm dev
```

Or run specific services as needed:

```bash
pnpm dev:cms   # Hono Worker API + SvelteKit Admin
pnpm dev:api   # Hono Worker API only (Port 8787)
pnpm dev:admin # SvelteKit Admin only (Port 5173)
pnpm dev:web   # Astro Storefront only (Port 4321)
```

Open `http://localhost:5173` in your browser. Since it's a fresh installation, you will automatically be greeted by the **Setup Wizard** to create your primary administrator account.

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
