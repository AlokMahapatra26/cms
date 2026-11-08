<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { login, getSetupStatus, getToken } from '$lib/api';
  import { Icon } from '$lib/components';

  let email = $state('');
  let password = $state('');
  let loading = $state(false);
  let checkingSetup = $state(true);
  let error = $state<string | null>(null);

  onMount(async () => {
    try {
      const status = await getSetupStatus();
      if (status.needsSetup) {
        goto('/setup');
        return;
      }
      if (getToken()) {
        goto('/');
        return;
      }
    } catch (e) {
      // Backend might still be starting
    } finally {
      checkingSetup = false;
    }
  });

  async function handleLogin(e: SubmitEvent) {
    e.preventDefault();
    if (!email.trim() || !password) {
      error = 'Please enter both your email address and password.';
      return;
    }

    loading = true;
    error = null;

    try {
      await login({ email: email.trim(), password });
      window.location.href = '/';
    } catch (err: any) {
      error = err.message || 'Invalid email or password. Please try again.';
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>Sign In — EdgeCMS</title>
</svelte:head>

<div class="auth-screen-container">
  {#if checkingSetup}
    <div class="text-center p-12 text-muted text-sm">
      Checking system status...
    </div>
  {:else}
    <!-- Brand lockup -->
    <div class="text-center mb-6">
      <div class="inline-flex items-center justify-center w-10 h-10 bg-dark rounded-md mb-3">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect width="24" height="24" rx="5" fill="#171717" />
          <path d="M7 12H17M7 7H17M7 17H13" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </div>
      <h1 class="text-xl font-semibold m-0 mb-1 tracking-tight">Sign in to EdgeCMS</h1>
      <p class="text-muted text-xs m-0">Cloudflare Edge Headless Content Platform</p>
    </div>

    <!-- Login Card -->
    <div class="shopify-card">
      {#if error}
        <div class="error-banner mb-4">
          {error}
        </div>
      {/if}

      <form onsubmit={handleLogin} class="flex flex-col gap-4">
        <div>
          <label for="email" class="form-label">Email Address</label>
          <input
            id="email"
            type="email"
            bind:value={email}
            placeholder="admin@example.com"
            class="shopify-input"
            required
            autocomplete="email"
          />
        </div>

        <div>
          <label for="password" class="form-label">Password</label>
          <input
            id="password"
            type="password"
            bind:value={password}
            placeholder="••••••••••••"
            class="shopify-input"
            required
            autocomplete="current-password"
          />
        </div>

        <button
          type="submit"
          class="btn btn-primary w-full mt-2"
          disabled={loading}
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
    </div>

    <!-- Security notice -->
    <div class="mt-6 text-center text-xs text-muted flex items-center justify-center gap-1.5 font-mono">
      <Icon name="lock" size={13} />
      <span>Edge session tokens & Web Crypto PBKDF2</span>
    </div>
  {/if}
</div>
