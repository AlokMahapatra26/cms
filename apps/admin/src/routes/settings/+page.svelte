<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import {
    getMe,
    updateProfile,
    changePassword,
    fetchUsers,
    createUser,
    updateUser,
    deleteUser
  } from '$lib/api';
  import { Icon } from '$lib/components';
  import { workspacesStore } from '$lib/workspaces.svelte';
  import { frontendStore } from '$lib/frontendStore.svelte';
  import { modal } from '$lib/modal.svelte';
  import Modal from '$lib/components/Modal.svelte';
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
  let newWsWebhook = $state('');
  let newWsAutoDeploy = $state(true);
  let isCreatingWs = $state(false);
  let createWsError = $state('');

  let showEditWsModal = $state(false);
  let editingWs = $state<Workspace | null>(null);
  let editWsName = $state('');
  let editWsSlug = $state('');
  let editWsWebhook = $state('');
  let editWsAutoDeploy = $state(true);
  let isUpdatingWs = $state(false);
  let editWsError = $state('');

  let deployingWsId = $state<string | null>(null);
  let deployFeedback = $state<Record<string, { success: boolean; message: string }>>({});

  // Team & Client Users state
  let teamUsers = $state<User[]>([]);
  let loadingUsers = $state(false);

  let showCreateUserModal = $state(false);
  let newUserName = $state('');
  let newUserEmail = $state('');
  let newUserPassword = $state('');
  let newUserRole = $state<'admin' | 'client_editor'>('client_editor');
  let newUserWorkspaceId = $state<string>('');
  let isCreatingUser = $state(false);
  let createUserError = $state('');

  let showEditUserModal = $state(false);
  let editingUser = $state<User | null>(null);
  let editUserName = $state('');
  let editUserEmail = $state('');
  let editUserPassword = $state('');
  let editUserRole = $state<'admin' | 'client_editor'>('client_editor');
  let editUserWorkspaceId = $state<string>('');
  let isUpdatingUser = $state(false);
  let editUserError = $state('');

  function handleWsNameInput(e: Event) {
    const val = (e.target as HTMLInputElement).value;
    newWsName = val;
    newWsSlug = val.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '-').replace(/-+/g, '-');
  }

  function openCreateWsModal() {
    newWsName = '';
    newWsSlug = '';
    newWsWebhook = '';
    newWsAutoDeploy = true;
    createWsError = '';
    showCreateWsModal = true;
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
        slug: newWsSlug.trim(),
        deploy_webhook_url: newWsWebhook.trim() || undefined,
        auto_deploy: newWsAutoDeploy
      });
      newWsName = '';
      newWsSlug = '';
      newWsWebhook = '';
      newWsAutoDeploy = true;
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
    editWsWebhook = ws.deploy_webhook_url || '';
    editWsAutoDeploy = ws.auto_deploy === 1 || ws.auto_deploy === true || ws.auto_deploy === undefined;
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
        slug: editingWs.id === 'ws_default' ? 'default' : editWsSlug.trim(),
        deploy_webhook_url: editWsWebhook.trim() || null,
        auto_deploy: editWsAutoDeploy
      });
      showEditWsModal = false;
      editingWs = null;
    } catch (err: any) {
      editWsError = err.message || 'Failed to update workspace';
    } finally {
      isUpdatingWs = false;
    }
  }

  async function handleDeployWs(ws: Workspace) {
    if (!ws.deploy_webhook_url) {
      openEditWsModal(ws);
      return;
    }

    deployingWsId = ws.id;
    try {
      const res = await workspacesStore.deploy(ws.id);
      deployFeedback = {
        ...deployFeedback,
        [ws.id]: {
          success: res.success,
          message: res.status
        }
      };
    } catch (err: any) {
      deployFeedback = {
        ...deployFeedback,
        [ws.id]: {
          success: false,
          message: err.message || 'Deploy trigger failed'
        }
      };
    } finally {
      deployingWsId = null;
      setTimeout(() => {
        const next = { ...deployFeedback };
        delete next[ws.id];
        deployFeedback = next;
      }, 5000);
    }
  }

  async function handleDeleteWs(ws: Workspace) {
    const confirmed = await modal.confirm({
      title: `Delete Workspace "${ws.name}"?`,
      message: `Are you sure you want to permanently delete "${ws.name}" (slug: /${ws.slug})? All collections and content items inside this workspace will be deleted immediately. This action cannot be undone.`,
      confirmText: 'Delete Workspace',
      cancelText: 'Cancel',
      variant: 'danger'
    });

    if (confirmed) {
      try {
        await workspacesStore.remove(ws.id);
      } catch (err: any) {
        await modal.alert({
          title: 'Error',
          message: err.message || 'Failed to delete workspace',
          variant: 'danger'
        });
      }
    }
  }

  async function loadTeamUsers() {
    loadingUsers = true;
    try {
      teamUsers = await fetchUsers();
    } catch (err: any) {
      console.error('Failed to load team users:', err);
    } finally {
      loadingUsers = false;
    }
  }

  function openCreateUserModal() {
    newUserName = '';
    newUserEmail = '';
    newUserPassword = '';
    newUserRole = 'client_editor';
    newUserWorkspaceId = workspacesStore.list.find((w) => w.id !== 'ws_default')?.id || workspacesStore.list[0]?.id || '';
    createUserError = '';
    showCreateUserModal = true;
  }

  async function handleCreateUser(e: Event) {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim() || !newUserPassword) {
      createUserError = 'Name, email, and password are required.';
      return;
    }
    if (newUserPassword.length < 6) {
      createUserError = 'Password must be at least 6 characters.';
      return;
    }
    if (newUserRole === 'client_editor' && !newUserWorkspaceId) {
      createUserError = 'Please select an assigned workspace for the client user.';
      return;
    }

    isCreatingUser = true;
    createUserError = '';
    try {
      await createUser({
        name: newUserName.trim(),
        email: newUserEmail.trim(),
        password: newUserPassword,
        role: newUserRole,
        workspace_id: newUserRole === 'client_editor' ? newUserWorkspaceId : null
      });
      showCreateUserModal = false;
      await loadTeamUsers();
    } catch (err: any) {
      createUserError = err.message || 'Failed to create user';
    } finally {
      isCreatingUser = false;
    }
  }

  function openEditUserModal(u: User) {
    editingUser = u;
    editUserName = u.name;
    editUserEmail = u.email;
    editUserPassword = '';
    editUserRole = (u.role as 'admin' | 'client_editor') || 'client_editor';
    editUserWorkspaceId = u.workspace_id || workspacesStore.list[0]?.id || '';
    editUserError = '';
    showEditUserModal = true;
  }

  async function handleUpdateUser(e: Event) {
    e.preventDefault();
    if (!editingUser) return;
    if (!editUserName.trim() || !editUserEmail.trim()) {
      editUserError = 'Name and email are required.';
      return;
    }
    if (editUserPassword && editUserPassword.length < 6) {
      editUserError = 'Password must be at least 6 characters.';
      return;
    }

    isUpdatingUser = true;
    editUserError = '';
    try {
      await updateUser(editingUser.id, {
        name: editUserName.trim(),
        email: editUserEmail.trim(),
        role: editUserRole,
        workspace_id: editUserRole === 'client_editor' ? editUserWorkspaceId : null,
        password: editUserPassword ? editUserPassword : undefined
      });
      showEditUserModal = false;
      editingUser = null;
      await loadTeamUsers();
    } catch (err: any) {
      editUserError = err.message || 'Failed to update user';
    } finally {
      isUpdatingUser = false;
    }
  }

  async function handleDeleteUser(u: User) {
    if (u.id === user?.id) {
      await modal.alert({
        title: 'Action Not Allowed',
        message: 'You cannot delete your own active administrator account while logged in.',
        variant: 'danger'
      });
      return;
    }

    const confirmed = await modal.confirm({
      title: `Delete user "${u.name}"?`,
      message: `Are you sure you want to permanently delete user "${u.name}" (${u.email})? Their session will be revoked immediately.`,
      confirmText: 'Delete User',
      cancelText: 'Cancel',
      variant: 'danger'
    });

    if (confirmed) {
      try {
        await deleteUser(u.id);
        await loadTeamUsers();
      } catch (err: any) {
        await modal.alert({
          title: 'Error',
          message: err.message || 'Failed to delete user',
          variant: 'danger'
        });
      }
    }
  }

  async function loadUser() {
    loadingUser = true;
    try {
      const u = await getMe();
      user = u;
      name = u.name;
      email = u.email;
      if (u.role === 'admin') {
        await loadTeamUsers();
      }
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

    {#if user.role === 'admin'}
      <!-- Workspaces & Client Management Card -->
      <div class="shopify-card col-span-2">
        <div class="workspace-settings-header mb-4">
          <div>
            <h2 class="text-base font-semibold m-0 mb-1">Workspaces & Client Projects</h2>
            <p class="text-xs text-muted m-0">
              Manage isolated client websites or project environments on your single Cloudflare deployment.
            </p>
          </div>

          {#if workspacesStore.enabled}
            <button
              type="button"
              class="btn btn-secondary btn-sm"
              onclick={openCreateWsModal}
            >
              <Icon name="plus" size={12} />
              <span>New Client Workspace</span>
            </button>
          {/if}
        </div>

        <!-- Feature Toggle Banner -->
        <div class="workspace-mode-banner mb-4">
          <div class="workspace-mode-info">
            <div class="flex items-center gap-2">
              <span class="workspace-mode-title">Multi-Client Agency Mode</span>
              {#if workspacesStore.enabled}
                <span class="pill-tag-mint">Enabled</span>
              {:else}
                <span class="pill-tag-gray">Disabled</span>
              {/if}
            </div>
            <p class="workspace-mode-desc">
              {workspacesStore.enabled 
                ? 'Multi-tenant isolation active. Client workspace quick-switcher is active in your top navigation.' 
                : 'Single personal project mode. All collections and content are managed under your primary workspace with zero overhead.'}
            </p>
          </div>

          <div class="workspace-toggle-wrapper">
            <button
              type="button"
              role="switch"
              aria-checked={workspacesStore.enabled}
              class="workspace-toggle-track {workspacesStore.enabled ? 'active' : ''}"
              onclick={() => workspacesStore.toggleMultiTenant()}
              title={workspacesStore.enabled ? 'Disable Multi-Client Mode' : 'Enable Multi-Client Mode'}
            >
              <span class="workspace-toggle-thumb"></span>
            </button>
          </div>
        </div>

        {#if !workspacesStore.enabled}
          <div class="workspace-solo-callout">
            <div class="flex items-center gap-2 text-sm font-medium text-dark mb-1">
              <Icon name="workspace" size={14} />
              <span>Single Project Mode (Multi-Client Disabled)</span>
            </div>
            <p class="text-xs text-muted m-0">
              Multi-client mode is currently disabled. All collections and content are managed under your primary workspace, and the top navigation switcher is hidden. Toggle the switch above anytime to activate multi-client isolation.
            </p>
          </div>
        {:else}
          {#if workspacesStore.list.length <= 1}
            <div class="workspace-solo-callout mb-4">
              <div class="flex items-center gap-2 text-sm font-medium text-dark mb-1">
                <Icon name="workspace" size={14} />
                <span>Only 1 Workspace Present</span>
              </div>
              <p class="text-xs text-muted m-0">
                You currently only have the primary workspace. Click "New Client Workspace" above to add your first client project. The top navigation switcher will appear once 2 or more workspaces exist.
              </p>
            </div>
          {/if}

          <div class="shopify-table-container">
            <table class="shopify-table">
              <thead>
                <tr>
                  <th>Workspace</th>
                  <th>Slug / API Path</th>
                  <th>Deploy Hook</th>
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
                      {#if ws.deploy_webhook_url}
                        <div class="webhook-inline-badge">
                          <button
                            type="button"
                            class="btn btn-secondary btn-xs"
                            disabled={deployingWsId === ws.id}
                            onclick={() => handleDeployWs(ws)}
                            title={`Trigger immediate rebuild on Vercel/Netlify. URL: ${ws.deploy_webhook_url}`}
                          >
                            <span class="status-dot active"></span>
                            {#if deployingWsId === ws.id}
                              <span>Deploying...</span>
                            {:else}
                              <Icon name="play" size={10} />
                              <span>Deploy</span>
                            {/if}
                          </button>

                          {#if deployFeedback[ws.id]}
                            <span class="webhook-status-tag {deployFeedback[ws.id].success ? 'success' : 'failed'}">
                              {deployFeedback[ws.id].message}
                            </span>
                          {:else if ws.last_deploy_status}
                            <span
                              class="webhook-status-tag {ws.last_deploy_status.includes('Success') ? 'success' : 'idle'}"
                              title={ws.last_deployed_at ? `Last deploy: ${new Date(ws.last_deployed_at).toLocaleString()}` : ''}
                            >
                              {ws.last_deploy_status}
                            </span>
                          {/if}
                        </div>
                      {:else}
                        <button
                          type="button"
                          class="btn btn-secondary btn-xs text-muted"
                          onclick={() => openEditWsModal(ws)}
                          title="Configure Vercel, Netlify, or Cloudflare Pages deploy hook"
                        >
                          <Icon name="plus" size={10} />
                          <span>Connect Hook</span>
                        </button>
                      {/if}
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
                          title="Configure Workspace & Webhook"
                          onclick={() => openEditWsModal(ws)}
                        >
                          <Icon name="edit" size={12} />
                          <span>Configure</span>
                        </button>

                        {#if ws.id !== 'ws_default' && ws.slug !== 'default'}
                          <button
                            type="button"
                            class="btn btn-secondary btn-sm text-danger"
                            title="Delete Workspace"
                            onclick={() => handleDeleteWs(ws)}
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
        {/if}
      </div>

      <!-- Team & Client Portal Users Card (RBAC) -->
      <div class="shopify-card col-span-2">
        <div class="workspace-settings-header mb-4">
          <div>
            <div class="flex items-center gap-2 mb-1">
              <h2 class="text-base font-semibold m-0">Team & Client Portal Users (RBAC)</h2>
              <span class="pill-tag-mint">{teamUsers.length} Users</span>
            </div>
            <p class="text-xs text-muted m-0">
              Create isolated client logins restricted to their own project workspace, or manage administrative team members.
            </p>
          </div>

          <button
            type="button"
            class="btn btn-secondary btn-sm"
            onclick={openCreateUserModal}
          >
            <Icon name="plus" size={12} />
            <span>New Client User</span>
          </button>
        </div>

        {#if loadingUsers}
          <div class="text-center py-6 text-xs text-muted">
            Loading team members...
          </div>
        {:else if teamUsers.length === 0}
          <div class="workspace-solo-callout">
            <p class="text-xs text-muted m-0">
              No additional users yet. Click "+ New Client User" to create an isolated login for a client.
            </p>
          </div>
        {:else}
          <div class="shopify-table-container">
            <table class="shopify-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Assigned Workspace</th>
                  <th>Created</th>
                  <th class="col-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                {#each teamUsers as member (member.id)}
                  <tr>
                    <td>
                      <div class="flex items-center gap-2">
                        <div class="user-avatar-circle">
                          {member.name.slice(0, 1).toUpperCase()}
                        </div>
                        <div>
                          <div class="font-medium text-sm text-dark flex items-center gap-1.5">
                            <span>{member.name}</span>
                            {#if member.id === user.id}
                              <span class="pill-tag-gray text-2xs">You</span>
                            {/if}
                          </div>
                          <div class="text-xs text-muted font-mono">{member.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      {#if member.role === 'admin'}
                        <span class="pill-tag-mint">SUPER ADMIN</span>
                      {:else if member.role === 'client_editor'}
                        <span class="pill-tag-blue">CLIENT EDITOR</span>
                      {:else}
                        <span class="pill-tag-gray">{member.role.toUpperCase()}</span>
                      {/if}
                    </td>
                    <td>
                      {#if member.role === 'admin'}
                        <span class="text-xs text-muted font-medium">All Workspaces (Full Access)</span>
                      {:else if member.workspace_name || member.workspace_id}
                        <div class="flex items-center gap-1 text-xs font-semibold text-dark">
                          <Icon name="workspace" size={11} />
                          <span>{member.workspace_name || member.workspace_id}</span>
                          <span class="pill-tag-gray text-2xs">Locked</span>
                        </div>
                      {:else}
                        <span class="text-xs text-faint">Unassigned</span>
                      {/if}
                    </td>
                    <td class="text-xs text-muted font-mono whitespace-nowrap">
                      {new Date(member.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td class="text-right whitespace-nowrap">
                      <div class="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          class="btn btn-secondary btn-sm"
                          title="Edit User & Credentials"
                          onclick={() => openEditUserModal(member)}
                        >
                          <Icon name="edit" size={12} />
                          <span>Edit</span>
                        </button>

                        {#if member.id !== user.id}
                          <button
                            type="button"
                            class="btn btn-secondary btn-sm text-danger"
                            title="Delete User"
                            onclick={() => handleDeleteUser(member)}
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
        {/if}
      </div>

      <!-- Astro Frontend Opt-In Feature Card -->
      <div class="shopify-card col-span-2">
        <div class="workspace-mode-banner">
          <div class="workspace-mode-info">
            <div class="flex items-center gap-2">
              <span class="workspace-mode-title">Astro Frontend Website (:4321)</span>
              {#if frontendStore.enabled}
                <span class="pill-tag-mint">Enabled</span>
              {:else}
                <span class="pill-tag-gray">Disabled</span>
              {/if}
            </div>
            <p class="workspace-mode-desc">
              {frontendStore.enabled 
                ? 'Embedded Astro 5.0 blank canvas active at localhost:4321 with quick navigation link in your top header.' 
                : 'Pure Headless CMS mode. The embedded public frontend and its navigation shortcuts are disabled.'}
            </p>
          </div>

          <div class="flex items-center gap-3">
            {#if frontendStore.enabled}
              <a
                href="http://localhost:4321"
                target="_blank"
                rel="noopener noreferrer"
                class="btn btn-secondary btn-sm"
              >
                <span>Open Website</span>
                <Icon name="external" size={11} />
              </a>
            {/if}

            <div class="workspace-toggle-wrapper">
              <button
                type="button"
                role="switch"
                aria-checked={frontendStore.enabled}
                class="workspace-toggle-track {frontendStore.enabled ? 'active' : ''}"
                onclick={() => frontendStore.toggle()}
                title={frontendStore.enabled ? 'Disable Astro Frontend' : 'Enable Astro Frontend'}
              >
                <span class="workspace-toggle-thumb"></span>
              </button>
            </div>
          </div>
        </div>
      </div>
    {/if}

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

      <div class="form-group">
        <label for="settings-ws-webhook" class="form-label">Deploy Webhook URL (Optional)</label>
        <input
          id="settings-ws-webhook"
          type="url"
          class="shopify-input font-mono"
          placeholder="https://api.vercel.com/v1/integrations/deploy/prj_.../..."
          bind:value={newWsWebhook}
        />
        <div class="field-hint">
          Outgoing webhook to instantly trigger frontend rebuilds (Vercel, Netlify, Cloudflare Pages).
        </div>
      </div>

      <div class="form-group">
        <label class="form-checkbox-label">
          <input
            type="checkbox"
            bind:checked={newWsAutoDeploy}
          />
          <span>Auto-trigger deploy webhook whenever content is published or updated</span>
        </label>
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

<!-- Modal: Edit / Configure Workspace -->
{#if showEditWsModal && editingWs}
  <Modal open={showEditWsModal} title="Configure Workspace" onclose={() => { showEditWsModal = false; editingWs = null; }}>
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

      <div class="form-group">
        <label for="settings-edit-webhook" class="form-label">Deploy Webhook URL (Vercel, Netlify, Cloudflare Pages)</label>
        <input
          id="settings-edit-webhook"
          type="url"
          class="shopify-input font-mono"
          placeholder="https://api.vercel.com/v1/integrations/deploy/prj_.../..."
          bind:value={editWsWebhook}
        />
        <div class="field-hint">
          Instant rebuild trigger for client frontend whenever content is published or updated.
        </div>
      </div>

      <div class="form-group">
        <label class="form-checkbox-label">
          <input
            type="checkbox"
            bind:checked={editWsAutoDeploy}
          />
          <span>Auto-trigger deploy webhook whenever content is published or updated</span>
        </label>
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

<!-- Modal: Create User -->
{#if showCreateUserModal}
  <Modal open={showCreateUserModal} title="Create Client / Team User" onclose={() => (showCreateUserModal = false)}>
    <form onsubmit={handleCreateUser}>
      {#if createUserError}
        <div class="error-banner mb-3">{createUserError}</div>
      {/if}

      <div class="form-group">
        <label for="new-user-name" class="form-label">Full Name *</label>
        <input
          id="new-user-name"
          type="text"
          class="shopify-input"
          placeholder="e.g. John Doe, Marketing Manager"
          bind:value={newUserName}
          required
        />
      </div>

      <div class="form-group">
        <label for="new-user-email" class="form-label">Email Address (Login ID) *</label>
        <input
          id="new-user-email"
          type="email"
          class="shopify-input"
          placeholder="e.g. client@brand.com"
          bind:value={newUserEmail}
          required
        />
      </div>

      <div class="form-group">
        <label for="new-user-pass" class="form-label">Initial Password (min 6 chars) *</label>
        <input
          id="new-user-pass"
          type="password"
          class="shopify-input"
          placeholder="••••••••••••"
          bind:value={newUserPassword}
          required
          minlength="6"
        />
      </div>

      <div class="form-group">
        <label for="new-user-role" class="form-label">Account Role *</label>
        <select
          id="new-user-role"
          class="shopify-input"
          bind:value={newUserRole}
        >
          <option value="client_editor">Client Editor (Locked strictly to one workspace)</option>
          <option value="admin">Administrator (Full Access to all workspaces & settings)</option>
        </select>
      </div>

      {#if newUserRole === 'client_editor'}
        <div class="form-group">
          <label for="new-user-ws" class="form-label">Assigned Client Workspace *</label>
          <select
            id="new-user-ws"
            class="shopify-input"
            bind:value={newUserWorkspaceId}
            required
          >
            <option value="">-- Choose Assigned Workspace --</option>
            {#each workspacesStore.list as ws (ws.id)}
              <option value={ws.id}>{ws.name} (/{ws.slug})</option>
            {/each}
          </select>
          <div class="field-hint">
            This client user will only be able to view and manage content within this workspace. All other client projects remain strictly isolated and hidden.
          </div>
        </div>
      {/if}

      <div class="shopify-actions-bar">
        <button
          type="button"
          class="btn btn-secondary"
          onclick={() => (showCreateUserModal = false)}
        >
          Cancel
        </button>
        <button
          type="submit"
          class="btn btn-primary"
          disabled={isCreatingUser}
        >
          {isCreatingUser ? 'Creating User...' : 'Create User'}
        </button>
      </div>
    </form>
  </Modal>
{/if}

<!-- Modal: Edit User -->
{#if showEditUserModal && editingUser}
  <Modal open={showEditUserModal} title="Edit User Account" onclose={() => { showEditUserModal = false; editingUser = null; }}>
    <form onsubmit={handleUpdateUser}>
      {#if editUserError}
        <div class="error-banner mb-3">{editUserError}</div>
      {/if}

      <div class="form-group">
        <label for="edit-user-name" class="form-label">Full Name *</label>
        <input
          id="edit-user-name"
          type="text"
          class="shopify-input"
          bind:value={editUserName}
          required
        />
      </div>

      <div class="form-group">
        <label for="edit-user-email" class="form-label">Email Address *</label>
        <input
          id="edit-user-email"
          type="email"
          class="shopify-input"
          bind:value={editUserEmail}
          required
        />
      </div>

      <div class="form-group">
        <label for="edit-user-pass" class="form-label">Reset Password (leave empty to keep unchanged)</label>
        <input
          id="edit-user-pass"
          type="password"
          class="shopify-input"
          placeholder="New password (optional)"
          bind:value={editUserPassword}
        />
      </div>

      <div class="form-group">
        <label for="edit-user-role" class="form-label">Account Role *</label>
        <select
          id="edit-user-role"
          class="shopify-input"
          bind:value={editUserRole}
          disabled={editingUser.id === user?.id}
        >
          <option value="client_editor">Client Editor (Locked strictly to one workspace)</option>
          <option value="admin">Administrator (Full Access)</option>
        </select>
        {#if editingUser.id === user?.id}
          <div class="field-hint">You cannot demote your own administrator account.</div>
        {/if}
      </div>

      {#if editUserRole === 'client_editor'}
        <div class="form-group">
          <label for="edit-user-ws" class="form-label">Assigned Client Workspace *</label>
          <select
            id="edit-user-ws"
            class="shopify-input"
            bind:value={editUserWorkspaceId}
            required
          >
            {#each workspacesStore.list as ws (ws.id)}
              <option value={ws.id}>{ws.name} (/{ws.slug})</option>
            {/each}
          </select>
        </div>
      {/if}

      <div class="shopify-actions-bar">
        <button
          type="button"
          class="btn btn-secondary"
          onclick={() => { showEditUserModal = false; editingUser = null; }}
        >
          Cancel
        </button>
        <button
          type="submit"
          class="btn btn-primary"
          disabled={isUpdatingUser}
        >
          {isUpdatingUser ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  </Modal>
{/if}
