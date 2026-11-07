<script lang="ts">
  import { uploadMedia } from '$lib/api';
  import RichTextEditor from '$lib/RichTextEditor.svelte';
  import type { FieldDefinition } from '@cms/shared';

  let {
    field,
    value = $bindable()
  }: {
    field: FieldDefinition;
    value: any;
  } = $props();

  let uploadingMedia = $state(false);
  let mediaError = $state<string | null>(null);

  async function handleMediaUpload(e: Event) {
    const target = e.target as HTMLInputElement;
    if (!target.files || target.files.length === 0) return;

    uploadingMedia = true;
    mediaError = null;

    try {
      const res = await uploadMedia(target.files[0]);
      value = res.url;
    } catch (err: any) {
      mediaError = err.message || 'R2 upload failed';
    } finally {
      uploadingMedia = false;
      target.value = '';
    }
  }
</script>

<div class="dynamic-field-group">
  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
    <label for="field-{field.key}" class="field-label">
      {field.label}
      {#if field.required}
        <span style="color: #dc2626;">*</span>
      {/if}
    </label>

    <span style="font-size: 10.5px; color: #71717a; text-transform: uppercase; letter-spacing: 0.04em;">
      {field.type}
    </span>
  </div>

  {#if field.description}
    <p style="font-size: 11.5px; color: #71717a; margin: 0 0 6px 0;">{field.description}</p>
  {/if}

  <!-- 1. Text -->
  {#if field.type === 'text'}
    <input
      id="field-{field.key}"
      type="text"
      class="shopify-input"
      bind:value={value}
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
    <label style="display: flex; align-items: center; gap: 8px; cursor: pointer; padding: 6px 0;">
      <input
        type="checkbox"
        bind:checked={value}
        style="width: 16px; height: 16px; accent-color: #000000;"
      />
      <span style="font-size: 13px; font-weight: 500; color: #27272a;">
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
        <div style="display: flex; align-items: center; gap: 12px; min-width: 0;">
          <img
            src={value}
            alt={field.label}
            class="media-thumb"
            onerror={(e) => { (e.currentTarget as HTMLElement).style.display = 'none'; }}
          />
          <div style="min-width: 0;">
            <div style="font-size: 12px; font-weight: 600; color: #000000; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
              {value.split('/').pop()}
            </div>
            <div style="font-size: 10.5px; color: #71717a; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
              {value}
            </div>
          </div>
        </div>

        <button
          type="button"
          class="btn-sm-pill btn-danger-sm"
          style="font-size: 11px; padding: 3px 8px;"
          onclick={() => (value = null)}
        >
          Remove
        </button>
      </div>
    {:else}
      <div class="media-upload-box">
        <label class="btn-outline-pill" style="cursor: pointer; font-size: 12px; padding: 5px 14px;">
          <span>{uploadingMedia ? 'Uploading to R2...' : 'Select or Upload Media'}</span>
          <input
            type="file"
            accept="image/*"
            onchange={handleMediaUpload}
            disabled={uploadingMedia}
            style="display: none;"
          />
        </label>
        {#if mediaError}
          <span style="color: #dc2626; font-size: 11px; margin-top: 4px;">{mediaError}</span>
        {/if}
      </div>
    {/if}

  <!-- 8. Rich Text Editor -->
  {:else if field.type === 'richtext'}
    <div style="border: 1px solid #e4e4e7; border-radius: 8px; overflow: hidden;">
      <RichTextEditor bind:content={value} placeholder={field.placeholder} />
    </div>
  {/if}
</div>



