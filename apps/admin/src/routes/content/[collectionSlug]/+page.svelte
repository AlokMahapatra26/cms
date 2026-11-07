<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/state';
  import { fetchCollection, fetchContentItems, deleteContentItem, updateContentItem } from '$lib/api';
  import { modal } from '$lib/modal.svelte';
  import { Icon } from '$lib/components';
  import type { Collection, ContentItem } from '@cms/shared';

  const collectionSlug = $derived(page.params.collectionSlug);

  let collection = $state<Collection | null>(null);
  let items = $state<ContentItem[]>([]);
  let loading = $state(true);
  let error = $state<string | null>(null);
  let filter = $state<'all' | 'published' | 'draft'>('all');

  async function loadData() {
    loading = true;
    error = null;
    try {
      const [colData, itemsData] = await Promise.all([
        fetchCollection(collectionSlug),
        fetchContentItems(collectionSlug)
      ]);
      collection = colData;
      items = itemsData;
    } catch (err: any) {
      error = err.message || 'Failed to load content collection';
    } finally {
      loading = false;
    }
  }

  $effect(() => {
    // reload when route param changes
    if (collectionSlug) {
      loadData();
    }
  });

  async function handleDelete(item: ContentItem) {
    const primaryTitle = getPrimaryValue(item);
    const confirmed = await modal.confirm({
      title: `Delete ${collection?.name || 'Item'}?`,
      message: `Are you sure you want to delete "${primaryTitle}"? This action cannot be undone.`,
      confirmText: 'Delete Item',
      variant: 'danger'
    });
    if (!confirmed) return;

    try {
      await deleteContentItem(collectionSlug, item.id);
      items = items.filter((i) => i.id !== item.id);
    } catch (err: any) {
      await modal.alert({
        title: 'Delete Failed',
        message: err.message || 'Failed to delete content item',
        variant: 'danger'
      });
    }
  }

  async function handleToggleStatus(item: ContentItem) {
    const nextStatus = item.status === 'published' ? 'draft' : 'published';
    try {
      const updated = await updateContentItem(collectionSlug, item.id, {
        status: nextStatus
      });
      items = items.map((i) => (i.id === item.id ? updated : i));
    } catch (err: any) {
      await modal.alert({
        title: 'Status Update Failed',
        message: err.message || 'Failed to update item status',
        variant: 'danger'
      });
    }
  }

  function getPrimaryValue(item: ContentItem): string {
    if (!collection?.fields || collection.fields.length === 0) return item.id;
    const firstField = collection.fields[0];
    const val = item.data?.[firstField.key];
    if (val !== undefined && val !== null && val !== '') return String(val);
    return item.id.substring(0, 8);
  }

  const filteredItems = $derived(
    items.filter((item) => {
      if (filter === 'all') return true;
      return item.status === filter;
    })
  );

  // Pick up to 3 fields to show as columns in the table
  const tableColumns = $derived(
    (collection?.fields || []).slice(0, 4)
  );
</script>

<svelte:head>
  <title>{collection?.name || 'Content Collection'} - EdgeCMS</title>
</svelte:head>

<!-- Header & Controls -->
<div style="margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
  <div>
    <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 2px;">
      <h1 style="font-size: 20px; font-weight: 600; color: #000000; margin: 0; letter-spacing: -0.01em;">
        {collection?.name || 'Collection'}
      </h1>
      <span class="collection-badge">
        /content/{collectionSlug}
      </span>
    </div>
    <p style="font-size: 12.5px; color: #71717a; margin: 0;">
      {collection?.description || `Manage records for the ${collection?.name || ''} collection.`}
    </p>
  </div>

  <div style="display: flex; align-items: center; gap: 8px;">
    <a
      href="/schemas"
      class="btn-outline-pill"
      style="font-size: 12px; padding: 5px 12px; display: inline-flex; align-items: center; gap: 6px;"
      title="Edit schema fields"
    >
      <Icon name="settings" size={13} />
      <span>Schema</span>
    </a>

    <a
      href="/content/{collectionSlug}/new"
      class="btn-primary-pill"
      style="font-size: 12px; padding: 6px 15px; display: inline-flex; align-items: center; gap: 6px;"
    >
      <Icon name="plus" size={12} />
      <span>New {collection?.name ? collection.name.replace(/s$/, '') : 'Item'}</span>
    </a>
  </div>
</div>

<!-- Segmented Filter -->
{#if items.length > 0}
  <div style="margin-bottom: 14px; display: flex; justify-content: space-between; align-items: center;">
    <div class="shopify-segmented">
      <button
        class="shopify-segment-btn {filter === 'all' ? 'active' : ''}"
        onclick={() => (filter = 'all')}
      >
        All ({items.length})
      </button>
      <button
        class="shopify-segment-btn {filter === 'published' ? 'active' : ''}"
        onclick={() => (filter = 'published')}
      >
        Published ({items.filter((i) => i.status === 'published').length})
      </button>
      <button
        class="shopify-segment-btn {filter === 'draft' ? 'active' : ''}"
        onclick={() => (filter = 'draft')}
      >
        Drafts ({items.filter((i) => i.status === 'draft').length})
      </button>
    </div>

    <a
      href="http://localhost:8787/api/content/{collectionSlug}"
      target="_blank"
      rel="noopener"
      class="btn-outline-pill"
      style="font-size: 11px; padding: 3px 8px; color: #71717a;"
    >
      <span>JSON Feed</span>
      <span style="font-size: 9px; opacity: 0.6;">↗</span>
    </a>
  </div>
{/if}

{#if error}
  <div style="background-color: #fef2f2; border: 1px solid #fee2e2; border-radius: 8px; padding: 12px 16px; color: #b91c1c; margin-bottom: 20px; font-size: 13px;">
    {error}
  </div>
{/if}

{#if loading}
  <div class="shopify-card" style="padding: 48px; text-align: center; color: #71717a; font-size: 13.5px;">
    Loading dynamic records...
  </div>
{:else if items.length === 0}
  <div class="shopify-card" style="padding: 56px 20px; text-align: center;">
    <div style="width: 48px; height: 48px; border-radius: 12px; background: #f4f4f5; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 12px; color: #71717a;">
      <Icon name="collection" size={24} />
    </div>
    <h3 style="font-size: 16px; font-weight: 600; margin: 0 0 6px 0;">No records in this collection yet</h3>
    <p style="color: #71717a; font-size: 13px; max-width: 420px; margin: 0 auto 18px auto;">
      Add your first record using the auto-generated dynamic form based on the schema fields.
    </p>
    <a href="/content/{collectionSlug}/new" class="btn-primary-pill" style="display: inline-flex;">
      Create First {collection?.name ? collection.name.replace(/s$/, '') : 'Item'}
    </a>
  </div>
{:else}
  <!-- Dynamic Table -->
  <div class="shopify-card" style="overflow-x: auto;">
    <table class="shopify-table">
      <thead>
        <tr>
          {#each tableColumns as col}
            <th>{col.label}</th>
          {/each}
          <th style="width: 100px;">STATUS</th>
          <th style="width: 110px;">CREATED</th>
          <th style="text-align: right; width: 150px;">ACTIONS</th>
        </tr>
      </thead>
      <tbody>
        {#each filteredItems as item (item.id)}
          <tr>
            {#each tableColumns as col, idx}
              <td>
                {#if idx === 0}
                  <!-- Primary Title Column -->
                  <div style="display: flex; align-items: center; gap: 8px;">
                    {#if item.data?.[col.key] && col.type === 'media'}
                      <img src={item.data[col.key]} alt="Thumb" style="width: 28px; height: 28px; border-radius: 4px; object-fit: cover;" />
                    {/if}
                    <span style="font-weight: 600; color: #000000; font-size: 13px;">
                      {item.data?.[col.key] !== undefined && item.data?.[col.key] !== null ? item.data[col.key] : '—'}
                    </span>
                  </div>
                {:else if col.type === 'boolean'}
                  <span style="font-size: 12px; font-weight: 500; display: inline-flex; align-items: center; gap: 4px; color: {item.data?.[col.key] ? '#15803d' : '#71717a'};">
                    {#if item.data?.[col.key]}
                      <Icon name="check" size={12} />
                      <span>Yes</span>
                    {:else}
                      <Icon name="close" size={12} />
                      <span>No</span>
                    {/if}
                  </span>
                {:else if col.type === 'media'}
                  {#if item.data?.[col.key]}
                    <img src={item.data[col.key]} alt="Thumb" style="width: 26px; height: 26px; border-radius: 4px; object-fit: cover; border: 1px solid #e4e4e7;" />
                  {:else}
                    <span style="color: #a1a1aa; font-size: 11px;">None</span>
                  {/if}
                {:else if col.type === 'number'}
                  <span style="font-family: monospace; font-size: 12.5px; font-weight: 600;">
                    {item.data?.[col.key] !== undefined ? item.data[col.key] : '—'}
                  </span>
                {:else}
                  <span style="font-size: 12.5px; color: #3f3f46; max-width: 200px; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    {item.data?.[col.key] !== undefined ? String(item.data[col.key]).replace(/<[^>]*>?/gm, '') : '—'}
                  </span>
                {/if}
              </td>
            {/each}

            <!-- Status Column -->
            <td>
              <button
                type="button"
                class="status-toggle-btn"
                onclick={() => handleToggleStatus(item)}
                title="Click to toggle status"
              >
                {#if item.status === 'published'}
                  <span class="pill-tag-mint">PUBLISHED</span>
                {:else}
                  <span class="pill-tag-gray">DRAFT</span>
                {/if}
              </button>
            </td>

            <!-- Created Date -->
            <td style="font-size: 11.5px; color: #71717a; white-space: nowrap;">
              {new Date(item.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
            </td>

            <!-- Actions -->
            <td style="text-align: right; white-space: nowrap;">
              <a
                href="/content/{collectionSlug}/{item.id}"
                class="btn-sm-pill btn-gray-sm"
                style="font-size: 11px; padding: 2.5px 8px;"
              >
                Edit
              </a>
              <button
                type="button"
                class="btn-sm-pill btn-danger-sm"
                style="font-size: 11px; padding: 2.5px 7px; margin-left: 4px;"
                title="Delete item"
                onclick={() => handleDelete(item)}
              >
                Delete
              </button>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{/if}



