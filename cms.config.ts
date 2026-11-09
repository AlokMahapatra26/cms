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

/**
 * ============================================================================
 * EdgeCMS Code-First Configuration (Root Schema)
 * ============================================================================
 * 
 * 🤖 Instructions for AI Agents (Cursor, Claude Code, Antigravity, Copilot):
 * - Whenever the user asks to add or edit schemas/collections, define them below in `collections: [...]`.
 * - The EdgeCMS backend automatically detects changes and syncs them to Cloudflare D1 on save.
 * 
 * 📚 Available Field Helpers:
 * - text('key', { label, required, placeholder })
 * - longtext('key', { label, required, placeholder })
 * - richtext('key', { label, required })
 * - number('key', { label, required, placeholder })
 * - boolean('key', { label })
 * - date('key', { label })
 * - media('key', { label })
 * - select('key', { label, options: ['Draft', 'In Review', 'Published'] })
 * - relation('key', 'targetCollectionSlug', { label })
 */

export const cmsConfig = defineConfig({
  collections: [
    defineCollection({
      slug: 'testimonials',
      name: 'Testimonials',
      description: 'Client reviews and social proof',
      icon: 'chat',
      fields: [
        text('client_name', { label: 'Client Name', required: true }),
        text('company', { label: 'Company / Role' }),
        richtext('quote', { label: 'Testimonial Quote', required: true }),
        number('rating', { label: 'Star Rating (1-5)' }),
        media('avatar', { label: 'Client Avatar' })
      ]
    })
  ]
});

export default cmsConfig;
