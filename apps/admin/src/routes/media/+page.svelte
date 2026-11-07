<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { fetchMediaItems, uploadMedia, deleteMedia } from '$lib/api';
  import { modal } from '$lib/modal.svelte';
  import RenameModal from '$lib/RenameModal.svelte';
  import type { MediaItem } from '@cms/shared';

  let items = $state<MediaItem[]>([]);
  let loading = $state(true);
  let uploading = $state(false);
  let deletingKey = $state<string | null>(null);
  let error = $state<string | null>(null);
  let copiedKey = $state<string | null>(null);
  let renameModalOpen = $state(false);
  let renameTargetItem = $state<MediaItem | null>(null);

  async function loadMedia() {
    loading = true;
    error = null;
    try {
      items = await fetchMediaItems();
    } catch (e: any) {
      if (e.message === 'UNAUTHORIZED') {
        goto('/login');
        return;
      }
      error = e.message || 'Failed to load media assets';
    } finally {
      loading = false;
    }
  }

  async function handleUpload(e: Event) {
    const target = e.target as HTMLInputElement;
    if (!target.files || target.files.length === 0) return;

    uploading = true;
    error = null;
    try {
      await uploadMedia(target.files[0]);
      await loadMedia();
    } catch (err: any) {
      error = err.message || 'Upload to Cloudflare R2 failed';
    } finally {
      uploading = false;
      target.value = '';
    }
  }

  async function handleDeleteMedia(key: string, fileName: string) {
    const confirmed = await modal.confirm({
      title: 'Delete Media Asset?',
      message: `Are you sure you want to permanently delete "${fileName}" from Cloudflare R2? This action cannot be undone.`,
      confirmText: 'Delete Asset',
      variant: 'danger'
    });
    if (!confirmed) return;

    deletingKey = key;
    error = null;
    try {
      await deleteMedia(key);
      items = items.filter((item) => item.key !== key);
    } catch (err: any) {
      error = `Delete failed: ${err.message}`;
    } finally {
      deletingKey = null;
    }
  }

  function copyUrl(url: string, key: string) {
    navigator.clipboard.writeText(url);
    copiedKey = key;
    setTimeout(() => {
      copiedKey = null;
    }, 2000);
  }

  function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  onMount(() => {
    loadMedia();
  });
</script>

<svelte:head>
  <title>Media Library - EdgeCMS</title>
</svelte:head>

<!-- Header -->
<div class="shopify-page-header">
  <div>
    <h1 class="shopify-page-title">
      Media Library
    </h1>
    <p class="shopify-page-subtitle">
      Assets, cover images, and graphics stored globally on Cloudflare R2.
    </p>
  </div>

  <div>
    <label class="btn-primary-pill cursor-pointer text-xs py-2 px-3">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
        <polyline points="17 8 12 3 7 8"></polyline>
        <line x1="12" y1="3" x2="12" y2="15"></line>
      </svg>
      <span>{uploading ? 'Uploading to R2...' : 'Upload Media'}</span>
      <input
        type="file"
        accept="image/*"
        onchange={handleUpload}
        disabled={uploading}
        class="hidden"
      />
    </label>
  </div>
</div>

{#if error}
  <div class="error-banner mb-6">
    {error}
  </div>
{/if}

{#if loading}
  <div class="shopify-card p-12 text-center text-muted">
    <p class="m-0 text-base">Fetching R2 bucket storage...</p>
  </div>
{:else if items.length === 0}
  <div class="shopify-card p-12 text-center">
    <div class="media-empty-icon">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#71717a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
        <circle cx="8.5" cy="8.5" r="1.5"></circle>
        <polyline points="21 15 16 10 5 21"></polyline>
      </svg>
    </div>
    <h3 class="text-lg font-semibold m-0 mb-1">No media files yet</h3>
    <p class="text-muted text-base m-0 mb-4">
      Upload images to use them as article covers or embed them in Markdown posts.
    </p>
    <label class="btn-primary-pill cursor-pointer text-sm inline-flex">
      <span>Upload First File</span>
      <input type="file" accept="image/*" onchange={handleUpload} class="hidden" />
    </label>
  </div>
{:else}
  <div class="grid grid-cols-auto gap-3">
    {#each items as item (item.key)}
      <div class="shopify-card media-card">
        <!-- Thumbnail with fallback for non-images -->
        <div class="media-thumb-container">
          <span class="absolute">FILE</span>
          <img
            src={item.url}
            alt={item.key}
            class="media-thumb-img"
            onerror={(e) => {
              (e.currentTarget as HTMLElement).style.display = 'none';
            }}
          />
        </div>

        <!-- Details -->
        <div class="p-2 flex-1 flex flex-col justify-between">
          <div>
            <div class="text-sm font-semibold text-dark truncate mb-1" title={item.key}>
              {item.key.replace('uploads/', '')}
            </div>
            <div class="text-xs text-muted mb-2">
              {formatBytes(item.size)}
            </div>
          </div>

          <div class="flex gap-1 items-center">
            <button
              class="btn-sm-pill btn-gray-sm flex-1 justify-center whitespace-nowrap"
              onclick={() => copyUrl(item.url, item.key)}
            >
              {copiedKey === item.key ? 'Copied!' : 'Copy URL'}
            </button>
            <button
              class="btn-sm-pill btn-gray-sm"
              title="Rename asset"
              onclick={() => {
                renameTargetItem = item;
                renameModalOpen = true;
              }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
              </svg>
            </button>
            <a
              href={item.url}
              target="_blank"
              rel="noopener"
              class="btn-sm-pill btn-gray-sm"
              title="Open full image in new tab"
            >
              ↗
            </a>
            <button
              class="btn-sm-pill btn-danger-sm"
              title="Delete asset from Cloudflare R2"
              disabled={deletingKey === item.key}
              onclick={() => handleDeleteMedia(item.key, item.key.replace('uploads/', ''))}
            >
              {#if deletingKey === item.key}
                ...
              {:else}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
              {/if}
            </button>
          </div>
        </div>
      </div>
    {/each}
  </div>
{/if}

<!-- Rename Asset Dialog -->
<RenameModal
  isOpen={renameModalOpen}
  item={renameTargetItem}
  onClose={() => {
    renameModalOpen = false;
    renameTargetItem = null;
  }}
  onRenamed={(updatedItem) => {
    items = items.map((i) => (i.key === renameTargetItem?.key ? updatedItem : i));
  }}
/>
