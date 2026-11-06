<script lang="ts">
  import { renameMedia } from '$lib/api';
  import type { MediaItem } from '@cms/shared';

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

  function onKeyDown(e: KeyboardEvent) {
    if (!isOpen) return;
    if (e.key === 'Escape' && !loading) {
      e.preventDefault();
      onClose();
    }
  }

  function onBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget && !loading) {
      onClose();
    }
  }

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

<svelte:window onkeydown={onKeyDown} />

{#if isOpen && item}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div
    class="modal-backdrop"
    onclick={onBackdropClick}
    role="presentation"
  >
    <div
      class="modal-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rename-modal-title"
      tabindex="-1"
    >
      <!-- Header with Icon & Close -->
      <div class="modal-header">
        <div style="display: flex; align-items: center; gap: 10px;">
          <div class="modal-icon-badge info">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
            </svg>
          </div>
          <h3 id="rename-modal-title" class="modal-title">Rename Asset</h3>
        </div>

        <button
          type="button"
          class="modal-close-btn"
          onclick={onClose}
          disabled={loading}
          title="Close dialog (Esc)"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <!-- Form Body -->
      <form onsubmit={handleSubmit}>
        <div class="modal-body">
          {#if error}
            <div class="error-banner">
              {error}
            </div>
          {/if}

          <div style="margin-bottom: 14px;">
            <label for="rename-input" style="display: block; font-size: 12px; font-weight: 600; color: #3f3f46; margin-bottom: 6px;">
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
            <strong style="color: #000000;">Smart sync:</strong> Renaming this asset updates its Cloudflare R2 path and automatically updates references across all blog posts.
          </div>
        </div>

        <!-- Footer -->
        <div class="modal-footer">
          <button
            type="button"
            class="btn-outline-pill"
            style="font-size: 12.5px; padding: 6px 15px;"
            disabled={loading}
            onclick={onClose}
          >
            Cancel
          </button>
          <button
            type="submit"
            class="btn-primary-pill"
            style="font-size: 12.5px; padding: 6px 18px;"
            disabled={loading || !inputValue.trim()}
          >
            {loading ? 'Renaming...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background-color: rgba(0, 0, 0, 0.45);
    backdrop-filter: blur(3px);
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    box-sizing: border-box;
    animation: fadeIn 0.15s ease-out;
  }

  .modal-dialog {
    background-color: #ffffff;
    border-radius: 12px;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.12), 0 8px 10px -6px rgba(0, 0, 0, 0.05);
    border: 1px solid #e4e4e7;
    width: 100%;
    max-width: 440px;
    overflow: hidden;
    animation: popIn 0.15s cubic-bezier(0.16, 1, 0.3, 1);
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 15px 18px;
    border-bottom: 1px solid #f4f4f5;
  }

  .modal-title {
    font-size: 14.5px;
    font-weight: 600;
    color: #000000;
    margin: 0;
    line-height: 1.3;
  }

  .modal-close-btn {
    background: transparent;
    border: none;
    cursor: pointer;
    color: #71717a;
    padding: 4px;
    border-radius: 6px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transition: all 0.1s ease;
  }

  .modal-close-btn:hover {
    background-color: #f4f4f5;
    color: #000000;
  }

  .modal-icon-badge {
    width: 30px;
    height: 30px;
    border-radius: 50%;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .modal-icon-badge.info {
    background-color: #f4f4f5;
    color: #18181b;
    border: 1px solid #e4e4e7;
  }

  .modal-body {
    padding: 16px 18px;
  }

  .error-banner {
    background-color: #fef2f2;
    border: 1px solid #fee2e2;
    border-radius: 8px;
    padding: 10px 12px;
    color: #dc2626;
    font-size: 12px;
    margin-bottom: 14px;
    line-height: 1.4;
  }

  .info-callout {
    background-color: #fbfbf5;
    border: 1px solid #e4e4e7;
    border-radius: 8px;
    padding: 10px 12px;
    font-size: 11.5px;
    color: #71717a;
    line-height: 1.45;
  }

  .modal-footer {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
    padding: 12px 18px;
    background-color: #fbfbf5;
    border-top: 1px solid #e4e4e7;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }

  @keyframes popIn {
    from {
      opacity: 0;
      transform: scale(0.96) translateY(-4px);
    }
    to {
      opacity: 1;
      transform: scale(1) translateY(0);
    }
  }
</style>
