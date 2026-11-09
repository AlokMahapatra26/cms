<script lang="ts">
  import type { FieldDefinition } from '@cms/shared';
  import { uploadMedia, fetchContentItems, type ContentItem } from '$lib/api';
  import { Icon } from '$lib/components';
  import RichTextEditor from '$lib/RichTextEditor.svelte';

  let {
    field,
    value = $bindable()
  }: {
    field: FieldDefinition;
    value: any;
  } = $props();

  let uploadingMedia = $state(false);
  let mediaError = $state<string | null>(null);

  // Relationship state
  let relationItems = $state<ContentItem[]>([]);
  let loadingRelation = $state(false);
  let relationError = $state<string | null>(null);

  $effect(() => {
    if (field.type === 'relation' && field.relationCollectionSlug) {
      loadRelationItems(field.relationCollectionSlug);
    }
  });

  async function loadRelationItems(colSlug: string) {
    loadingRelation = true;
    relationError = null;
    try {
      const items = await fetchContentItems(colSlug);
      relationItems = items;
    } catch (err: any) {
      relationError = err.message || 'Failed to load referenced items';
    } finally {
      loadingRelation = false;
    }
  }

  async function handleMediaUpload(e: Event) {
    const target = e.target as HTMLInputElement;
    if (!target.files || target.files.length === 0) return;

    uploadingMedia = true;
    mediaError = null;

    try {
      const item = await uploadMedia(target.files[0]);
      value = item.url;
    } catch (err: any) {
      mediaError = err.message || 'Media upload failed';
    } finally {
      uploadingMedia = false;
      target.value = '';
    }
  }
</script>

<div class="dynamic-field-group">
  <div class="flex justify-between items-center mb-1">
    <label for="field-{field.key}" class="field-label">
      {field.label}
      {#if field.required}
        <span class="text-danger">*</span>
      {/if}
    </label>

    <span class="text-xs text-muted uppercase tracking-wide">
      {field.type}
    </span>
  </div>

  {#if field.description}
    <p class="text-xs text-muted m-0 mb-1">{field.description}</p>
  {/if}

  <!-- 1. Text -->
  {#if field.type === 'text'}
    <input
      id="field-{field.key}"
      type="text"
      class="shopify-input"
      bind:value={value}
      oninput={(e) => {
        if (field.key === 'slug') {
          value = (e.currentTarget.value || '').toLowerCase().replace(/[\s_]+/g, '-').replace(/[^a-z0-9-]/g, '');
        }
      }}
      placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}...`}
      required={field.required}
    />

  <!-- 2. Long Text / Textarea -->
  {:else if field.type === 'longtext'}
    <textarea
      id="field-{field.key}"
      class="shopify-input"
      rows="3"
      bind:value={value}
      placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}...`}
      required={field.required}
    ></textarea>

  <!-- 3. Number -->
  {:else if field.type === 'number'}
    <input
      id="field-{field.key}"
      type="number"
      step="any"
      class="shopify-input"
      bind:value={value}
      placeholder={field.placeholder || '0'}
      required={field.required}
    />

  <!-- 4. Boolean (Toggle / Checkbox) -->
  {:else if field.type === 'boolean'}
    <label class="flex items-center gap-2 cursor-pointer py-1">
      <input
        type="checkbox"
        bind:checked={value}
        class="checkbox-input"
      />
      <span class="text-sm font-medium text-dark">
        {value ? 'Yes / Enabled' : 'No / Disabled'}
      </span>
    </label>

  <!-- 5. Date -->
  {:else if field.type === 'date'}
    <input
      id="field-{field.key}"
      type="date"
      class="shopify-input"
      bind:value={value}
      required={field.required}
    />

  <!-- 6. Select Dropdown -->
  {:else if field.type === 'select'}
    <select
      id="field-{field.key}"
      class="shopify-input"
      bind:value={value}
      required={field.required}
    >
      <option value="">-- Choose an option --</option>
      {#each field.options || [] as opt}
        <option value={opt}>{opt}</option>
      {/each}
    </select>

  <!-- 7. Media (Cloudflare R2) -->
  {:else if field.type === 'media'}
    {#if value}
      <div class="media-preview-box">
        <div class="flex items-center gap-3 min-w-0">
          <img
            src={value}
            alt={field.label}
            class="media-thumb"
            onerror={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }}
          />
          <div class="min-w-0">
            <div class="text-xs font-semibold text-dark truncate">
              {value.split('/').pop()}
            </div>
            <div class="text-xs text-muted truncate">
              {value}
            </div>
          </div>
        </div>

        <button
          type="button"
          class="btn btn-danger btn-sm"
          onclick={() => (value = null)}
        >
          Remove
        </button>
      </div>
    {:else}
      <div class="media-upload-box">
        <label class="btn btn-secondary btn-sm cursor-pointer inline-flex items-center gap-1.5">
          <Icon name="upload" size={13} />
          <span>{uploadingMedia ? 'Uploading to R2...' : 'Select or Upload Media'}</span>
          <input
            type="file"
            accept="image/*"
            onchange={handleMediaUpload}
            disabled={uploadingMedia}
            class="hidden"
          />
        </label>
        {#if mediaError}
          <span class="text-danger text-xs mt-1">{mediaError}</span>
        {/if}
      </div>
    {/if}

  <!-- 8. Rich Text Editor -->
  {:else if field.type === 'richtext'}
    <div class="border rounded-md overflow-hidden">
      <RichTextEditor bind:content={value} placeholder={field.placeholder} />
    </div>

  <!-- 9. Relation / Reference to Another Collection -->
  {:else if field.type === 'relation'}
    {#if !field.relationCollectionSlug}
      <div class="field-hint text-danger">
        No target collection configured for this relationship.
      </div>
    {:else}
      <div class="relation-field-container">
        <div class="relation-input-row">
          <select
            id="field-{field.key}"
            class="shopify-input"
            bind:value={value}
            required={field.required}
            disabled={loadingRelation}
          >
            <option value="">{loadingRelation ? 'Loading choices...' : '-- None / Unassigned --'}</option>
            {#each relationItems as item (item.id)}
              {@const label = item.data?.title || item.data?.name || item.data?.heading || item.data?.label || item.data?.slug || item.id}
              <option value={item.id}>
                {label} {item.status === 'draft' ? '(Draft)' : ''}
              </option>
            {/each}
          </select>

          {#if value}
            <a
              href="/content/{field.relationCollectionSlug}/{value}"
              target="_blank"
              rel="noreferrer"
              class="relation-view-btn"
              title="Open referenced record in new tab"
            >
              <Icon name="link" size={12} />
              <span>View</span>
            </a>
          {/if}
        </div>

        {#if relationError}
          <span class="text-danger text-xs">{relationError}</span>
        {:else if relationItems.length === 0 && !loadingRelation}
          <p class="relation-empty-hint">
            No records found in "{field.relationCollectionSlug}".
            <a href="/content/{field.relationCollectionSlug}/new" target="_blank" class="relation-create-link">
              + Add {field.relationCollectionSlug}
            </a>
          </p>
        {/if}
      </div>
    {/if}
  {/if}
</div>
