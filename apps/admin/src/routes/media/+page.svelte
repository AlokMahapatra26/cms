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
  <title>Media Library — EdgeCMS</title>
</svelte:head>

<!-- Header -->
<div class="shopify-page-header">
  <div>
    <h1 class="shopify-page-title">
      Media
    </h1>
    <p class="shopify-page-subtitle">
      Upload and manage images and assets on Cloudflare R2.
    </p>
  </div>

  <div>
    <label class="btn btn-primary btn-sm cursor-pointer">
      <Icon name="upload" size={13} />
      <span>{uploading ? 'Uploading...' : 'Upload File'}</span>
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
  <div class="error-banner mb-4">
    {error}
  </div>
{/if}

{#if loading}
  <div class="shopify-card p-12 text-center text-muted text-sm">
    Fetching R2 bucket storage...
  </div>
{:else if items.length === 0}
  <div class="shopify-card p-12 text-center">
    <div class="media-empty-icon mx-auto">
      <Icon name="media" size={24} />
    </div>
    <h3 class="text-base font-semibold mb-2">No media files yet</h3>
    <p class="text-muted text-sm max-w-md mx-auto mb-4">
      Upload images, graphics, and assets to attach them to your dynamic content records.
    </p>
    <label class="btn btn-primary cursor-pointer inline-flex">
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
          <span class="text-xs text-muted font-mono">FILE</span>
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
        <div class="p-3 flex-1 flex flex-col justify-between">
          <div>
            <div class="text-sm font-medium text-dark truncate mb-1" title={item.key}>
              {item.key.replace('uploads/', '')}
            </div>
            <div class="text-xs text-muted mb-3 font-mono">
              {formatBytes(item.size)}
            </div>
          </div>

          <div class="flex gap-1 items-center">
            <button
              class="btn btn-secondary btn-sm flex-1"
              onclick={() => copyUrl(item.url, item.key)}
            >
              {copiedKey === item.key ? 'Copied!' : 'Copy URL'}
            </button>
            <button
              class="btn btn-secondary btn-sm"
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
              class="btn btn-secondary btn-sm"
              title="Open full image in new tab"
            >
              <Icon name="external" size={11} />
            </a>
            <button
              class="btn btn-danger btn-sm"
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
