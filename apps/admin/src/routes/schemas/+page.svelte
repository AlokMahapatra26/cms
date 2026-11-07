<script lang="ts">
  import { onMount } from 'svelte';
  import {
    fetchCollections,
    createCollection,
    updateCollection,
    deleteCollection
  } from '$lib/api';
  import { collectionsStore } from '$lib/collections.svelte';
  import { modal } from '$lib/modal.svelte';
  import { Icon } from '$lib/components';
  import type { Collection, FieldDefinition, FieldType } from '@cms/shared';

  let collections = $state<Collection[]>([]);
  let loading = $state(true);
  let error = $state<string | null>(null);

  // Editor Modal State
  let modalOpen = $state(false);
  let editingSlug = $state<string | null>(null); // null if new
  let modelName = $state('');
  let modelSlug = $state('');
  let modelDescription = $state('');
  let modelIcon = $state('box');
  let modelFields = $state<FieldDefinition[]>([]);
  let saving = $state(false);
  let modalError = $state<string | null>(null);

  // New Field Sub-Form State
  let isAddingField = $state(false);
  let newFieldLabel = $state('');
  let newFieldKey = $state('');
  let newFieldType = $state<FieldType>('text');
  let newFieldRequired = $state(false);
  let newFieldPlaceholder = $state('');
  let newFieldOptions = $state('');

  const FIELD_TYPES: { type: FieldType; label: string; icon: string; desc: string }[] = [
    { type: 'text', label: 'Single Line Text', icon: 'text', desc: 'Titles, names, short strings' },
    { type: 'longtext', label: 'Long Text', icon: 'longtext', desc: 'Multi-line descriptions, bios' },
    { type: 'richtext', label: 'Rich Text WYSIWYG', icon: 'richtext', desc: 'Formatted HTML with headings, lists' },
    { type: 'number', label: 'Number', icon: 'number', desc: 'Prices, quantities, ratings' },
    { type: 'media', label: 'Media (Cloudflare R2)', icon: 'media', desc: 'Photos, banners, graphics' },
    { type: 'boolean', label: 'Boolean (Yes/No)', icon: 'boolean', desc: 'In stock, featured, active' },
    { type: 'date', label: 'Date', icon: 'date', desc: 'Event date, expiry, milestones' },
    { type: 'select', label: 'Dropdown Select', icon: 'select', desc: 'Single choice from list of options' }
  ];

  async function loadData() {
    loading = true;
    error = null;
    try {
      collections = await fetchCollections();
      collectionsStore.list = collections;
    } catch (e: any) {
      error = e.message || 'Failed to load collections';
    } finally {
      loading = false;
    }
  }

  function autoSlugModel() {
    if (editingSlug) return;
    modelSlug = modelName
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  function autoSlugField() {
    newFieldKey = newFieldLabel
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  function openCreateModal() {
    editingSlug = null;
    modelName = '';
    modelSlug = '';
    modelDescription = '';
    modelIcon = 'box';
    modelFields = [
      {
        id: `f_${Date.now()}_1`,
        key: 'title',
        label: 'Title',
        type: 'text',
        required: true,
        placeholder: 'e.g. Item title'
      }
    ];
    modalError = null;
    isAddingField = false;
    modalOpen = true;
  }

  function openEditModal(col: Collection) {
    editingSlug = col.slug;
    modelName = col.name;
    modelSlug = col.slug;
    modelDescription = col.description || '';
    modelIcon = col.icon || 'box';
    modelFields = JSON.parse(JSON.stringify(col.fields || []));
    modalError = null;
    isAddingField = false;
    modalOpen = true;
  }

  function addFieldToModel() {
    if (!newFieldLabel.trim() || !newFieldKey.trim()) {
      return;
    }

    if (modelFields.some((f) => f.key === newFieldKey.trim())) {
      modalError = `Field key "${newFieldKey}" already exists in this schema`;
      return;
    }

    const field: FieldDefinition = {
      id: `f_${Date.now()}`,
      key: newFieldKey.trim(),
      label: newFieldLabel.trim(),
      type: newFieldType,
      required: newFieldRequired,
      placeholder: newFieldPlaceholder.trim() || undefined,
      options:
        newFieldType === 'select'
          ? newFieldOptions
              .split(',')
              .map((s) => s.trim())
              .filter(Boolean)
          : undefined
    };

    modelFields = [...modelFields, field];
    newFieldLabel = '';
    newFieldKey = '';
    newFieldType = 'text';
    newFieldRequired = false;
    newFieldPlaceholder = '';
    newFieldOptions = '';
    isAddingField = false;
    modalError = null;
  }

  function removeField(id: string) {
    if (modelFields.length <= 1) {
      modalError = 'A schema must have at least one field.';
      return;
    }
    modelFields = modelFields.filter((f) => f.id !== id);
    modalError = null;
  }

  async function handleSaveModel(e: Event) {
    e.preventDefault();
    if (!modelName.trim() || !modelSlug.trim()) {
      modalError = 'Model name and slug are required';
      return;
    }

    if (modelFields.length === 0) {
      modalError = 'Please define at least one field for this schema';
      return;
    }

    saving = true;
    modalError = null;

    try {
      if (editingSlug) {
        const updated = await updateCollection(editingSlug, {
          name: modelName.trim(),
          slug: modelSlug.trim(),
          description: modelDescription.trim() || undefined,
          icon: modelIcon,
          fields: modelFields
        });
        collections = collections.map((c) => (c.slug === editingSlug ? updated : c));
        collectionsStore.add(updated);
      } else {
        const created = await createCollection({
          name: modelName.trim(),
          slug: modelSlug.trim(),
          description: modelDescription.trim() || undefined,
          icon: modelIcon,
          fields: modelFields
        });
        collections = [...collections, created];
        collectionsStore.add(created);
      }
      modalOpen = false;
    } catch (err: any) {
      modalError = err.message || 'Failed to save content model';
    } finally {
      saving = false;
    }
  }

  async function handleDeleteModel(col: Collection) {
    const ok = await modal.confirm({
      title: `Delete "${col.name}" Content Model?`,
      message: `Are you sure you want to delete this schema and ALL dynamic content items stored inside it? This cannot be undone.`,
      confirmText: 'Delete Model',
      variant: 'danger'
    });
    if (!ok) return;

    try {
      await deleteCollection(col.slug);
      collections = collections.filter((c) => c.slug !== col.slug);
      collectionsStore.remove(col.slug);
    } catch (err: any) {
      await modal.alert({
        title: 'Delete Failed',
        message: err.message || 'Failed to delete schema',
        variant: 'danger'
      });
    }
  }

  onMount(() => {
    loadData();
  });
</script>

<svelte:head>
  <title>Content Modeler (Schemas) - EdgeCMS</title>
</svelte:head>

<!-- Header -->
<div style="margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
  <div>
    <h1 style="font-size: 20px; font-weight: 600; color: #000000; margin: 0 0 2px 0; letter-spacing: -0.01em;">
      Content Modeler
    </h1>
    <p style="font-size: 12.5px; color: #71717a; margin: 0;">
      Define custom schemas and automatically generate edge APIs and management views.
    </p>
  </div>

  <button
    type="button"
    class="btn-primary-pill"
    style="font-size: 12.5px; padding: 6px 16px;"
    onclick={openCreateModal}
  >
    <Icon name="plus" size={13} />
    <span>New Content Model</span>
  </button>
</div>

{#if error}
  <div style="background-color: #fef2f2; border: 1px solid #fee2e2; border-radius: 8px; padding: 12px 16px; color: #b91c1c; margin-bottom: 20px; font-size: 13px;">
    {error}
  </div>
{/if}

{#if loading}
  <div class="shopify-card" style="padding: 48px; text-align: center; color: #71717a; font-size: 13.5px;">
    Loading content schemas from Cloudflare D1...
  </div>
{:else if collections.length === 0}
  <div class="shopify-card" style="padding: 56px 20px; text-align: center;">
    <div style="width: 48px; height: 48px; border-radius: 12px; background: #f4f4f5; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 12px; color: #71717a;">
      <Icon name="schema" size={24} />
    </div>
    <h3 style="font-size: 16px; font-weight: 600; margin: 0 0 6px 0;">No custom schemas yet</h3>
    <p style="color: #71717a; font-size: 13px; max-width: 420px; margin: 0 auto 18px auto;">
      Create your first schema like Products, Authors, FAQs, or Testimonials to unlock dynamic forms and APIs.
    </p>
    <button type="button" class="btn-primary-pill" onclick={openCreateModal}>
      Create First Content Model
    </button>
  </div>
{:else}
  <!-- Collections Grid -->
  <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 16px;">
    {#each collections as col (col.slug)}
      <div class="schema-item-card">
        <div>
          <!-- Header -->
          <div class="schema-card-header">
            <div class="schema-card-identity">
              <div class="schema-card-avatar">
                {col.name.charAt(0).toUpperCase()}
              </div>
              <div style="min-width: 0;">
                <h3 class="schema-card-title">
                  {col.name}
                </h3>
                <div class="schema-card-slug">
                  <span>/content/{col.slug}</span>
                </div>
              </div>
            </div>

            <span class="schema-card-badge">
              {col.fields?.length || 0} fields
            </span>
          </div>

          {#if col.description}
            <p class="schema-card-desc">
              {col.description}
            </p>
          {/if}

          <!-- Fields Chips -->
          <div class="schema-fields-list">
            {#each col.fields || [] as field}
              <span class="schema-field-chip" title="{field.label} ({field.type})">
                <Icon name={field.type} size={11} class="text-muted" />
                <span class="schema-field-chip-key">{field.key}</span>
                <span class="schema-field-chip-type">({field.type})</span>
              </span>
            {/each}
          </div>
        </div>

        <!-- Actions Footer -->
        <div class="schema-card-footer">
          <a
            href="/content/{col.slug}"
            class="btn-primary-pill"
            style="font-size: 12px; padding: 6px 14px;"
          >
            <span>Manage Content</span>
            <span style="font-size: 11px;">&rarr;</span>
          </a>

          <div class="schema-card-actions-group">
            <button
              type="button"
              class="btn-outline-pill"
              style="font-size: 11.5px; padding: 5px 11px;"
              title="Edit Schema Fields"
              onclick={() => openEditModal(col)}
            >
              <Icon name="edit" size={12} />
              <span>Edit</span>
            </button>
            <button
              type="button"
              class="btn-danger-outline-pill"
              style="font-size: 11.5px; padding: 5px 11px;"
              title="Delete Schema"
              onclick={() => handleDeleteModel(col)}
            >
              <Icon name="trash" size={12} />
              <span>Delete</span>
            </button>
          </div>
        </div>
      </div>
    {/each}
  </div>
{/if}

<!-- Schema Builder Modal Dialog -->
{#if modalOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div
    class="modal-backdrop"
    onclick={(e) => { if (e.target === e.currentTarget && !saving) modalOpen = false; }}
    role="presentation"
  >
    <div
      class="modal-dialog schema-modal-dialog"
      role="dialog"
      aria-modal="true"
      tabindex="-1"
    >
      <!-- Header -->
      <div class="modal-header">
        <div style="display: flex; align-items: center; gap: 10px;">
          <div class="modal-icon-badge primary">
            <Icon name="schema" size={16} />
          </div>
          <h3 class="modal-title">
            {editingSlug ? `Edit Schema: ${modelName}` : 'Create New Content Model'}
          </h3>
        </div>

        <button
          type="button"
          class="modal-close-btn"
          onclick={() => { if (!saving) modalOpen = false; }}
          title="Close dialog"
        >
          <Icon name="close" size={14} />
        </button>
      </div>

      <!-- Form Body -->
      <form onsubmit={handleSaveModel} style="display: flex; flex-direction: column; overflow-y: auto; max-height: calc(85vh - 120px);">
        <div class="modal-body" style="display: flex; flex-direction: column; gap: 16px;">
          {#if modalError}
            <div class="error-banner">
              {modalError}
            </div>
          {/if}

          <!-- Name & Slug -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div>
              <label for="model-name" class="form-label">Collection Name *</label>
              <input
                id="model-name"
                type="text"
                class="shopify-input"
                bind:value={modelName}
                oninput={autoSlugModel}
                placeholder="e.g. Products, Testimonials, FAQs"
                required
              />
            </div>
            <div>
              <label for="model-slug" class="form-label">API Identifier (Slug) *</label>
              <input
                id="model-slug"
                type="text"
                class="shopify-input"
                bind:value={modelSlug}
                placeholder="e.g. products"
                required
              />
            </div>
          </div>

          <!-- Description -->
          <div>
            <label for="model-desc" class="form-label">Description (Optional)</label>
            <input
              id="model-desc"
              type="text"
              class="shopify-input"
              bind:value={modelDescription}
              placeholder="e.g. Store catalog with pricing and media"
            />
          </div>

          <!-- Fields Builder -->
          <div style="border-top: 1px solid #f4f4f5; padding-top: 14px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
              <div>
                <span style="font-size: 13px; font-weight: 600; color: #000000;">Fields Schema</span>
                <span style="font-size: 11.5px; color: #71717a; margin-left: 6px;">({modelFields.length} defined)</span>
              </div>

              {#if !isAddingField}
                <button
                  type="button"
                  class="btn-sm-pill btn-gray-sm"
                  style="font-size: 11.5px; padding: 3px 10px;"
                  onclick={() => { isAddingField = true; modalError = null; }}
                >
                  + Add Field
                </button>
              {/if}
            </div>

            <!-- Existing Fields List -->
            <div style="display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px;">
              {#each modelFields as field (field.id)}
                <div class="field-row">
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="display: inline-flex; align-items: center; color: #52525b;">
                      <Icon name={field.type} size={15} />
                    </span>
                    <div>
                      <div style="font-size: 12.5px; font-weight: 600; color: #000000; line-height: 1.2;">
                        {field.label}
                      </div>
                      <div style="font-size: 11px; color: #71717a;">
                        <code>{field.key}</code> • <span style="text-transform: capitalize;">{field.type}</span>
                        {#if field.required}
                          <span style="color: #dc2626; font-weight: 600;">• Required</span>
                        {/if}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    class="btn-sm-pill btn-danger-sm"
                    style="font-size: 11px; padding: 2px 7px;"
                    title="Delete Field"
                    onclick={() => removeField(field.id)}
                  >
                    &times;
                  </button>
                </div>
              {/each}
            </div>

            <!-- Add New Field Sub-Card -->
            {#if isAddingField}
              <div class="add-field-card">
                <div style="font-size: 12.5px; font-weight: 600; margin-bottom: 10px; color: #000000;">
                  Add New Field
                </div>

                <!-- Field Type Selector -->
                <div style="margin-bottom: 10px;">
                  <span style="font-size: 11.5px; font-weight: 600; color: #52525b; display: block; margin-bottom: 6px;">Select Type:</span>
                  <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 6px;">
                    {#each FIELD_TYPES as ft}
                      <button
                        type="button"
                        class="field-type-btn {newFieldType === ft.type ? 'active' : ''}"
                        onclick={() => (newFieldType = ft.type)}
                      >
                        <Icon name={ft.icon} size={14} />
                        <span style="font-size: 11.5px; font-weight: 500;">{ft.label}</span>
                      </button>
                    {/each}
                  </div>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px;">
                  <div>
                    <label for="nf-label" class="form-label">Field Label *</label>
                    <input
                      id="nf-label"
                      type="text"
                      class="shopify-input"
                      bind:value={newFieldLabel}
                      oninput={autoSlugField}
                      placeholder="e.g. Price, Rating, Bio"
                    />
                  </div>
                  <div>
                    <label for="nf-key" class="form-label">Field Key (API JSON Property) *</label>
                    <input
                      id="nf-key"
                      type="text"
                      class="shopify-input"
                      bind:value={newFieldKey}
                      placeholder="e.g. price, rating"
                    />
                  </div>
                </div>

                {#if newFieldType === 'select'}
                  <div style="margin-bottom: 10px;">
                    <label for="nf-options" class="form-label">Dropdown Options (Comma-separated)</label>
                    <input
                      id="nf-options"
                      type="text"
                      class="shopify-input"
                      bind:value={newFieldOptions}
                      placeholder="e.g. Small, Medium, Large, Extra Large"
                    />
                  </div>
                {/if}

                <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 10px;">
                  <label style="display: flex; align-items: center; gap: 6px; font-size: 12px; cursor: pointer;">
                    <input type="checkbox" bind:checked={newFieldRequired} />
                    <span>Mark as required field</span>
                  </label>

                  <div style="display: flex; gap: 6px;">
                    <button
                      type="button"
                      class="btn-outline-pill"
                      style="font-size: 11.5px; padding: 4px 10px;"
                      onclick={() => (isAddingField = false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      class="btn-primary-pill"
                      style="font-size: 11.5px; padding: 4px 12px;"
                      disabled={!newFieldLabel.trim() || !newFieldKey.trim()}
                      onclick={addFieldToModel}
                    >
                      Save Field
                    </button>
                  </div>
                </div>
              </div>
            {/if}
          </div>
        </div>

        <!-- Footer -->
        <div class="modal-footer">
          <button
            type="button"
            class="btn-outline-pill"
            style="font-size: 12px; padding: 6px 14px;"
            disabled={saving}
            onclick={() => (modalOpen = false)}
          >
            Cancel
          </button>
          <button
            type="submit"
            class="btn-primary-pill"
            style="font-size: 12px; padding: 6px 18px;"
            disabled={saving || !modelName.trim() || !modelSlug.trim()}
          >
            {saving ? 'Saving...' : editingSlug ? 'Update Schema' : 'Create Content Model'}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}



