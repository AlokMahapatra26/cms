<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { getMe, updateProfile, changePassword } from '$lib/api';
  import { Icon } from '$lib/components';
  import type { User } from '@cms/shared';

  let user = $state<User | null>(null);
  let loadingUser = $state(true);

  // Profile Form state
  let name = $state('');
  let email = $state('');
  let savingProfile = $state(false);
  let profileSuccess = $state<string | null>(null);
  let profileError = $state<string | null>(null);

  // Password Form state
  let currentPassword = $state('');
  let newPassword = $state('');
  let confirmPassword = $state('');
  let savingPassword = $state(false);
  let passwordSuccess = $state<string | null>(null);
  let passwordError = $state<string | null>(null);

  async function loadUser() {
    loadingUser = true;
    try {
      const u = await getMe();
      user = u;
      name = u.name;
      email = u.email;
    } catch (e: any) {
      if (e.message === 'UNAUTHORIZED' || e.message?.includes('expired')) {
        goto('/login');
      }
    } finally {
      loadingUser = false;
    }
  }

  onMount(() => {
    loadUser();
  });

  async function handleProfileSubmit(e: SubmitEvent) {
    e.preventDefault();
    profileSuccess = null;
    profileError = null;

    if (!name.trim() || name.trim().length < 2) {
      profileError = 'Name must be at least 2 characters.';
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      profileError = 'A valid email address is required.';
      return;
    }

    savingProfile = true;
    try {
      const updated = await updateProfile({
        name: name.trim(),
        email: email.trim()
      });
      user = updated;
      profileSuccess = 'Profile credentials updated successfully.';
    } catch (err: any) {
      profileError = err.message || 'Failed to update profile.';
    } finally {
      savingProfile = false;
    }
  }

  async function handlePasswordSubmit(e: SubmitEvent) {
    e.preventDefault();
    passwordSuccess = null;
    passwordError = null;

    if (!currentPassword) {
      passwordError = 'Please enter your current password.';
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      passwordError = 'New password must be at least 6 characters.';
      return;
    }
    if (newPassword !== confirmPassword) {
      passwordError = 'New password and confirmation do not match.';
      return;
    }

    savingPassword = true;
    try {
      await changePassword({
        current_password: currentPassword,
        new_password: newPassword
      });
      passwordSuccess = 'Password updated successfully!';
      currentPassword = '';
      newPassword = '';
      confirmPassword = '';
    } catch (err: any) {
      passwordError = err.message || 'Failed to change password.';
    } finally {
      savingPassword = false;
    }
  }
</script>

<svelte:head>
  <title>Account Settings — EdgeCMS</title>
</svelte:head>

<div class="shopify-page-header">
  <div>
    <h1 class="shopify-page-title">
      Account & Settings
    </h1>
    <p class="shopify-page-subtitle">
      Manage administrator credentials and security settings.
    </p>
  </div>
</div>

{#if loadingUser}
  <div class="shopify-card p-12 text-center text-muted text-sm">
    Loading user profile...
  </div>
{:else if user}
  <div class="grid grid-cols-2 gap-4">
    
    <!-- Profile Card -->
    <div class="shopify-card">
      <div class="mb-4">
        <h2 class="text-base font-semibold m-0 mb-1">Profile Credentials</h2>
        <p class="text-xs text-muted m-0">Update your display name and login email.</p>
      </div>

      {#if profileSuccess}
        <div class="info-callout mb-4 flex items-center gap-2 text-success">
          <Icon name="check" size={14} />
          <span>{profileSuccess}</span>
        </div>
      {/if}

      {#if profileError}
        <div class="error-banner mb-4">
          {profileError}
        </div>
      {/if}

      <form onsubmit={handleProfileSubmit} class="flex flex-col gap-4">
        <div>
          <label for="profile-name" class="form-label">
            Full Name
          </label>
          <input
            id="profile-name"
            type="text"
            bind:value={name}
            class="shopify-input"
            required
            placeholder="e.g. Alok Mahapatra"
          />
        </div>

        <div>
          <label for="profile-email" class="form-label">
            Email Address (Login ID)
          </label>
          <input
            id="profile-email"
            type="email"
            bind:value={email}
            class="shopify-input"
            required
            placeholder="admin@example.com"
          />
          <p class="field-hint">
            This email is used to sign into EdgeCMS.
          </p>
        </div>

        <div class="pt-2">
          <button
            type="submit"
            class="btn btn-primary"
            disabled={savingProfile}
          >
            {savingProfile ? 'Saving Changes...' : 'Save Profile Changes'}
          </button>
        </div>
      </form>
    </div>

    <!-- Password Card -->
    <div class="shopify-card">
      <div class="mb-4">
        <h2 class="text-base font-semibold m-0 mb-1">Change Password</h2>
        <p class="text-xs text-muted m-0">Update your edge-encrypted master password.</p>
      </div>

      {#if passwordSuccess}
        <div class="info-callout mb-4 flex items-center gap-2 text-success">
          <Icon name="check" size={14} />
          <span>{passwordSuccess}</span>
        </div>
      {/if}

      {#if passwordError}
        <div class="error-banner mb-4">
          {passwordError}
        </div>
      {/if}

      <form onsubmit={handlePasswordSubmit} class="flex flex-col gap-4">
        <div>
          <label for="current-pw" class="form-label">
            Current Password
          </label>
          <input
            id="current-pw"
            type="password"
            bind:value={currentPassword}
            class="shopify-input"
            required
            placeholder="••••••••••••"
            autocomplete="current-password"
          />
        </div>

        <div>
          <label for="new-pw" class="form-label">
            New Password (min 6 characters)
          </label>
          <input
            id="new-pw"
            type="password"
            bind:value={newPassword}
            class="shopify-input"
            required
            minlength="6"
            placeholder="••••••••••••"
            autocomplete="new-password"
          />
        </div>

        <div>
          <label for="confirm-pw" class="form-label">
            Confirm New Password
          </label>
          <input
            id="confirm-pw"
            type="password"
            bind:value={confirmPassword}
            class="shopify-input"
            required
            placeholder="••••••••••••"
            autocomplete="new-password"
          />
        </div>

        <div class="pt-2">
          <button
            type="submit"
            class="btn btn-primary"
            disabled={savingPassword}
          >
            {savingPassword ? 'Updating Password...' : 'Update Password'}
          </button>
        </div>
      </form>
    </div>

  </div>
{/if}
