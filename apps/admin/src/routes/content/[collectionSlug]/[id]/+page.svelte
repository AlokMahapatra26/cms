<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { fetchCollection, fetchContentItem, updateContentItem, deleteContentItem } from '$lib/api';
  import { modal } from '$lib/modal.svelte';
  import { Icon } from '$lib/components';
  import DynamicFieldInput from '$lib/DynamicFieldInput.svelte';
  import type { Collection, ContentItem } from '@cms/shared';

  const collectionSlug = $derived(page.params.collectionSlug);
  const itemId = $derived(page.params.id);

  let collection = $state<Collection | null>(null);
  let item = $state<ContentItem | null>(null);
  let formData = $state<Record<string, any>>({});
  let status = $state<'draft' | 'published'>('draft');
  let loading = $state(true);
  let submitting = $state(false);
  let error = $state<string | null>(null);

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
      status = itemData.status;

      // Populate form data
      const data: Record<string, any> = {};
      for (const field of colData.fields || []) {
        data[field.key] = itemData.data?.[field.key] ?? (field.type === 'boolean' ? false : field.type === 'number' ? null : '');
      }
      formData = data;
    } catch (err: any) {
      error = err.message || 'Failed to load content item';
    } finally {
      loading = false;
    }
  }

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    submitting = true;
    error = null;

    try {
      await updateContentItem(collectionSlug, itemId, {
        status,
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
      <!-- Visibility / Status Toggle -->
      <div>
        <div class="form-label">
          Visibility Status
        </div>
        <div class="shopify-segmented">
          <button
            type="button"
            class="shopify-segment-btn {status === 'draft' ? 'active' : ''}"
            onclick={() => (status = 'draft')}
          >
            Draft (Hidden)
          </button>
          <button
            type="button"
            class="shopify-segment-btn {status === 'published' ? 'active' : ''}"
            onclick={() => (status = 'published')}
          >
            Published (Live)
          </button>
        </div>
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
