# EdgeCMS — Claude Code Guidelines

## Project Structure
- `cms.config.ts` — Root Code-First schema definition. Edit this to add collections.
- `apps/api` — Hono REST API Worker (Cloudflare D1 & R2). Auto-syncs `cms.config.ts` on save.
- `apps/admin` — SvelteKit Admin Studio.
- `apps/web` — Minimalist frontend starter.

## Commands
- `pnpm dev` — Start API (:8787), Admin Studio (:5173), and Web (:4321) in parallel.
- `pnpm dev:cms` — Start API and Admin Studio only (pure headless mode).
- `pnpm build` — Build monorepo packages.
- `pnpm cms:sync` — Sync `cms.config.ts` schemas to D1 database manually.

## Creating Schemas
Always edit `cms.config.ts` using the builder helpers: `text`, `longtext`, `richtext`, `number`, `boolean`, `date`, `media`, `select`, `relation`.
Saving `cms.config.ts` automatically updates Cloudflare D1.

