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
      passwordSuccess = 'Password updated successfully! Your new password is now active.';
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
  <title>Account Settings & Credentials - EdgeCMS</title>
</svelte:head>

<div style="margin-bottom: 16px;">
  <h1 style="font-size: 20px; font-weight: 600; color: #000000; margin: 0 0 2px 0; letter-spacing: -0.01em;">
    Account & Credentials
  </h1>
  <p style="font-size: 12.5px; color: #71717a; margin: 0;">
    Manage your administrator profile details, login email address, and security password.
  </p>
</div>

{#if loadingUser}
  <div class="shopify-card" style="padding: 36px; text-align: center; color: #71717a;">
    <p style="margin: 0; font-size: 13px;">Loading user profile...</p>
  </div>
{:else if user}
  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 16px;">
    
    <!-- Profile Card -->
    <div class="shopify-card" style="padding: 20px;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px;">
        <div>
          <h2 style="font-size: 15px; font-weight: 600; margin: 0 0 2px 0;">Profile Credentials</h2>
          <p style="font-size: 12px; color: #71717a; margin: 0;">Update your display name and login email.</p>
        </div>
        <span style="background-color: var(--color-aloe); color: #043e1d; font-size: 10px; font-weight: 700; text-transform: uppercase; padding: 2px 7px; border-radius: 9999px; letter-spacing: 0.04em;">
          {user.role}
        </span>
      </div>

      {#if profileSuccess}
        <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; padding: 12px 16px; border-radius: 8px; font-size: 13px; margin-bottom: 20px; display: flex; align-items: center; gap: 8px;">
          <Icon name="check" size={16} />
          <span>{profileSuccess}</span>
        </div>
      {/if}

      {#if profileError}
        <div style="background-color: #fef2f2; border: 1px solid #fecaca; color: #991b1b; padding: 12px 16px; border-radius: 8px; font-size: 13px; margin-bottom: 20px; display: flex; align-items: center; gap: 8px;">
          <Icon name="warning" size={16} />
          <span>{profileError}</span>
        </div>
      {/if}

      <form onsubmit={handleProfileSubmit} style="display: flex; flex-direction: column; gap: 18px;">
        <div>
          <label for="profile-name" style="display: block; font-size: 13px; font-weight: 600; margin-bottom: 6px;">
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
          <label for="profile-email" style="display: block; font-size: 13px; font-weight: 600; margin-bottom: 6px;">
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
          <p style="font-size: 12px; color: #71717a; margin: 4px 0 0 0;">
            This email is used to sign into EdgeCMS.
          </p>
        </div>

        <div style="padding-top: 6px;">
          <button
            type="submit"
            class="btn-primary-pill"
            style="font-size: 13px; padding: 9px 20px;"
            disabled={savingProfile}
          >
            {savingProfile ? 'Saving Changes...' : 'Save Profile Changes'}
          </button>
        </div>
      </form>
    </div>

    <!-- Password Card -->
    <div class="shopify-card" style="padding: 20px;">
      <div style="margin-bottom: 16px;">
        <h2 style="font-size: 15px; font-weight: 600; margin: 0 0 2px 0;">Change Password</h2>
        <p style="font-size: 12px; color: #71717a; margin: 0;">Update your edge-encrypted master password.</p>
      </div>

      {#if passwordSuccess}
        <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; color: #166534; padding: 12px 16px; border-radius: 8px; font-size: 13px; margin-bottom: 20px; display: flex; align-items: center; gap: 8px;">
          <Icon name="check" size={16} />
          <span>{passwordSuccess}</span>
        </div>
      {/if}

      {#if passwordError}
        <div style="background-color: #fef2f2; border: 1px solid #fecaca; color: #991b1b; padding: 12px 16px; border-radius: 8px; font-size: 13px; margin-bottom: 20px; display: flex; align-items: center; gap: 8px;">
          <Icon name="warning" size={16} />
          <span>{passwordError}</span>
        </div>
      {/if}

      <form onsubmit={handlePasswordSubmit} style="display: flex; flex-direction: column; gap: 18px;">
        <div>
          <label for="current-pw" style="display: block; font-size: 13px; font-weight: 600; margin-bottom: 6px;">
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
          <label for="new-pw" style="display: block; font-size: 13px; font-weight: 600; margin-bottom: 6px;">
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
          <label for="confirm-pw" style="display: block; font-size: 13px; font-weight: 600; margin-bottom: 6px;">
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

        <div style="padding-top: 6px;">
          <button
            type="submit"
            class="btn-primary-pill"
            style="font-size: 13px; padding: 9px 20px;"
            disabled={savingPassword}
          >
            {savingPassword ? 'Updating Password...' : 'Update Password'}
          </button>
        </div>
      </form>
    </div>

  </div>
{/if}

