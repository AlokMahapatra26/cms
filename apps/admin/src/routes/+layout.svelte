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
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="24" height="24" rx="6" fill="#09090b" />
          <path d="M7 12H17M7 7H17M7 17H13" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>
        </svg>
        <span style="font-weight: 600; font-size: 14px; color: #09090b; letter-spacing: -0.02em;">EdgeCMS</span>
      </a>

      <!-- Right Action Controls -->
      <div class="flex items-center gap-2">
        {#if currentUser}
          <!-- User Profile Chip -->
          <a
            href="/settings"
            class="shopify-user-pill"
            title="Account Settings"
          >
            <div class="user-avatar-badge">
              {currentUser.name.charAt(0).toUpperCase()}
            </div>
            <span class="font-medium text-xs text-dark">{currentUser.name}</span>
          </a>

          <a
            href="/api"
            class="btn-outline-pill"
            style="font-size: 11.5px; padding: 4px 10px; color: #52525b;"
            title="Headless API"
          >
            <span>API</span>
            <Icon name="external" size={11} />
          </a>

          <button
            onclick={handleLogout}
            class="btn-outline-pill"
            style="font-size: 11.5px; padding: 4px 10px; color: #71717a;"
            title="Sign out"
          >
            Sign out
          </button>
        {:else if !isAuthPage}
          <a href="/login" class="btn-primary-pill" style="font-size: 12px; padding: 5px 14px;">
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
                No collections yet
              </div>
            {:else}
              {#each collectionsStore.list as col (col.slug)}
                <a
                  href="/content/{col.slug}"
                  class="shopify-sidebar-link {page.url.pathname.startsWith('/content/' + col.slug) ? 'active' : ''}"
                >
                  <div class="shopify-sidebar-link-content">
                    <Icon name={col.icon || 'collection'} size={14} />
                    <span>{col.name}</span>
                  </div>
                </a>
              {/each}
            {/if}
          </div>

          <!-- Section 2: Schema Modeler & Media -->
          <div class="shopify-sidebar-section">
            <h3 class="shopify-sidebar-heading">Studio</h3>
            <a href="/schemas" class="shopify-sidebar-link {page.url.pathname === '/schemas' ? 'active' : ''}">
              <div class="shopify-sidebar-link-content">
                <Icon name="schema" size={14} />
                <span>Schemas</span>
              </div>
            </a>

            <a href="/media" class="shopify-sidebar-link {page.url.pathname === '/media' ? 'active' : ''}">
              <div class="shopify-sidebar-link-content">
                <Icon name="media" size={14} />
                <span>Media</span>
              </div>
            </a>
          </div>

          <!-- Section 3: Distribution & Settings -->
          <div class="shopify-sidebar-section">
            <h3 class="shopify-sidebar-heading">Settings</h3>
            <a href="/api" class="shopify-sidebar-link {page.url.pathname === '/api' ? 'active' : ''}">
              <div class="shopify-sidebar-link-content">
                <Icon name="api" size={14} />
                <span>REST API</span>
              </div>
            </a>

            <a href="/settings" class="shopify-sidebar-link {page.url.pathname === '/settings' ? 'active' : ''}">
              <div class="shopify-sidebar-link-content">
                <Icon name="settings" size={14} />
                <span>Account</span>
              </div>
            </a>
          </div>
        </div>

        <!-- Sidebar Footer Status -->
        <div class="sidebar-status-box">
          <span class="status-dot-active"></span>
          <span>Edge Online</span>
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
        <div class="text-center p-12 text-muted text-sm">
          Loading...
        </div>
      {:else}
        {@render children()}
      {/if}
    </main>
  {/if}

  <!-- Universal Confirmation / Alert Modal -->
  <ConfirmModal />
</div>
