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
  let loading = $state(true);
  let submitting = $state(false);
  let error = $state<string | null>(null);

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
  <title>New {collection?.name || 'Item'} - EdgeCMS</title>
</svelte:head>

<div style="margin-bottom: 16px;">
  <div style="margin-bottom: 4px;">
    <a href="/content/{collectionSlug}" style="font-size: 12px; color: #71717a; text-decoration: none; display: inline-flex; align-items: center; gap: 4px;">
      <Icon name="arrow-left" size={13} />
      <span>Back to {collection?.name || 'collection'}</span>
    </a>
  </div>
  <h1 style="font-size: 20px; font-weight: 600; color: #000000; margin: 0; letter-spacing: -0.01em;">
    Create {collection?.name ? collection.name.replace(/s$/, '') : 'Item'}
  </h1>
  <p style="color: #71717a; font-size: 12.5px; margin: 2px 0 0 0;">
    Add a new dynamic record to the {collection?.name || ''} collection.
  </p>
</div>

{#if error}
  <div style="background-color: #fef2f2; border: 1px solid #fee2e2; border-radius: 8px; padding: 12px 16px; color: #b91c1c; margin-bottom: 16px; font-size: 13px;">
    <strong>Error:</strong> {error}
  </div>
{/if}

{#if loading}
  <div class="shopify-card" style="padding: 48px; text-align: center; color: #71717a; font-size: 13.5px;">
    Loading dynamic schema form...
  </div>
{:else if collection}
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
          type="button"
          disabled={submitting}
          onclick={() => {
            status = 'published';
            const form = document.querySelector('form');
            if (form) form.requestSubmit();
          }}
          class="btn-aloe-pill"
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
          class="btn-outline-pill"
        >
          {submitting && status === 'draft' ? 'Saving...' : 'Save as Draft'}
        </button>

        <a href="/content/{collectionSlug}" class="btn-sm-pill btn-gray-sm" style="padding: 8px 16px; margin-left: auto;">
          Cancel
        </a>
      </div>
    </form>
  </div>
{/if}

