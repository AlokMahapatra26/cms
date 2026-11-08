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

  // Filters, Search, Sort & Pagination State
  let filter = $state<'all' | 'published' | 'draft'>('all');
  let searchQuery = $state('');
  let sortColumn = $state<string>('created_at');
  let sortDirection = $state<'asc' | 'desc'>('desc');
  let currentPage = $state(1);
  let pageSize = $state(10);

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

  // Reset pagination when search query or filter changes
  $effect(() => {
    // track reactive dependencies
    const _q = searchQuery;
    const _f = filter;
    currentPage = 1;
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

  function handleSort(columnKey: string) {
    if (sortColumn === columnKey) {
      sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      sortColumn = columnKey;
      sortDirection = columnKey === 'created_at' ? 'desc' : 'asc';
    }
  }

  function clearAllFilters() {
    searchQuery = '';
    filter = 'all';
    currentPage = 1;
  }

  // Pick up to 4 fields to show as columns in the table
  const tableColumns = $derived(
    (collection?.fields || []).slice(0, 4)
  );

  // Status Filter Counts
  const publishedCount = $derived(items.filter((i) => i.status === 'published').length);
  const draftCount = $derived(items.filter((i) => i.status === 'draft').length);

  // Filtered Items (by status & search query)
  const filteredItems = $derived(
    items.filter((item) => {
      // 1. Status filter
      if (filter !== 'all' && item.status !== filter) {
        return false;
      }

      // 2. Search query filter
      const q = searchQuery.trim().toLowerCase();
      if (!q) return true;

      // Match item ID
      if (item.id.toLowerCase().includes(q)) return true;

      // Match status
      if (item.status.toLowerCase().includes(q)) return true;

      // Match any field inside item.data
      if (item.data) {
        for (const val of Object.values(item.data)) {
          if (val !== undefined && val !== null) {
            const strVal = String(val).toLowerCase();
            if (strVal.includes(q)) return true;
          }
        }
      }

      return false;
    })
  );

  // Sorted Items
  const sortedItems = $derived(
    [...filteredItems].sort((a, b) => {
      let valA: any;
      let valB: any;

      if (sortColumn === 'status') {
        valA = a.status;
        valB = b.status;
      } else if (sortColumn === 'created_at') {
        valA = new Date(a.created_at).getTime();
        valB = new Date(b.created_at).getTime();
      } else {
        valA = a.data?.[sortColumn];
        valB = b.data?.[sortColumn];
      }

      // Handle nulls / undefined - push to end
      if (valA === undefined || valA === null || valA === '') return 1;
      if (valB === undefined || valB === null || valB === '') return -1;

      let comparison = 0;
      if (typeof valA === 'number' && typeof valB === 'number') {
        comparison = valA - valB;
      } else if (typeof valA === 'boolean' && typeof valB === 'boolean') {
        comparison = valA === valB ? 0 : valA ? -1 : 1;
      } else if (
        sortColumn === 'created_at' ||
        (typeof valA === 'string' && /^\d{4}-\d{2}-\d{2}/.test(valA) && /^\d{4}-\d{2}-\d{2}/.test(valB))
      ) {
        const timeA = new Date(valA).getTime();
        const timeB = new Date(valB).getTime();
        comparison = isNaN(timeA) || isNaN(timeB) ? String(valA).localeCompare(String(valB)) : timeA - timeB;
      } else {
        comparison = String(valA).localeCompare(String(valB), undefined, { numeric: true, sensitivity: 'base' });
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    })
  );

  // Pagination calculations
  const totalItems = $derived(sortedItems.length);
  const totalPages = $derived(Math.max(1, Math.ceil(totalItems / pageSize)));
  const startIndex = $derived((currentPage - 1) * pageSize);
  const endIndex = $derived(Math.min(startIndex + pageSize, totalItems));
  const paginatedItems = $derived(sortedItems.slice(startIndex, endIndex));

  // Generate page numbers for pagination
  const visiblePages = $derived.by(() => {
    const pages: (number | string)[] = [];
    if (totalPages <= 5) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) pages.push(i);
      }
      if (currentPage < totalPages - 2) pages.push('...');
      if (!pages.includes(totalPages)) pages.push(totalPages);
    }
    return pages;
  });
</script>

<svelte:head>
  <title>{collection?.name || 'Content Collection'} - EdgeCMS</title>
</svelte:head>

<!-- Header & Controls -->
<div style="margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
  <div>
    <h1 style="font-size: 18px; font-weight: 600; color: #09090b; margin: 0 0 3px 0; letter-spacing: -0.015em;">
      {collection?.name || 'Collection'}
    </h1>
    {#if collection?.description}
      <p style="font-size: 13px; color: #71717a; margin: 0;">
        {collection.description}
      </p>
    {/if}
  </div>

  <div style="display: flex; align-items: center; gap: 8px;">
    <a
      href="/schemas"
      class="btn-outline-pill"
      style="font-size: 12px; padding: 5px 12px; display: inline-flex; align-items: center; gap: 6px; color: #52525b;"
      title="Edit schema fields"
    >
      <Icon name="settings" size={13} />
      <span>Schema</span>
    </a>

    <a
      href="/content/{collectionSlug}/new"
      class="btn-primary-pill"
      style="font-size: 12px; padding: 6px 14px; display: inline-flex; align-items: center; gap: 6px;"
    >
      <Icon name="plus" size={12} />
      <span>New {collection?.name ? collection.name.replace(/s$/, '') : 'Item'}</span>
    </a>
  </div>
</div>

<!-- Toolbar: Filter Tabs + Search Box -->
{#if items.length > 0}
  <div class="table-toolbar" style="margin-bottom: 14px;">
    <div class="table-toolbar-left" style="width: 100%; display: flex; justify-content: space-between; align-items: center;">
      <!-- Status Tabs -->
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
          Published ({publishedCount})
        </button>
        <button
          class="shopify-segment-btn {filter === 'draft' ? 'active' : ''}"
          onclick={() => (filter = 'draft')}
        >
          Drafts ({draftCount})
        </button>
      </div>

      <!-- Instant Search Input -->
      <div class="table-search-box" style="max-width: 260px;">
        <span class="table-search-icon">
          <Icon name="search" size={13} />
        </span>
        <input
          type="text"
          class="table-search-input"
          placeholder="Search..."
          bind:value={searchQuery}
        />
        {#if searchQuery}
          <button
            type="button"
            class="table-search-clear"
            onclick={() => (searchQuery = '')}
            title="Clear search"
            aria-label="Clear search"
          >
            <Icon name="close" size={11} />
          </button>
        {/if}
      </div>
    </div>
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
  <!-- Dynamic Table with Sorting and Pagination -->
  <div class="shopify-card" style="overflow: hidden; padding: 0;">
    <div style="overflow-x: auto;">
      <table class="shopify-table">
        <thead>
          <tr>
            {#each tableColumns as col}
              <th
                class="sortable {sortColumn === col.key ? 'active-sort' : ''}"
                onclick={() => handleSort(col.key)}
                title="Sort by {col.label}"
              >
                <span class="th-sort-wrapper">
                  <span>{col.label}</span>
                  <span class="sort-indicator">
                    {#if sortColumn === col.key}
                      <Icon name={sortDirection === 'asc' ? 'chevron-up' : 'chevron-down'} size={12} />
                    {:else}
                      <Icon name="sort" size={11} />
                    {/if}
                  </span>
                </span>
              </th>
            {/each}

            <!-- Status Column Header -->
            <th
              class="sortable {sortColumn === 'status' ? 'active-sort' : ''}"
              style="width: 110px;"
              onclick={() => handleSort('status')}
              title="Sort by status"
            >
              <span class="th-sort-wrapper">
                <span>STATUS</span>
                <span class="sort-indicator">
                  {#if sortColumn === 'status'}
                    <Icon name={sortDirection === 'asc' ? 'chevron-up' : 'chevron-down'} size={12} />
                  {:else}
                    <Icon name="sort" size={11} />
                  {/if}
                </span>
              </span>
            </th>

            <!-- Created Date Column Header -->
            <th
              class="sortable {sortColumn === 'created_at' ? 'active-sort' : ''}"
              style="width: 120px;"
              onclick={() => handleSort('created_at')}
              title="Sort by creation date"
            >
              <span class="th-sort-wrapper">
                <span>CREATED</span>
                <span class="sort-indicator">
                  {#if sortColumn === 'created_at'}
                    <Icon name={sortDirection === 'asc' ? 'chevron-up' : 'chevron-down'} size={12} />
                  {:else}
                    <Icon name="sort" size={11} />
                  {/if}
                </span>
              </span>
            </th>

            <!-- Actions Header -->
            <th style="text-align: right; width: 140px;">ACTIONS</th>
          </tr>
        </thead>
        <tbody>
          {#if sortedItems.length === 0}
            <tr>
              <td colspan={tableColumns.length + 3} style="padding: 48px 20px; text-align: center;">
                <div style="width: 40px; height: 40px; border-radius: 50%; background: #f4f4f5; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 10px; color: #71717a;">
                  <Icon name="search" size={18} />
                </div>
                <div style="font-size: 14px; font-weight: 600; color: #000000; margin-bottom: 4px;">
                  No records match your filters
                </div>
                <p style="font-size: 12px; color: #71717a; margin: 0 0 12px 0;">
                  {searchQuery ? `No results found for "${searchQuery}".` : 'Try selecting a different status filter.'}
                </p>
                <button type="button" class="btn-outline-pill" onclick={clearAllFilters}>
                  Clear Filters
                </button>
              </td>
            </tr>
          {:else}
            {#each paginatedItems as item (item.id)}
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
          {/if}
        </tbody>
      </table>
    </div>

    <!-- Pagination & Item Count Footer -->
    {#if sortedItems.length > 0}
      <div class="table-pagination">
        <div style="display: flex; align-items: center; gap: 12px;">
          <span>
            Showing <strong>{startIndex + 1}–{endIndex}</strong> of <strong>{totalItems}</strong> records
            {#if searchQuery || filter !== 'all'}
              <span style="color: #71717a;">(from {items.length} total)</span>
            {/if}
          </span>

          <div class="page-size-selector">
            <label for="page-size" style="color: #71717a;">Rows:</label>
            <select
              id="page-size"
              class="page-size-select"
              bind:value={pageSize}
              onchange={() => (currentPage = 1)}
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>

        {#if totalPages > 1}
          <div class="pagination-controls">
            <button
              type="button"
              class="pagination-btn"
              disabled={currentPage <= 1}
              onclick={() => (currentPage = Math.max(1, currentPage - 1))}
              title="Previous page"
              aria-label="Previous page"
            >
              <Icon name="chevron-left" size={12} />
            </button>

            {#each visiblePages as p}
              {#if p === '...'}
                <span style="padding: 0 4px; color: #a1a1aa; font-size: 11px;">...</span>
              {:else}
                <button
                  type="button"
                  class="pagination-btn {currentPage === p ? 'active' : ''}"
                  onclick={() => (currentPage = Number(p))}
                >
                  {p}
                </button>
              {/if}
            {/each}

            <button
              type="button"
              class="pagination-btn"
              disabled={currentPage >= totalPages}
              onclick={() => (currentPage = Math.min(totalPages, currentPage + 1))}
              title="Next page"
              aria-label="Next page"
            >
              <Icon name="chevron-right" size={12} />
            </button>
          </div>
        {/if}
      </div>
    {/if}
  </div>
{/if}
