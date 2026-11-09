# EdgeCMS AI Agent Guide (AGENT.md)

This repository uses **EdgeCMS** — a Cloudflare-native, Code-First Headless CMS with SQLite D1 database and R2 media storage.

## How to Manage Schemas & Collections
When asked to create, modify, or extend collections:
- **File to Edit:** [`cms.config.ts`](cms.config.ts) (located at the repository root).
- **Auto-Sync:** The API Worker automatically syncs `cms.config.ts` into the Cloudflare D1 database upon saving the file.
- **CLI Sync (Optional):** Run `pnpm cms:sync` if you want to trigger manual sync from the terminal.

### Field Types & Builders:
```typescript
import {
  defineCollection,
  defineConfig,
  text,
  longtext,
  richtext,
  number,
  boolean,
  date,
  media,
  select,
  relation
} from './packages/shared/src/builder';

export const cmsConfig = defineConfig({
  collections: [
    defineCollection({
      slug: 'events',
      name: 'Events',
      fields: [
        text('title', { label: 'Event Title', required: true }),
        date('event_date', { label: 'Event Date' }),
        text('location', { label: 'Venue / City' }),
        number('ticket_price', { label: 'Ticket Price' }),
        media('poster', { label: 'Event Poster' }),
        richtext('details', { label: 'Full Description' })
      ]
    })
  ]
});

export default cmsConfig;
```

## Content Delivery API
- Published content items are accessible via:
  - `GET /api/v1/:workspaceSlug/content/:collectionSlug?status=published&populate=true`
  - Or simply `GET /api/content/:collectionSlug`
- Client helper: `apps/web/src/lib/cms.ts` provides `getCMSContent(slug)`.

