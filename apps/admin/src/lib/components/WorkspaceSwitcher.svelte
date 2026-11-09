<script lang="ts">
  import { onMount } from 'svelte';
  import { workspacesStore } from '$lib/workspaces.svelte';
  import { Icon } from '$lib/components';
  import Modal from '$lib/components/Modal.svelte';
  import type { Workspace } from '@cms/shared';

  let open = $state(false);

  // Create Workspace Modal state
  let showCreateModal = $state(false);
  let newName = $state('');
  let newSlug = $state('');
  let isCreating = $state(false);
  let errorMessage = $state('');

  // Edit / Rename Workspace Modal state
  let showEditModal = $state(false);
  let editingWorkspace = $state<Workspace | null>(null);
  let editName = $state('');
  let editSlug = $state('');
  let isUpdating = $state(false);
  let editErrorMessage = $state('');

  onMount(() => {
    workspacesStore.load();
  });

  function toggleDropdown() {
    open = !open;
  }

  function handleSelect(slug: string) {
    workspacesStore.switchWorkspace(slug);
    open = false;
  }

  function handleNameInput(e: Event) {
    const val = (e.target as HTMLInputElement).value;
    newName = val;
    newSlug = val.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '-').replace(/-+/g, '-');
  }

  async function handleCreateWorkspace(e: Event) {
    e.preventDefault();
    if (!newName.trim() || !newSlug.trim()) {
      errorMessage = 'Please provide both workspace name and slug.';
      return;
    }

    isCreating = true;
    errorMessage = '';
    try {
      await workspacesStore.create({
        name: newName.trim(),
        slug: newSlug.trim()
      });
      newName = '';
      newSlug = '';
      showCreateModal = false;
      open = false;
    } catch (err: any) {
      errorMessage = err.message || 'Failed to create workspace';
    } finally {
      isCreating = false;
    }
  }

  function openEditModal(ws: Workspace) {
    editingWorkspace = ws;
    editName = ws.name;
    editSlug = ws.slug;
    editErrorMessage = '';
    showEditModal = true;
    open = false;
  }

  async function handleEditWorkspace(e: Event) {
    e.preventDefault();
    if (!editingWorkspace) return;
    if (!editName.trim()) {
      editErrorMessage = 'Please provide a workspace name.';
      return;
    }

    isUpdating = true;
    editErrorMessage = '';
    try {
      await workspacesStore.update(editingWorkspace.id, {
        name: editName.trim(),
        slug: editingWorkspace.id === 'ws_default' ? 'default' : editSlug.trim()
      });
      showEditModal = false;
      editingWorkspace = null;
    } catch (err: any) {
      editErrorMessage = err.message || 'Failed to update workspace';
    } finally {
      isUpdating = false;
    }
  }

  function handleClickOutside(e: MouseEvent) {
    const target = e.target as HTMLElement;
    if (!target.closest('.workspace-switcher-container')) {
      open = false;
    }
  }
</script>

<svelte:window onclick={handleClickOutside} />

{#if workspacesStore.enabled && workspacesStore.list.length > 1}
  <div class="workspace-switcher-container">
    <span class="workspace-divider">/</span>

    <button
      type="button"
      class="workspace-trigger {open ? 'active' : ''}"
      onclick={toggleDropdown}
      title="Switch Client Workspace"
    >
      <span class="workspace-trigger-icon">
        <Icon name="workspace" size={12} />
      </span>
      <span>{workspacesStore.active.name}</span>
      <Icon name="chevron-down" size={10} class="workspace-chevron" />
    </button>

    {#if open}
      <div class="workspace-dropdown">
        <div class="workspace-dropdown-header">Client Workspaces</div>

        {#each workspacesStore.list as ws (ws.id)}
          <div class="workspace-item-row {workspacesStore.activeSlug === ws.slug ? 'selected' : ''}">
            <button
              type="button"
              class="workspace-item"
              onclick={() => handleSelect(ws.slug)}
            >
              <div class="workspace-item-info">
                <span class="workspace-item-name">{ws.name}</span>
                <span class="workspace-item-slug">/{ws.slug}</span>
              </div>
              {#if workspacesStore.activeSlug === ws.slug}
                <Icon name="check" size={13} />
              {/if}
            </button>

            <button
              type="button"
              class="workspace-item-edit-btn"
              title="Rename '{ws.name}'"
              onclick={(e) => {
                e.stopPropagation();
                openEditModal(ws);
              }}
            >
              <Icon name="edit" size={12} />
            </button>
          </div>
        {/each}

        <div class="workspace-dropdown-divider"></div>

        <button
          type="button"
          class="workspace-add-btn"
          onclick={() => {
            open = false;
            openEditModal(workspacesStore.active);
          }}
        >
          <Icon name="edit" size={13} />
          <span>Rename Active Workspace</span>
        </button>

        <button
          type="button"
          class="workspace-add-btn"
          onclick={() => {
            open = false;
            showCreateModal = true;
          }}
        >
          <Icon name="plus" size={13} />
          <span>New Client Workspace</span>
        </button>
      </div>
    {/if}
  </div>
{/if}

<!-- Modal: Create Workspace -->
{#if showCreateModal}
  <Modal open={showCreateModal} title="Create Client Workspace" onclose={() => (showCreateModal = false)}>
    <form onsubmit={handleCreateWorkspace}>
      {#if errorMessage}
        <div class="error-banner mb-3">{errorMessage}</div>
      {/if}

      <div class="form-group">
        <label for="ws-name" class="form-label">Client / Workspace Name *</label>
        <input
          id="ws-name"
          type="text"
          class="shopify-input"
          placeholder="e.g. Nike India, Dental Clinic, Tech Startup"
          value={newName}
          oninput={handleNameInput}
          required
        />
      </div>

      <div class="form-group">
        <label for="ws-slug" class="form-label">Workspace Slug (API Identifier) *</label>
        <input
          id="ws-slug"
          type="text"
          class="shopify-input font-mono"
          placeholder="e.g. nike, dental-clinic"
          bind:value={newSlug}
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
          onclick={() => (showCreateModal = false)}
        >
          Cancel
        </button>
        <button
          type="submit"
          class="btn btn-primary"
          disabled={isCreating}
        >
          {isCreating ? 'Creating...' : 'Create Workspace'}
        </button>
      </div>
    </form>
  </Modal>
{/if}

<!-- Modal: Edit / Rename Workspace -->
{#if showEditModal && editingWorkspace}
  <Modal open={showEditModal} title="Rename Workspace" onclose={() => { showEditModal = false; editingWorkspace = null; }}>
    <form onsubmit={handleEditWorkspace}>
      {#if editErrorMessage}
        <div class="error-banner mb-3">{editErrorMessage}</div>
      {/if}

      <div class="form-group">
        <label for="edit-ws-name" class="form-label">Workspace / Brand Name *</label>
        <input
          id="edit-ws-name"
          type="text"
          class="shopify-input"
          placeholder="e.g. My Main Agency, Personal Brand"
          bind:value={editName}
          required
        />
      </div>

      <div class="form-group">
        <label for="edit-ws-slug" class="form-label">Workspace Slug</label>
        <input
          id="edit-ws-slug"
          type="text"
          class="shopify-input font-mono"
          bind:value={editSlug}
          disabled={editingWorkspace.id === 'ws_default'}
          required
        />
        {#if editingWorkspace.id === 'ws_default'}
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
          onclick={() => { showEditModal = false; editingWorkspace = null; }}
        >
          Cancel
        </button>
        <button
          type="submit"
          class="btn btn-primary"
          disabled={isUpdating}
        >
          {isUpdating ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </form>
  </Modal>
{/if}

