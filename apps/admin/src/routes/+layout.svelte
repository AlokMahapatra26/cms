<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { getMe, logout, getToken, getSetupStatus } from '$lib/api';
  import { collectionsStore } from '$lib/collections.svelte';
  import type { User } from '@cms/shared';
  import ConfirmModal from '$lib/ConfirmModal.svelte';
  import { Icon } from '$lib/components';

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
            <Icon name="api" size={13} class="text-muted" />
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
          <!-- Section 1: Dynamic Content Collections -->
          <div class="shopify-sidebar-section">
            <h3 class="shopify-sidebar-heading">Collections</h3>

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

          <!-- Section 2: Schema Modeler & Media -->
          <div class="shopify-sidebar-section">
            <h3 class="shopify-sidebar-heading">Models & Assets</h3>
            <a href="/schemas" class="shopify-sidebar-link {page.url.pathname === '/schemas' ? 'active' : ''}">
              <div class="shopify-sidebar-link-content">
                <Icon name="schema" size={16} />
                <span>Schema Builder</span>
              </div>
            </a>

            <a href="/media" class="shopify-sidebar-link {page.url.pathname === '/media' ? 'active' : ''}">
              <div class="shopify-sidebar-link-content">
                <Icon name="media" size={16} />
                <span>Media Library</span>
              </div>
            </a>
          </div>

          <!-- Section 3: Distribution & Settings -->
          <div class="shopify-sidebar-section">
            <h3 class="shopify-sidebar-heading">System</h3>
            <a href="/api" class="shopify-sidebar-link {page.url.pathname === '/api' ? 'active' : ''}">
              <div class="shopify-sidebar-link-content">
                <Icon name="api" size={16} />
                <span>API Reference</span>
              </div>
            </a>

            <a href="/settings" class="shopify-sidebar-link {page.url.pathname === '/settings' ? 'active' : ''}">
              <div class="shopify-sidebar-link-content">
                <Icon name="settings" size={16} />
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
