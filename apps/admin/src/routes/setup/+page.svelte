<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { setupAdmin, getSetupStatus } from '$lib/api';
  import { Icon } from '$lib/components';

  let name = $state('');
  let email = $state('');
  let password = $state('');
  let confirmPassword = $state('');
  let loading = $state(false);
  let checking = $state(true);
  let error = $state<string | null>(null);

  onMount(async () => {
    try {
      const status = await getSetupStatus();
      if (!status.needsSetup) {
        goto('/login');
        return;
      }
    } catch (e) {
      // Backend status error
    } finally {
      checking = false;
    }
  });

  async function handleSetup(e: SubmitEvent) {
    e.preventDefault();
    if (!name.trim()) {
      error = 'Please provide your full name.';
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      error = 'Please enter a valid email address.';
      return;
    }
    if (password.length < 6) {
      error = 'Password must be at least 6 characters.';
      return;
    }
    if (password !== confirmPassword) {
      error = 'Passwords do not match.';
      return;
    }

    loading = true;
    error = null;

    try {
      await setupAdmin({
        name: name.trim(),
        email: email.trim(),
        password
      });
      window.location.href = '/';
    } catch (err: any) {
      error = err.message || 'Failed to complete initial setup.';
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>Setup Administrator — EdgeCMS</title>
</svelte:head>

<div class="auth-screen-container">
  {#if checking}
    <div class="text-center p-12 text-muted text-sm">
      Checking configuration status...
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
      <h1 class="text-xl font-semibold m-0 mb-1 tracking-tight">Create Super Admin</h1>
      <p class="text-muted text-xs m-0">Configure your primary administrator account for EdgeCMS</p>
    </div>

    <!-- Setup Card -->
    <div class="shopify-card">
      {#if error}
        <div class="error-banner mb-4">
          {error}
        </div>
      {/if}

      <form onsubmit={handleSetup} class="flex flex-col gap-4">
        <div>
          <label for="name" class="form-label">Full Name</label>
          <input
            id="name"
            type="text"
            bind:value={name}
            placeholder="e.g. Alok Mahapatra"
            class="shopify-input"
            required
            autocomplete="name"
          />
        </div>

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
          <label for="password" class="form-label">Password (min 6 characters)</label>
          <input
            id="password"
            type="password"
            bind:value={password}
            placeholder="••••••••••••"
            class="shopify-input"
            required
            minlength="6"
            autocomplete="new-password"
          />
        </div>

        <div>
          <label for="confirm" class="form-label">Confirm Password</label>
          <input
            id="confirm"
            type="password"
            bind:value={confirmPassword}
            placeholder="••••••••••••"
            class="shopify-input"
            required
            autocomplete="new-password"
          />
        </div>

        <button
          type="submit"
          class="btn btn-primary w-full mt-2"
          disabled={loading}
        >
          {loading ? 'Creating Administrator...' : 'Create Admin Account'}
        </button>
      </form>
    </div>

    <!-- Security notice -->
    <div class="mt-6 text-center text-xs text-muted flex items-center justify-center gap-1.5 font-mono">
      <Icon name="lock" size={13} />
      <span>Encrypted with Web Crypto PBKDF2 & SHA-256</span>
    </div>
  {/if}
</div>
