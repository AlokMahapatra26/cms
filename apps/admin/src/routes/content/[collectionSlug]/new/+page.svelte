<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { fetchCollection, createContentItem } from '$lib/api';
  import { Icon } from '$lib/components';
  import DynamicFieldInput from '$lib/DynamicFieldInput.svelte';
  import type { Collection } from '@cms/shared';

  const collectionSlug = $derived(page.params.collectionSlug);

  let collection = $state<Collection | null>(null);
  let formData = $state<Record<string, any>>({});
  let status = $state<'draft' | 'published'>('draft');
  let slugTouched = $state(false);
  let loading = $state(true);
  let submitting = $state(false);
  let error = $state<string | null>(null);

  $effect(() => {
    if (!slugTouched && 'title' in formData && 'slug' in formData) {
      formData.slug = String(formData.title || '')
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
    }
  });

  async function loadCollection() {
    loading = true;
    error = null;
    try {
      collection = await fetchCollection(collectionSlug);
      // Initialize default values based on fields
      const initial: Record<string, any> = {};
      for (const field of collection.fields || []) {
        if (field.type === 'boolean') {
          initial[field.key] = false;
        } else if (field.type === 'number') {
          initial[field.key] = null;
        } else {
          initial[field.key] = '';
        }
      }
      formData = initial;
    } catch (err: any) {
      error = err.message || 'Failed to load collection schema';
    } finally {
      loading = false;
    }
  }

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    submitting = true;
    error = null;

    try {
      await createContentItem(collectionSlug, {
        status,
        data: formData
      });
      goto(`/content/${collectionSlug}`);
    } catch (err: any) {
      error = err.message || 'Failed to create record';
    } finally {
      submitting = false;
    }
  }

  onMount(() => {
    loadCollection();
  });
</script>

<svelte:head>
  <title>New {collection?.name || 'Item'} — EdgeCMS</title>
</svelte:head>

<div class="shopify-page-header">
  <div>
    <div class="mb-1">
      <a href="/content/{collectionSlug}" class="text-xs text-muted inline-flex items-center gap-1">
        <Icon name="arrow-left" size={12} />
        <span>{collection?.name || 'Back'}</span>
      </a>
    </div>
    <h1 class="shopify-page-title">
      New {collection?.name ? collection.name.replace(/s$/, '') : 'Item'}
    </h1>
  </div>
</div>

{#if error}
  <div class="error-banner mb-4">
    {error}
  </div>
{/if}

{#if loading}
  <div class="shopify-card p-12 text-center text-muted text-sm">
    Loading...
  </div>
{:else if collection}
  <div class="shopify-card">
    <form onsubmit={handleSubmit} class="flex flex-col gap-4">
      <!-- Visibility / Status Toggle -->
      <div>
        <div class="form-label">Status</div>
        <div class="shopify-segmented">
          <button
            type="button"
            class="shopify-segment-btn {status === 'draft' ? 'active' : ''}"
            onclick={() => (status = 'draft')}
          >
            Draft
          </button>
          <button
            type="button"
            class="shopify-segment-btn {status === 'published' ? 'active' : ''}"
            onclick={() => (status = 'published')}
          >
            Published
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
          type="button"
          disabled={submitting}
          onclick={() => {
            status = 'published';
            const form = document.querySelector('form');
            if (form) form.requestSubmit();
          }}
          class="btn btn-primary"
        >
          {submitting && status === 'published' ? 'Publishing...' : 'Publish Item'}
        </button>

        <button
          type="button"
          disabled={submitting}
          onclick={() => {
            status = 'draft';
            const form = document.querySelector('form');
            if (form) form.requestSubmit();
          }}
          class="btn btn-secondary"
        >
          {submitting && status === 'draft' ? 'Saving...' : 'Save as Draft'}
        </button>

        <a href="/content/{collectionSlug}" class="btn btn-secondary ml-auto">
          Cancel
        </a>
      </div>
    </form>
  </div>
{/if}
