<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { fetchCollection, fetchContentItem, updateContentItem, deleteContentItem } from '$lib/api';
  import { modal } from '$lib/modal.svelte';
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

      // Populate form data with existing item values and fallback defaults
      const populated: Record<string, any> = {};
      for (const field of colData.fields || []) {
        if (itemData.data?.[field.key] !== undefined) {
          populated[field.key] = itemData.data[field.key];
        } else if (field.type === 'boolean') {
          populated[field.key] = false;
        } else if (field.type === 'number') {
          populated[field.key] = null;
        } else {
          populated[field.key] = '';
        }
      }
      formData = populated;
    } catch (err: any) {
      error = err.message || 'Failed to load record';
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
      title: `Delete ${collection?.name || 'Item'}?`,
      message: `Are you sure you want to permanently delete this record? This action cannot be undone.`,
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
  <title>Edit {collection?.name ? collection.name.replace(/s$/, '') : 'Item'} - EdgeCMS</title>
</svelte:head>

<div style="margin-bottom: 16px;">
  <div style="margin-bottom: 4px;">
    <a href="/content/{collectionSlug}" style="font-size: 12px; color: #71717a; text-decoration: none;">
      &larr; Back to {collection?.name || 'collection'}
    </a>
  </div>
  <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;">
    <div>
      <h1 style="font-size: 20px; font-weight: 600; color: #000000; margin: 0; letter-spacing: -0.01em;">
        Edit {collection?.name ? collection.name.replace(/s$/, '') : 'Item'}
      </h1>
      <p style="color: #71717a; font-size: 12.5px; margin: 2px 0 0 0;">
        Update dynamic fields in Cloudflare D1 database.
      </p>
    </div>

    <button
      type="button"
      class="btn-sm-pill btn-danger-sm"
      style="font-size: 11.5px; padding: 4px 10px;"
      onclick={handleDelete}
    >
      Delete Record
    </button>
  </div>
</div>

{#if error}
  <div style="background-color: #fef2f2; border: 1px solid #fee2e2; border-radius: 8px; padding: 12px 16px; color: #b91c1c; margin-bottom: 16px; font-size: 13px;">
    <strong>Error:</strong> {error}
  </div>
{/if}

{#if loading}
  <div class="shopify-card" style="padding: 48px; text-align: center; color: #71717a; font-size: 13.5px;">
    Loading dynamic record...
  </div>
{:else if collection && item}
  <div class="shopify-card" style="padding: 20px;">
    <form onsubmit={handleSubmit} style="display: flex; flex-direction: column; gap: 16px;">
      <!-- Visibility / Status Toggle -->
      <div>
        <div style="font-size: 12.5px; font-weight: 600; color: #27272a; margin-bottom: 6px;">
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
      <div style="display: flex; gap: 12px; align-items: center; padding-top: 14px; border-top: 1px solid #e4e4e7; flex-wrap: wrap;">
        <button
          type="submit"
          disabled={submitting}
          class="btn-primary-pill"
        >
          {submitting ? 'Saving...' : 'Save Changes'}
        </button>

        <a href="/content/{collectionSlug}" class="btn-sm-pill btn-gray-sm" style="padding: 8px 16px; margin-left: auto;">
          Cancel
        </a>
      </div>
    </form>
  </div>
{/if}
