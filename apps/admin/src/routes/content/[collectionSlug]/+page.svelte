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
    if (collectionSlug) {
      loadData();
    }
  });

  $effect(() => {
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

  function handleSort(column: string) {
    if (sortColumn === column) {
      sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      sortColumn = column;
      sortDirection = 'asc';
    }
  }

  function clearAllFilters() {
    filter = 'all';
    searchQuery = '';
    currentPage = 1;
  }

  const filteredByStatus = $derived.by(() => {
    if (filter === 'all') return items;
    return items.filter((i) => i.status === filter);
  });

  const searchedItems = $derived.by(() => {
    if (!searchQuery.trim()) return filteredByStatus;
    const q = searchQuery.toLowerCase().trim();
    return filteredByStatus.filter((item) => {
      if (item.status?.toLowerCase().includes(q)) return true;
      if (item.id?.toLowerCase().includes(q)) return true;
      if (item.data) {
        for (const val of Object.values(item.data)) {
          if (val !== undefined && val !== null && String(val).toLowerCase().includes(q)) {
            return true;
          }
        }
      }
      return false;
    });
  });

  const sortedItems = $derived.by(() => {
    return [...searchedItems].sort((a, b) => {
      let aVal: any;
      let bVal: any;

      if (sortColumn === 'status') {
        aVal = a.status || '';
        bVal = b.status || '';
      } else if (sortColumn === 'created_at') {
        aVal = new Date(a.created_at).getTime();
        bVal = new Date(b.created_at).getTime();
      } else if (sortColumn === 'updated_at') {
        aVal = new Date(a.updated_at).getTime();
        bVal = new Date(b.updated_at).getTime();
      } else {
        aVal = a.data?.[sortColumn] ?? '';
        bVal = b.data?.[sortColumn] ?? '';
      }

      if (typeof aVal === 'string') {
        const cmp = aVal.localeCompare(String(bVal));
        return sortDirection === 'asc' ? cmp : -cmp;
      }
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  });

  const publishedCount = $derived(items.filter((i) => i.status === 'published').length);
  const draftCount = $derived(items.filter((i) => i.status === 'draft').length);

  const tableColumns = $derived.by(() => {
    if (!collection?.fields || collection.fields.length === 0) {
      return [{ key: 'id', label: 'ID', type: 'text' }];
    }
    return collection.fields.slice(0, 4).map((f) => ({
      key: f.key,
      label: f.label || f.key,
      type: f.type
    }));
  });

  const totalItems = $derived(sortedItems.length);
  const totalPages = $derived(Math.max(1, Math.ceil(totalItems / pageSize)));
  const startIndex = $derived((currentPage - 1) * pageSize);
  const endIndex = $derived(Math.min(startIndex + pageSize, totalItems));
  const paginatedItems = $derived(sortedItems.slice(startIndex, endIndex));

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
  <title>{collection?.name || 'Content Collection'} — EdgeCMS</title>
</svelte:head>

<!-- Header & Controls -->
<div class="shopify-page-header">
  <div>
    <h1 class="shopify-page-title">
      {collection?.name || 'Collection'}
    </h1>
    {#if collection?.description}
      <p class="shopify-page-subtitle">
        {collection.description}
      </p>
    {/if}
  </div>

  <div class="flex items-center gap-2">
    <a
      href="/schemas"
      class="btn btn-secondary btn-sm"
      title="Edit schema fields"
    >
      <Icon name="settings" size={12} />
      <span>Schema</span>
    </a>

    <a
      href="/content/{collectionSlug}/new"
      class="btn btn-primary btn-sm"
    >
      <Icon name="plus" size={12} />
      <span>New {collection?.name ? collection.name.replace(/s$/, '') : 'Item'}</span>
    </a>
  </div>
</div>

<!-- Toolbar: Filter Tabs + Search Box -->
{#if items.length > 0}
  <div class="table-toolbar mb-3">
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

    <!-- Search Input -->
    <div class="search-input-wrapper">
      <span class="search-input-icon">
        <Icon name="search" size={13} />
      </span>
      <input
        type="text"
        class="search-input-field"
        placeholder="Search..."
        bind:value={searchQuery}
      />
    </div>
  </div>
{/if}

{#if error}
  <div class="error-banner mb-4">
    {error}
  </div>
{/if}

{#if loading}
  <div class="shopify-card p-12 text-center text-muted text-sm">
    Loading dynamic records...
  </div>
{:else if items.length === 0}
  <div class="shopify-card p-12 text-center">
    <div class="media-empty-icon">
      <Icon name="collection" size={24} />
    </div>
    <h3 class="text-base font-semibold mb-2">No records in this collection yet</h3>
    <p class="text-muted text-sm max-w-md mx-auto mb-4">
      Add your first record using the auto-generated dynamic form based on the schema fields.
    </p>
    <a href="/content/{collectionSlug}/new" class="btn btn-primary">
      Create First {collection?.name ? collection.name.replace(/s$/, '') : 'Item'}
    </a>
  </div>
{:else}
  <!-- Dynamic Table with Sorting and Pagination -->
  <div class="shopify-table-container">
    <table class="shopify-table">
      <thead>
        <tr>
          {#each tableColumns as col}
            <th
              class="sortable"
              onclick={() => handleSort(col.key)}
              title="Sort by {col.label}"
            >
              <span class="table-header-content">
                <span>{col.label}</span>
                <span class="sort-indicator {sortColumn === col.key ? '' : 'inactive'}">
                  {#if sortColumn === col.key}
                    <Icon name={sortDirection === 'asc' ? 'chevron-up' : 'chevron-down'} size={12} />
                  {/if}
                </span>
              </span>
            </th>
          {/each}

          <!-- Status Column Header -->
          <th
            class="sortable col-status"
            onclick={() => handleSort('status')}
            title="Sort by status"
          >
            <span class="table-header-content">
              <span>STATUS</span>
              <span class="sort-indicator {sortColumn === 'status' ? '' : 'inactive'}">
                {#if sortColumn === 'status'}
                  <Icon name={sortDirection === 'asc' ? 'chevron-up' : 'chevron-down'} size={12} />
                {/if}
              </span>
            </span>
          </th>

          <!-- Created Date Column Header -->
          <th
            class="sortable col-created"
            onclick={() => handleSort('created_at')}
            title="Sort by creation date"
          >
            <span class="table-header-content">
              <span>CREATED</span>
              <span class="sort-indicator {sortColumn === 'created_at' ? '' : 'inactive'}">
                {#if sortColumn === 'created_at'}
                  <Icon name={sortDirection === 'asc' ? 'chevron-up' : 'chevron-down'} size={12} />
                {/if}
              </span>
            </span>
          </th>

          <!-- Actions Header -->
          <th class="col-actions">ACTIONS</th>
        </tr>
      </thead>
      <tbody>
        {#if sortedItems.length === 0}
          <tr>
            <td colspan={tableColumns.length + 3} class="p-12 text-center">
              <div class="media-empty-icon mx-auto mb-2">
                <Icon name="search" size={18} />
              </div>
              <div class="font-semibold text-sm mb-1">
                No records match your filters
              </div>
              <p class="text-xs text-muted mb-3">
                {searchQuery ? `No results found for "${searchQuery}".` : 'Try selecting a different status filter.'}
              </p>
              <button type="button" class="btn btn-secondary btn-sm" onclick={clearAllFilters}>
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
                    <div class="flex items-center gap-2 min-w-0">
                      {#if item.data?.[col.key] && col.type === 'media'}
                        <img src={item.data[col.key]} alt="Thumb" class="table-thumb" />
                      {/if}
                      <span class="font-medium text-sm text-dark shopify-table-cell-truncate">
                        {item.data?.[col.key] !== undefined && item.data?.[col.key] !== null ? item.data[col.key] : '—'}
                      </span>
                    </div>
                  {:else if col.type === 'boolean'}
                    <span class="text-xs font-medium inline-flex items-center gap-1 {item.data?.[col.key] ? 'text-success' : 'text-muted'}">
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
                      <img src={item.data[col.key]} alt="Thumb" class="table-thumb" />
                    {:else}
                      <span class="text-faint text-xs">None</span>
                    {/if}
                  {:else if col.type === 'number'}
                    <span class="font-mono text-xs font-medium shopify-table-cell-truncate">
                      {item.data?.[col.key] !== undefined ? item.data[col.key] : '—'}
                    </span>
                  {:else}
                    <span class="text-xs text-muted shopify-table-cell-truncate">
                      {item.data?.[col.key] !== undefined ? String(item.data[col.key]).replace(/<[^>]*>?/gm, '') : '—'}
                    </span>
                  {/if}
                </td>
              {/each}

              <!-- Status Column -->
              <td class="col-status">
                <button
                  type="button"
                  class="cursor-pointer bg-transparent border-none p-0 inline-flex"
                  onclick={() => handleToggleStatus(item)}
                  title="Click to toggle status"
                >
                  {#if item.status === 'published'}
                    <span class="badge-published">PUBLISHED</span>
                  {:else}
                    <span class="badge-draft">DRAFT</span>
                  {/if}
                </button>
              </td>

              <!-- Created Date -->
              <td class="col-created text-xs text-muted whitespace-nowrap font-mono">
                {new Date(item.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
              </td>

              <!-- Actions -->
              <td class="col-actions whitespace-nowrap">
                <a
                  href="/content/{collectionSlug}/{item.id}"
                  class="btn btn-secondary btn-sm"
                >
                  Edit
                </a>
                <button
                  type="button"
                  class="btn btn-danger btn-sm ml-1"
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

    <!-- Pagination & Item Count Footer -->
    {#if sortedItems.length > 0}
      <div class="table-pagination-bar">
        <div class="flex items-center gap-3">
          <span>
            Showing <strong>{startIndex + 1}–{endIndex}</strong> of <strong>{totalItems}</strong> records
            {#if searchQuery || filter !== 'all'}
              <span class="text-muted">(from {items.length} total)</span>
            {/if}
          </span>

          <div class="flex items-center gap-1">
            <label for="page-size" class="text-muted text-xs">Rows:</label>
            <select
              id="page-size"
              class="shopify-input py-1 px-2 text-xs w-auto"
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
                <span class="px-1 text-faint text-xs">...</span>
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
