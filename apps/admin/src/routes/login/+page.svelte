<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { login, getSetupStatus, getToken } from '$lib/api';

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
  <title>Sign In - EdgeCMS</title>
</svelte:head>

<div style="max-width: 420px; margin: 40px auto 80px auto;">
  {#if checkingSetup}
    <div style="text-align: center; padding: 40px; color: var(--color-shade-50); font-size: 14px;">
      Checking system status...
    </div>
  {:else}
    <!-- Brand badge -->
    <div style="text-align: center; margin-bottom: 28px;">
      <div style="display: inline-flex; align-items: center; justify-content: center; width: 48px; height: 48px; background: #000000; border-radius: 12px; margin-bottom: 16px;">
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M14 6C12.3431 6 11 7.34315 11 9H9C8.44772 9 8 9.44772 8 10V20C8 20.5523 8.44772 21 9 21H19C19.5523 21 20 20.5523 20 20V10C20 9.44772 19.5523 9 19 9H17C17 7.34315 15.6569 6 14 6ZM14 7.5C14.8284 7.5 15.5 8.17157 15.5 9H12.5C12.5 8.17157 13.1716 7.5 14 7.5ZM9.5 10.5H18.5V19.5H9.5V10.5Z" fill="#C1FBD4" />
        </svg>
      </div>
      <h1 style="font-size: 26px; font-weight: 700; margin: 0 0 6px 0; letter-spacing: -0.02em;">Sign in to EdgeCMS</h1>
      <p style="color: var(--color-shade-50); font-size: 14px; margin: 0;">Cloudflare Edge Headless Content Management</p>
    </div>

    <!-- Login Card -->
    <div class="shopify-card" style="padding: 28px;">
      {#if error}
        <div style="background-color: #fef2f2; border: 1px solid #fecaca; color: #991b1b; padding: 12px 16px; border-radius: 8px; font-size: 13px; margin-bottom: 20px; display: flex; align-items: center; gap: 8px;">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path fill-rule="evenodd" d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14zm-.75-4a.75.75 0 0 1 1.5 0v.5a.75.75 0 0 1-1.5 0v-.5zm.75-7.5a.75.75 0 0 0-.75.75v4.5a.75.75 0 0 0 1.5 0v-4.5A.75.75 0 0 0 8 3.5z" clip-rule="evenodd" />
          </svg>
          <span>{error}</span>
        </div>
      {/if}

      <form onsubmit={handleLogin} style="display: flex; flex-direction: column; gap: 18px;">
        <div>
          <label for="email" style="display: block; font-size: 13px; font-weight: 600; margin-bottom: 6px;">Email address</label>
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
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <label for="password" style="font-size: 13px; font-weight: 600;">Password</label>
          </div>
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
          class="btn-primary-pill"
          style="width: 100%; justify-content: center; padding: 11px 20px; font-size: 14px; margin-top: 6px;"
          disabled={loading}
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
    </div>

    <!-- Security notice -->
    <div style="margin-top: 24px; text-align: center; font-size: 12px; color: var(--color-shade-50); display: flex; align-items: center; justify-content: center; gap: 6px;">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
        <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
      </svg>
      <span>Protected by Cloudflare edge session tokens & Web Crypto PBKDF2</span>
    </div>
  {/if}
</div>

