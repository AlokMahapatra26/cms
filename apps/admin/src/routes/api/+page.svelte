<script lang="ts">
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

  const fetchSnippet = `// 1. Fetch all published storefront articles
const posts = await fetch('${API_BASE}/api/posts')
  .then(res => res.json());

// 2. Fetch single article by slug
const post = await fetch('${API_BASE}/api/posts/nee-post')
  .then(res => res.json());

console.log(post.title, post.content);`;

  const nextjsSnippet = `// app/blog/page.tsx (Next.js 14/15 App Router)
export default async function BlogPage() {
  const res = await fetch('${API_BASE}/api/posts', {
    next: { revalidate: 60 } // Cloudflare edge cache & revalidation
  });
  const posts = await res.json();

  return (
    <main>
      <h1>Storefront Articles</h1>
      {posts.map((post) => (
        <a key={post.id} href={\`/blog/\${post.slug}\`}>
          <h2>{post.title}</h2>
          <p>{post.excerpt}</p>
        </a>
      ))}
    </main>
  );
}`;

  const curlSnippet = `# 1. List all published articles (Public)
curl -X GET ${API_BASE}/api/posts

# 2. Get specific article by slug (Public)
curl -X GET ${API_BASE}/api/posts/nee-post

# 3. Authenticate Admin (Get Bearer Token)
curl -X POST ${API_BASE}/api/auth/login \\
  -H "Content-Type: application/json" \\
  -d '{"email":"admin@example.com","password":"password123"}'

# 4. Fetch All Drafts/Posts with Bearer Token
curl -X GET ${API_BASE}/api/admin/posts \\
  -H "Authorization: Bearer <YOUR_SESSION_TOKEN>"`;
</script>

<div style="margin-bottom: 16px;">
  <h1 style="font-size: 20px; font-weight: 600; color: #000000; margin: 0 0 2px 0; letter-spacing: -0.01em;">
    API Reference
  </h1>
  <p style="font-size: 12.5px; color: #71717a; margin: 0;">
    Connect external storefronts, headless checkouts, and mobile apps to your Cloudflare edge CMS.
  </p>
</div>

<!-- Endpoints Table Card -->
<div style="margin-bottom: 24px;">
  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
    <h2 style="font-size: 15px; font-weight: 600; margin: 0;">Storefront Delivery Endpoints</h2>
    <span class="pill-tag-mint">CORS Enabled</span>
  </div>

  <div class="shopify-card">
    <table class="shopify-table">
      <thead>
        <tr>
          <th style="width: 80px;">Method</th>
          <th>Endpoint</th>
          <th>Description</th>
          <th style="text-align: right;">Action</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <span class="pill-tag-mint">GET</span>
          </td>
          <td>
            <code style="font-family: monospace; font-size: 14px; font-weight: 600; color: #000000;">/api/posts</code>
          </td>
          <td style="color: #71717a; font-size: 14px;">
            Lists all published articles sorted by newest first.
          </td>
          <td style="text-align: right;">
            <button
              class="btn-sm-pill btn-gray-sm"
              onclick={() => copyToClipboard(`${API_BASE}/api/posts`, 'posts')}
            >
              {copied === 'posts' ? 'Copied!' : 'Copy URL'}
            </button>
          </td>
        </tr>

        <tr>
          <td>
            <span class="pill-tag-mint">GET</span>
          </td>
          <td>
            <code style="font-family: monospace; font-size: 14px; font-weight: 600; color: #000000;">/api/posts/:slug</code>
          </td>
          <td style="color: #71717a; font-size: 14px;">
            Fetches single article with complete Markdown body and media.
          </td>
          <td style="text-align: right;">
            <button
              class="btn-sm-pill btn-gray-sm"
              onclick={() => copyToClipboard(`${API_BASE}/api/posts/:slug`, 'slug')}
            >
              {copied === 'slug' ? 'Copied!' : 'Copy URL'}
            </button>
          </td>
        </tr>

        <tr>
          <td>
            <span class="pill-tag-mint">GET</span>
          </td>
          <td>
            <code style="font-family: monospace; font-size: 14px; font-weight: 600; color: #000000;">/api/media/*</code>
          </td>
          <td style="color: #71717a; font-size: 14px;">
            Streams media assets stored directly in Cloudflare R2 bucket.
          </td>
          <td style="text-align: right;">
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
<div style="margin-bottom: 32px;">
  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
    <h2 style="font-size: 18px; font-weight: 600; margin: 0;">Authenticated Admin Endpoints</h2>
    <span class="pill-tag-mint" style="background-color: #000000; color: #ffffff;">Requires Bearer Token</span>
  </div>

  <div class="shopify-card">
    <table class="shopify-table">
      <thead>
        <tr>
          <th style="width: 80px;">Method</th>
          <th>Endpoint</th>
          <th>Description</th>
          <th style="text-align: right;">Action</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <span class="pill-tag-mint" style="background: #f4f4f5; color: #18181b;">POST</span>
          </td>
          <td>
            <code style="font-family: monospace; font-size: 14px; font-weight: 600; color: #000000;">/api/auth/login</code>
          </td>
          <td style="color: #71717a; font-size: 14px;">
            Authenticate admin credentials and retrieve a 7-day session token.
          </td>
          <td style="text-align: right;">
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
            <span class="pill-tag-mint" style="background: #f4f4f5; color: #18181b;">GET</span>
          </td>
          <td>
            <code style="font-family: monospace; font-size: 14px; font-weight: 600; color: #000000;">/api/auth/me</code>
          </td>
          <td style="color: #71717a; font-size: 14px;">
            Validate active session and return current user role & profile.
          </td>
          <td style="text-align: right;">
            <button
              class="btn-sm-pill btn-gray-sm"
              onclick={() => copyToClipboard(`${API_BASE}/api/auth/me`, 'auth-me')}
            >
              {copied === 'auth-me' ? 'Copied!' : 'Copy URL'}
            </button>
          </td>
        </tr>
        <tr>
          <td>
            <span class="pill-tag-mint" style="background: #f4f4f5; color: #18181b;">GET</span>
          </td>
          <td>
            <code style="font-family: monospace; font-size: 14px; font-weight: 600; color: #000000;">/api/admin/posts</code>
          </td>
          <td style="color: #71717a; font-size: 14px;">
            Fetch all articles including drafts and internal revisions.
          </td>
          <td style="text-align: right;">
            <button
              class="btn-sm-pill btn-gray-sm"
              onclick={() => copyToClipboard(`${API_BASE}/api/admin/posts`, 'admin-posts')}
            >
              {copied === 'admin-posts' ? 'Copied!' : 'Copy URL'}
            </button>
          </td>
        </tr>
        <tr>
          <td>
            <span class="pill-tag-mint" style="background: #f4f4f5; color: #18181b;">POST</span>
          </td>
          <td>
            <code style="font-family: monospace; font-size: 14px; font-weight: 600; color: #000000;">/api/admin/posts</code>
          </td>
          <td style="color: #71717a; font-size: 14px;">
            Create new article draft or directly publish with markdown content.
          </td>
          <td style="text-align: right;">
            <button
              class="btn-sm-pill btn-gray-sm"
              onclick={() => copyToClipboard(`${API_BASE}/api/admin/posts`, 'admin-create')}
            >
              {copied === 'admin-create' ? 'Copied!' : 'Copy URL'}
            </button>
          </td>
        </tr>
        <tr>
          <td>
            <span class="pill-tag-mint" style="background: #f4f4f5; color: #18181b;">POST</span>
          </td>
          <td>
            <code style="font-family: monospace; font-size: 14px; font-weight: 600; color: #000000;">/api/admin/upload</code>
          </td>
          <td style="color: #71717a; font-size: 14px;">
            Direct multipart upload to Cloudflare R2 object storage.
          </td>
          <td style="text-align: right;">
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
<div class="shopify-card" style="padding: 28px;">
  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 12px;">
    <div>
      <h2 style="font-size: 18px; font-weight: 600; margin: 0 0 4px 0;">Storefront Integration Code</h2>
      <p style="color: #71717a; font-size: 14px; margin: 0;">Drop into your storefront or frontend app.</p>
    </div>

    <!-- Segmented Tabs -->
    <div class="shopify-segmented">
      <button
        class="shopify-segment-btn {activeTab === 'fetch' ? 'active' : ''}"
        onclick={() => (activeTab = 'fetch')}
      >
        Fetch / JavaScript
      </button>
      <button
        class="shopify-segment-btn {activeTab === 'nextjs' ? 'active' : ''}"
        onclick={() => (activeTab = 'nextjs')}
      >
        Next.js
      </button>
      <button
        class="shopify-segment-btn {activeTab === 'curl' ? 'active' : ''}"
        onclick={() => (activeTab = 'curl')}
      >
        cURL / CLI
      </button>
    </div>
  </div>

  <div style="position: relative;">
    <button
      class="btn-sm-pill btn-aloe-sm"
      style="position: absolute; top: 14px; right: 14px; font-size: 12px; padding: 6px 14px;"
      onclick={() => {
        const text = activeTab === 'fetch' ? fetchSnippet : activeTab === 'nextjs' ? nextjsSnippet : curlSnippet;
        copyToClipboard(text, 'code');
      }}
    >
      {copied === 'code' ? 'Copied Code!' : 'Copy Code'}
    </button>

    <pre style="background-color: #000000; color: #f4f4f5; padding: 24px; border-radius: 12px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 13px; line-height: 1.6; overflow-x: auto; margin: 0;">
      <code>{activeTab === 'fetch' ? fetchSnippet : activeTab === 'nextjs' ? nextjsSnippet : curlSnippet}</code>
    </pre>
  </div>
</div>

<!-- Authenticated Management Endpoints -->
<div style="margin-bottom: 32px;">
  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
    <h2 style="font-size: 18px; font-weight: 600; margin: 0;">Authenticated Admin Endpoints</h2>
    <span class="pill-tag-mint" style="background-color: #000000; color: #ffffff;">Requires Bearer Token</span>
  </div>

  <div class="shopify-card">
    <table class="shopify-table">
      <thead>
        <tr>
          <th style="width: 80px;">Method</th>
          <th>Endpoint</th>
          <th>Description</th>
          <th style="text-align: right;">Action</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <span class="pill-tag-mint" style="background: #f4f4f5; color: #18181b;">POST</span>
          </td>
          <td>
            <code style="font-family: monospace; font-size: 14px; font-weight: 600; color: #000000;">/api/auth/login</code>
          </td>
          <td style="color: #71717a; font-size: 14px;">
            Authenticate admin credentials and retrieve a 7-day session token.
          </td>
          <td style="text-align: right;">
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
            <span class="pill-tag-mint" style="background: #f4f4f5; color: #18181b;">GET</span>
          </td>
          <td>
            <code style="font-family: monospace; font-size: 14px; font-weight: 600; color: #000000;">/api/auth/me</code>
          </td>
          <td style="color: #71717a; font-size: 14px;">
            Validate active session and return current user role & profile.
          </td>
          <td style="text-align: right;">
            <button
              class="btn-sm-pill btn-gray-sm"
              onclick={() => copyToClipboard(`${API_BASE}/api/auth/me`, 'auth-me')}
            >
              {copied === 'auth-me' ? 'Copied!' : 'Copy URL'}
            </button>
          </td>
        </tr>
        <tr>
          <td>
            <span class="pill-tag-mint" style="background: #f4f4f5; color: #18181b;">GET</span>
          </td>
          <td>
            <code style="font-family: monospace; font-size: 14px; font-weight: 600; color: #000000;">/api/admin/posts</code>
          </td>
          <td style="color: #71717a; font-size: 14px;">
            Fetch all articles including drafts and internal revisions.
          </td>
          <td style="text-align: right;">
            <button
              class="btn-sm-pill btn-gray-sm"
              onclick={() => copyToClipboard(`${API_BASE}/api/admin/posts`, 'admin-posts')}
            >
              {copied === 'admin-posts' ? 'Copied!' : 'Copy URL'}
            </button>
          </td>
        </tr>
        <tr>
          <td>
            <span class="pill-tag-mint" style="background: #f4f4f5; color: #18181b;">POST</span>
          </td>
          <td>
            <code style="font-family: monospace; font-size: 14px; font-weight: 600; color: #000000;">/api/admin/posts</code>
          </td>
          <td style="color: #71717a; font-size: 14px;">
            Create new article draft or directly publish with markdown content.
          </td>
          <td style="text-align: right;">
            <button
              class="btn-sm-pill btn-gray-sm"
              onclick={() => copyToClipboard(`${API_BASE}/api/admin/posts`, 'admin-create')}
            >
              {copied === 'admin-create' ? 'Copied!' : 'Copy URL'}
            </button>
          </td>
        </tr>
        <tr>
          <td>
            <span class="pill-tag-mint" style="background: #f4f4f5; color: #18181b;">POST</span>
          </td>
          <td>
            <code style="font-family: monospace; font-size: 14px; font-weight: 600; color: #000000;">/api/admin/upload</code>
          </td>
          <td style="color: #71717a; font-size: 14px;">
            Direct multipart upload to Cloudflare R2 object storage.
          </td>
          <td style="text-align: right;">
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
