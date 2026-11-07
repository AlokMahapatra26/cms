<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { collectionsStore } from '$lib/collections.svelte';
  import { fetchMediaItems } from '$lib/api';
  import { Button, Card, Badge } from '$lib/components';
  import type { MediaItem } from '@cms/shared';

  let mediaCount = $state(0);
  let loadingMedia = $state(true);

  onMount(async () => {
    try {
      await collectionsStore.load();
      const media = await fetchMediaItems();
      mediaCount = media.length;
    } catch (e: any) {
      if (e.message === 'UNAUTHORIZED') {
        goto('/login');
      }
    } finally {
      loadingMedia = false;
    }
  });
</script>

<svelte:head>
  <title>Dashboard - EdgeCMS Headless Engine</title>
</svelte:head>

<!-- Page Header -->
<div class="shopify-page-header">
  <div>
    <h1 class="shopify-page-title">Headless CMS Dashboard</h1>
    <p class="shopify-page-subtitle">
      Design dynamic schemas, manage content collections, and query edge REST APIs.
    </p>
  </div>

  <div class="flex items-center gap-2">
    <Button variant="outline" href="/media">
      Media Library
    </Button>
    <Button variant="primary" href="/schemas">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <line x1="12" y1="5" x2="12" y2="19"></line>
        <line x1="5" y1="12" x2="19" y2="12"></line>
      </svg>
      <span>+ New Schema</span>
    </Button>
  </div>
</div>

<!-- Stats Overview Cards -->
<div class="grid grid-cols-auto gap-3 mb-6">
  <!-- Stat 1: Collections -->
  <Card compact>
    <div class="flex items-center justify-between mb-2">
      <span class="text-xs text-muted uppercase font-semibold tracking-wide">Content Models</span>
      <span class="pill-tag-mint">Dynamic</span>
    </div>
    <div class="text-2xl font-bold text-dark">
      {collectionsStore.list.length}
    </div>
    <div class="text-xs text-muted mt-1">
      Custom schemas defined
    </div>
  </Card>

  <!-- Stat 2: Media Storage -->
  <Card compact>
    <div class="flex items-center justify-between mb-2">
      <span class="text-xs text-muted uppercase font-semibold tracking-wide">R2 Media Assets</span>
      <span class="pill-tag-gray">Cloudflare</span>
    </div>
    <div class="text-2xl font-bold text-dark">
      {loadingMedia ? '...' : mediaCount}
    </div>
    <div class="text-xs text-muted mt-1">
      Images & files in global bucket
    </div>
  </Card>

  <!-- Stat 3: Edge API -->
  <Card compact>
    <div class="flex items-center justify-between mb-2">
      <span class="text-xs text-muted uppercase font-semibold tracking-wide">Runtime Engine</span>
      <span class="status-dot-active"></span>
    </div>
    <div class="text-2xl font-bold text-dark">
      Edge Workers
    </div>
    <div class="text-xs text-muted mt-1">
      D1 SQLite database active
    </div>
  </Card>
</div>

<!-- Content Collections Section -->
<div class="mb-6">
  <div class="flex justify-between items-center mb-3">
    <div>
      <h2 class="text-base font-semibold text-dark m-0">Your Content Collections</h2>
      <p class="text-xs text-muted m-0">Dynamic schemas managed and published on the edge.</p>
    </div>

    <Button variant="outline" size="sm" href="/schemas">
      Manage Models
    </Button>
  </div>

  {#if collectionsStore.loading}
    <Card class="p-12 text-center text-muted">
      <p class="m-0 text-base">Loading content models...</p>
    </Card>
  {:else if collectionsStore.list.length === 0}
    <!-- Empty State -->
    <Card class="p-12 text-center">
      <div class="media-empty-icon">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#71717a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="3" y1="9" x2="21" y2="9"></line>
          <line x1="9" y1="21" x2="9" y2="9"></line>
        </svg>
      </div>

      <h3 class="text-lg font-semibold text-dark m-0 mb-1">No Content Schemas Created Yet</h3>
      <p class="text-muted text-base m-0 mb-4" style="max-width: 480px; margin: 0 auto 20px auto;">
        Design your first custom content model. You can add text, rich text, media, boolean toggles, dropdowns, and date fields.
      </p>

      <Button variant="primary" href="/schemas">
        + Create Your First Schema
      </Button>
    </Card>
  {:else}
    <!-- Collections Grid -->
    <div class="grid grid-cols-auto gap-4">
      {#each collectionsStore.list as col (col.slug)}
        <div class="schema-item-card p-4">
          <div class="flex items-start justify-between mb-3">
            <div class="flex items-center gap-2">
              <div class="collection-avatar-badge" style="width: 28px; height: 28px; font-size: 13px;">
                {col.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h3 class="text-base font-semibold text-dark m-0">
                  {col.name}
                </h3>
                <Badge variant="collection">/{col.slug}</Badge>
              </div>
            </div>

            <Button variant="outline" size="sm" href="/content/{col.slug}/new">
              + Add
            </Button>
          </div>

          {#if col.description}
            <p class="text-xs text-muted m-0 mb-3 truncate">
              {col.description}
            </p>
          {/if}

          <!-- Fields Preview Chips -->
          <div class="flex flex-wrap gap-1 mb-4 flex-1">
            {#each col.fields.slice(0, 4) as field}
              <span class="schema-field-chip">
                <span>{field.label}</span>
                <span class="text-muted text-xs">({field.type})</span>
              </span>
            {/each}
            {#if col.fields.length > 4}
              <span class="schema-field-chip text-muted">
                +{col.fields.length - 4} more
              </span>
            {/if}
          </div>

          <!-- Bottom Card Actions -->
          <div class="flex items-center justify-between pt-3 border-t">
            <a
              href="/content/{col.slug}"
              class="text-xs font-semibold text-dark flex items-center gap-1 hover:underline"
            >
              <span>Browse Records</span>
              <span>→</span>
            </a>

            <div class="flex gap-2">
              <a
                href="/api"
                class="text-xs text-muted hover:text-dark"
                title="View REST API endpoint"
              >
                REST API
              </a>
              <span class="text-muted text-xs">•</span>
              <a
                href="/schemas"
                class="text-xs text-muted hover:text-dark"
                title="Edit collection schema definition"
              >
                Edit Model
              </a>
            </div>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<!-- API Integration Box -->
<Card class="p-4">
  <div class="flex items-center justify-between flex-wrap gap-3">
    <div>
      <h3 class="text-sm font-semibold text-dark m-0 mb-1">
        ⚡ Universal Edge Content Delivery API
      </h3>
      <p class="text-xs text-muted m-0">
        Every schema you create immediately gets dedicated public and authenticated REST endpoints on Cloudflare Workers.
      </p>
    </div>

    <Button variant="outline" size="sm" href="/api">
      Explore API Endpoints
    </Button>
  </div>
</Card>
