<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/state';
  import { goto } from '$app/navigation';
  import { fetchCollection, createContentItem } from '$lib/api';
  import { Icon } from '$lib/components';
  import DynamicFieldInput from '$lib/DynamicFieldInput.svelte';
  import type { Collection, ContentStatus } from '@cms/shared';

  const collectionSlug = $derived(page.params.collectionSlug);

  let collection = $state<Collection | null>(null);
  let formData = $state<Record<string, any>>({});
  let status = $state<ContentStatus>('draft');
  let scheduledAt = $state<string>('');
  let locale = $state<string>('en');
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
        scheduled_at: status === 'scheduled' && scheduledAt ? new Date(scheduledAt).toISOString() : null,
        locale,
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
      <!-- Visibility & Scheduling Section -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4 border-b border-subtle">
        <div>
          <div class="form-label">Publishing Status</div>
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
            <button
              type="button"
              class="shopify-segment-btn {status === 'scheduled' ? 'active' : ''}"
              onclick={() => (status = 'scheduled')}
            >
              Scheduled
            </button>
          </div>
        </div>

        <div>
          <label for="new-record-locale" class="form-label">Language / Locale</label>
          <select id="new-record-locale" bind:value={locale} class="input">
            <option value="en">English (en)</option>
            <option value="es">Spanish (es)</option>
            <option value="fr">French (fr)</option>
            <option value="de">German (de)</option>
            <option value="ja">Japanese (ja)</option>
          </select>
        </div>

        {#if status === 'scheduled'}
          <div class="md:col-span-2 bg-canvas-subtle p-3 rounded-lg border border-subtle flex flex-col gap-1.5">
            <label for="new-schedule-datetime" class="text-xs font-semibold text-primary flex items-center gap-1.5">
              <Icon name="clock" size={13} />
              <span>Target Publish Date & Time (UTC)</span>
            </label>
            <input
              id="new-schedule-datetime"
              type="datetime-local"
              bind:value={scheduledAt}
              class="input max-w-sm"
              required
            />
            <p class="text-[11px] text-muted">
              Item will automatically become visible via public endpoints once this time is reached.
            </p>
          </div>
        {/if}
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
