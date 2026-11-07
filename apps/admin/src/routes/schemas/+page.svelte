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
  let newFieldLabel = $state('');
  let newFieldKey = $state('');
  let newFieldType = $state<FieldType>('text');
  let newFieldRequired = $state(false);
  let newFieldPlaceholder = $state('');
  let newFieldOptions = $state('');

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
    modelIcon = 'schema';
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
    newFieldLabel = '';
    newFieldKey = '';
    newFieldType = 'text';
    newFieldRequired = false;
    newFieldPlaceholder = '';
    newFieldOptions = '';
    modalError = null;
    modalOpen = true;
  }

  function openEditModal(col: Collection) {
    editingSlug = col.slug;
    modelName = col.name;
    modelSlug = col.slug;
    modelDescription = col.description || '';
    modelIcon = col.icon || 'schema';
    modelFields = JSON.parse(JSON.stringify(col.fields || []));
    newFieldLabel = '';
    newFieldKey = '';
    newFieldType = 'text';
    newFieldRequired = false;
    newFieldPlaceholder = '';
    newFieldOptions = '';
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
        return `    ${f.type}('${f.key}'${optsStr})`;
      })
      .join(',\n');

    return `import { defineCollection, text, number, boolean, date, richtext, media, select } from '@cms/shared';

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
  <title>Schema Builder - EdgeCMS</title>
</svelte:head>

<!-- Header & Controls -->
<div style="margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
  <div>
    <h1 style="font-size: 20px; font-weight: 600; color: #000000; margin: 0 0 3px 0; letter-spacing: -0.01em;">
      Schema Builder
    </h1>
    <p style="font-size: 13px; color: #71717a; margin: 0;">
      Create schemas visually or sync code-first definitions from <code>cms.config.ts</code>.
    </p>
  </div>

  <div style="display: flex; align-items: center; gap: 8px;">
    <button
      type="button"
      class="btn-outline-pill"
      style="font-size: 12px; padding: 6px 14px;"
      onclick={handleSync}
      disabled={syncing}
      title="Re-read cms.config.ts and sync collections to database"
    >
      <Icon name="check" size={12} />
      <span>{syncing ? 'Syncing...' : 'Sync cms.config.ts'}</span>
    </button>

    <button
      type="button"
      class="btn-primary-pill"
      style="font-size: 12px; padding: 6px 16px;"
      onclick={openCreateModal}
    >
      <Icon name="plus" size={12} />
      <span>New Schema</span>
    </button>
  </div>
</div>

{#if error}
  <div style="background-color: #fef2f2; border: 1px solid #fee2e2; border-radius: 8px; padding: 12px 16px; color: #b91c1c; margin-bottom: 20px; font-size: 13px;">
    {error}
  </div>
{/if}

<!-- Collection Cards Grid -->
{#if loading}
  <div class="shopify-card" style="padding: 48px; text-align: center; color: #71717a; font-size: 13.5px;">
    Loading schemas...
  </div>
{:else if collections.length === 0}
  <div class="shopify-card" style="padding: 56px 20px; text-align: center;">
    <div style="width: 48px; height: 48px; border-radius: 12px; background: #f4f4f5; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 12px; color: #71717a;">
      <Icon name="schema" size={24} />
    </div>
    <h3 style="font-size: 16px; font-weight: 600; margin: 0 0 6px 0;">No schemas created yet</h3>
    <p style="color: #71717a; font-size: 13px; max-width: 420px; margin: 0 auto 18px auto;">
      Create your first collection schema visually using the studio builder or sync from <code>cms.config.ts</code>.
    </p>
    <div style="display: flex; justify-content: center; gap: 8px;">
      <button type="button" class="btn-primary-pill" onclick={openCreateModal}>
        Create New Schema
      </button>
      <button type="button" class="btn-outline-pill" onclick={handleSync}>
        Sync cms.config.ts
      </button>
    </div>
  </div>
{:else}
  <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 16px;">
    {#each collections as col (col.id)}
      <div class="shopify-card" style="display: flex; flex-direction: column; justify-content: space-between;">
        <div>
          <!-- Card Header -->
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
            <div style="display: flex; align-items: center; gap: 10px;">
              <div style="width: 34px; height: 34px; border-radius: 8px; background: #000000; color: #ffffff; display: flex; align-items: center; justify-content: center; font-weight: 600; font-size: 13px;">
                <Icon name={col.icon || 'schema'} size={16} />
              </div>
              <div>
                <h3 style="font-size: 15px; font-weight: 600; color: #000000; margin: 0; line-height: 1.3;">
                  {col.name}
                </h3>
                <span style="font-size: 11px; color: #71717a; font-family: monospace;">
                  /content/{col.slug}
                </span>
              </div>
            </div>

            <div style="display: flex; align-items: center; gap: 4px;">
              <span class="field-badge" style="font-size: 11px;">
                {col.fields?.length || 0} fields
              </span>
            </div>
          </div>

          <!-- Description -->
          <p style="font-size: 12px; color: #52525b; margin: 0 0 12px 0; line-height: 1.4; min-height: 28px;">
            {col.description || 'No description specified in schema.'}
          </p>

          <!-- Fields Badges -->
          <div style="display: flex; flex-wrap: wrap; gap: 5px; margin-bottom: 16px;">
            {#each (col.fields || []) as field}
              <span class="field-badge" title="{field.label} ({field.type})">
                <strong style="color: #000000;">{field.key}</strong>
                <span style="opacity: 0.6; font-size: 10px;">({field.type})</span>
              </span>
            {/each}
          </div>
        </div>

        <!-- Card Footer Actions: 32px pill buttons -->
        <div style="display: flex; align-items: center; justify-content: space-between; padding-top: 12px; border-top: 1px solid var(--color-hairline); gap: 6px;">
          <a
            href="/content/{col.slug}"
            class="btn-primary-pill"
            style="font-size: 12px; padding: 5px 12px;"
          >
            <span>Manage Content</span>
            <span style="font-size: 10px;">→</span>
          </a>

          <div style="display: flex; align-items: center; gap: 6px;">
            <button
              type="button"
              class="btn-outline-pill"
              style="font-size: 11.5px; padding: 4px 10px;"
              onclick={() => openEditModal(col)}
              title="Edit schema visually"
            >
              <Icon name="edit" size={12} />
              <span>Edit</span>
            </button>

            <button
              type="button"
              class="btn-outline-pill"
              style="font-size: 11.5px; padding: 4px 8px;"
              onclick={() => openCodeModal(col)}
              title="View TypeScript definition"
            >
              <Icon name="code" size={12} />
              <span>TS</span>
            </button>

            <button
              type="button"
              class="btn-danger-outline-pill"
              style="font-size: 11.5px; padding: 4px 8px;"
              onclick={() => handleDelete(col)}
              title="Delete collection"
            >
              <Icon name="trash" size={11} />
            </button>
          </div>
        </div>
      </div>
    {/each}
  </div>
{/if}

<!-- VISUAL SCHEMA BUILDER STUDIO MODAL (Scalable 980px 2-Column) -->
{#if modalOpen}
  <div class="schema-studio-modal" role="dialog" aria-modal="true">
    <div class="schema-studio-backdrop" onclick={() => (modalOpen = false)} role="presentation"></div>

    <div class="schema-studio-window">
      <!-- Sticky Modal Header -->
      <div class="modal-header">
        <div style="display: flex; align-items: center; gap: 10px;">
          <div style="width: 32px; height: 32px; border-radius: 8px; background: #000000; color: #ffffff; display: flex; align-items: center; justify-content: center;">
            <Icon name="schema" size={16} />
          </div>
          <div>
            <h3 class="modal-title">
              {editingSlug ? `Edit Schema: ${modelName}` : 'Create New Collection Schema'}
            </h3>
            <p class="modal-subtitle">
              {editingSlug ? 'Update collection settings and field definitions' : 'Define API identifier and custom dynamic fields'}
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
      <form onsubmit={handleSaveModel} style="display: flex; flex-direction: column; flex: 1; overflow: hidden; margin: 0;">
        <div class="modal-body">
          {#if modalError}
            <div style="background-color: #fef2f2; border: 1px solid #fee2e2; border-radius: 8px; padding: 10px 14px; color: #b91c1c; margin-bottom: 16px; font-size: 12.5px;">
              {modalError}
            </div>
          {/if}

          <!-- Two-Column Studio Layout -->
          <div class="schema-studio-grid">
            <!-- Left Column: Schema Details & Active Fields -->
            <div class="schema-panel-card">
              <h4 class="schema-panel-heading">Collection Details</h4>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 12px;">
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

              <div style="margin-bottom: 16px;">
                <label for="sm-desc" class="form-label">Description (Optional)</label>
                <input
                  id="sm-desc"
                  type="text"
                  class="shopify-input"
                  bind:value={modelDescription}
                  placeholder="e.g. Store catalog with pricing and media"
                />
              </div>

              <div style="border-top: 1px solid #e4e4e7; padding-top: 14px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                  <h4 class="schema-panel-heading" style="margin: 0;">
                    Defined Fields ({modelFields.length})
                  </h4>
                  <span style="font-size: 11px; color: #71717a;">Minimum 1 field required</span>
                </div>

                {#if modelFields.length === 0}
                  <div style="text-align: center; padding: 24px; border: 1.5px dashed #e4e4e7; border-radius: 8px; color: #71717a; font-size: 12.5px;">
                    No fields added yet. Configure a field on the right and click "Add Field".
                  </div>
                {:else}
                  <div class="schema-fields-list">
                    {#each modelFields as f (f.id)}
                      <div class="schema-field-row">
                        <div style="display: flex; align-items: center; gap: 8px;">
                          <div style="width: 24px; height: 24px; border-radius: 4px; background: #f4f4f5; display: flex; align-items: center; justify-content: center; color: #18181b;">
                            <Icon name={f.type} size={13} />
                          </div>
                          <div>
                            <div style="font-size: 12.5px; font-weight: 600; color: #18181b;">
                              {f.label}
                            </div>
                            <div style="font-size: 11px; color: #71717a; font-family: monospace;">
                              {f.key} • {f.type}
                              {#if f.required}
                                <span style="color: #dc2626; font-weight: 600;">• Required</span>
                              {/if}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          class="btn-danger-outline-pill"
                          style="font-size: 11px; padding: 2px 7px;"
                          onclick={() => removeField(f.id)}
                          title="Remove field"
                        >
                          <Icon name="close" size={11} />
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

              <!-- Field Types Grid (8 types, clean cards) -->
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

<!-- TYPESCRIPT DEFINITION MODAL -->
{#if codeModalOpen}
  <div
    class="modal-backdrop"
    onclick={() => (codeModalOpen = false)}
    role="presentation"
  ></div>

  <div class="modal-card" style="max-width: 620px; z-index: 1001;">
    <div class="modal-header">
      <div>
        <h3 class="modal-title">TypeScript Definition</h3>
        <p class="modal-subtitle">Code for {codeModalTitle}</p>
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

    <div class="modal-body" style="padding: 16px 20px;">
      <pre style="background: #18181b; color: #f4f4f5; padding: 14px 16px; border-radius: 8px; font-family: ui-monospace, SFMono-Regular, monospace; font-size: 12px; line-height: 1.5; overflow-x: auto; margin: 0 0 12px 0;"><code>{codeModalSnippet}</code></pre>
      <p style="font-size: 12px; color: #71717a; margin: 0;">
        Place this in <code>cms.config.ts</code> to version control this schema in Git.
      </p>
    </div>

    <div class="modal-footer">
      <button
        type="button"
        class="btn-outline-pill"
        onclick={() => (codeModalOpen = false)}
      >
        Close
      </button>
      <button
        type="button"
        class="btn-primary-pill"
        onclick={copyCode}
      >
        <Icon name="check" size={12} />
        <span>{copied ? 'Copied to Clipboard!' : 'Copy TypeScript Code'}</span>
      </button>
    </div>
  </div>
{/if}
