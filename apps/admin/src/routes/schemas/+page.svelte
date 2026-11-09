<script lang="ts">
  import { onMount } from 'svelte';
  import {
    fetchCollections,
    createCollection,
    updateCollection,
    deleteCollection,
    syncCollections
  } from '$lib/api';
  import { collectionsStore } from '$lib/collections.svelte';
  import { modal } from '$lib/modal.svelte';
  import { Icon } from '$lib/components';
  import type { Collection, FieldDefinition, FieldType } from '@cms/shared';

  let collections = $state<Collection[]>([]);
  let loading = $state(true);
  let syncing = $state(false);
  let error = $state<string | null>(null);

  // Visual Editor Studio Modal State
  let modalOpen = $state(false);
  let editingSlug = $state<string | null>(null); // null if new
  let modelName = $state('');
  let modelSlug = $state('');
  let modelDescription = $state('');
  let modelIcon = $state('schema');
  let modelFields = $state<FieldDefinition[]>([]);
  let saving = $state(false);
  let modalError = $state<string | null>(null);

  // New Field Sub-Form State
  let editingFieldId = $state<string | null>(null);
  let newFieldLabel = $state('');
  let newFieldKey = $state('');
  let newFieldType = $state<FieldType>('text');
  let newFieldRequired = $state(false);
  let newFieldPlaceholder = $state('');
  let newFieldOptions = $state('');
  let newFieldRelationCollectionSlug = $state('');

  // TypeScript Code Modal State
  let codeModalOpen = $state(false);
  let codeModalTitle = $state('');
  let codeModalSnippet = $state('');
  let copied = $state(false);

  const FIELD_TYPES: { type: FieldType; label: string; icon: string; desc: string }[] = [
    { type: 'text', label: 'Short Text', icon: 'text', desc: 'Title, name, single-line' },
    { type: 'longtext', label: 'Long Text', icon: 'longtext', desc: 'Description, bio, multi-line' },
    { type: 'richtext', label: 'Rich Text', icon: 'richtext', desc: 'WYSIWYG formatted HTML' },
    { type: 'number', label: 'Number', icon: 'number', desc: 'Price, quantity, rating' },
    { type: 'media', label: 'Media Asset', icon: 'media', desc: 'Images & files on Cloudflare R2' },
    { type: 'boolean', label: 'Boolean', icon: 'boolean', desc: 'Yes/No switch, active status' },
    { type: 'date', label: 'Date', icon: 'date', desc: 'Calendar date, milestone' },
    { type: 'select', label: 'Dropdown', icon: 'select', desc: 'Selection from choices' },
    { type: 'relation', label: 'Relationship', icon: 'link', desc: 'Reference another collection (Author, Category)' }
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

  onMount(() => {
    loadData();
  });

  async function handleSync() {
    syncing = true;
    try {
      const res = await syncCollections();
      await loadData();
      await modal.alert({
        title: 'Sync Successful',
        message: `Successfully synced ${res.count} collection(s) from cms.config.ts to Cloudflare D1.`,
        variant: 'default'
      });
    } catch (e: any) {
      await modal.alert({
        title: 'Sync Failed',
        message: e.message || 'Failed to sync schemas from cms.config.ts',
        variant: 'danger'
      });
    } finally {
      syncing = false;
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
    if (editingFieldId) return;
    newFieldKey = newFieldLabel
      .toLowerCase()
      .trim()
      .replace(/[^\w\s]/g, '')
      .replace(/[\s_-]+/g, '_');
  }

  function openCreateModal() {
    editingSlug = null;
    modelName = '';
    modelSlug = '';
    modelDescription = '';
    modelIcon = 'schema';
    modelFields = [
      { id: crypto.randomUUID(), key: 'title', label: 'Title', type: 'text', required: true }
    ];
    modalError = null;
    resetFieldInputs();
    modalOpen = true;
  }

  function openEditModal(col: Collection) {
    editingSlug = col.slug;
    modelName = col.name;
    modelSlug = col.slug;
    modelDescription = col.description || '';
    modelIcon = col.icon || 'schema';
    modelFields = (col.fields || []).map((f) => ({
      ...f,
      id: f.id || crypto.randomUUID()
    }));
    modalError = null;
    resetFieldInputs();
    modalOpen = true;
  }

  function resetFieldInputs() {
    editingFieldId = null;
    newFieldLabel = '';
    newFieldKey = '';
    newFieldType = 'text';
    newFieldRequired = false;
    newFieldPlaceholder = '';
    newFieldOptions = '';
    newFieldRelationCollectionSlug = '';
  }

  function startEditField(field: FieldDefinition) {
    editingFieldId = field.id;
    newFieldLabel = field.label;
    newFieldKey = field.key;
    newFieldType = field.type;
    newFieldRequired = !!field.required;
    newFieldPlaceholder = field.placeholder || '';
    newFieldOptions = (field.options || []).join(', ');
    newFieldRelationCollectionSlug = field.relationCollectionSlug || '';
    modalError = null;
  }

  function cancelFieldEdit() {
    resetFieldInputs();
    modalError = null;
  }

  function updateFieldInModel() {
    if (!editingFieldId) return;
    if (!newFieldLabel.trim()) {
      modalError = 'Field label is required';
      return;
    }
    if (!newFieldKey.trim()) {
      modalError = 'Field key (API property name) is required';
      return;
    }
    if (newFieldType === 'relation' && !newFieldRelationCollectionSlug) {
      modalError = 'Please select a target collection to reference';
      return;
    }

    const key = newFieldKey.trim().toLowerCase();
    if (modelFields.some((f) => f.id !== editingFieldId && f.key === key)) {
      modalError = `Field with key "${key}" already exists in this schema`;
      return;
    }

    modelFields = modelFields.map((f) => {
      if (f.id !== editingFieldId) return f;
      const updated: FieldDefinition = {
        ...f,
        key,
        label: newFieldLabel.trim(),
        type: newFieldType,
        required: newFieldRequired,
        placeholder: newFieldPlaceholder.trim() || undefined
      };

      if (newFieldType === 'select' && newFieldOptions.trim()) {
        updated.options = newFieldOptions
          .split(',')
          .map((o) => o.trim())
          .filter(Boolean);
      } else {
        delete (updated as any).options;
      }

      if (newFieldType === 'relation' && newFieldRelationCollectionSlug) {
        updated.relationCollectionSlug = newFieldRelationCollectionSlug;
      } else {
        delete (updated as any).relationCollectionSlug;
      }

      return updated;
    });

    resetFieldInputs();
    modalError = null;
  }

  function addFieldToModel() {
    if (!newFieldLabel.trim()) {
      modalError = 'Field label is required';
      return;
    }
    if (!newFieldKey.trim()) {
      modalError = 'Field key (API property name) is required';
      return;
    }
    if (newFieldType === 'relation' && !newFieldRelationCollectionSlug) {
      modalError = 'Please select a target collection to reference';
      return;
    }

    const key = newFieldKey.trim().toLowerCase();
    if (modelFields.some((f) => f.key === key)) {
      modalError = `Field with key "${key}" already exists in this schema`;
      return;
    }

    const newField: FieldDefinition = {
      id: crypto.randomUUID(),
      key,
      label: newFieldLabel.trim(),
      type: newFieldType,
      required: newFieldRequired,
      placeholder: newFieldPlaceholder.trim() || undefined
    };

    if (newFieldType === 'select' && newFieldOptions.trim()) {
      newField.options = newFieldOptions
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean);
    }

    if (newFieldType === 'relation' && newFieldRelationCollectionSlug) {
      newField.relationCollectionSlug = newFieldRelationCollectionSlug;
    }

    modelFields = [...modelFields, newField];
    resetFieldInputs();
    modalError = null;
  }

  function removeField(fieldId: string) {
    if (editingFieldId === fieldId) {
      cancelFieldEdit();
    }
    modelFields = modelFields.filter((f) => f.id !== fieldId);
  }

  async function handleSaveModel(e: Event) {
    e.preventDefault();
    if (!modelName.trim() || !modelSlug.trim()) {
      modalError = 'Name and API Slug are required';
      return;
    }
    if (modelFields.length === 0) {
      modalError = 'Please add at least one field to this schema';
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
      } else {
        const created = await createCollection({
          name: modelName.trim(),
          slug: modelSlug.trim(),
          description: modelDescription.trim() || undefined,
          icon: modelIcon,
          fields: modelFields
        });
        collections = [...collections, created];
      }

      collectionsStore.list = collections;
      modalOpen = false;
    } catch (err: any) {
      modalError = err.message || 'Failed to save schema';
    } finally {
      saving = false;
    }
  }

  async function handleDelete(col: Collection) {
    const confirmed = await modal.confirm({
      title: `Delete ${col.name}?`,
      message: `Are you sure you want to delete "${col.name}"? All content records stored inside this collection will be permanently deleted. This action cannot be undone.`,
      confirmText: 'Delete Schema',
      variant: 'danger'
    });
    if (!confirmed) return;

    try {
      await deleteCollection(col.slug);
      collections = collections.filter((c) => c.slug !== col.slug);
      collectionsStore.list = collections;
    } catch (e: any) {
      await modal.alert({
        title: 'Delete Failed',
        message: e.message || 'Failed to delete collection',
        variant: 'danger'
      });
    }
  }

  function openCodeModal(col: Collection) {
    codeModalTitle = `${col.name} (${col.slug})`;
    codeModalSnippet = generateSnippet(col);
    copied = false;
    codeModalOpen = true;
  }

  function generateSnippet(col: Collection): string {
    const fieldLines = (col.fields || [])
      .map((f) => {
        const opts: string[] = [];
        if (f.label && f.label !== f.key) opts.push(`label: '${f.label}'`);
        if (f.required) opts.push(`required: true`);
        if (f.placeholder) opts.push(`placeholder: '${f.placeholder}'`);
        if (f.options && f.options.length > 0) opts.push(`options: ${JSON.stringify(f.options)}`);

        const optsStr = opts.length > 0 ? `, { ${opts.join(', ')} }` : '';
        if (f.type === 'relation') {
          return `    relation('${f.key}', '${f.relationCollectionSlug || ''}'${optsStr})`;
        }
        return `    ${f.type}('${f.key}'${optsStr})`;
      })
      .join(',\n');

    return `import { defineCollection, text, number, boolean, date, richtext, media, select, relation } from '@cms/shared';

export const ${col.name.replace(/[^a-zA-Z0-9]/g, '')} = defineCollection({
  name: '${col.name}',
  slug: '${col.slug}',
  description: '${col.description || ''}',
  icon: '${col.icon || 'schema'}',
  fields: [
${fieldLines}
  ]
});`;
  }

  function copyCode() {
    navigator.clipboard.writeText(codeModalSnippet);
    copied = true;
    setTimeout(() => {
      copied = false;
    }, 2000);
  }
</script>

<svelte:head>
  <title>Schema Builder — EdgeCMS</title>
</svelte:head>

<!-- Header & Controls -->
<div class="shopify-page-header">
  <div>
    <h1 class="shopify-page-title">
      Schemas
    </h1>
    <p class="shopify-page-subtitle">
      Define and manage content models and database schemas.
    </p>
  </div>

  <div class="flex items-center gap-2">
    <button
      type="button"
      class="btn btn-secondary btn-sm"
      onclick={handleSync}
      disabled={syncing}
      title="Re-read cms.config.ts and sync collections to database"
    >
      <Icon name="check" size={12} />
      <span>{syncing ? 'Syncing...' : 'Sync Config'}</span>
    </button>

    <button
      type="button"
      class="btn btn-primary btn-sm"
      onclick={openCreateModal}
    >
      <Icon name="plus" size={12} />
      <span>New Schema</span>
    </button>
  </div>
</div>

{#if error}
  <div class="error-banner mb-4">
    {error}
  </div>
{/if}

<!-- Collection Cards Grid -->
{#if loading}
  <div class="shopify-card p-12 text-center text-muted text-sm">
    Loading schemas...
  </div>
{:else if collections.length === 0}
  <div class="shopify-card p-12 text-center">
    <div class="media-empty-icon">
      <Icon name="schema" size={24} />
    </div>
    <h3 class="text-base font-semibold mb-2">No schemas created yet</h3>
    <p class="text-muted text-sm max-w-md mx-auto mb-4">
      Create your first collection schema visually using the studio builder or sync from <code>cms.config.ts</code>.
    </p>
    <div class="flex justify-center gap-2">
      <button type="button" class="btn btn-primary" onclick={openCreateModal}>
        Create New Schema
      </button>
      <button type="button" class="btn btn-secondary" onclick={handleSync}>
        Sync cms.config.ts
      </button>
    </div>
  </div>
{:else}
  <div class="schema-cards-grid">
    {#each collections as col (col.id)}
      <div class="schema-item-card">
        <div>
          <!-- Card Header -->
          <div class="schema-card-header">
            <div class="schema-card-identity">
              <div class="schema-card-avatar">
                <Icon name={col.icon || 'schema'} size={15} />
              </div>
              <h3 class="schema-card-title">
                {col.name}
              </h3>
            </div>

            <span class="schema-card-badge">
              {col.fields?.length || 0} fields
            </span>
          </div>

          <!-- Description -->
          {#if col.description}
            <p class="schema-card-desc">
              {col.description}
            </p>
          {/if}

          <!-- Fields Badges -->
          <div class="schema-fields-list">
            {#each (col.fields || []) as field}
              <span class="schema-field-chip" title="{field.label} ({field.type})">
                <span class="schema-field-chip-key">{field.key}</span>
                <span class="schema-field-chip-type">({field.type}{field.relationCollectionSlug ? ` → ${field.relationCollectionSlug}` : ''})</span>
              </span>
            {/each}
          </div>
        </div>

        <!-- Card Footer Actions -->
        <div class="schema-card-footer">
          <a
            href="/content/{col.slug}"
            class="btn btn-primary btn-sm"
          >
            <span>Manage Content</span>
            <span>&rarr;</span>
          </a>

          <div class="schema-card-actions-group">
            <button
              type="button"
              class="btn btn-secondary btn-sm"
              onclick={() => openEditModal(col)}
              title="Edit schema visually"
            >
              <Icon name="edit" size={12} />
              <span>Edit</span>
            </button>

            <button
              type="button"
              class="btn btn-secondary btn-sm"
              onclick={() => openCodeModal(col)}
              title="View TypeScript definition"
            >
              <Icon name="code" size={12} />
              <span>TS</span>
            </button>

            <button
              type="button"
              class="btn btn-danger btn-sm"
              onclick={() => handleDelete(col)}
              title="Delete collection"
            >
              <Icon name="trash" size={12} />
            </button>
          </div>
        </div>
      </div>
    {/each}
  </div>
{/if}

<!-- VISUAL SCHEMA BUILDER STUDIO MODAL -->
{#if modalOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div
    class="modal-backdrop"
    role="presentation"
  >
    <div
      class="schema-modal-dialog"
      role="dialog"
      aria-modal="true"
      tabindex="-1"
    >
      <!-- Modal Header -->
      <div class="modal-header">
        <div class="flex items-center gap-2">
          <div class="modal-icon-badge info">
            <Icon name="schema" size={14} />
          </div>
          <div>
            <h3 class="modal-title">
              {editingSlug ? `Edit Schema: ${modelName}` : 'New Schema'}
            </h3>
            <p class="modal-subtitle">
              Configure collection schema and field definitions
            </p>
          </div>
        </div>

        <button
          type="button"
          class="modal-close-btn"
          onclick={() => (modalOpen = false)}
          aria-label="Close"
        >
          <Icon name="close" size={14} />
        </button>
      </div>

      <!-- Studio Form -->
      <form onsubmit={handleSaveModel} class="schema-studio-form">
        <div class="schema-studio-scrollable">
          {#if modalError}
            <div class="error-banner mb-4">
              {modalError}
            </div>
          {/if}

          <!-- Two-Column Studio Layout -->
          <div class="schema-studio-grid">
            <!-- Left Column: Schema Details & Active Fields -->
            <div class="schema-panel-card">
              <h4 class="schema-panel-heading">Collection Details</h4>

              <div class="form-row-2col">
                <div>
                  <label for="sm-name" class="form-label">Collection Name *</label>
                  <input
                    id="sm-name"
                    type="text"
                    class="shopify-input"
                    bind:value={modelName}
                    oninput={autoSlugModel}
                    placeholder="e.g. Products, Articles"
                    required
                  />
                </div>
                <div>
                  <label for="sm-slug" class="form-label">API Identifier (Slug) *</label>
                  <input
                    id="sm-slug"
                    type="text"
                    class="shopify-input"
                    bind:value={modelSlug}
                    placeholder="e.g. products, articles"
                    disabled={!!editingSlug}
                    required
                  />
                </div>
              </div>

              <div class="mb-4">
                <label for="sm-desc" class="form-label">Description (Optional)</label>
                <input
                  id="sm-desc"
                  type="text"
                  class="shopify-input"
                  bind:value={modelDescription}
                  placeholder="e.g. Store catalog with pricing and media"
                />
              </div>

              <div class="form-sub-header">
                <div class="form-sub-header-row">
                  <h4 class="schema-panel-heading m-0">
                    Defined Fields ({modelFields.length})
                  </h4>
                  <span class="text-xs text-muted">Minimum 1 field required</span>
                </div>

                {#if modelFields.length === 0}
                  <div class="empty-fields-state">
                    <p class="text-xs text-muted m-0">
                      No fields added yet. Configure a field on the right and click "Add Field".
                    </p>
                  </div>
                {:else}
                  <div class="schema-fields-scroll-list">
                    {#each modelFields as f (f.id)}
                      <!-- svelte-ignore a11y_click_events_have_key_events -->
                      <div
                        class="field-item-row {editingFieldId === f.id ? 'is-editing' : ''}"
                        onclick={() => startEditField(f)}
                        role="button"
                        tabindex="0"
                        title="Click to edit field settings"
                      >
                        <div class="field-item-left">
                          <div class="field-type-icon-box">
                            <Icon name={f.type} size={13} />
                          </div>
                          <div class="field-item-details">
                            <div class="field-item-title-row">
                              <span class="field-item-label">{f.label}</span>
                              {#if f.required}
                                <span class="badge-required">Required</span>
                              {/if}
                              {#if editingFieldId === f.id}
                                <span class="builder-badge-editing">Editing</span>
                              {/if}
                            </div>
                            <div class="field-item-meta">
                              <span class="field-item-key">{f.key}</span>
                              <span class="meta-dot">&bull;</span>
                              <span class="field-item-type">{f.type}</span>
                              {#if f.type === 'relation' && f.relationCollectionSlug}
                                <span class="meta-dot">&bull;</span>
                                <span class="field-item-relation">→ {f.relationCollectionSlug}</span>
                              {/if}
                            </div>
                          </div>
                        </div>

                        <div class="field-item-actions">
                          <button
                            type="button"
                            class="field-action-btn {editingFieldId === f.id ? 'active' : ''}"
                            onclick={(e) => {
                              e.stopPropagation();
                              if (editingFieldId === f.id) {
                                cancelFieldEdit();
                              } else {
                                startEditField(f);
                              }
                            }}
                            title={editingFieldId === f.id ? 'Cancel editing' : 'Edit field'}
                            aria-label="Edit field"
                          >
                            <Icon name="edit" size={12} />
                          </button>

                          <button
                            type="button"
                            class="field-action-btn delete"
                            onclick={(e) => {
                              e.stopPropagation();
                              removeField(f.id);
                            }}
                            title="Remove field"
                            aria-label="Remove field"
                          >
                            <Icon name="close" size={12} />
                          </button>
                        </div>
                      </div>
                    {/each}
                  </div>
                {/if}
              </div>
            </div>

            <!-- Right Column: Field Configurator / Builder -->
            <div class="schema-panel-card builder-card">
              <div class="builder-header-row">
                <h4 class="schema-panel-heading m-0">
                  {editingFieldId ? `Edit Field: ${newFieldLabel || 'Field'}` : 'Add New Field'}
                </h4>
                {#if editingFieldId}
                  <button
                    type="button"
                    class="btn btn-secondary btn-sm"
                    onclick={cancelFieldEdit}
                    title="Switch back to Add New Field"
                  >
                    <Icon name="plus" size={11} />
                    <span>New Field</span>
                  </button>
                {/if}
              </div>

              <p class="text-xs text-muted mb-3">
                {editingFieldId
                  ? 'Modify data type, label, API key, and validation settings'
                  : 'Pick a data type and configure its API property settings'}
              </p>

              <!-- Field Types Grid (8 types, clean Vercel cards) -->
              <div class="mb-3">
                <div class="field-types-catalog">
                  {#each FIELD_TYPES as ft}
                    <button
                      type="button"
                      class="field-catalog-card {newFieldType === ft.type ? 'active' : ''}"
                      onclick={() => (newFieldType = ft.type)}
                    >
                      <div class="field-catalog-icon">
                        <Icon name={ft.icon} size={13} />
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
              <div class="form-row-2col">
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
                <div class="mb-3">
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

              {#if newFieldType === 'relation'}
                <div class="mb-3">
                  <label for="nf-relation" class="form-label">Target Collection to Reference *</label>
                  <select
                    id="nf-relation"
                    class="shopify-input"
                    bind:value={newFieldRelationCollectionSlug}
                  >
                    <option value="">-- Choose collection to reference --</option>
                    {#each collections as col}
                      <option value={col.slug}>{col.name} (/{col.slug})</option>
                    {/each}
                  </select>
                  <p class="field-hint">
                    Editors will select a record from the <strong>{newFieldRelationCollectionSlug || 'chosen'}</strong> collection.
                  </p>
                </div>
              {/if}

              <!-- Options & Actions -->
              <div class="form-add-footer-row">
                <label class="form-checkbox-label">
                  <input type="checkbox" bind:checked={newFieldRequired} />
                  <span>Mark as required field</span>
                </label>

                <div class="builder-actions-group">
                  {#if editingFieldId}
                    <button
                      type="button"
                      class="btn btn-secondary btn-sm"
                      onclick={cancelFieldEdit}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      class="btn btn-primary btn-sm"
                      disabled={!newFieldLabel.trim() || !newFieldKey.trim()}
                      onclick={updateFieldInModel}
                    >
                      <Icon name="check" size={12} />
                      <span>Update Field</span>
                    </button>
                  {:else}
                    <button
                      type="button"
                      class="btn btn-secondary btn-sm"
                      disabled={!newFieldLabel.trim() || !newFieldKey.trim()}
                      onclick={addFieldToModel}
                    >
                      <Icon name="plus" size={12} />
                      <span>Add Field</span>
                    </button>
                  {/if}
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Sticky Modal Footer -->
        <div class="modal-footer">
          <button
            type="button"
            class="btn btn-secondary"
            disabled={saving}
            onclick={() => (modalOpen = false)}
          >
            Cancel
          </button>
          <button
            type="submit"
            class="btn btn-primary"
            disabled={saving || !modelName.trim() || !modelSlug.trim()}
          >
            {saving ? 'Saving...' : editingSlug ? 'Update Schema' : 'Create Content Model'}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}

<!-- TYPESCRIPT DEFINITION MODAL -->
{#if codeModalOpen}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div
    class="modal-backdrop"
    role="presentation"
  >
    <div
      class="modal-dialog"
      role="dialog"
      aria-modal="true"
      tabindex="-1"
    >
      <div class="modal-header">
        <div>
          <h3 class="modal-title">TypeScript Definition</h3>
          <p class="modal-subtitle">Generated schema for {codeModalTitle}</p>
        </div>
        <button
          type="button"
          class="modal-close-btn"
          onclick={() => (codeModalOpen = false)}
          aria-label="Close"
        >
          <Icon name="close" size={14} />
        </button>
      </div>

      <div class="modal-body">
        <pre class="bg-shade p-3 rounded text-xs overflow-x-auto mb-3"><code>{codeModalSnippet}</code></pre>
        <p class="text-xs text-muted m-0">
          Place this inside <code>cms.config.ts</code> to version control your schema in Git.
        </p>
      </div>

      <div class="modal-footer">
        <button
          type="button"
          class="btn btn-secondary"
          onclick={() => (codeModalOpen = false)}
        >
          Close
        </button>
        <button
          type="button"
          class="btn btn-primary"
          onclick={copyCode}
        >
          <Icon name="check" size={12} />
          <span>{copied ? 'Copied to Clipboard!' : 'Copy TypeScript Code'}</span>
        </button>
      </div>
    </div>
  </div>
{/if}
