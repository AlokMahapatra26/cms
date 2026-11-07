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
  let newFieldLabel = $state('');
  let newFieldKey = $state('');
  let newFieldType = $state<FieldType>('text');
  let newFieldRequired = $state(false);
  let newFieldPlaceholder = $state('');
  let newFieldOptions = $state('');

  const FIELD_TYPES: { type: FieldType; label: string; icon: string; desc: string }[] = [
    { type: 'text', label: 'Short Text', icon: 'text', desc: 'Title, name, single-line' },
    { type: 'longtext', label: 'Long Text', icon: 'longtext', desc: 'Description, bio, multi-line' },
    { type: 'richtext', label: 'Rich Text', icon: 'richtext', desc: 'WYSIWYG formatted HTML' },
    { type: 'number', label: 'Number', icon: 'number', desc: 'Price, quantity, rating' },
    { type: 'media', label: 'Media Asset', icon: 'media', desc: 'Images & files on R2' },
    { type: 'boolean', label: 'Boolean', icon: 'boolean', desc: 'Yes/No switch, active status' },
    { type: 'date', label: 'Date', icon: 'date', desc: 'Calendar date, milestone' },
    { type: 'select', label: 'Dropdown', icon: 'select', desc: 'Selection from choices' }
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
          <div>
            <h3 class="modal-title">
              {editingSlug ? `Edit Schema: ${modelName}` : 'Create Content Model'}
            </h3>
            <p class="modal-subtitle">
              Configure collection attributes, API identifier, and dynamic fields
            </p>
          </div>
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

      <!-- Form Body (Two-Column Scalable Studio) -->
      <form onsubmit={handleSaveModel} class="schema-studio-form">
        <div class="schema-studio-scrollable">
          {#if modalError}
            <div class="error-banner" style="margin-bottom: 14px; display: flex; align-items: center; gap: 8px;">
              <Icon name="warning" size={15} />
              <span>{modalError}</span>
            </div>
          {/if}

          <div class="schema-studio-grid">
            <!-- Left Column: Collection Settings & Defined Fields -->
            <div style="display: flex; flex-direction: column; gap: 14px;">
              <!-- Panel 1: Collection Attributes -->
              <div class="schema-panel-card">
                <h4 class="schema-panel-heading">Collection Details</h4>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px;">
                  <div>
                    <label for="model-name" class="form-label">Name *</label>
                    <input
                      id="model-name"
                      type="text"
                      class="shopify-input"
                      bind:value={modelName}
                      oninput={autoSlugModel}
                      placeholder="e.g. Products, FAQs"
                      required
                    />
                  </div>
                  <div>
                    <label for="model-slug" class="form-label">API Identifier (Slug) *</label>
                    <div class="input-slug-prefix">
                      <span class="slug-prefix">/</span>
                      <input
                        id="model-slug"
                        type="text"
                        class="shopify-input input-with-prefix"
                        bind:value={modelSlug}
                        placeholder="products"
                        required
                      />
                    </div>
                  </div>
                </div>

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
              </div>

              <!-- Panel 2: Defined Fields List -->
              <div class="schema-panel-card">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                  <div>
                    <h4 class="schema-panel-heading" style="margin: 0;">Fields Schema</h4>
                    <span style="font-size: 11.5px; color: #71717a;">{modelFields.length} field{modelFields.length === 1 ? '' : 's'} defined</span>
                  </div>

                  <span class="pill-tag-mint">
                    {modelFields.length} active
                  </span>
                </div>

                {#if modelFields.length === 0}
                  <div class="empty-fields-state">
                    <div style="color: #71717a; margin-bottom: 6px;">
                      <Icon name="schema" size={24} />
                    </div>
                    <div style="font-size: 13px; font-weight: 600; color: #000000; margin-bottom: 2px;">
                      No fields added yet
                    </div>
                    <p style="font-size: 12px; color: #71717a; margin: 0;">
                      Select a field type on the right to configure and add properties to this model.
                    </p>
                  </div>
                {:else}
                  <div class="schema-fields-scroll-list">
                    {#each modelFields as field (field.id)}
                      <div class="field-item-row">
                        <div class="field-item-left">
                          <div class="field-type-icon-box">
                            <Icon name={field.type} size={15} />
                          </div>
                          <div class="field-item-details">
                            <div class="field-item-title-row">
                              <span class="field-item-label">{field.label}</span>
                              {#if field.required}
                                <span class="badge-required">Required</span>
                              {/if}
                            </div>
                            <div class="field-item-meta">
                              <code class="field-item-key">{field.key}</code>
                              <span class="meta-dot">&bull;</span>
                              <span class="field-item-type">{field.type}</span>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          class="field-delete-btn"
                          title="Delete {field.label} field"
                          onclick={() => removeField(field.id)}
                        >
                          <Icon name="trash" size={13} />
                        </button>
                      </div>
                    {/each}
                  </div>
                {/if}
              </div>
            </div>

            <!-- Right Column: Field Configurator / Builder -->
            <div class="schema-panel-card builder-card">
              <div style="margin-bottom: 12px;">
                <h4 class="schema-panel-heading" style="margin: 0 0 2px 0;">Add New Field</h4>
                <p style="font-size: 11.5px; color: #71717a; margin: 0;">
                  Pick a data type and configure its API property settings
                </p>
              </div>

              <!-- Field Types Grid (8 types, single-line, clean cards) -->
              <div style="margin-bottom: 12px;">
                <div class="form-label" style="display: block; margin-bottom: 6px;">Data Type:</div>
                <div class="field-types-catalog">
                  {#each FIELD_TYPES as ft}
                    <button
                      type="button"
                      class="field-catalog-card {newFieldType === ft.type ? 'active' : ''}"
                      onclick={() => (newFieldType = ft.type)}
                    >
                      <div class="field-catalog-icon">
                        <Icon name={ft.icon} size={14} />
                      </div>
                      <div class="field-catalog-info">
                        <span class="field-catalog-name">{ft.label}</span>
                        <span class="field-catalog-desc">{ft.desc}</span>
                      </div>
                    </button>
                  {/each}
                </div>
              </div>

              <!-- Field Inputs -->
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
                  <label for="nf-key" class="form-label">Field Key (API Property) *</label>
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
                  <label for="nf-options" class="form-label">Dropdown Options (Comma separated)</label>
                  <input
                    id="nf-options"
                    type="text"
                    class="shopify-input"
                    bind:value={newFieldOptions}
                    placeholder="e.g. In Stock, Pre-order, Sold Out"
                  />
                </div>
              {/if}

              <!-- Options & Add Action -->
              <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 14px; padding-top: 12px; border-top: 1px solid #e4e4e7;">
                <label style="display: flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 500; cursor: pointer; color: #18181b;">
                  <input type="checkbox" bind:checked={newFieldRequired} />
                  <span>Mark as required field</span>
                </label>

                <button
                  type="button"
                  class="btn-primary-pill"
                  style="font-size: 12px; padding: 6px 15px;"
                  disabled={!newFieldLabel.trim() || !newFieldKey.trim()}
                  onclick={addFieldToModel}
                >
                  <Icon name="plus" size={12} />
                  <span>Add Field</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Sticky Modal Footer -->
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
            style="font-size: 12px; padding: 6px 20px;"
            disabled={saving || !modelName.trim() || !modelSlug.trim()}
          >
            {saving ? 'Saving...' : editingSlug ? 'Update Schema' : 'Create Content Model'}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}



