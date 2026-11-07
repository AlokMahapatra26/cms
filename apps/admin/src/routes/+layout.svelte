<script lang="ts">
  import '../app.css';
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

      // If authenticated and visiting /login or /setup, redirect to schemas
      if (isAuthPage) {
        goto('/schemas');
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

<div class="flex flex-col min-h-screen">
  <!-- Merchant Admin Header -->
  <header class="shopify-header">
    <div class="shopify-nav-inner">
      <!-- Brand Lockup -->
      <a href="/schemas" class="shopify-brand">
        <svg width="22" height="22" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="28" height="28" rx="8" fill="#000000" />
          <path d="M14 6C12.3431 6 11 7.34315 11 9H9C8.44772 9 8 9.44772 8 10V20C8 20.5523 8.44772 21 9 21H19C19.5523 21 20 20.5523 20 20V10C20 9.44772 19.5523 9 19 9H17C17 7.34315 15.6569 6 14 6ZM14 7.5C14.8284 7.5 15.5 8.17157 15.5 9H12.5C12.5 8.17157 13.1716 7.5 14 7.5ZM9.5 10.5H18.5V19.5H9.5V10.5Z" fill="#C1FBD4" />
        </svg>
        <div class="flex flex-col">
          <span class="font-semibold text-sm">EdgeCMS</span>
          <span class="text-xs text-muted">Cloudflare Headless Engine</span>
        </div>
      </a>

      <!-- Right Action Controls -->
      <div class="flex items-center gap-2">
        {#if currentUser}
          <!-- User Profile Chip (Clickable link to Settings) -->
          <a
            href="/settings"
            class="shopify-user-pill"
            title="Edit credentials & settings"
          >
            <div class="user-avatar-badge">
              {currentUser.name.charAt(0).toUpperCase()}
            </div>
            <span class="font-medium text-sm">{currentUser.name}</span>
            <span class="pill-tag-mint">
              {currentUser.role}
            </span>
          </a>

          <a href="/api" class="btn-outline-pill" title="Explore Headless API">
            <span>REST API</span>
            <span class="text-xs text-muted">⚡</span>
          </a>

          <button
            onclick={handleLogout}
            class="btn-outline-pill"
            title="Sign out"
          >
            Sign out
          </button>
        {:else if !isAuthPage}
          <a href="/login" class="btn-primary-pill">
            Sign In
          </a>
        {/if}
      </div>
    </div>
  </header>

  <!-- Layout Body -->
  {#if currentUser && !isAuthPage}
    <div class="shopify-app-body">
      <!-- Left Sidebar -->
      <aside class="shopify-sidebar">
        <div>
          <!-- Quick Action: Create New Schema -->
          <div class="mb-3">
            <a
              href="/schemas"
              class="btn-primary-pill w-full justify-center"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              <span>+ New Schema</span>
            </a>
          </div>

          <!-- Section 1: Dynamic Content Collections -->
          <div class="shopify-sidebar-section">
            <div class="flex items-center justify-between pr-2 mb-1">
              <h3 class="shopify-sidebar-heading m-0">Collections</h3>
              <a href="/schemas" class="text-xs text-muted" title="Build new content models">+ Schema</a>
            </div>

            {#if collectionsStore.list.length === 0}
              <div class="px-2 py-1 text-xs text-muted">
                No collections yet.
              </div>
            {:else}
              {#each collectionsStore.list as col (col.slug)}
                <a
                  href="/content/{col.slug}"
                  class="shopify-sidebar-link {page.url.pathname.startsWith('/content/' + col.slug) ? 'active' : ''}"
                >
                  <div class="shopify-sidebar-link-content">
                    <div class="collection-avatar-badge">
                      {col.name.charAt(0).toUpperCase()}
                    </div>
                    <span>{col.name}</span>
                  </div>
                </a>
              {/each}
            {/if}
          </div>

          <!-- Section 3: Schema Modeler & Media -->
          <div class="shopify-sidebar-section">
            <h3 class="shopify-sidebar-heading">Models & Assets</h3>
            <a href="/schemas" class="shopify-sidebar-link {page.url.pathname === '/schemas' ? 'active' : ''}">
              <div class="shopify-sidebar-link-content">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="3" y1="9" x2="21" y2="9"></line>
                  <line x1="9" y1="21" x2="9" y2="9"></line>
                </svg>
                <span>Schema Builder</span>
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

          <!-- Section 4: Distribution & Settings -->
          <div class="shopify-sidebar-section">
            <h3 class="shopify-sidebar-heading">System</h3>
            <a href="/api" class="shopify-sidebar-link {page.url.pathname === '/api' ? 'active' : ''}">
              <div class="shopify-sidebar-link-content">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="16 18 22 12 16 6"></polyline>
                  <polyline points="8 6 2 12 8 18"></polyline>
                </svg>
                <span>API Reference</span>
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
        <div class="sidebar-status-box">
          <div class="flex items-center gap-1 font-semibold text-dark mb-1">
            <span class="status-dot-active"></span>
            <span>Cloudflare Edge</span>
          </div>
          <span>D1 SQLite & R2 Storage</span>
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
    <!-- Auth Screen Container -->
    <main class="auth-screen-container">
      {#if isCheckingAuth && !isAuthPage}
        <div class="text-center p-12 text-muted text-base">
          Loading CMS...
        </div>
      {:else}
        {@render children()}
      {/if}
    </main>
  {/if}

  <!-- Footer -->
  <footer class="app-global-footer">
    <div class="app-footer-inner">
      <div class="flex items-center gap-2">
        <span class="font-semibold text-sm">EdgeCMS</span>
        <span class="text-faint text-sm">•</span>
        <span class="text-muted text-sm">Cloudflare Headless CMS Engine</span>
      </div>

      <div class="flex gap-4 text-sm text-muted">
        <a href="/schemas">Schemas</a>
        <a href="/media">Media Library</a>
        <a href="/api">REST Endpoints</a>
      </div>
    </div>
  </footer>

  <!-- Universal Confirmation / Alert Modal -->
  <ConfirmModal />
</div>
