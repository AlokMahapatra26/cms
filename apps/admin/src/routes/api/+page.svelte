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

  const fetchSnippet = `// 1. Fetch all published articles
const posts = await fetch('${API_BASE}/api/posts')
  .then(res => res.json());

// 2. Fetch single article by slug
const post = await fetch('${API_BASE}/api/posts/nee-post')
  .then(res => res.json());

console.log(post.title, post.content);`;

  const nextjsSnippet = `// app/blog/page.tsx (Next.js 14/15 App Router)
export default async function BlogPage() {
  const res = await fetch('${API_BASE}/api/posts', {
    next: { revalidate: 60 } // Cache & revalidate
  });
  const posts = await res.json();

  return (
    <main>
      <h1>Articles</h1>
      {posts.map((post) => (
        <a key={post.id} href={\`/blog/\${post.slug}\`}>
          <h2>{post.title}</h2>
          <p>{post.excerpt}</p>
        </a>
      ))}
    </main>
  );
}`;

  const curlSnippet = `# 1. List all published articles
curl -X GET ${API_BASE}/api/posts

# 2. Get specific article by slug
curl -X GET ${API_BASE}/api/posts/nee-post

# 3. Check API health
curl -X GET ${API_BASE}/health`;
</script>

<div style="margin-bottom: 32px;">
  <h1 style="font-size: 36px; font-weight: 700; color: #141414; margin: 0 0 6px 0; letter-spacing: -0.02em;">
    API Reference.
  </h1>
  <p style="font-size: 16px; color: #707070; margin: 0; font-weight: 400;">
    Connect any frontend, mobile app, or static generator to your Cloudflare edge CMS.
  </p>
</div>

<!-- Endpoints Table Card -->
<div style="margin-bottom: 36px;">
  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
    <h2 style="font-size: 20px; font-weight: 700; margin: 0;">Public Content Delivery API</h2>
    <span class="badge-popular">CORS ENABLED</span>
  </div>

  <div class="table-card">
    <table class="data-table">
      <thead>
        <tr>
          <th style="width: 90px;">Method</th>
          <th>Endpoint</th>
          <th>Description</th>
          <th style="text-align: right;">Action</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>
            <span style="background-color: #e6f4ea; color: #137333; font-weight: 700; font-size: 11px; padding: 4px 8px; border-radius: 6px;">GET</span>
          </td>
          <td>
            <code style="font-family: monospace; font-size: 14px; font-weight: 600; color: #141414;">/api/posts</code>
          </td>
          <td style="color: #707070; font-size: 14px;">
            Lists all published posts ordered by newest first.
          </td>
          <td style="text-align: right;">
            <button
              class="btn-pill-soft"
              onclick={() => copyToClipboard(`${API_BASE}/api/posts`, 'posts')}
            >
              {copied === 'posts' ? 'Copied!' : 'Copy URL'}
            </button>
          </td>
        </tr>

        <tr>
          <td>
            <span style="background-color: #e6f4ea; color: #137333; font-weight: 700; font-size: 11px; padding: 4px 8px; border-radius: 6px;">GET</span>
          </td>
          <td>
            <code style="font-family: monospace; font-size: 14px; font-weight: 600; color: #141414;">/api/posts/:slug</code>
          </td>
          <td style="color: #707070; font-size: 14px;">
            Returns a single post with full Markdown content and cover image.
          </td>
          <td style="text-align: right;">
            <button
              class="btn-pill-soft"
              onclick={() => copyToClipboard(`${API_BASE}/api/posts/:slug`, 'slug')}
            >
              {copied === 'slug' ? 'Copied!' : 'Copy URL'}
            </button>
          </td>
        </tr>

        <tr>
          <td>
            <span style="background-color: #e6f4ea; color: #137333; font-weight: 700; font-size: 11px; padding: 4px 8px; border-radius: 6px;">GET</span>
          </td>
          <td>
            <code style="font-family: monospace; font-size: 14px; font-weight: 600; color: #141414;">/api/media/*</code>
          </td>
          <td style="color: #707070; font-size: 14px;">
            Streams image assets stored in Cloudflare R2 bucket with 1-year cache headers.
          </td>
          <td style="text-align: right;">
            <button
              class="btn-pill-soft"
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

<!-- Code Snippets Integration Card -->
<div class="form-card" style="padding: 28px;">
  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 12px;">
    <div>
      <h2 style="font-size: 20px; font-weight: 700; margin: 0 0 4px 0;">Frontend Integration Code</h2>
      <p style="color: #707070; font-size: 14px; margin: 0;">Copy and paste directly into your frontend app.</p>
    </div>

    <!-- Segmented Control Tabs -->
    <div class="segmented-control">
      <button
        class="segment-item {activeTab === 'fetch' ? 'active' : ''}"
        onclick={() => (activeTab = 'fetch')}
      >
        Fetch / JavaScript
      </button>
      <button
        class="segment-item {activeTab === 'nextjs' ? 'active' : ''}"
        onclick={() => (activeTab = 'nextjs')}
      >
        Next.js (App Router)
      </button>
      <button
        class="segment-item {activeTab === 'curl' ? 'active' : ''}"
        onclick={() => (activeTab = 'curl')}
      >
        cURL / CLI
      </button>
    </div>
  </div>

  <div style="position: relative;">
    <button
      class="btn-outline"
      style="position: absolute; top: 14px; right: 14px; font-size: 12px; padding: 6px 12px; background: #262626; color: #fff; border: 1px solid #444;"
      onclick={() => {
        const text = activeTab === 'fetch' ? fetchSnippet : activeTab === 'nextjs' ? nextjsSnippet : curlSnippet;
        copyToClipboard(text, 'code');
      }}
    >
      {copied === 'code' ? 'Copied Code!' : 'Copy Code'}
    </button>

    <pre style="background-color: #141414; color: #f3f3f3; padding: 24px; border-radius: 16px; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 13px; line-height: 1.6; overflow-x: auto; margin: 0;">
      <code>{activeTab === 'fetch' ? fetchSnippet : activeTab === 'nextjs' ? nextjsSnippet : curlSnippet}</code>
    </pre>
  </div>
</div>
