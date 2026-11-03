<script lang="ts">
  import { page } from '$app/state';

  let { children } = $props();
</script>

<div style="min-height: 100vh; display: flex; flex-direction: column; background-color: #fbfbf5;">
  <!-- Shopify Merchant Admin Header -->
  <header class="shopify-header">
    <div class="shopify-nav-inner">
      <div style="display: flex; align-items: center; gap: 24px;">
        <!-- Shopify-style Brand Lockup -->
        <a href="/" class="shopify-brand">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="28" height="28" rx="8" fill="#000000" />
            <path d="M14 6C12.3431 6 11 7.34315 11 9H9C8.44772 9 8 9.44772 8 10V20C8 20.5523 8.44772 21 9 21H19C19.5523 21 20 20.5523 20 20V10C20 9.44772 19.5523 9 19 9H17C17 7.34315 15.6569 6 14 6ZM14 7.5C14.8284 7.5 15.5 8.17157 15.5 9H12.5C12.5 8.17157 13.1716 7.5 14 7.5ZM9.5 10.5H18.5V19.5H9.5V10.5Z" fill="#C1FBD4" />
          </svg>
          <div style="display: flex; flex-direction: column;">
            <span style="font-weight: 600; font-size: 15px; line-height: 1.2;">EdgeCMS</span>
            <span style="font-size: 11px; color: #71717a; font-weight: 400;">Cloudflare Commerce Edition</span>
          </div>
        </a>

        <!-- Navigation Links -->
        <nav class="shopify-nav-links">
          <a href="/" class="shopify-nav-link {page.url.pathname === '/' ? 'active' : ''}">
            Articles
          </a>
          <a href="/new" class="shopify-nav-link {page.url.pathname === '/new' ? 'active' : ''}">
            New Article
          </a>
          <a href="/api" class="shopify-nav-link {page.url.pathname === '/api' ? 'active' : ''}">
            API Reference
          </a>
        </nav>
      </div>

      <!-- Right Action Controls -->
      <div style="display: flex; align-items: center; gap: 10px;">
        <a href="http://localhost:4321" target="_blank" rel="noopener" class="btn-outline-pill" style="font-size: 13px; padding: 7px 16px;">
          <span>Live Blog</span>
          <span style="font-size: 11px; opacity: 0.6;">↗</span>
        </a>
        <a href="/new" class="btn-primary-pill" style="font-size: 13px; padding: 7px 18px;">
          + Create Article
        </a>
      </div>
    </div>
  </header>

  <!-- Content Container -->
  <main style="max-width: 1040px; width: 100%; margin: 32px auto 80px auto; padding: 0 20px; flex: 1;">
    {@render children()}
  </main>

  <!-- Clean Minimal Footer -->
  <footer style="background-color: #ffffff; border-top: 1px solid #e4e4e7; padding: 32px 24px; margin-top: auto;">
    <div style="max-width: 1040px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="font-weight: 600; font-size: 13px;">EdgeCMS</span>
        <span style="color: #a1a1aa; font-size: 13px;">•</span>
        <span style="color: #71717a; font-size: 13px;">Built for high-performance edge commerce and publishing.</span>
      </div>

      <div style="display: flex; gap: 20px; font-size: 13px; color: #71717a;">
        <a href="http://localhost:8787/api/posts" target="_blank" style="color: inherit;">Feed</a>
        <a href="http://localhost:4321" target="_blank" style="color: inherit;">Public Front</a>
        <a href="https://shopify.dev" target="_blank" style="color: inherit;">Polaris DNA</a>
      </div>
    </div>
  </footer>
</div>
