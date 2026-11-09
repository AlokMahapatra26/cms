<script lang="ts">
  import { onMount } from 'svelte';
  import { workspacesStore } from '$lib/workspaces.svelte';
  import { Icon } from '$lib/components';
  import Modal from '$lib/components/Modal.svelte';

  let open = $state(false);
  let showCreateModal = $state(false);
  let newName = $state('');
  let newSlug = $state('');
  let isCreating = $state(false);
  let errorMessage = $state('');

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

  function handleClickOutside(e: MouseEvent) {
    const target = e.target as HTMLElement;
    if (!target.closest('.workspace-switcher-container')) {
      open = false;
    }
  }
</script>

<svelte:window onclick={handleClickOutside} />

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
        <button
          type="button"
          class="workspace-item {workspacesStore.activeSlug === ws.slug ? 'selected' : ''}"
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
      {/each}

      <div class="workspace-dropdown-divider"></div>

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

{#if showCreateModal}
  <Modal title="Create Client Workspace" onclose={() => (showCreateModal = false)}>
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

