import { defineCollection, defineConfig, text, number, boolean, date, richtext, media, select } from './builder';

/**
 * EdgeCMS Code-First Configuration
 * 
 * AI Agents & Developers: Define your collections and schemas here in pure TypeScript.
 * When this file is saved, the Cloudflare Worker API & SvelteKit Admin Panel
 * automatically sync and render dynamic CRUD forms, validation, and REST endpoints.
 */

export const Products = defineCollection({
  name: 'Products',
  slug: 'products',
  description: 'Manage store catalog, pricing, inventory and product media.',
  icon: 'schema',
  fields: [
    text('title', { label: 'Product Title', required: true, placeholder: 'e.g. Wireless Noise-Cancelling Headphones' }),
    number('price', { label: 'Price (USD)', required: true, placeholder: '99.99' }),
    boolean('instock', { label: 'In Stock' }),
    date('date', { label: 'Release Date' }),
    media('photo', { label: 'Product Photo' })
  ]
});

export const Articles = defineCollection({
  name: 'Articles',
  slug: 'articles',
  description: 'Editorial blog posts, announcements, and guides.',
  icon: 'text',
  fields: [
    text('title', { label: 'Article Title', required: true, placeholder: 'e.g. How to Build on Cloudflare Edge' }),
    text('slug', { label: 'URL Slug', required: true, placeholder: 'how-to-build-on-cloudflare-edge' }),
    text('excerpt', { label: 'Short Excerpt', placeholder: 'A quick summary for previews and social cards' }),
    richtext('content', { label: 'Article Content' }),
    media('cover_image', { label: 'Cover Image' }),
    date('published_at', { label: 'Publish Date' })
  ]
});

export const cmsConfig = defineConfig({
  collections: [
    Products,
    Articles
  ]
});

export default cmsConfig;
