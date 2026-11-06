<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { fetchMediaItems, uploadMedia, deleteMedia } from '$lib/api';
  import type { MediaItem } from '@cms/shared';

  let items = $state<MediaItem[]>([]);
  let loading = $state(true);
  let uploading = $state(false);
  let deletingKey = $state<string | null>(null);
  let error = $state<string | null>(null);
  let copiedKey = $state<string | null>(null);

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
    if (!confirm(`Are you sure you want to permanently delete "${fileName}" from Cloudflare R2?`)) {
      return;
    }

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
<div style="margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
  <div>
    <h1 style="font-size: 20px; font-weight: 600; color: #000000; margin: 0 0 2px 0; letter-spacing: -0.01em;">
      Media Library
    </h1>
    <p style="font-size: 12.5px; color: #71717a; margin: 0;">
      Assets, cover images, and graphics stored globally on Cloudflare R2.
    </p>
  </div>

  <div>
    <label class="btn-primary-pill" style="cursor: pointer; font-size: 12px; padding: 6px 14px;">
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
        style="display: none;"
      />
    </label>
  </div>
</div>

{#if error}
  <div style="background-color: #fef2f2; border: 1px solid #fee2e2; border-radius: 12px; padding: 16px; color: #b91c1c; margin-bottom: 24px;">
    {error}
  </div>
{/if}

{#if loading}
  <div class="shopify-card" style="padding: 48px; text-align: center; color: #71717a;">
    <p style="margin: 0; font-size: 14px;">Fetching R2 bucket storage...</p>
  </div>
{:else if items.length === 0}
  <div class="shopify-card" style="padding: 60px 24px; text-align: center;">
    <div style="width: 52px; height: 52px; border-radius: 12px; background: #f4f4f5; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px;">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#71717a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
        <circle cx="8.5" cy="8.5" r="1.5"></circle>
        <polyline points="21 15 16 10 5 21"></polyline>
      </svg>
    </div>
    <h3 style="font-size: 16px; font-weight: 600; margin: 0 0 6px 0;">No media files yet</h3>
    <p style="color: #71717a; font-size: 14px; margin: 0 0 20px 0;">
      Upload images to use them as article covers or embed them in Markdown posts.
    </p>
    <label class="btn-primary-pill" style="cursor: pointer; font-size: 13px; padding: 8px 18px; display: inline-flex;">
      <span>Upload First File</span>
      <input type="file" accept="image/*" onchange={handleUpload} style="display: none;" />
    </label>
  </div>
{:else}
  <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 14px;">
    {#each items as item (item.key)}
      <div class="shopify-card" style="overflow: hidden; display: flex; flex-direction: column;">
        <!-- Thumbnail with fallback for non-images -->
        <div style="height: 110px; background-color: #f4f4f5; position: relative; overflow: hidden; display: flex; align-items: center; justify-content: center; color: #a1a1aa; font-size: 11px; font-weight: 600;">
          <span style="position: absolute;">FILE</span>
          <img
            src={item.url}
            alt={item.key}
            style="width: 100%; height: 100%; object-fit: cover; position: relative; z-index: 1;"
            onerror={(e) => {
              (e.currentTarget as HTMLElement).style.display = 'none';
            }}
          />
        </div>

        <!-- Details -->
        <div style="padding: 10px; flex: 1; display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <div style="font-size: 12px; font-weight: 600; color: #000000; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; margin-bottom: 2px;" title={item.key}>
              {item.key.replace('uploads/', '')}
            </div>
            <div style="font-size: 10.5px; color: #71717a; margin-bottom: 8px;">
              {formatBytes(item.size)}
            </div>
          </div>

          <div style="display: flex; gap: 5px; align-items: center;">
            <button
              class="btn-sm-pill btn-gray-sm"
              style="flex: 1; justify-content: center; font-size: 11px; padding: 2.5px 6px; white-space: nowrap;"
              onclick={() => copyUrl(item.url, item.key)}
            >
              {copiedKey === item.key ? 'Copied!' : 'Copy URL'}
            </button>
            <a
              href={item.url}
              target="_blank"
              rel="noopener"
              class="btn-sm-pill btn-gray-sm"
              style="font-size: 11px; padding: 2.5px 6px;"
              title="Open full image in new tab"
            >
              ↗
            </a>
            <button
              class="btn-sm-pill btn-danger-sm"
              style="font-size: 11px; padding: 2.5px 7px;"
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

