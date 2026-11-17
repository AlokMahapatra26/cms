<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import {
    fetchCollection,
    fetchContentItem,
    updateContentItem,
    deleteContentItem,
    fetchContentVersions,
    rollbackContentVersion
  } from '$lib/api';
  import { modal } from '$lib/modal.svelte';
  import { Icon } from '$lib/components';
  import Modal from '$lib/components/Modal.svelte';
  import DynamicFieldInput from '$lib/DynamicFieldInput.svelte';
  import type { Collection, ContentItem, ContentStatus, ContentVersion } from '@cms/shared';

  const collectionSlug = $derived(page.params.collectionSlug);
  const itemId = $derived(page.params.id);

  let collection = $state<Collection | null>(null);
  let item = $state<ContentItem | null>(null);
  let formData = $state<Record<string, any>>({});
  let status = $state<ContentStatus>('draft');
  let scheduledAt = $state<string>('');
  let locale = $state<string>('en');
  let loading = $state(true);
  let submitting = $state(false);
  let error = $state<string | null>(null);

  // Version history state
  let versions = $state<ContentVersion[]>([]);
  let showVersionsModal = $state(false);
  let loadingVersions = $state(false);
  let rollingBack = $state(false);

  const API_BASE = (import.meta.env.VITE_API_BASE_URL as string) || 'http://localhost:8787';

  async function loadData() {
    loading = true;
    error = null;
    try {
      const [colData, itemData] = await Promise.all([
        fetchCollection(collectionSlug),
        fetchContentItem(collectionSlug, itemId)
      ]);
      collection = colData;
      item = itemData;
      status = itemData.status || 'draft';
      scheduledAt = itemData.scheduled_at ? itemData.scheduled_at.slice(0, 16) : '';
      locale = itemData.locale || 'en';

      // Populate form data
      const data: Record<string, any> = {};
      for (const field of colData.fields || []) {
        data[field.key] = itemData.data?.[field.key] ?? (field.type === 'boolean' ? false : field.type === 'number' ? null : '');
      }
      formData = data;

      // Load version count in background
      loadVersions();
    } catch (err: any) {
      error = err.message || 'Failed to load content item';
    } finally {
      loading = false;
    }
  }

  async function loadVersions() {
    loadingVersions = true;
    try {
      versions = await fetchContentVersions(collectionSlug, itemId);
    } catch {
      versions = [];
    } finally {
      loadingVersions = false;
    }
  }

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    submitting = true;
    error = null;

    try {
      await updateContentItem(collectionSlug, itemId, {
        status,
        scheduled_at: status === 'scheduled' && scheduledAt ? new Date(scheduledAt).toISOString() : null,
        locale,
        data: formData
      });
      goto(`/content/${collectionSlug}`);
    } catch (err: any) {
      error = err.message || 'Failed to update record';
    } finally {
      submitting = false;
    }
  }

  async function handleDelete() {
    const confirmed = await modal.confirm({
      title: `Delete record?`,
      message: `Are you sure you want to delete this record? This action cannot be undone.`,
      confirmText: 'Delete Record',
      variant: 'danger'
    });
    if (!confirmed) return;

    try {
      await deleteContentItem(collectionSlug, itemId);
      goto(`/content/${collectionSlug}`);
    } catch (err: any) {
      await modal.alert({
        title: 'Delete Failed',
        message: err.message || 'Failed to delete record',
        variant: 'danger'
      });
    }
  }

  async function handleRollback(v: ContentVersion) {
    const confirmed = await modal.confirm({
      title: `Restore version v${v.version_number}?`,
      message: `Are you sure you want to restore the data from version ${v.version_number} (${new Date(v.created_at).toLocaleString()})? A new version snapshot will be created.`,
      confirmText: 'Restore Version',
      variant: 'primary'
    });
    if (!confirmed) return;

    rollingBack = true;
    try {
      const res = await rollbackContentVersion(collectionSlug, itemId, v.id);
      status = (res.status as ContentStatus) || 'draft';
      formData = { ...res.data };
      showVersionsModal = false;
      await loadVersions();
      await modal.alert({
        title: 'Version Restored',
        message: `Successfully rolled back to v${v.version_number}. Current active version is now v${res.currentVersion}.`,
        variant: 'info'
      });
    } catch (err: any) {
      await modal.alert({
        title: 'Rollback Failed',
        message: err.message || 'Failed to rollback version',
        variant: 'danger'
      });
    } finally {
      rollingBack = false;
    }
  }

  function handleOpenPreview() {
    const previewUrl = `${API_BASE}/api/content/${collectionSlug}/${itemId}?preview=true`;
    window.open(previewUrl, '_blank');
  }

  onMount(() => {
    loadData();
  });
</script>

<svelte:head>
  <title>Edit {collection?.name ? collection.name.replace(/s$/, '') : 'Item'} — EdgeCMS</title>
</svelte:head>

<!-- Header & Controls -->
<div class="shopify-page-header">
  <div>
    <div class="mb-1">
      <a href="/content/{collectionSlug}" class="text-xs text-muted inline-flex items-center gap-1">
        <Icon name="arrow-left" size={12} />
        <span>{collection?.name || 'Back'}</span>
      </a>
    </div>
    <h1 class="shopify-page-title">
      Edit {collection?.name ? collection.name.replace(/s$/, '') : 'Item'}
    </h1>
  </div>

  <div class="flex items-center gap-2">
    <!-- Live Preview Button -->
    <button
      type="button"
      class="btn btn-secondary btn-sm"
      onclick={handleOpenPreview}
      title="Preview JSON / Draft API endpoint"
    >
      <Icon name="link" size={12} />
      <span>Live Preview</span>
    </button>

    <!-- Version History Button -->
    <button
      type="button"
      class="btn btn-secondary btn-sm"
      onclick={() => (showVersionsModal = true)}
      title="View revision history"
    >
      <Icon name="clock" size={12} />
      <span>History ({versions.length})</span>
    </button>

    <!-- Delete Button -->
    <button
      type="button"
      class="btn btn-danger btn-sm"
      onclick={handleDelete}
      title="Delete record"
    >
      <Icon name="trash" size={12} />
      <span>Delete</span>
    </button>
  </div>
</div>

{#if error}
  <div class="error-banner mb-4">
    <strong>Error:</strong> {error}
  </div>
{/if}

{#if loading}
  <div class="shopify-card p-12 text-center text-muted text-sm">
    Loading dynamic record...
  </div>
{:else if collection && item}
  <div class="shopify-card">
    <form onsubmit={handleSubmit} class="flex flex-col gap-4">
      <!-- Visibility & Scheduling Section -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4 border-b border-subtle">
        <div>
          <div class="form-label">
            Publishing Status
          </div>
          <div class="shopify-segmented">
            <button
              type="button"
              class="shopify-segment-btn {status === 'draft' ? 'active' : ''}"
              onclick={() => (status = 'draft')}
            >
              Draft
            </button>
            <button
              type="button"
              class="shopify-segment-btn {status === 'published' ? 'active' : ''}"
              onclick={() => (status = 'published')}
            >
              Published
            </button>
            <button
              type="button"
              class="shopify-segment-btn {status === 'scheduled' ? 'active' : ''}"
              onclick={() => (status = 'scheduled')}
            >
              Scheduled
            </button>
          </div>
        </div>

        <div>
          <label for="record-locale" class="form-label">
            Language / Locale
          </label>
          <select id="record-locale" bind:value={locale} class="input">
            <option value="en">English (en)</option>
            <option value="es">Spanish (es)</option>
            <option value="fr">French (fr)</option>
            <option value="de">German (de)</option>
            <option value="ja">Japanese (ja)</option>
          </select>
        </div>

        {#if status === 'scheduled'}
          <div class="md:col-span-2 bg-canvas-subtle p-3 rounded-lg border border-subtle flex flex-col gap-1.5">
            <label for="schedule-datetime" class="text-xs font-semibold text-primary flex items-center gap-1.5">
              <Icon name="clock" size={13} />
              <span>Target Publish Date & Time (UTC)</span>
            </label>
            <input
              id="schedule-datetime"
              type="datetime-local"
              bind:value={scheduledAt}
              class="input max-w-sm"
              required
            />
            <p class="text-[11px] text-muted">
              Item will automatically become visible via public endpoints once this time is reached.
            </p>
          </div>
        {/if}
      </div>

      <!-- Dynamically Generated Fields -->
      {#each collection.fields || [] as field (field.id)}
        <DynamicFieldInput {field} bind:value={formData[field.key]} />
      {/each}

      <!-- Actions Bar -->
      <div class="shopify-actions-bar">
        <button
          type="submit"
          disabled={submitting}
          class="btn btn-primary"
        >
          {submitting ? 'Saving...' : 'Save Changes'}
        </button>

        <a href="/content/{collectionSlug}" class="btn btn-secondary ml-auto">
          Cancel
        </a>
      </div>
    </form>
  </div>
{/if}

<!-- Version History Modal -->
{#if showVersionsModal}
  <Modal
    title="Version History & 1-Click Rollback"
    size="lg"
    onclose={() => (showVersionsModal = false)}
  >
    <div class="flex flex-col gap-3 max-h-[60vh] overflow-y-auto">
      {#if versions.length === 0}
        <div class="text-center py-8 text-muted text-sm">
          No revision snapshots recorded yet.
        </div>
      {:else}
        {#each versions as v (v.id)}
          <div class="p-3 bg-canvas-subtle border border-subtle rounded-lg flex items-center justify-between gap-4">
            <div>
              <div class="flex items-center gap-2">
                <span class="badge font-mono text-xs font-bold">v{v.version_number}</span>
                <span class="badge {v.status === 'published' ? 'badge-success' : v.status === 'scheduled' ? 'badge-warning' : 'badge-neutral'}">
                  {v.status}
                </span>
                <span class="text-xs text-muted">
                  {new Date(v.created_at).toLocaleString()}
                </span>
              </div>
              <p class="text-xs text-secondary mt-1">
                {v.change_summary || 'Content updated'} by <strong class="text-primary">{v.author_name || 'Admin'}</strong>
              </p>
            </div>

            <button
              type="button"
              class="btn btn-secondary btn-sm"
              disabled={rollingBack}
              onclick={() => handleRollback(v)}
            >
              <Icon name="undo" size={12} />
              <span>Restore</span>
            </button>
          </div>
        {/each}
      {/if}
    </div>

    <div class="mt-4 pt-3 border-t border-subtle flex justify-end">
      <button
        type="button"
        class="btn btn-secondary"
        onclick={() => (showVersionsModal = false)}
      >
        Close
      </button>
    </div>
  </Modal>
{/if}
