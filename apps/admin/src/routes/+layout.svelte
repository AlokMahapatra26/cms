<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { getMe, logout, getToken, getSetupStatus } from '$lib/api';
  import { collectionsStore } from '$lib/collections.svelte';
  import type { User } from '@cms/shared';
  import ConfirmModal from '$lib/ConfirmModal.svelte';

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
      collectionsStore.load();

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
    <div style="display: flex; align-items: center; justify-content: space-between; width: 100%; margin: 0 auto;">
      <!-- Shopify-style Brand Lockup -->
      <a href="/" class="shopify-brand">
        <svg width="22" height="22" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="28" height="28" rx="8" fill="#000000" />
          <path d="M14 6C12.3431 6 11 7.34315 11 9H9C8.44772 9 8 9.44772 8 10V20C8 20.5523 8.44772 21 9 21H19C19.5523 21 20 20.5523 20 20V10C20 9.44772 19.5523 9 19 9H17C17 7.34315 15.6569 6 14 6ZM14 7.5C14.8284 7.5 15.5 8.17157 15.5 9H12.5C12.5 8.17157 13.1716 7.5 14 7.5ZM9.5 10.5H18.5V19.5H9.5V10.5Z" fill="#C1FBD4" />
        </svg>
        <div style="display: flex; flex-direction: column;">
          <span style="font-weight: 600; font-size: 14px; line-height: 1.2;">EdgeCMS</span>
          <span style="font-size: 10.5px; color: #71717a; font-weight: 400;">Cloudflare Commerce</span>
        </div>
      </a>

      <!-- Right Action Controls -->
      <div style="display: flex; align-items: center; gap: 8px;">
        {#if currentUser}
          <!-- User Profile Chip (Clickable link to Settings) -->
          <a
            href="/settings"
            class="shopify-user-pill"
            title="Edit credentials & settings"
          >
            <div style="width: 20px; height: 20px; border-radius: 50%; background: #000000; color: #ffffff; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700;">
              {currentUser.name.charAt(0).toUpperCase()}
            </div>
            <span style="font-weight: 500; font-size: 12px;">{currentUser.name}</span>
            <span style="background-color: var(--color-aloe); color: #043e1d; font-size: 9.5px; font-weight: 700; text-transform: uppercase; padding: 1px 6px; border-radius: 9999px; letter-spacing: 0.04em;">
              {currentUser.role}
            </span>
          </a>

          <a href="http://localhost:4321" target="_blank" rel="noopener" class="btn-outline-pill" style="font-size: 12px; padding: 4px 11px;">
            <span>Live Blog</span>
            <span style="font-size: 10px; opacity: 0.6;">↗</span>
          </a>

          <button
            onclick={handleLogout}
            class="btn-outline-pill"
            style="font-size: 12px; padding: 4px 11px; color: #71717a; border-color: #d4d4d8;"
            title="Sign out"
          >
            Sign out
          </button>
        {:else if !isAuthPage}
          <a href="/login" class="btn-primary-pill" style="font-size: 12.5px; padding: 5px 14px;">
            Sign In
          </a>
        {/if}
      </div>
    </div>
  </header>

  <!-- Layout Body -->
  {#if currentUser && !isAuthPage}
    <div class="shopify-app-body">
      <!-- Shopify Left Sidebar -->
      <aside class="shopify-sidebar">
        <div>
          <!-- Quick Action: Create Article -->
          <div style="margin-bottom: 14px;">
            <a
              href="/new"
              class="btn-primary-pill"
              style="width: 100%; justify-content: center; padding: 7px 12px; font-size: 12.5px; box-sizing: border-box;"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              <span>Create Article</span>
            </a>
          </div>

          <!-- Section 1: Content -->
          <div class="shopify-sidebar-section">
            <h3 class="shopify-sidebar-heading">Content</h3>
            <a href="/" class="shopify-sidebar-link {page.url.pathname === '/' ? 'active' : ''}">
              <div class="shopify-sidebar-link-content">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
                <span>Articles</span>
              </div>
            </a>

            <a href="/new" class="shopify-sidebar-link {page.url.pathname === '/new' ? 'active' : ''}">
              <div class="shopify-sidebar-link-content">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
                <span>Write Draft</span>
              </div>
            </a>

            <a href="/media" class="shopify-sidebar-link {page.url.pathname === '/media' ? 'active' : ''}">
              <div class="shopify-sidebar-link-content">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <circle cx="8.5" cy="8.5" r="1.5"></circle>
                  <polyline points="21 15 16 10 5 21"></polyline>
                </svg>
                <span>Media Library</span>
              </div>
            </a>
          </div>

          <!-- Section 1.5: Dynamic Collections -->
          <div class="shopify-sidebar-section">
            <div style="display: flex; align-items: center; justify-content: space-between; padding-right: 6px;">
              <h3 class="shopify-sidebar-heading" style="margin-bottom: 0;">Collections</h3>
              <a href="/schemas" style="font-size: 10.5px; color: #71717a; text-decoration: none;" title="Build new content models">+ Schema</a>
            </div>

            {#each collectionsStore.list as col (col.slug)}
              <a
                href="/content/{col.slug}"
                class="shopify-sidebar-link {page.url.pathname.startsWith('/content/' + col.slug) ? 'active' : ''}"
              >
                <div class="shopify-sidebar-link-content">
                  <div style="width: 15px; height: 15px; border-radius: 4px; background: #000000; color: #ffffff; display: flex; align-items: center; justify-content: center; font-size: 8.5px; font-weight: 700;">
                    {col.name.charAt(0).toUpperCase()}
                  </div>
                  <span>{col.name}</span>
                </div>
              </a>
            {/each}
          </div>

          <!-- Section 2: Developer & Distribution -->
          <div class="shopify-sidebar-section">
            <h3 class="shopify-sidebar-heading">Distribution</h3>
            <a href="/api" class="shopify-sidebar-link {page.url.pathname === '/api' ? 'active' : ''}">
              <div class="shopify-sidebar-link-content">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="16 18 22 12 16 6"></polyline>
                  <polyline points="8 6 2 12 8 18"></polyline>
                </svg>
                <span>API Reference</span>
              </div>
            </a>

            <a href="http://localhost:4321" target="_blank" rel="noopener" class="shopify-sidebar-link">
              <div class="shopify-sidebar-link-content">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="2" y1="12" x2="22" y2="12"></line>
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                </svg>
                <span>Storefront</span>
              </div>
              <span style="font-size: 10px; opacity: 0.6;">↗</span>
            </a>
          </div>

          <!-- Section 3: Settings & Schema -->
          <div class="shopify-sidebar-section">
            <h3 class="shopify-sidebar-heading">Models & Settings</h3>
            <a href="/schemas" class="shopify-sidebar-link {page.url.pathname === '/schemas' ? 'active' : ''}">
              <div class="shopify-sidebar-link-content">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="3" y1="9" x2="21" y2="9"></line>
                  <line x1="9" y1="21" x2="9" y2="9"></line>
                </svg>
                <span>Content Modeler</span>
              </div>
            </a>

            <a href="/settings" class="shopify-sidebar-link {page.url.pathname === '/settings' ? 'active' : ''}">
              <div class="shopify-sidebar-link-content">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="3"></circle>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                </svg>
                <span>Credentials</span>
              </div>
            </a>
          </div>
        </div>

        <!-- Sidebar Footer Status -->
        <div style="padding: 10px; background-color: #fbfbf5; border: 1px solid var(--color-hairline); border-radius: 8px; font-size: 10.5px; color: #71717a;">
          <div style="display: flex; align-items: center; gap: 5px; font-weight: 600; color: #000000; margin-bottom: 2px;">
            <span style="display: inline-block; width: 5px; height: 5px; border-radius: 50%; background-color: #10b981;"></span>
            <span>Cloudflare Edge</span>
          </div>
          <span>D1 SQLite & R2 Active</span>
        </div>
      </aside>

      <!-- Main Content Area -->
      <main class="shopify-content-area">
        <div class="shopify-content-inner">
          {@render children()}
        </div>
      </main>
    </div>
  {:else}
    <!-- Auth Screen Container (Centered, No Sidebar) -->
    <main style="max-width: 600px; width: 100%; margin: 32px auto 80px auto; padding: 0 20px; flex: 1;">
      {#if isCheckingAuth && !isAuthPage}
        <div style="text-align: center; padding: 60px; color: var(--color-shade-50); font-size: 14px;">
          Loading dashboard...
        </div>
      {:else}
        {@render children()}
      {/if}
    </main>
  {/if}

  <!-- Clean Minimal Footer -->
  <footer style="background-color: #ffffff; border-top: 1px solid #e4e4e7; padding: 24px; margin-top: auto;">
    <div style="max-width: 1360px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="font-weight: 600; font-size: 13px;">EdgeCMS</span>
        <span style="color: #a1a1aa; font-size: 13px;">•</span>
        <span style="color: #71717a; font-size: 13px;">Cloudflare Workers • D1 • R2 • SvelteKit • Astro</span>
      </div>

      <div style="display: flex; gap: 20px; font-size: 13px; color: #71717a;">
        <a href="http://localhost:8787/api/posts" target="_blank" style="color: inherit;">Feed</a>
        <a href="http://localhost:4321" target="_blank" style="color: inherit;">Public Front</a>
        <a href="https://shopify.dev" target="_blank" style="color: inherit;">Polaris DNA</a>
      </div>
    </div>
  </footer>

  <!-- Universal Polaris Modal for Confirmations & Alerts -->
  <ConfirmModal />
</div>
