<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { getMe, logout, getToken, getSetupStatus } from '$lib/api';
  import type { User } from '@cms/shared';

  let { children } = $props();

  let currentUser = $state<User | null>(null);
  let isCheckingAuth = $state(true);

  const isAuthPage = $derived(
    page.url.pathname === '/login' || page.url.pathname === '/setup'
  );

  async function checkAuth() {
    isCheckingAuth = true;
    try {
      // Check setup status first
      const setup = await getSetupStatus().catch(() => ({ needsSetup: false }));
      if (setup.needsSetup) {
        if (page.url.pathname !== '/setup') {
          goto('/setup');
          return;
        }
        isCheckingAuth = false;
        return;
      }

      const token = getToken();
      if (!token) {
        if (!isAuthPage) {
          goto('/login');
          return;
        }
        isCheckingAuth = false;
        return;
      }

      // Validate session with backend
      const user = await getMe();
      currentUser = user;

      // If authenticated and visiting /login or /setup, redirect to dashboard
      if (isAuthPage) {
        goto('/');
      }
    } catch (e) {
      if (!isAuthPage) {
        goto('/login');
      }
    } finally {
      isCheckingAuth = false;
    }
  }

  onMount(() => {
    checkAuth();
  });

  async function handleLogout() {
    await logout();
    currentUser = null;
    goto('/login');
  }
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

        <!-- Navigation Links (only shown when authenticated) -->
        {#if currentUser}
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
        {/if}
      </div>

      <!-- Right Action Controls -->
      <div style="display: flex; align-items: center; gap: 12px;">
        {#if currentUser}
          <!-- User Profile Chip -->
          <div style="display: flex; align-items: center; gap: 8px; background: #f4f4f5; padding: 4px 10px; border-radius: 9999px; font-size: 13px;">
            <div style="width: 22px; height: 22px; border-radius: 50%; background: #000000; color: #ffffff; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700;">
              {currentUser.name.charAt(0).toUpperCase()}
            </div>
            <span style="font-weight: 500;">{currentUser.name}</span>
            <span style="background-color: var(--color-aloe); color: #043e1d; font-size: 10px; font-weight: 700; text-transform: uppercase; padding: 2px 7px; border-radius: 9999px; letter-spacing: 0.04em;">
              {currentUser.role}
            </span>
          </div>

          <a href="http://localhost:4321" target="_blank" rel="noopener" class="btn-outline-pill" style="font-size: 13px; padding: 6px 14px;">
            <span>Live Blog</span>
            <span style="font-size: 11px; opacity: 0.6;">↗</span>
          </a>

          <button
            onclick={handleLogout}
            class="btn-outline-pill"
            style="font-size: 13px; padding: 6px 14px; color: #71717a; border-color: #d4d4d8;"
            title="Sign out"
          >
            Sign out
          </button>
        {:else if !isAuthPage}
          <a href="/login" class="btn-primary-pill" style="font-size: 13px; padding: 6px 16px;">
            Sign In
          </a>
        {/if}
      </div>
    </div>
  </header>

  <!-- Content Container -->
  <main style="max-width: 1040px; width: 100%; margin: 32px auto 80px auto; padding: 0 20px; flex: 1;">
    {#if isCheckingAuth && !isAuthPage}
      <div style="text-align: center; padding: 60px; color: var(--color-shade-50); font-size: 14px;">
        Loading dashboard...
      </div>
    {:else}
      {@render children()}
    {/if}
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
