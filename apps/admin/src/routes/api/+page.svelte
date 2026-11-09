<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { getMe } from '$lib/api';
  import { collectionsStore } from '$lib/collections.svelte';
  import { workspacesStore } from '$lib/workspaces.svelte';
  import { Icon } from '$lib/components';
  import type { Collection, FieldDefinition } from '@cms/shared';

  let copied = $state<string | null>(null);
  let apiBase = $state('http://localhost:8787');

  const cleanApiBase = $derived(apiBase.trim().replace(/\/+$/, '') || 'http://localhost:8787');

  onMount(async () => {
    try {
      const user = await getMe();
      if (user.role !== 'admin') {
        const firstCol = collectionsStore.list[0]?.slug;
        goto(firstCol ? `/content/${firstCol}` : '/settings');
        return;
      }
    } catch {
      goto('/login');
      return;
    }
    workspacesStore.load();
    collectionsStore.load();
    const saved = localStorage.getItem('cms_api_base');
    if (saved) {
      apiBase = saved;
    }
  });

  function handleApiBaseChange(e: Event) {
    const target = e.target as HTMLInputElement;
    apiBase = target.value;
    if (target.value.trim() && target.value.trim() !== 'http://localhost:8787') {
      localStorage.setItem('cms_api_base', target.value.trim());
    } else {
      localStorage.removeItem('cms_api_base');
    }
  }

  function resetApiBase() {
    apiBase = 'http://localhost:8787';
    localStorage.removeItem('cms_api_base');
  }

  const collections = $derived(collectionsStore.list);
  const isMultiTenant = $derived(workspacesStore.enabled && workspacesStore.list.length > 1);

  function copyToClipboard(text: string, id: string) {
    navigator.clipboard.writeText(text);
    copied = id;
    setTimeout(() => {
      copied = null;
    }, 2000);
  }

  function toPascalCase(str: string): string {
    return str
      .replace(/[-_](\w)/g, (_, c) => c.toUpperCase())
      .replace(/^\w/, (c) => c.toUpperCase());
  }

  function getTsType(f: FieldDefinition): string {
    switch (f.type) {
      case 'text':
      case 'longtext':
        return 'string';
      case 'richtext':
        return 'string; // Rich text HTML';
      case 'number':
        return 'number';
      case 'boolean':
        return 'boolean';
      case 'date':
        return 'string; // ISO Date (YYYY-MM-DD)';
      case 'media':
        return 'string; // Cloudflare R2 Media URL';
      case 'select':
        if (f.options && f.options.length > 0) {
          return f.options.map((o) => `'${o}'`).join(' | ');
        }
        return 'string';
      case 'relation':
        return `string | ${toPascalCase(f.relationCollectionSlug || 'Record')}Record; // Reference ID (or populated object with ?populate=true)`;
      default:
        return 'any';
    }
  }

  function generateInterface(col: Collection): string {
    const typeName = `${toPascalCase(col.slug)}Data`;
    const recordName = `${toPascalCase(col.slug)}Record`;
    const fields = col.fields || [];

    const fieldLines = fields
      .map((f) => `    ${f.key}${f.required ? '' : '?'}: ${getTsType(f)};`)
      .join('\n');

    return `// Schema for collection '${col.name}' (slug: '${col.slug}')
export interface ${typeName} {
${fieldLines || '    [key: string]: any;'}
}

export type ${recordName} = CmsRecord<${typeName}>;`;
  }

  const generatedTypes = $derived.by(() => {
    let output = `export interface CmsRecord<T = Record<string, any>> {
  id: string;
  collection_slug: string;
  data: T;
  created_at: string;
  updated_at: string;
}\n\n`;

    if (collections.length === 0) {
      output += `// No collections defined yet. Visit /schemas to create content models.\n`;
    } else {
      output += collections.map(generateInterface).join('\n\n');
    }

    return output;
  });

  const agentPrompt = $derived.by(() => {
    const cols = collections;
    const base = cleanApiBase;
    const wsSlug = workspacesStore.active.slug;
    const wsName = workspacesStore.active.name;

    const endpointsList = cols.length === 0
      ? isMultiTenant
        ? `- \`GET ${base}/api/v1/${wsSlug}/content/:slug\` (List published records)\n- \`GET ${base}/api/v1/${wsSlug}/content/:slug/:id\` (Get single record by ID or slug)`
        : `- \`GET ${base}/api/content/:slug\` (List published records)\n- \`GET ${base}/api/content/:slug/:id\` (Get single record by ID or slug)`
      : cols.map((col) => {
          const pascal = toPascalCase(col.slug);
          const listUrl = isMultiTenant
            ? `${base}/api/v1/${wsSlug}/content/${col.slug}?page=1&limit=12&sort=created_at&order=desc`
            : `${base}/api/content/${col.slug}?page=1&limit=12&sort=created_at&order=desc`;
          const singleUrl = isMultiTenant
            ? `${base}/api/v1/${wsSlug}/content/${col.slug}/:id`
            : `${base}/api/content/${col.slug}/:id`;
          return `### ${col.name} (\`${col.slug}\`)
- **List All**: \`GET ${listUrl}\`
  - Query parameters: \`?page\`, \`?limit\`, \`?sort\`, \`?order\`, \`?search\`, \`?populate=true\`
  - Returns: \`${pascal}Record[]\`
- **Single Record**: \`GET ${singleUrl}\`
  - Query parameters: \`?populate=true\` (expands referenced collection data)
  - Returns: \`${pascal}Record\``;
        }).join('\n\n');

    const collectionInstructions = cols.length === 0
      ? `   - Create catalog listing pages and detail pages for your CMS collections.`
      : cols.map((c) => `   - **${c.name}**: Create listing page (\`/${c.slug}\`) and detail page (\`/${c.slug}/[id]\`). Render title, thumbnail, and defined fields.`).join('\n');

    return `# CFEdge-CMS Headless API Integration Spec for AI Agent

## 1. System Overview
You are tasked with connecting our frontend application (Next.js / Astro / React / SvelteKit / Nuxt) to our CFEdge-CMS Headless API.
- **Base API URL**: \`${base}\` (configured via environment variable \`PUBLIC_API_URL\` or \`NEXT_PUBLIC_API_URL\`)
${isMultiTenant ? `- **Active Workspace**: \`${wsName}\` (Slug: \`${wsSlug}\`)\n` : ''}- **Backend Architecture**: Cloudflare Workers + Cloudflare D1 (SQL) + Cloudflare R2 (Media Storage)
- **Delivery**: All public content endpoints are edge-cached globally and return standard JSON.

---

## 2. TypeScript Data Types
Add these types to your frontend project (e.g. in \`types/cms.ts\` or \`lib/cms.ts\`):

\`\`\`typescript
${generatedTypes}
\`\`\`

---

## 3. Active Collections & Public Delivery Endpoints

${endpointsList}

### Media Assets (Images / Files)
- Media files uploaded to Cloudflare R2 are accessible directly via:
  \`${base}/api/media/*\` (stored in media and thumbnail fields).

---

## 4. Implementation Steps for AI Agent
1. **Environment Setup**: In your frontend project root, configure \`.env.local\` (or \`.env\`):
   \`\`\`env
   PUBLIC_API_URL=${base}
${isMultiTenant ? `   WORKSPACE_SLUG=${wsSlug}\n` : ''}   \`\`\`
   (Use \`NEXT_PUBLIC_API_URL=${base}\` if using Next.js).
2. **CMS Client**: Create a data fetching helper using \`PUBLIC_API_URL\` targeting \`${isMultiTenant ? `/api/v1/${wsSlug}/content/:slug` : `/api/content/:slug`}\` with typed returns.
3. **Collection Pages**:
${collectionInstructions}
4. **Rich Text / HTML**: If a collection has rich text HTML, render it safely with semantic prose styles.
5. **Resilience**: Handle loading states, empty states ("No published items yet"), and error states cleanly.`;
  });
</script>

<svelte:head>
  <title>Agent Prompt Studio - CFEdge-CMS</title>
</svelte:head>

<!-- Header -->
<div class="shopify-page-header">
  <div>
    <h1 class="shopify-page-title">Agent Prompt Studio</h1>
    <p class="shopify-page-subtitle">
      One-click prompt to paste into Cursor, Claude Code, or Windsurf to build your complete frontend automatically.
    </p>
  </div>
</div>

<!-- Main AI Prompt Card -->
<div class="shopify-card mb-6">
  <div class="prompt-banner-header">
    <div class="api-base-control">
      <label for="api-base-input" class="api-base-label">API Base URL:</label>
      <div class="api-base-input-wrapper">
        <input
          id="api-base-input"
          type="text"
          class="shopify-input api-base-input"
          value={apiBase}
          oninput={handleApiBaseChange}
          placeholder="http://localhost:8787"
          spellcheck="false"
        />
        {#if apiBase.trim() !== 'http://localhost:8787' && apiBase.trim() !== ''}
          <button
            type="button"
            class="api-base-reset-btn"
            title="Reset to local default (http://localhost:8787)"
            onclick={resetApiBase}
          >
            Reset
          </button>
        {/if}
      </div>
    </div>

    <!-- Copy Agent Prompt Button -->
    <button
      type="button"
      class="btn btn-primary"
      onclick={() => copyToClipboard(agentPrompt, 'agent-prompt')}
    >
      <Icon name={copied === 'agent-prompt' ? 'check' : 'copy'} size={14} />
      <span>{copied === 'agent-prompt' ? 'Prompt Copied to Clipboard!' : 'Copy Agent Prompt'}</span>
    </button>
  </div>

  <!-- Prompt Content Preview -->
  <pre class="prompt-code-block"><code>{agentPrompt}</code></pre>
</div>

<!-- Essential Public Delivery Endpoints -->
<div class="mb-6">
  <div class="flex items-center justify-between mb-3">
    <div>
      <h2 class="text-base font-semibold text-dark m-0">Public Delivery Endpoints</h2>
      <p class="text-xs text-muted m-0">Zero-authentication endpoints for high-speed edge delivery from Cloudflare D1 & R2.</p>
    </div>
    {#if isMultiTenant}
      <div class="workspace-badge-pill">
        <Icon name="workspace" size={12} />
        <span>Active: <strong>{workspacesStore.active.name}</strong> (<code>{workspacesStore.active.slug}</code>)</span>
      </div>
    {/if}
  </div>

  <div class="shopify-table-container">
    <table class="shopify-table">
      <thead>
        <tr>
          <th class="col-method">Method</th>
          <th class="col-endpoint">Endpoint</th>
          <th>Description</th>
          <th class="col-actions">Action</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <span class="font-mono text-xs font-semibold text-dark">GET</span>
          </td>
          <td>
            {#if isMultiTenant}
              <code class="font-semibold text-dark text-sm">/api/v1/{workspacesStore.active.slug}/content/:slug</code>
            {:else}
              <code class="font-semibold text-dark text-sm">/api/content/:slug</code>
            {/if}
            <div class="text-xs text-muted mt-1 font-mono">
              Params: <code>?page</code>, <code>?limit</code>, <code>?sort</code>, <code>?order</code>, <code>?search</code>, <code>?populate=true</code>
            </div>
          </td>
          <td class="text-muted text-sm">
            Fetch published collection items with pagination and keyword filtering.
          </td>
          <td class="text-right">
            <button
              type="button"
              class="btn btn-secondary btn-sm"
              onclick={() => copyToClipboard(isMultiTenant ? `${cleanApiBase}/api/v1/${workspacesStore.active.slug}/content/${collections[0]?.slug || 'blogs'}` : `${cleanApiBase}/api/content/${collections[0]?.slug || 'blogs'}`, 'ep-list')}
            >
              <Icon name={copied === 'ep-list' ? 'check' : 'copy'} size={12} />
              <span>{copied === 'ep-list' ? 'Copied' : 'Copy URL'}</span>
            </button>
          </td>
        </tr>

        <tr>
          <td>
            <span class="font-mono text-xs font-semibold text-dark">GET</span>
          </td>
          <td>
            {#if isMultiTenant}
              <code class="font-semibold text-dark text-sm">/api/v1/{workspacesStore.active.slug}/content/:slug/:id</code>
            {:else}
              <code class="font-semibold text-dark text-sm">/api/content/:slug/:id</code>
            {/if}
            <div class="text-xs text-muted mt-1 font-mono">
              Params: <code>?populate=true</code> (expands related collection records)
            </div>
          </td>
          <td class="text-muted text-sm">
            Retrieve a single published record by unique record ID or slug.
          </td>
          <td class="text-right">
            <button
              type="button"
              class="btn btn-secondary btn-sm"
              onclick={() => copyToClipboard(isMultiTenant ? `${cleanApiBase}/api/v1/${workspacesStore.active.slug}/content/${collections[0]?.slug || 'blogs'}/:id` : `${cleanApiBase}/api/content/${collections[0]?.slug || 'blogs'}/:id`, 'ep-single')}
            >
              <Icon name={copied === 'ep-single' ? 'check' : 'copy'} size={12} />
              <span>{copied === 'ep-single' ? 'Copied' : 'Copy URL'}</span>
            </button>
          </td>
        </tr>

        <tr>
          <td>
            <span class="font-mono text-xs font-semibold text-dark">GET</span>
          </td>
          <td>
            <code class="font-semibold text-dark text-sm">/api/media/*</code>
          </td>
          <td class="text-muted text-sm">
            Direct high-speed asset streaming from Cloudflare R2 bucket.
          </td>
          <td class="text-right">
            <button
              type="button"
              class="btn btn-secondary btn-sm"
              onclick={() => copyToClipboard(`${cleanApiBase}/api/media/uploads/`, 'ep-media')}
            >
              <Icon name={copied === 'ep-media' ? 'check' : 'copy'} size={12} />
              <span>{copied === 'ep-media' ? 'Copied' : 'Copy URL'}</span>
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</div>
