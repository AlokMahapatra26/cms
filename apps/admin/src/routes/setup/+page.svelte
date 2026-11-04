<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { setupAdmin, getSetupStatus } from '$lib/api';

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
  <title>Setup Super Admin - EdgeCMS</title>
</svelte:head>

<div style="max-width: 480px; margin: 40px auto 80px auto;">
  {#if checking}
    <div style="text-align: center; padding: 40px; color: var(--color-shade-50); font-size: 14px;">
      Checking configuration status...
    </div>
  {:else}
    <!-- Brand badge -->
    <div style="text-align: center; margin-bottom: 28px;">
      <div style="display: inline-flex; align-items: center; justify-content: center; width: 48px; height: 48px; background: #000000; border-radius: 12px; margin-bottom: 16px;">
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M14 6C12.3431 6 11 7.34315 11 9H9C8.44772 9 8 9.44772 8 10V20C8 20.5523 8.44772 21 9 21H19C19.5523 21 20 20.5523 20 20V10C20 9.44772 19.5523 9 19 9H17C17 7.34315 15.6569 6 14 6ZM14 7.5C14.8284 7.5 15.5 8.17157 15.5 9H12.5C12.5 8.17157 13.1716 7.5 14 7.5ZM9.5 10.5H18.5V19.5H9.5V10.5Z" fill="#C1FBD4" />
        </svg>
      </div>
      <div style="display: inline-block; background-color: var(--color-aloe); color: #043e1d; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; padding: 3px 10px; border-radius: 9999px; margin-bottom: 12px;">
        First Time Setup
      </div>
      <h1 style="font-size: 26px; font-weight: 700; margin: 0 0 6px 0; letter-spacing: -0.02em;">Create Super Admin</h1>
      <p style="color: var(--color-shade-50); font-size: 14px; margin: 0;">Configure your primary administrator account for EdgeCMS</p>
    </div>

    <!-- Setup Card -->
    <div class="shopify-card" style="padding: 28px;">
      {#if error}
        <div style="background-color: #fef2f2; border: 1px solid #fecaca; color: #991b1b; padding: 12px 16px; border-radius: 8px; font-size: 13px; margin-bottom: 20px; display: flex; align-items: center; gap: 8px;">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path fill-rule="evenodd" d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14zm-.75-4a.75.75 0 0 1 1.5 0v.5a.75.75 0 0 1-1.5 0v-.5zm.75-7.5a.75.75 0 0 0-.75.75v4.5a.75.75 0 0 0 1.5 0v-4.5A.75.75 0 0 0 8 3.5z" clip-rule="evenodd" />
          </svg>
          <span>{error}</span>
        </div>
      {/if}

      <form onsubmit={handleSetup} style="display: flex; flex-direction: column; gap: 18px;">
        <div>
          <label for="name" style="display: block; font-size: 13px; font-weight: 600; margin-bottom: 6px;">Your Name</label>
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
          <label for="email" style="display: block; font-size: 13px; font-weight: 600; margin-bottom: 6px;">Admin Email Address</label>
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
          <label for="password" style="display: block; font-size: 13px; font-weight: 600; margin-bottom: 6px;">Password</label>
          <input
            id="password"
            type="password"
            bind:value={password}
            placeholder="Minimum 6 characters"
            class="shopify-input"
            required
            minlength="6"
            autocomplete="new-password"
          />
        </div>

        <div>
          <label for="confirmPassword" style="display: block; font-size: 13px; font-weight: 600; margin-bottom: 6px;">Confirm Password</label>
          <input
            id="confirmPassword"
            type="password"
            bind:value={confirmPassword}
            placeholder="Re-type password"
            class="shopify-input"
            required
            autocomplete="new-password"
          />
        </div>

        <button
          type="submit"
          class="btn-primary-pill"
          style="width: 100%; justify-content: center; padding: 11px 20px; font-size: 14px; margin-top: 6px;"
          disabled={loading}
        >
          {loading ? 'Creating Administrator...' : 'Complete Setup & Launch Dashboard'}
        </button>
      </form>
    </div>

    <!-- Onboarding note -->
    <div style="margin-top: 24px; padding: 16px; background-color: #ffffff; border: 1px solid var(--color-hairline); border-radius: 12px; font-size: 12px; color: var(--color-shade-60); line-height: 1.5;">
      <strong style="color: #000000;">🔐 Secure by Design</strong>
      <p style="margin: 4px 0 0 0;">
        This account will have full administrator permissions over articles, media, and settings. Credentials are encrypted via PBKDF2 with unique salts directly within Cloudflare D1 SQLite.
      </p>
    </div>
  {/if}
</div>

