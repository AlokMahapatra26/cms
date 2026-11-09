# CFEdge-CMS

A high-performance, edge-native headless CMS built on **Cloudflare Workers**, **Cloudflare D1 (SQL)**, and **Cloudflare R2 (Object Storage)** with a **Vercel Geist OLED dark-mode** admin panel and an **AI Agent Prompt Studio**.

---

## Quickstart via CLI

Create a new CFEdge-CMS project in seconds with zero configuration:

```bash
# npm
npm create cfedge-cms my-cms

# npx
npx create-cfedge-cms my-cms

# pnpm
pnpm create cfedge-cms my-cms

# bun
bun create cfedge-cms my-cms
```

---

## Architecture

```
apps/
├── api/       # Cloudflare Worker running Hono (D1 database + R2 bucket)
└── admin/     # SvelteKit Admin Dashboard (Vercel Geist design, OLED pitch black)
packages/
├── shared/    # Shared TypeScript types & dynamic collection schemas
└── create-cfedge-cms/ # CLI scaffolder for npm
```

---

## Key Features

- **Global Edge Performance**: Sub-50ms latency worldwide running directly on Cloudflare's network.
- **Dynamic Content Models**: Create custom collections (Blogs, Products, Authors, etc.) with custom fields (text, rich text, images, dates, select dropdowns) stored in SQLite on Cloudflare D1.
- **Agent Prompt Studio**: Generates 1-click prompt specifications containing TypeScript types, edge endpoints, and design specs to hand off directly to AI coding agents (Cursor, Claude Code, Windsurf).
- **Zero-Dependency CLI**: `create-cfedge-cms` scaffolds fresh projects in seconds using native Node 18+ capabilities with automatic pnpm fallback.
- **Edge Storage (R2)**: Direct image and file upload with global CDN delivery.

---

## Local Development

```bash
# 1. Install dependencies
pnpm install

# 2. Run local development servers (API: 8787, Admin: 5173)
pnpm dev
```

- **Admin CMS**: `http://localhost:5173`
- **Edge API Worker**: `http://localhost:8787`

---

## First-Time Setup Flow

1. On a fresh setup, visiting `http://localhost:5173` automatically redirects to `/setup`.
2. Create your Super Admin account (passwords hashed using Web Crypto PBKDF2).
3. Once created, `/setup` is locked permanently and future visits authenticate via `/login`.

---

## Deploying to Cloudflare

1. **Create Cloudflare Resources**:
   ```bash
   npx wrangler d1 create cms-d1
   npx wrangler r2 bucket create cms-media
   ```
2. Put your database ID in `apps/api/wrangler.toml`.
3. Apply remote migrations:
   ```bash
   pnpm --filter @cms/api migrate:remote
   ```
4. Deploy the API Worker:
   ```bash
   pnpm --filter @cms/api deploy
   ```

---

## License

MIT © [Alok Mahapatra](https://github.com/AlokMahapatra26)
