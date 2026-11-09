<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { getMe, updateProfile, changePassword } from '$lib/api';
  import { Icon } from '$lib/components';
  import { workspacesStore } from '$lib/workspaces.svelte';
  import Modal from '$lib/components/Modal.svelte';
  import ConfirmModal from '$lib/ConfirmModal.svelte';
  import type { User, Workspace } from '@cms/shared';

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

  // Workspaces state
  let showCreateWsModal = $state(false);
  let newWsName = $state('');
  let newWsSlug = $state('');
  let isCreatingWs = $state(false);
  let createWsError = $state('');

  let showEditWsModal = $state(false);
  let editingWs = $state<Workspace | null>(null);
  let editWsName = $state('');
  let editWsSlug = $state('');
  let isUpdatingWs = $state(false);
  let editWsError = $state('');

  let showDeleteConfirm = $state(false);
  let deleteTargetWs = $state<Workspace | null>(null);
  let isDeletingWs = $state(false);

  function handleWsNameInput(e: Event) {
    const val = (e.target as HTMLInputElement).value;
    newWsName = val;
    newWsSlug = val.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '-').replace(/-+/g, '-');
  }

  async function handleCreateWs(e: Event) {
    e.preventDefault();
    if (!newWsName.trim() || !newWsSlug.trim()) {
      createWsError = 'Please provide both workspace name and slug.';
      return;
    }

    isCreatingWs = true;
    createWsError = '';
    try {
      await workspacesStore.create({
        name: newWsName.trim(),
        slug: newWsSlug.trim()
      });
      newWsName = '';
      newWsSlug = '';
      showCreateWsModal = false;
    } catch (err: any) {
      createWsError = err.message || 'Failed to create workspace';
    } finally {
      isCreatingWs = false;
    }
  }

  function openEditWsModal(ws: Workspace) {
    editingWs = ws;
    editWsName = ws.name;
    editWsSlug = ws.slug;
    editWsError = '';
    showEditWsModal = true;
  }

  async function handleSaveWs(e: Event) {
    e.preventDefault();
    if (!editingWs) return;
    if (!editWsName.trim()) {
      editWsError = 'Please provide a workspace name.';
      return;
    }

    isUpdatingWs = true;
    editWsError = '';
    try {
      await workspacesStore.update(editingWs.id, {
        name: editWsName.trim(),
        slug: editingWs.id === 'ws_default' ? 'default' : editWsSlug.trim()
      });
      showEditWsModal = false;
      editingWs = null;
    } catch (err: any) {
      editWsError = err.message || 'Failed to update workspace';
    } finally {
      isUpdatingWs = false;
    }
  }

  function openDeleteWsConfirm(ws: Workspace) {
    deleteTargetWs = ws;
    showDeleteConfirm = true;
  }

  async function handleConfirmDeleteWs() {
    if (!deleteTargetWs) return;
    isDeletingWs = true;
    try {
      await workspacesStore.remove(deleteTargetWs.id);
      showDeleteConfirm = false;
      deleteTargetWs = null;
    } catch (err: any) {
      alert(err.message || 'Failed to delete workspace');
    } finally {
      isDeletingWs = false;
    }
  }

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
    workspacesStore.load();
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

    <!-- Workspaces & Client Management Card -->
    <div class="shopify-card">
      <div class="flex items-center justify-between mb-4">
        <div>
          <h2 class="text-base font-semibold m-0 mb-1">Workspaces & Client Projects</h2>
          <p class="text-xs text-muted m-0">
            Manage isolated client websites or project environments on your single Cloudflare deployment.
          </p>
        </div>
        <button
          type="button"
          class="btn btn-secondary btn-sm"
          onclick={() => (showCreateWsModal = true)}
        >
          <Icon name="plus" size={12} />
          <span>New Client Workspace</span>
        </button>
      </div>

      {#if workspacesStore.list.length <= 1}
        <div class="workspace-solo-callout mb-4">
          <div class="flex items-center gap-2 text-sm font-medium text-dark mb-1">
            <Icon name="workspace" size={14} />
            <span>Single Project Mode (Default)</span>
          </div>
          <p class="text-xs text-muted m-0">
            You are currently running in single-project mode. Your top navigation is streamlined and clean. When you add a client workspace, a quick-switcher will automatically appear in your header.
          </p>
        </div>
      {/if}

      <div class="shopify-table-container">
        <table class="shopify-table">
          <thead>
            <tr>
              <th>Workspace</th>
              <th>Slug / API Path</th>
              <th>Status</th>
              <th class="col-actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            {#each workspacesStore.list as ws (ws.id)}
              <tr>
                <td>
                  <div class="flex items-center gap-2">
                    <div class="workspace-trigger-icon">
                      <Icon name="workspace" size={12} />
                    </div>
                    <div>
                      <div class="font-medium text-sm text-dark">{ws.name}</div>
                      {#if ws.id === 'ws_default'}
                        <div class="text-xs text-muted">Primary Root Workspace</div>
                      {/if}
                    </div>
                  </div>
                </td>
                <td>
                  <code class="font-mono text-xs">/{ws.slug}</code>
                </td>
                <td>
                  {#if workspacesStore.activeSlug === ws.slug}
                    <span class="pill-tag-mint">Active</span>
                  {:else}
                    <button
                      type="button"
                      class="btn btn-secondary btn-sm"
                      onclick={() => workspacesStore.switchWorkspace(ws.slug)}
                    >
                      Switch
                    </button>
                  {/if}
                </td>
                <td class="text-right">
                  <div class="flex items-center justify-end gap-1">
                    <button
                      type="button"
                      class="btn btn-secondary btn-sm"
                      title="Rename Workspace"
                      onclick={() => openEditWsModal(ws)}
                    >
                      <Icon name="edit" size={12} />
                      <span>Rename</span>
                    </button>

                    {#if ws.id !== 'ws_default' && ws.slug !== 'default'}
                      <button
                        type="button"
                        class="btn btn-secondary btn-sm text-danger"
                        title="Delete Workspace"
                        onclick={() => openDeleteWsConfirm(ws)}
                      >
                        <Icon name="trash" size={12} />
                      </button>
                    {/if}
                  </div>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>

  </div>
{/if}

<!-- Modal: Create Workspace -->
{#if showCreateWsModal}
  <Modal open={showCreateWsModal} title="Create Client Workspace" onclose={() => (showCreateWsModal = false)}>
    <form onsubmit={handleCreateWs}>
      {#if createWsError}
        <div class="error-banner mb-3">{createWsError}</div>
      {/if}

      <div class="form-group">
        <label for="settings-ws-name" class="form-label">Client / Workspace Name *</label>
        <input
          id="settings-ws-name"
          type="text"
          class="shopify-input"
          placeholder="e.g. Nike India, Dental Clinic, Tech Startup"
          value={newWsName}
          oninput={handleWsNameInput}
          required
        />
      </div>

      <div class="form-group">
        <label for="settings-ws-slug" class="form-label">Workspace Slug (API Identifier) *</label>
        <input
          id="settings-ws-slug"
          type="text"
          class="shopify-input font-mono"
          placeholder="e.g. nike, dental-clinic"
          bind:value={newWsSlug}
          required
        />
        <div class="field-hint">
          Used in frontend delivery URLs: <code>/api/v1/:slug/content/...</code>
        </div>
      </div>

      <div class="shopify-actions-bar">
        <button
          type="button"
          class="btn btn-secondary"
          onclick={() => (showCreateWsModal = false)}
        >
          Cancel
        </button>
        <button
          type="submit"
          class="btn btn-primary"
          disabled={isCreatingWs}
        >
          {isCreatingWs ? 'Creating...' : 'Create Workspace'}
        </button>
      </div>
    </form>
  </Modal>
{/if}

<!-- Modal: Edit / Rename Workspace -->
{#if showEditWsModal && editingWs}
  <Modal open={showEditWsModal} title="Rename Workspace" onclose={() => { showEditWsModal = false; editingWs = null; }}>
    <form onsubmit={handleSaveWs}>
      {#if editWsError}
        <div class="error-banner mb-3">{editWsError}</div>
      {/if}

      <div class="form-group">
        <label for="settings-edit-name" class="form-label">Workspace / Brand Name *</label>
        <input
          id="settings-edit-name"
          type="text"
          class="shopify-input"
          placeholder="e.g. My Main Agency, Personal Brand"
          bind:value={editWsName}
          required
        />
      </div>

      <div class="form-group">
        <label for="settings-edit-slug" class="form-label">Workspace Slug</label>
        <input
          id="settings-edit-slug"
          type="text"
          class="shopify-input font-mono"
          bind:value={editWsSlug}
          disabled={editingWs.id === 'ws_default'}
          required
        />
        {#if editingWs.id === 'ws_default'}
          <div class="field-hint">
            The default workspace uses <code>default</code> (and root <code>/api/content/*</code>) for backward compatibility.
          </div>
        {:else}
          <div class="field-hint">
            Used in frontend delivery URLs: <code>/api/v1/:slug/content/...</code>
          </div>
        {/if}
      </div>

      <div class="shopify-actions-bar">
        <button
          type="button"
          class="btn btn-secondary"
          onclick={() => { showEditWsModal = false; editingWs = null; }}
        >
          Cancel
        </button>
        <button
          type="submit"
          class="btn btn-primary"
          disabled={isUpdatingWs}
        >
          {isUpdatingWs ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  </Modal>
{/if}

<!-- Modal: Confirm Delete Workspace -->
{#if showDeleteConfirm && deleteTargetWs}
  <ConfirmModal
    open={showDeleteConfirm}
    title="Delete Workspace '{deleteTargetWs.name}'?"
    message="This will permanently delete this client workspace along with all its collections and content items. This action cannot be undone."
    confirmText={isDeletingWs ? 'Deleting...' : 'Delete Workspace'}
    cancelText="Cancel"
    danger={true}
    onconfirm={handleConfirmDeleteWs}
    oncancel={() => { showDeleteConfirm = false; deleteTargetWs = null; }}
  />
{/if}
