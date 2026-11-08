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
  import { handleEnterNavigation } from '$lib/form-utils';

  let { children } = $props();

  let currentUser = $state<User | null>(null);
  let isCheckingAuth = $state(true);
  let isDark = $state(false);

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
    if (typeof window !== 'undefined') {
      isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    }
  });

  function toggleTheme() {
    isDark = !isDark;
    if (isDark) {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('theme', 'light');
    }
  }

  async function handleLogout() {
    await logout();
    currentUser = null;
    goto('/login');
  }
</script>

<svelte:window onkeydown={handleEnterNavigation} />

<div class="flex flex-col min-h-screen">
  <!-- Vercel Platform Header -->
  <header class="shopify-header">
    <div class="shopify-nav-inner">
      <!-- Brand Lockup -->
      <a href="/schemas" class="shopify-brand">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="24" height="24" rx="5" fill="var(--color-ink)" />
          <path d="M7 12H17M7 7H17M7 17H13" stroke="var(--color-canvas)" stroke-width="2" stroke-linecap="round"/>
        </svg>
        <span>EdgeCMS</span>
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
            <span class="font-medium text-xs">{currentUser.name}</span>
          </a>

          <a
            href="/api"
            class="btn btn-secondary btn-sm"
            title="Headless API"
          >
            <span>API</span>
            <Icon name="external" size={11} />
          </a>

          <button
            onclick={handleLogout}
            class="btn btn-secondary btn-sm"
            title="Sign out"
          >
            Sign out
          </button>
        {:else if !isAuthPage}
          <a href="/login" class="btn btn-primary btn-sm">
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

        <!-- Sidebar Footer Theme Toggle -->
        <div class="sidebar-footer-theme">
          <button
            type="button"
            class="sidebar-theme-toggle"
            onclick={toggleTheme}
            title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            aria-label="Toggle theme"
          >
            <div class="sidebar-theme-left">
              <Icon name={isDark ? "moon" : "sun"} size={13} />
              <span>{isDark ? "Dark Mode" : "Light Mode"}</span>
            </div>
            <div class="theme-switch-track {isDark ? 'active' : ''}">
              <div class="theme-switch-thumb"></div>
            </div>
          </button>
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
