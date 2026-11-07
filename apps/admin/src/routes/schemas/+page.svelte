<script lang="ts">
  import { onMount } from 'svelte';
  import {
    fetchCollections,
    syncCollections,
    deleteCollection
  } from '$lib/api';
  import { collectionsStore } from '$lib/collections.svelte';
  import { modal } from '$lib/modal.svelte';
  import { Icon } from '$lib/components';
  import type { Collection, FieldDefinition } from '@cms/shared';

  let collections = $state<Collection[]>([]);
  let loading = $state(true);
  let syncing = $state(false);
  let error = $state<string | null>(null);

  // Code View Modal State
  let codeModalOpen = $state(false);
  let codeModalTitle = $state('');
  let codeModalSnippet = $state('');
  let copied = $state(false);

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

  async function handleDelete(col: Collection) {
    const confirmed = await modal.confirm({
      title: `Remove ${col.name}?`,
      message: `Are you sure you want to remove the "${col.name}" collection model from the database? Records inside this collection will no longer be visible in the admin.`,
      confirmText: 'Remove Collection',
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
        message: e.message || 'Failed to remove collection',
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

  const samplePrompt = `// Example: Paste this prompt to your AI coding agent (Cursor, Claude, Copilot, Antigravity):
"Add a new 'Testimonials' collection to cms.config.ts with:
- author_name (text, required)
- company (text)
- rating (number, required)
- quote (longtext, required)
- avatar (media)
- verified_buyer (boolean)"`;
</script>

<svelte:head>
  <title>Schema Models (Code-First) - EdgeCMS</title>
</svelte:head>

<!-- Top Header -->
<div style="margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
  <div>
    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 3px;">
      <h1 style="font-size: 20px; font-weight: 600; color: #000000; margin: 0; letter-spacing: -0.01em;">
        Schema Models
      </h1>
      <span class="pill-tag-mint">
        Code-First
      </span>
    </div>
    <p style="font-size: 13px; color: #71717a; margin: 0;">
      Schemas are defined in <code>cms.config.ts</code>. Built for AI coding agents & version-controlled in Git.
    </p>
  </div>

  <div style="display: flex; align-items: center; gap: 8px;">
    <button
      type="button"
      class="btn-primary-pill"
      onclick={handleSync}
      disabled={syncing}
      title="Re-read cms.config.ts and sync collections to database"
    >
      <Icon name="check" size={12} />
      <span>{syncing ? 'Syncing...' : 'Sync cms.config.ts'}</span>
    </button>
  </div>
</div>

<!-- AI Agent & Developer Workflow Info Card -->
<div class="shopify-card" style="margin-bottom: 20px; padding: 16px 20px; border-left: 3px solid #000000;">
  <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap;">
    <div style="flex: 1; min-width: 280px;">
      <div style="font-size: 13.5px; font-weight: 600; color: #000000; margin-bottom: 4px; display: flex; align-items: center; gap: 6px;">
        <Icon name="api" size={14} />
        <span>How to Add or Modify Schemas</span>
      </div>
      <p style="font-size: 12.5px; color: #52525b; margin: 0 0 10px 0; line-height: 1.45;">
        No clicking in complex UI forms. Simply open <code>cms.config.ts</code> in your editor and ask your AI agent (Cursor, Claude, Copilot, Antigravity) to create or edit schemas with full TypeScript type safety.
      </p>
      <div style="background: #f4f4f5; border-radius: 6px; padding: 8px 12px; font-family: ui-monospace, SFMono-Regular, monospace; font-size: 11.5px; color: #27272a; white-space: pre-wrap;">{samplePrompt}</div>
    </div>
    <div style="display: flex; flex-direction: column; gap: 6px;">
      <button
        type="button"
        class="btn-outline-pill"
        style="font-size: 11.5px;"
        onclick={() => {
          navigator.clipboard.writeText(samplePrompt);
          modal.alert({ title: 'Copied', message: 'Sample prompt copied to clipboard.' });
        }}
      >
        <span>Copy Prompt Example</span>
      </button>
    </div>
  </div>
</div>

{#if error}
  <div style="background-color: #fef2f2; border: 1px solid #fee2e2; border-radius: 8px; padding: 12px 16px; color: #b91c1c; margin-bottom: 20px; font-size: 13px;">
    {error}
  </div>
{/if}

<!-- Collection List Grid -->
{#if loading}
  <div class="shopify-card" style="padding: 48px; text-align: center; color: #71717a; font-size: 13.5px;">
    Loading schema models...
  </div>
{:else if collections.length === 0}
  <div class="shopify-card" style="padding: 56px 20px; text-align: center;">
    <div style="width: 48px; height: 48px; border-radius: 12px; background: #f4f4f5; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 12px; color: #71717a;">
      <Icon name="schema" size={24} />
    </div>
    <h3 style="font-size: 16px; font-weight: 600; margin: 0 0 6px 0;">No schemas synced yet</h3>
    <p style="color: #71717a; font-size: 13px; max-width: 420px; margin: 0 auto 18px auto;">
      Define your collections in <code>cms.config.ts</code> and click Sync to generate the dynamic CMS forms.
    </p>
    <button type="button" class="btn-primary-pill" onclick={handleSync}>
      Sync from cms.config.ts
    </button>
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

        <!-- Card Footer Actions -->
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
              onclick={() => openCodeModal(col)}
              title="View TypeScript definition"
            >
              <Icon name="code" size={12} />
              <span>TypeScript</span>
            </button>

            <button
              type="button"
              class="btn-danger-outline-pill"
              style="font-size: 11.5px; padding: 4px 8px;"
              onclick={() => handleDelete(col)}
              title="Remove collection from database"
            >
              <Icon name="trash" size={11} />
            </button>
          </div>
        </div>
      </div>
    {/each}
  </div>
{/if}

<!-- TypeScript Definition Modal -->
{#if codeModalOpen}
  <!-- Backdrop -->
  <div
    class="modal-backdrop"
    onclick={() => (codeModalOpen = false)}
    role="presentation"
  ></div>

  <div class="modal-card" style="max-width: 620px; z-index: 1001;">
    <div class="modal-header">
      <div>
        <h3 class="modal-title">TypeScript Definition</h3>
        <p class="modal-subtitle">Schema for {codeModalTitle}</p>
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
        Place this inside <code>cms.config.ts</code> to customize or extend the collection schema.
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
