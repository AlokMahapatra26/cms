<script lang="ts">
  import { Card, Button, Badge } from '$lib/components';

  let copied = $state<string | null>(null);
  let activeTab = $state<'fetch' | 'nextjs' | 'curl'>('fetch');

  const API_BASE = 'http://localhost:8787';

  function copyToClipboard(text: string, id: string) {
    navigator.clipboard.writeText(text);
    copied = id;
    setTimeout(() => {
      copied = null;
    }, 2000);
  }

  const fetchSnippet = `// 1. Fetch paginated collection records (e.g. 'products', 'articles')
const res = await fetch('${API_BASE}/api/content/products?page=1&limit=10&sort=created_at&order=desc');
const { data, pagination } = await res.json();

console.log('Records:', data);
console.log(\`Showing page \${pagination.page} of \${pagination.totalPages} (\${pagination.total} total items)\`);

// 2. Fetch single record by ID
const single = await fetch('${API_BASE}/api/content/products/3608c4ee-6351-4e90-9833-1d8cb5f0a9ad');
const item = await single.json();

console.log(item.data);`;

  const nextjsSnippet = `// app/catalog/page.tsx (Next.js 14/15 App Router with Pagination)
export default async function CatalogPage({
  searchParams
}: {
  searchParams: Promise<{ page?: string; search?: string }>
}) {
  const { page = '1', search = '' } = await searchParams;
  const res = await fetch(
    \`${API_BASE}/api/content/products?page=\${page}&limit=12&search=\${encodeURIComponent(search)}\`,
    { next: { revalidate: 60 } } // Edge cache & revalidation
  );
  const { data, pagination } = await res.json();

  return (
    <main className="p-8">
      <h1 className="text-2xl font-bold">Dynamic Catalog</h1>
      <p className="text-gray-500">Total Items: {pagination.total}</p>

      <div className="grid grid-cols-3 gap-4 mt-6">
        {data.map((entry: any) => (
          <div key={entry.id} className="border p-4 rounded-lg">
            <h2>{entry.data.name || entry.data.title}</h2>
            <p className="text-gray-600">{entry.data.description || 'No description'}</p>
          </div>
        ))}
      </div>
    </main>
  );
}`;

  const curlSnippet = `# 1. Query with Pagination, Sorting & Keyword Search (Public Edge)
curl -X GET "${API_BASE}/api/content/products?page=1&limit=10&sort=created_at&order=desc&search=keyword"

# 2. Get unpaginated records array (Backwards-compatible)
curl -X GET ${API_BASE}/api/content/products

# 3. Get specific record by ID (Public Edge)
curl -X GET ${API_BASE}/api/content/products/:id

# 4. Authenticate Admin (Get Bearer Token)
curl -X POST ${API_BASE}/api/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"email":"admin@example.com","password":"password123"}'

# 5. Admin Query with Status Filter & Pagination
curl -X GET "${API_BASE}/api/admin/content/products?status=all&page=1&limit=20" \\
  -H "Authorization: Bearer <YOUR_SESSION_TOKEN>"

# 6. Create Record in Collection (Admin)
curl -X POST ${API_BASE}/api/admin/content/products \\
  -H "Authorization: Bearer <YOUR_SESSION_TOKEN>" \\
  -H "Content-Type: application/json" \\
  -d '{"data": {"title": "Demo Product", "price": 49.99}, "status": "published"}'`;
</script>

<svelte:head>
  <title>API Reference - EdgeCMS Headless Engine</title>
</svelte:head>

<!-- Header -->
<div class="shopify-page-header">
  <div>
    <h1 class="shopify-page-title">Headless REST API</h1>
    <p class="shopify-page-subtitle">
      Query and distribute dynamic schema records, media assets, and collections worldwide.
    </p>
  </div>

  <div class="flex items-center gap-2">
    <span class="pill-tag-mint">
      Edge Global: Online
    </span>
    <span class="field-badge">
      Hono v4
    </span>
  </div>
</div>

<!-- Public Edge Endpoints -->
<div class="mb-6">
  <div class="flex justify-between items-center mb-3">
    <div>
      <h2 class="text-base font-semibold text-dark m-0">Public Delivery Endpoints</h2>
      <p class="text-xs text-muted m-0">No API key required. High-speed cache on Cloudflare edge.</p>
    </div>
    <span class="pill-tag-mint">Public / CDN Cached</span>
  </div>

  <div class="shopify-table-container">
    <table class="shopify-table">
      <thead>
        <tr>
          <th style="width: 80px;">Method</th>
          <th>Endpoint</th>
          <th>Description</th>
          <th class="text-right">Action</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <span class="pill-tag-mint">GET</span>
          </td>
          <td>
            <code class="font-semibold text-dark text-sm">/api/content/:collectionSlug</code>
            <div style="font-size: 11px; color: #71717a; margin-top: 2px;">
              Query params: <code>?page</code>, <code>?limit</code>, <code>?sort</code>, <code>?order</code>, <code>?search</code>
            </div>
          </td>
          <td class="text-muted text-sm">
            Fetch published records with pagination, custom sorting, and keyword search.
          </td>
          <td class="text-right">
            <button
              class="btn-sm-pill btn-gray-sm"
              onclick={() => copyToClipboard(`${API_BASE}/api/content/:collectionSlug`, 'content-list')}
            >
              {copied === 'content-list' ? 'Copied!' : 'Copy URL'}
            </button>
          </td>
        </tr>

        <tr>
          <td>
            <span class="pill-tag-mint">GET</span>
          </td>
          <td>
            <code class="font-semibold text-dark text-sm">/api/content/:collectionSlug/:id</code>
          </td>
          <td class="text-muted text-sm">
            Retrieve a single published record by unique ID or slug.
          </td>
          <td class="text-right">
            <button
              class="btn-sm-pill btn-gray-sm"
              onclick={() => copyToClipboard(`${API_BASE}/api/content/:collectionSlug/:id`, 'content-single')}
            >
              {copied === 'content-single' ? 'Copied!' : 'Copy URL'}
            </button>
          </td>
        </tr>

        <tr>
          <td>
            <span class="pill-tag-mint">GET</span>
          </td>
          <td>
            <code class="font-semibold text-dark text-sm">/api/media/*</code>
          </td>
          <td class="text-muted text-sm">
            Stream media assets and graphics stored directly in Cloudflare R2 bucket.
          </td>
          <td class="text-right">
            <button
              class="btn-sm-pill btn-gray-sm"
              onclick={() => copyToClipboard(`${API_BASE}/api/media/`, 'media')}
            >
              {copied === 'media' ? 'Copied!' : 'Copy URL'}
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</div>

<!-- Authenticated Management Endpoints -->
<div class="mb-6">
  <div class="flex justify-between items-center mb-3">
    <div>
      <h2 class="text-base font-semibold text-dark m-0">Authenticated Admin Endpoints</h2>
      <p class="text-xs text-muted m-0">Manage schemas, write drafts, and upload files.</p>
    </div>
    <span class="pill-tag-gray">Requires Bearer Token</span>
  </div>

  <div class="shopify-table-container">
    <table class="shopify-table">
      <thead>
        <tr>
          <th style="width: 80px;">Method</th>
          <th>Endpoint</th>
          <th>Description</th>
          <th class="text-right">Action</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <span class="pill-tag-gray">POST</span>
          </td>
          <td>
            <code class="font-semibold text-dark text-sm">/api/auth/login</code>
          </td>
          <td class="text-muted text-sm">
            Authenticate admin credentials and retrieve a 7-day session token.
          </td>
          <td class="text-right">
            <button
              class="btn-sm-pill btn-gray-sm"
              onclick={() => copyToClipboard(`${API_BASE}/api/auth/login`, 'auth-login')}
            >
              {copied === 'auth-login' ? 'Copied!' : 'Copy URL'}
            </button>
          </td>
        </tr>
        <tr>
          <td>
            <span class="pill-tag-gray">GET</span>
          </td>
          <td>
            <code class="font-semibold text-dark text-sm">/api/admin/collections</code>
          </td>
          <td class="text-muted text-sm">
            List all dynamic collection schema models and their field definitions.
          </td>
          <td class="text-right">
            <button
              class="btn-sm-pill btn-gray-sm"
              onclick={() => copyToClipboard(`${API_BASE}/api/admin/collections`, 'admin-collections')}
            >
              {copied === 'admin-collections' ? 'Copied!' : 'Copy URL'}
            </button>
          </td>
        </tr>
        <tr>
          <td>
            <span class="pill-tag-gray">POST</span>
          </td>
          <td>
            <code class="font-semibold text-dark text-sm">/api/admin/collections</code>
          </td>
          <td class="text-muted text-sm">
            Create a new collection model with dynamic field definitions.
          </td>
          <td class="text-right">
            <button
              class="btn-sm-pill btn-gray-sm"
              onclick={() => copyToClipboard(`${API_BASE}/api/admin/collections`, 'admin-create-col')}
            >
              {copied === 'admin-create-col' ? 'Copied!' : 'Copy URL'}
            </button>
          </td>
        </tr>
        <tr>
          <td>
            <span class="pill-tag-gray">GET</span>
          </td>
          <td>
            <code class="font-semibold text-dark text-sm">/api/admin/content/:collectionSlug</code>
          </td>
          <td class="text-muted text-sm">
            Fetch all records in a collection including drafts and unpublished items.
          </td>
          <td class="text-right">
            <button
              class="btn-sm-pill btn-gray-sm"
              onclick={() => copyToClipboard(`${API_BASE}/api/admin/content/:collectionSlug`, 'admin-content-list')}
            >
              {copied === 'admin-content-list' ? 'Copied!' : 'Copy URL'}
            </button>
          </td>
        </tr>
        <tr>
          <td>
            <span class="pill-tag-gray">POST</span>
          </td>
          <td>
            <code class="font-semibold text-dark text-sm">/api/admin/content/:collectionSlug</code>
          </td>
          <td class="text-muted text-sm">
            Create a new record in a collection with custom dynamic fields payload.
          </td>
          <td class="text-right">
            <button
              class="btn-sm-pill btn-gray-sm"
              onclick={() => copyToClipboard(`${API_BASE}/api/admin/content/:collectionSlug`, 'admin-create-item')}
            >
              {copied === 'admin-create-item' ? 'Copied!' : 'Copy URL'}
            </button>
          </td>
        </tr>
        <tr>
          <td>
            <span class="pill-tag-gray">POST</span>
          </td>
          <td>
            <code class="font-semibold text-dark text-sm">/api/admin/upload</code>
          </td>
          <td class="text-muted text-sm">
            Direct multipart file upload to Cloudflare R2 object storage.
          </td>
          <td class="text-right">
            <button
              class="btn-sm-pill btn-gray-sm"
              onclick={() => copyToClipboard(`${API_BASE}/api/admin/upload`, 'admin-upload')}
            >
              {copied === 'admin-upload' ? 'Copied!' : 'Copy URL'}
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</div>

<!-- Code Integration Card -->
<Card class="p-6">
  <div class="flex justify-between items-center mb-4 flex-wrap gap-3">
    <div>
      <h2 class="text-lg font-semibold text-dark m-0 mb-1">Frontend Integration Code</h2>
      <p class="text-sm text-muted m-0">Drop directly into Next.js, Astro, Nuxt, or mobile apps.</p>
    </div>

    <!-- Segmented Tabs -->
    <div class="shopify-segmented">
      <button
        class="shopify-segment-btn {activeTab === 'fetch' ? 'active' : ''}"
        onclick={() => (activeTab = 'fetch')}
      >
        Fetch / JS
      </button>
      <button
        class="shopify-segment-btn {activeTab === 'nextjs' ? 'active' : ''}"
        onclick={() => (activeTab = 'nextjs')}
      >
        Next.js App Router
      </button>
      <button
        class="shopify-segment-btn {activeTab === 'curl' ? 'active' : ''}"
        onclick={() => (activeTab = 'curl')}
      >
        cURL / CLI
      </button>
    </div>
  </div>

  <div class="relative">
    {#if activeTab === 'fetch'}
      <pre class="m-0 p-4 rounded-md text-sm text-dark bg-cream overflow-x-auto border"><code>{fetchSnippet}</code></pre>
    {:else if activeTab === 'nextjs'}
      <pre class="m-0 p-4 rounded-md text-sm text-dark bg-cream overflow-x-auto border"><code>{nextjsSnippet}</code></pre>
    {:else if activeTab === 'curl'}
      <pre class="m-0 p-4 rounded-md text-sm text-dark bg-cream overflow-x-auto border"><code>{curlSnippet}</code></pre>
    {/if}
  </div>
</Card>
