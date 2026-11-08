import { defineCollection, defineConfig, text, number, boolean, date, richtext, media, select } from './builder';

/**
 * EdgeCMS Code-First Configuration
 * 
 * Define your collections and schemas here in pure TypeScript if you want schemas tracked in Git.
 * Or create and manage schemas dynamically from the Admin Studio UI.
 */

export const cmsConfig = defineConfig({
  collections: []
});

export default cmsConfig;


