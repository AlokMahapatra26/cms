<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { fetchMediaItems, uploadMedia, deleteMedia } from '$lib/api';
  import { modal } from '$lib/modal.svelte';
  import RenameModal from '$lib/RenameModal.svelte';
  import { Icon } from '$lib/components';
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
      Media
    </h1>
    <p class="shopify-page-subtitle">
      Upload and manage images and assets.
    </p>
  </div>

  <div>
    <label class="btn-primary-pill cursor-pointer text-xs py-2 px-3 inline-flex items-center gap-1.5">
      <Icon name="upload" size={14} />
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
    <div class="media-empty-icon" style="color: #71717a; display: inline-flex; align-items: center; justify-content: center;">
      <Icon name="media" size={24} />
    </div>
    <h3 class="text-lg font-semibold m-0 mb-1">No media files yet</h3>
    <p class="text-muted text-base m-0 mb-4">
      Upload images, graphics, and assets to attach them to your dynamic content records.
    </p>
    <label class="btn-primary-pill cursor-pointer text-sm inline-flex items-center gap-1.5">
      <Icon name="upload" size={14} />
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
              <Icon name="edit" size={11} />
            </button>
            <a
              href={item.url}
              target="_blank"
              rel="noopener"
              class="btn-sm-pill btn-gray-sm inline-flex items-center justify-center"
              title="Open full image in new tab"
            >
              <Icon name="external" size={11} />
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
                <Icon name="trash" size={11} />
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
