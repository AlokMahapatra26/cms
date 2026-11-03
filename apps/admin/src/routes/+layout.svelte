<script lang="ts">
  import '$lib/mobbin.css';
  import { page } from '$app/state';

  let { children } = $props();
</script>

<div style="min-height: 100vh; display: flex; flex-direction: column;">
  <!-- Floating Stadium Navigation Pill -->
  <header style="padding: 0 16px;">
    <nav class="nav-pill">
      <div style="display: flex; align-items: center; gap: 12px;">
        <!-- Squircle Brand Mark -->
        <a href="/" style="display: flex; align-items: center; gap: 10px;">
          <div style="width: 32px; height: 32px; background: #141414; border-radius: 30%; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 14px; font-weight: 700;">
            E
          </div>
          <span style="font-size: 17px; font-weight: 700; color: #141414; letter-spacing: -0.01em;">EdgeCMS.</span>
        </a>

        <div class="nav-links" style="margin-left: 16px;">
          <a href="/" class="nav-link {page.url.pathname === '/' ? 'active' : ''}">Posts</a>
          <a href="/new" class="nav-link {page.url.pathname === '/new' ? 'active' : ''}">New Post</a>
        </div>
      </div>

      <div style="display: flex; align-items: center; gap: 10px;">
        <a href="http://localhost:4321" target="_blank" rel="noopener" class="btn-outline" style="font-size: 13px; padding: 7px 14px;">
          <span>Live Blog</span>
          <span style="font-size: 12px; opacity: 0.6;">↗</span>
        </a>
        <a href="/new" class="btn-primary" style="font-size: 13px; padding: 7px 16px;">
          + Create Post
        </a>
      </div>
    </nav>
  </header>

  <!-- Page Content Container -->
  <main style="max-width: 960px; width: 100%; margin: 0 auto; padding: 0 16px 80px 16px; flex: 1;">
    {@render children()}
  </main>

  <!-- Mobbin Inverse Footer -->
  <footer style="background-color: #141414; color: #ffffff; border-top-left-radius: 24px; border-top-right-radius: 24px; padding: 48px 32px 36px 32px; margin-top: auto;">
    <div style="max-width: 960px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 20px;">
      <div>
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 6px;">
          <div style="width: 24px; height: 24px; background: #ffffff; border-radius: 30%; display: flex; align-items: center; justify-content: center; color: #141414; font-size: 12px; font-weight: 700;">
            E
          </div>
          <span style="font-weight: 700; font-size: 16px;">EdgeCMS.</span>
        </div>
        <p style="color: #adadad; font-size: 13px; margin: 0;">
          Gallery-grade headless CMS running at the edge on Cloudflare Workers, D1 & R2.
        </p>
      </div>

      <div style="display: flex; gap: 24px; font-size: 13px; color: #adadad;">
        <a href="http://localhost:8787/api/posts" target="_blank" style="color: inherit;">API Feed</a>
        <a href="http://localhost:4321" target="_blank" style="color: inherit;">Public Front</a>
        <a href="https://developers.cloudflare.com/d1" target="_blank" style="color: inherit;">Cloudflare D1</a>
      </div>
    </div>
  </footer>
</div>
