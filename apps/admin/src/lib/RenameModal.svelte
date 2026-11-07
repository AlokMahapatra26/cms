<script lang="ts">
  import { renameMedia } from '$lib/api';
  import type { MediaItem } from '@cms/shared';
  import { Modal, Button } from '$lib/components';

  let {
    isOpen = false,
    item = null,
    onClose,
    onRenamed
  }: {
    isOpen: boolean;
    item: MediaItem | null;
    onClose: () => void;
    onRenamed: (updatedItem: MediaItem) => void;
  } = $props();

  let inputValue = $state('');
  let loading = $state(false);
  let error = $state<string | null>(null);
  let inputElement: HTMLInputElement | null = $state(null);

  $effect(() => {
    if (isOpen && item) {
      const rawName = item.key.includes('/')
        ? item.key.substring(item.key.lastIndexOf('/') + 1)
        : item.key;
      inputValue = rawName;
      error = null;
      loading = false;

      setTimeout(() => {
        inputElement?.focus();
        inputElement?.select();
      }, 50);
    }
  });

  async function handleSubmit(e: Event) {
    e.preventDefault();
    if (!item || !inputValue.trim() || loading) return;

    loading = true;
    error = null;

    try {
      const updated = await renameMedia(item.key, inputValue.trim());
      onRenamed(updated);
      onClose();
    } catch (err: any) {
      error = err.message || 'Failed to rename asset';
    } finally {
      loading = false;
    }
  }
</script>

<Modal
  open={isOpen && !!item}
  title="Rename Asset"
  icon="info"
  onclose={() => { if (!loading) onClose(); }}
>
  <form id="rename-form" onsubmit={handleSubmit}>
    {#if error}
      <div class="error-banner mb-3">
        {error}
      </div>
    {/if}

    <div class="form-group mb-3">
      <label for="rename-input" class="form-label">
        File Name
      </label>
      <input
        id="rename-input"
        type="text"
        class="shopify-input"
        bind:this={inputElement}
        bind:value={inputValue}
        disabled={loading}
        required
        placeholder="e.g. brand-logo.png"
      />
    </div>

    <div class="info-callout">
      <strong class="text-dark">Smart sync:</strong> Renaming this asset updates its Cloudflare R2 path and automatically updates references across all blog posts.
    </div>
  </form>

  {#snippet footer()}
    <Button
      variant="outline"
      disabled={loading}
      onclick={onClose}
    >
      Cancel
    </Button>
    <Button
      variant="primary"
      type="submit"
      loading={loading}
      disabled={loading || !inputValue.trim()}
      onclick={() => {
        const form = document.getElementById('rename-form') as HTMLFormElement;
        form?.requestSubmit();
      }}
    >
      {loading ? 'Renaming...' : 'Save Changes'}
    </Button>
  {/snippet}
</Modal>
